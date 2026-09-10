import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { StreamSource, HoverThumbnailState } from '../types/player';
import { clamp } from '../utils/clamp';

interface UseThumbnailSeekerOptions {
  source: StreamSource | null;
  duration: number;
  isLive: boolean;
  isBuffering?: boolean;
  previewWidth?: number;
  previewHeight?: number;
  mainVideoRef?: React.RefObject<HTMLVideoElement | null>;
}

const TOOLTIP_WIDTH = 200; // standard width in pixels for thumbnail tooltip
const BUCKET_SIZE = 2.5; // 2.5s discrete frame quantization bucket
const MAX_CACHE_SIZE = 160; // Max stored frames (~8MB RAM total at 240x135)
const MAX_NEAREST_DISTANCE = 45; // Max seconds diff to use nearest-neighbor frame
const DEBOUNCE_DELAY_MS = 70; // Snappy debounce for uncached seek requests

export function useThumbnailSeeker({
  source,
  duration,
  isLive,
  isBuffering = false,
  previewWidth = 240,
  previewHeight = 135,
  mainVideoRef,
}: UseThumbnailSeekerOptions) {
  const [thumbnailState, setThumbnailState] = useState<HoverThumbnailState>({
    isHovering: false,
    hoverTime: 0,
    hoverX: 0,
    hoverPercent: 0,
    frameCanvasDataUrl: null,
    hasFrame: false,
    isDecoding: false,
    isExact: false,
    error: false,
  });

  const headlessVideoRef = useRef<HTMLVideoElement | null>(null);
  const auxiliaryHlsRef = useRef<Hls | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // LRU Frame Cache: Map<bucketSeconds, HTMLCanvasElement>
  const frameCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const debounceTimerRef = useRef<number | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  const pendingTargetTimeRef = useRef<number | null>(null);
  const isSeekingActiveRef = useRef<boolean>(false);
  const seekSafetyTimeoutRef = useRef<number | null>(null);
  const lastSoughtBucketRef = useRef<number>(-999);
  const isSourceAttachedRef = useRef<boolean>(false);

  // Helper: Quantize timestamp to discrete bucket
  const getBucket = useCallback((time: number): number => {
    return Math.round(time / BUCKET_SIZE) * BUCKET_SIZE;
  }, []);

  // Helper: Save frame to LRU cache
  const cacheFrame = useCallback(
    (bucket: number, sourceElement: CanvasImageSource): HTMLCanvasElement | null => {
      const cache = frameCacheRef.current;

      // If already present, re-insert to refresh LRU position
      if (cache.has(bucket)) {
        const existing = cache.get(bucket)!;
        cache.delete(bucket);
        cache.set(bucket, existing);
        return existing;
      }

      // Evict oldest entry if limit reached
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;

      try {
        ctx.drawImage(sourceElement, 0, 0, previewWidth, previewHeight);
        cache.set(bucket, canvas);
        return canvas;
      } catch {
        return null;
      }
    },
    [previewWidth, previewHeight]
  );

  // Helper: Find nearest cached frame
  const findNearestCachedFrame = useCallback(
    (targetBucket: number): { bucket: number; canvas: HTMLCanvasElement; distance: number } | null => {
      const cache = frameCacheRef.current;
      if (cache.size === 0) return null;

      if (cache.has(targetBucket)) {
        return { bucket: targetBucket, canvas: cache.get(targetBucket)!, distance: 0 };
      }

      let closestBucket: number | null = null;
      let minDiff = Infinity;

      for (const bucket of cache.keys()) {
        const diff = Math.abs(bucket - targetBucket);
        if (diff < minDiff) {
          minDiff = diff;
          closestBucket = bucket;
        }
      }

      if (closestBucket !== null && minDiff <= MAX_NEAREST_DISTANCE) {
        return {
          bucket: closestBucket,
          canvas: cache.get(closestBucket)!,
          distance: minDiff,
        };
      }

      return null;
    },
    []
  );

  // Helper: Blit canvas to DOM preview canvas
  const blitToPreview = useCallback((srcCanvas: HTMLCanvasElement) => {
    const target = previewCanvasRef.current;
    if (target) {
      const ctx = target.getContext('2d', { alpha: false });
      ctx?.drawImage(srcCanvas, 0, 0, target.width, target.height);
    }
  }, []);

  // 1. Passive Frame Harvester: Capture frames from main video element during playback
  useEffect(() => {
    const mainVideo = mainVideoRef?.current;
    if (!mainVideo || isLive) return;

    let lastHarvestedBucket = -999;
    let isCancelled = false;
    let rfcId: number | null = null;

    const harvestCurrentFrame = () => {
      if (isCancelled) return;
      if (
        mainVideo &&
        !mainVideo.paused &&
        !mainVideo.seeking &&
        mainVideo.readyState >= 2 &&
        mainVideo.videoWidth > 0
      ) {
        const bucket = getBucket(mainVideo.currentTime);
        if (bucket !== lastHarvestedBucket && !frameCacheRef.current.has(bucket)) {
          lastHarvestedBucket = bucket;
          cacheFrame(bucket, mainVideo);
        }
      }

      if ('requestVideoFrameCallback' in mainVideo) {
        const videoWithRfc = mainVideo as unknown as {
          requestVideoFrameCallback: (cb: () => void) => number;
        };
        rfcId = videoWithRfc.requestVideoFrameCallback(harvestCurrentFrame);
      }
    };

    if ('requestVideoFrameCallback' in mainVideo) {
      const videoWithRfc = mainVideo as unknown as {
        requestVideoFrameCallback: (cb: () => void) => number;
      };
      rfcId = videoWithRfc.requestVideoFrameCallback(harvestCurrentFrame);
    }

    const handleTimeUpdate = () => {
      if (
        mainVideo &&
        !mainVideo.seeking &&
        mainVideo.readyState >= 2 &&
        mainVideo.videoWidth > 0
      ) {
        const bucket = getBucket(mainVideo.currentTime);
        if (bucket !== lastHarvestedBucket && !frameCacheRef.current.has(bucket)) {
          lastHarvestedBucket = bucket;
          cacheFrame(bucket, mainVideo);
        }
      }
    };

    mainVideo.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      isCancelled = true;
      mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
      if (rfcId !== null && 'cancelVideoFrameCallback' in mainVideo) {
        const videoWithCancel = mainVideo as unknown as {
          cancelVideoFrameCallback: (id: number) => void;
        };
        videoWithCancel.cancelVideoFrameCallback(rfcId);
      }
    };
  }, [mainVideoRef, isLive, getBucket, cacheFrame]);

  // 2. Setup offscreen canvas and headless video element
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    offscreenCanvasRef.current = canvas;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none'; // Zero eager network consumption before hover
    video.style.display = 'none';
    headlessVideoRef.current = video;

    const handleSeeked = () => {
      isSeekingActiveRef.current = false;
      if (seekSafetyTimeoutRef.current !== null) {
        window.clearTimeout(seekSafetyTimeoutRef.current);
        seekSafetyTimeoutRef.current = null;
      }

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const bucket = getBucket(video.currentTime);
        const cached = cacheFrame(bucket, video);

        if (cached) {
          blitToPreview(cached);
        } else {
          // Fallback direct blit
          const target = previewCanvasRef.current;
          if (target) {
            const tCtx = target.getContext('2d', { alpha: false });
            tCtx?.drawImage(video, 0, 0, target.width, target.height);
          }
        }

        setThumbnailState((prev) => ({
          ...prev,
          hasFrame: true,
          isExact: true,
          isDecoding: false,
          error: false,
        }));
      } else {
        setThumbnailState((prev) => ({
          ...prev,
          isDecoding: false,
        }));
      }

      // Process any queued seek request
      if (pendingTargetTimeRef.current !== null) {
        const nextTime = pendingTargetTimeRef.current;
        pendingTargetTimeRef.current = null;
        dispatchSeek(nextTime);
      }
    };

    const handleError = () => {
      isSeekingActiveRef.current = false;
      if (seekSafetyTimeoutRef.current !== null) {
        window.clearTimeout(seekSafetyTimeoutRef.current);
        seekSafetyTimeoutRef.current = null;
      }
      setThumbnailState((prev) => ({
        ...prev,
        isDecoding: false,
        error: true,
      }));
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.src = '';
      video.load();
      headlessVideoRef.current = null;
      offscreenCanvasRef.current = null;
    };
  }, [previewWidth, previewHeight, getBucket, cacheFrame, blitToPreview]);

  // 3. Reset source and cache when media changes
  useEffect(() => {
    isSourceAttachedRef.current = false;
    lastSoughtBucketRef.current = -999;
    frameCacheRef.current.clear();

    if (auxiliaryHlsRef.current) {
      auxiliaryHlsRef.current.destroy();
      auxiliaryHlsRef.current = null;
    }

    const video = headlessVideoRef.current;
    if (video) {
      video.src = '';
    }
  }, [source]);

  // 4. Dispatches seek to headless video with fastSeek or standard currentTime
  const dispatchSeek = useCallback(
    (time: number) => {
      const video = headlessVideoRef.current;
      if (!video) return;

      const safeTime = clamp(time, 0, duration || 0);
      const targetBucket = getBucket(safeTime);

      // Double check if bucket was populated while queued
      if (frameCacheRef.current.has(targetBucket)) {
        const cached = frameCacheRef.current.get(targetBucket)!;
        blitToPreview(cached);
        isSeekingActiveRef.current = false;
        setThumbnailState((prev) => ({
          ...prev,
          hasFrame: true,
          isExact: true,
          isDecoding: false,
        }));
        return;
      }

      if (video.readyState < 1) {
        // Wait until metadata is loaded before seeking
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          dispatchSeek(time);
        };
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        return;
      }

      isSeekingActiveRef.current = true;
      lastSoughtBucketRef.current = targetBucket;

      // 1.5s safety watchdog against frozen decoder
      if (seekSafetyTimeoutRef.current !== null) {
        window.clearTimeout(seekSafetyTimeoutRef.current);
      }
      seekSafetyTimeoutRef.current = window.setTimeout(() => {
        isSeekingActiveRef.current = false;
        if (pendingTargetTimeRef.current !== null) {
          const next = pendingTargetTimeRef.current;
          pendingTargetTimeRef.current = null;
          dispatchSeek(next);
        }
      }, 1500);

      // fastSeek seeks to nearest keyframe (10x faster than precise decoding)
      const candidate = video as unknown as { fastSeek?: (t: number) => void };
      if (typeof candidate.fastSeek === 'function') {
        try {
          candidate.fastSeek(safeTime);
        } catch {
          video.currentTime = safeTime;
        }
      } else {
        video.currentTime = safeTime;
      }
    },
    [duration, getBucket, blitToPreview]
  );

  // 5. Debounced seek triggered on seekbar hover
  const requestThumbnailSeek = useCallback(
    (targetTime: number) => {
      if (isLive || duration <= 0 || isBuffering) return;

      const targetBucket = getBucket(targetTime);

      // If exact bucket is already in cache, 0ms latency!
      if (frameCacheRef.current.has(targetBucket)) {
        const cached = frameCacheRef.current.get(targetBucket)!;
        blitToPreview(cached);
        setThumbnailState((prev) => ({
          ...prev,
          hasFrame: true,
          isExact: true,
          isDecoding: false,
        }));
        return;
      }

      // If exact bucket is missing, check for nearest-neighbor cached frame
      const nearest = findNearestCachedFrame(targetBucket);
      if (nearest) {
        blitToPreview(nearest.canvas);
        setThumbnailState((prev) => ({
          ...prev,
          hasFrame: true,
          isExact: false,
          isDecoding: true,
        }));
      } else {
        setThumbnailState((prev) => ({
          ...prev,
          isDecoding: true,
        }));
      }

      // If decoder is currently seeking this bucket, no need to re-request
      if (targetBucket === lastSoughtBucketRef.current && isSeekingActiveRef.current) {
        return;
      }

      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
      }

      // Snappy 70ms debounce for uncached decoder seek
      debounceTimerRef.current = window.setTimeout(() => {
        rafHandleRef.current = requestAnimationFrame(() => {
          if (isSeekingActiveRef.current) {
            // Decoder is busy; queue this latest target
            pendingTargetTimeRef.current = targetTime;
          } else {
            if (auxiliaryHlsRef.current) {
              auxiliaryHlsRef.current.startLoad();
            }
            dispatchSeek(targetTime);
          }
        });
      }, DEBOUNCE_DELAY_MS);
    },
    [duration, isLive, isBuffering, getBucket, blitToPreview, findNearestCachedFrame, dispatchSeek]
  );

  // 6. Mouse event handlers for Seekbar
  const handleSeekbarHover = useCallback(
    (
      clientX: number,
      containerRect: DOMRect,
      currentDuration: number
    ) => {
      // Lazily attach video stream source on first hover
      if (!isSourceAttachedRef.current && source && !isLive) {
        isSourceAttachedRef.current = true;
        const video = headlessVideoRef.current;
        if (video) {
          if (source.type === 'hls' && Hls.isSupported()) {
            const auxHls = new Hls({
              autoStartLoad: false,
              enableWorker: true,
              lowLatencyMode: false,
              maxBufferLength: 4,
              maxMaxBufferLength: 8,
            });
            auxiliaryHlsRef.current = auxHls;
            auxHls.loadSource(source.url);
            auxHls.attachMedia(video);
            auxHls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
              if (data.levels.length > 0) auxHls.currentLevel = 0; // lowest bandwidth for thumbnails
            });
          } else {
            video.src = source.url;
            video.preload = 'auto';
          }
        }
      }

      const offsetX = clientX - containerRect.left;
      const percent = clamp(offsetX / containerRect.width, 0, 1);
      const calculatedTime = percent * currentDuration;

      // Tooltip position clamping
      const halfTooltip = TOOLTIP_WIDTH / 2;
      const clampedX = clamp(
        offsetX,
        halfTooltip + 8,
        containerRect.width - halfTooltip - 8
      );

      setThumbnailState((prev) => ({
        ...prev,
        isHovering: true,
        hoverTime: calculatedTime,
        hoverX: clampedX,
        hoverPercent: percent,
      }));

      requestThumbnailSeek(calculatedTime);
    },
    [source, isLive, requestThumbnailSeek]
  );

  const handleSeekbarLeave = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (rafHandleRef.current !== null) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }
    if (seekSafetyTimeoutRef.current !== null) {
      window.clearTimeout(seekSafetyTimeoutRef.current);
      seekSafetyTimeoutRef.current = null;
    }

    // Stop auxiliary HLS downloading when cursor leaves seekbar
    if (auxiliaryHlsRef.current) {
      auxiliaryHlsRef.current.stopLoad();
    }

    setThumbnailState((prev) => ({
      ...prev,
      isHovering: false,
    }));
  }, []);

  return {
    thumbnailState,
    handleSeekbarHover,
    handleSeekbarLeave,
    previewCanvasRef,
  };
}
