import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { QualityLevel, StreamSource } from '../types/player';
import { formatResolution, formatBitrate } from '../utils/formatters';

interface UseHlsStreamOptions {
  source: StreamSource | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onIsLiveChange?: (isLive: boolean) => void;
  onError?: (error: string) => void;
}

interface UseHlsStreamReturn {
  isHlsSupported: boolean;
  qualities: QualityLevel[];
  currentQuality: number;
  setQuality: (qualityIndex: number) => void;
  isLive: boolean;
  retryStream: () => void;
}

export function useHlsStream({
  source,
  videoRef,
  onIsLiveChange,
  onError,
}: UseHlsStreamOptions): UseHlsStreamReturn {
  const hlsRef = useRef<Hls | null>(null);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = ABR / Auto
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isHlsSupported, setIsHlsSupported] = useState<boolean>(true);
  const retryCountRef = useRef<number>(0);

  const cleanUpHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initStream = useCallback(() => {
    const video = videoRef.current;
    if (!video || !source || source.type !== 'hls') {
      cleanUpHls();
      return;
    }

    cleanUpHls();
    retryCountRef.current = 0;

    if (Hls.isSupported()) {
      setIsHlsSupported(true);
      const hls = new Hls({
        enableWorker: true,
        // Disable lowLatencyMode so the engine can build a deep forward buffer on slow connections
        lowLatencyMode: false,
        backBufferLength: 90,
        // Deep forward buffer (up to 300-600 seconds / 5-10 minutes) so paused videos cache ahead
        maxBufferLength: 300,
        maxMaxBufferLength: 600,
        maxBufferSize: 250 * 1000 * 1000, // 250MB memory buffer limit

        // Conservative ABR to avoid overshooting bandwidth and buffer starvation
        abrEwmaDefaultEstimate: 800000, // 800 kbps conservative start
        abrBandWidthFactor: 0.8, // Reserve 20% bandwidth headroom for safety
        abrBandWidthUpFactor: 0.7, // Require 30% headroom before upgrading quality

        // Automatic stall recovery and buffer hole jumping
        maxBufferHole: 0.5, // Automatically jump micro-holes up to 500ms
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,

        // High-resilience retries on packet loss
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,
      });

      hlsRef.current = hls;

      hls.loadSource(source.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const parsedQualities: QualityLevel[] = data.levels.map((level, index) => {
          const resLabel = formatResolution(level.width, level.height);
          const bitrateLabel = formatBitrate(level.bitrate);
          return {
            id: index,
            height: level.height,
            width: level.width,
            bitrate: level.bitrate,
            label: bitrateLabel ? `${resLabel} (${bitrateLabel})` : resLabel,
          };
        });

        setQualities(parsedQualities);
        setCurrentQuality(-1); // Auto by default
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        const liveDetected = data.details.live;
        setIsLive(liveDetected);
        onIsLiveChange?.(liveDetected);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls.autoLevelEnabled) {
          setCurrentQuality(-1);
        } else {
          setCurrentQuality(data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[HLS Fatal Error]', data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCountRef.current < 3) {
                retryCountRef.current += 1;
                console.warn(`[HLS] Network error, recovering retry #${retryCountRef.current}...`);
                hls.startLoad();
              } else {
                onError?.('Network error encountered loading stream manifest. Check URL and CORS permissions.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCountRef.current < 3) {
                retryCountRef.current += 1;
                console.warn(`[HLS] Media decode error, recovering retry #${retryCountRef.current}...`);
                hls.recoverMediaError();
              } else {
                onError?.('Fatal media decoding error encountered.');
              }
              break;
            default:
              onError?.(`Fatal playback error: ${data.details}`);
              cleanUpHls();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari
      setIsHlsSupported(true);
      video.src = source.url;
    } else {
      setIsHlsSupported(false);
      onError?.('HLS streaming is not supported in this environment.');
    }
  }, [source, videoRef, onIsLiveChange, onError, cleanUpHls]);

  useEffect(() => {
    initStream();
    return () => {
      cleanUpHls();
    };
  }, [initStream, cleanUpHls]);

  const setQuality = useCallback((qualityIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (qualityIndex === -1) {
      hls.currentLevel = -1; // Enable ABR
      setCurrentQuality(-1);
    } else if (qualityIndex >= 0 && qualityIndex < qualities.length) {
      hls.currentLevel = qualityIndex;
      setCurrentQuality(qualityIndex);
    }
  }, [qualities.length]);

  const retryStream = useCallback(() => {
    initStream();
  }, [initStream]);

  return {
    isHlsSupported,
    qualities,
    currentQuality,
    setQuality,
    isLive,
    retryStream,
  };
}
