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
const BUCKET_SIZE = 2; // 2s discrete frame quantization bucket
const MAX_CACHE_SIZE = 300; // Max stored frames in LRU cache (~15MB RAM total at 240x135)
const DEBOUNCE_DELAY_MS = 25; // Snappy 25ms debounce for uncached seek requests
const PRECACHE_STEPS = 20; // Number of background distributed sample points

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
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // LRU Frame Cache: Map<bucketSeconds, HTMLCanvasElement>
  const frameCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const debounceTimerRef = useRef<number | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  const pendingTargetTimeRef = useRef<number | null>(null);
  const isSeekingActiveRef = useRef<boolean>(false);
  const seekSafetyTimeoutRef = useRef<number | null>(null);
  const lastSoughtBucketRef = useRef<number>(-999);

  // Background pre-caching refs
  const isHoveringRef = useRef<boolean>(false);
  const isPreCachingRef = useRef<boolean>(false);
  const preCacheTimerRef = useRef<number | null>(null);
  const preCacheIndexRef = useRef<number>(0);

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

  // Helper: Find nearest cached frame (no distance cap so user always gets an instant preview)
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

      if (closestBucket !== null) {
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

  // 1. Passive Frame Harvester: Capture frames from main video element whenever ready
  useEffect(() => {
    const mainVideo = mainVideoRef?.current;
    if (!mainVideo || isLive) return;

    let lastHarvestedBucket = -999;
    let isCancelled = false;
    let rfcId: number | null = null;

    const harvestCurrentFrame = () => {
      if (isCancelled) return;
      if (mainVideo.readyState >= 2 && mainVideo.videoWidth > 0) {
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

    const handleFrameEvent = () => {
      if (mainVideo.readyState >= 2 && mainVideo.videoWidth > 0) {
        const bucket = getBucket(mainVideo.currentTime);
        if (bucket !== lastHarvestedBucket && !frameCacheRef.current.has(bucket)) {
          lastHarvestedBucket = bucket;
          cacheFrame(bucket, mainVideo);
        }
      }
    };

    mainVideo.addEventListener('timeupdate', handleFrameEvent);
    mainVideo.addEventListener('seeked', handleFrameEvent);
    mainVideo.addEventListener('loadeddata', handleFrameEvent);
    mainVideo.addEventListener('pause', handleFrameEvent);
    mainVideo.addEventListener('play', handleFrameEvent);

    return () => {
      isCancelled = true;
      mainVideo.removeEventListener('timeupdate', handleFrameEvent);
      mainVideo.removeEventListener('seeked', handleFrameEvent);
      mainVideo.removeEventListener('loadeddata', handleFrameEvent);
      mainVideo.removeEventListener('pause', handleFrameEvent);
      mainVideo.removeEventListener('play', handleFrameEvent);
      if (rfcId !== null && 'cancelVideoFrameCallback' in mainVideo) {
        const videoWithCancel = mainVideo as unknown as {
          cancelVideoFrameCallback: (id: number) => void;
        };
        videoWithCancel.cancelVideoFrameCallback(rfcId);
      }
    };
  }, [mainVideoRef, isLive, getBucket, cacheFrame]);

  // 2. Dispatches seek to headless video
  const dispatchSeek = useCallback(
    (time: number) => {
      const video = headlessVideoRef.current;
      if (!video) return;

      const safeTime = clamp(time, 0, duration || 0);
      const targetBucket = getBucket(safeTime);

      // Check if target bucket was populated in cache while queued
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

  // 3. Background Pre-Cacher: steps through key intervals when user is idle
  const stepPreCache = useCallback(() => {
    if (isHoveringRef.current || isSeekingActiveRef.current) {
      isPreCachingRef.current = false;
      return;
    }

    const video = headlessVideoRef.current;
    if (!video || video.readyState < 1 || duration <= 0) {
      isPreCachingRef.current = false;
      return;
    }

    const step = duration / (PRECACHE_STEPS + 1);
    let nextIndex = preCacheIndexRef.current + 1;

    // Find next uncached point
    while (nextIndex <= PRECACHE_STEPS) {
      const sampleTime = nextIndex * step;
      const bucket = getBucket(sampleTime);
      if (!frameCacheRef.current.has(bucket)) {
        break;
      }
      nextIndex++;
    }

    if (nextIndex > PRECACHE_STEPS) {
      isPreCachingRef.current = false;
      return;
    }

    preCacheIndexRef.current = nextIndex;
    isPreCachingRef.current = true;
    const targetTime = nextIndex * step;
    video.currentTime = targetTime;
  }, [duration, getBucket]);

  // 4. Setup headless video element and seeked listener
  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
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

        // Only blit if this was a user-requested seek, not background pre-caching
        if (!isPreCachingRef.current || isHoveringRef.current) {
          if (cached) {
            blitToPreview(cached);
          } else {
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
        }
      } else if (!isPreCachingRef.current) {
        setThumbnailState((prev) => ({
          ...prev,
          isDecoding: false,
        }));
      }

      // If user queued a target while seeking was busy, immediately process user seek
      if (pendingTargetTimeRef.current !== null) {
        isPreCachingRef.current = false;
        const nextTime = pendingTargetTimeRef.current;
        pendingTargetTimeRef.current = null;
        dispatchSeek(nextTime);
        return;
      }

      // If pre-caching was active and user is still idle, step to next frame after brief pause
      if (isPreCachingRef.current && !isHoveringRef.current) {
        preCacheTimerRef.current = window.setTimeout(() => {
          stepPreCache();
        }, 50);
      } else {
        isPreCachingRef.current = false;
      }
    };

    const handleError = () => {
      isSeekingActiveRef.current = false;
      isPreCachingRef.current = false;
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
    };
  }, [getBucket, cacheFrame, blitToPreview, dispatchSeek, stepPreCache]);

  // 5. Eagerly attach media pipeline as soon as source loads (eliminates cold-start hover delay)
  useEffect(() => {
    lastSoughtBucketRef.current = -999;
    frameCacheRef.current.clear();
    isPreCachingRef.current = false;
    preCacheIndexRef.current = 0;

    if (preCacheTimerRef.current !== null) {
      window.clearTimeout(preCacheTimerRef.current);
      preCacheTimerRef.current = null;
    }

    if (auxiliaryHlsRef.current) {
      auxiliaryHlsRef.current.destroy();
      auxiliaryHlsRef.current = null;
    }

    const video = headlessVideoRef.current;
    if (!video || !source || isLive) {
      if (video) {
        video.src = '';
      }
      return;
    }

    if (source.type === 'hls' && Hls.isSupported()) {
      const auxHls = new Hls({
        autoStartLoad: true,
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 4,
        maxMaxBufferLength: 8,
      });
      auxiliaryHlsRef.current = auxHls;
      auxHls.loadSource(source.url);
      auxHls.attachMedia(video);
      auxHls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data.levels.length > 0) {
          auxHls.currentLevel = 0; // lowest bandwidth / fastest decode for thumbnails
          auxHls.loadLevel = 0;
        }
      });
    } else {
      video.src = source.url;
      video.preload = 'auto';
    }

    // Trigger initial background pre-cache once metadata is loaded
    const onLoadedMetadata = () => {
      if (!isHoveringRef.current && duration > 0) {
        preCacheTimerRef.current = window.setTimeout(() => {
          stepPreCache();
        }, 300);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [source, isLive, duration, stepPreCache]);

  // 6. Debounced seek triggered on seekbar hover
  const requestThumbnailSeek = useCallback(
    (targetTime: number) => {
      if (isLive || duration <= 0 || isBuffering) return;

      const targetBucket = getBucket(targetTime);

      // Instant path: exact bucket is already in cache (0ms latency)
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

      // Fast fallback: show closest cached frame immediately with subtle refining indicator
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

      if (targetBucket === lastSoughtBucketRef.current && isSeekingActiveRef.current) {
        return;
      }

      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
      }

      // Snappy 25ms debounce
      debounceTimerRef.current = window.setTimeout(() => {
        rafHandleRef.current = requestAnimationFrame(() => {
          if (isSeekingActiveRef.current) {
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

  // 7. Mouse event handlers for Seekbar
  const handleSeekbarHover = useCallback(
    (
      clientX: number,
      containerRect: DOMRect,
      currentDuration: number
    ) => {
      isHoveringRef.current = true;
      isPreCachingRef.current = false;
      if (preCacheTimerRef.current !== null) {
        window.clearTimeout(preCacheTimerRef.current);
        preCacheTimerRef.current = null;
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

      // Instant harvest from main video if hover position is near main video's currentTime
      const mainVideo = mainVideoRef?.current;
      if (
        mainVideo &&
        mainVideo.readyState >= 2 &&
        mainVideo.videoWidth > 0 &&
        Math.abs(calculatedTime - mainVideo.currentTime) < 2
      ) {
        const bucket = getBucket(mainVideo.currentTime);
        const cached = cacheFrame(bucket, mainVideo);
        if (cached) {
          blitToPreview(cached);
        }
      }

      setThumbnailState((prev) => ({
        ...prev,
        isHovering: true,
        hoverTime: calculatedTime,
        hoverX: clampedX,
        hoverPercent: percent,
      }));

      requestThumbnailSeek(calculatedTime);
    },
    [requestThumbnailSeek, mainVideoRef, getBucket, cacheFrame, blitToPreview]
  );

  const handleSeekbarLeave = useCallback(() => {
    isHoveringRef.current = false;

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

    // Resume background pre-caching after user moves away
    if (duration > 0 && !isLive) {
      preCacheTimerRef.current = window.setTimeout(() => {
        stepPreCache();
      }, 500);
    }
  }, [duration, isLive, stepPreCache]);

  return {
    thumbnailState,
    handleSeekbarHover,
    handleSeekbarLeave,
    previewCanvasRef,
  };
}
