import { useState, useEffect, useRef, useCallback } from 'react';
import { BufferedRange } from '../types/player';
import { clamp } from '../utils/clamp';

interface UseMediaPlayerProps {
  initialVolume?: number;
}

export function useMediaPlayer({ initialVolume = 0.8 }: UseMediaPlayerProps = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(initialVolume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState<boolean>(false);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [bufferedAhead, setBufferedAhead] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Update buffered ranges helper
  const updateBufferedRanges = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const ranges: BufferedRange[] = [];
    const buffered = video.buffered;
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i),
      });
    }
    setBufferedRanges(ranges);

    const ct = video.currentTime;
    let forward = 0;
    for (let i = 0; i < ranges.length; i++) {
      if (ranges[i].start <= ct + 0.5 && ranges[i].end >= ct) {
        forward = Math.max(0, ranges[i].end - ct);
        break;
      }
    }
    setBufferedAhead(forward);
  }, []);

  // Event handlers on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const checkBufferHealth = () => {
      const ct = video.currentTime;
      const b = video.buffered;
      let forwardBuffer = 0;
      for (let i = 0; i < b.length; i++) {
        if (b.start(i) <= ct + 0.2 && b.end(i) >= ct) {
          forwardBuffer = Math.max(0, b.end(i) - ct);
          break;
        }
      }

      if (video.readyState >= 3 || forwardBuffer >= 0.5) {
        setIsBuffering(false);
      }
    };

    const handleWaiting = () => {
      // Show buffering indicator; keep pipeline active so browser aggressively downloads HTTP range
      setIsBuffering(true);
    };

    const handleSeeking = () => {
      setIsBuffering(true);
    };

    const handleSeeked = () => {
      updateBufferedRanges();
      if (video.readyState >= 3) {
        setIsBuffering(false);
      }
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };

    const handleCanPlay = () => {
      checkBufferHealth();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      updateBufferedRanges();
      checkBufferHealth();
    };

    const handleDurationChange = () => {
      const d = video.duration;
      setDuration(isNaN(d) ? 0 : d);
      updateBufferedRanges();
    };

    const handleProgress = () => {
      updateBufferedRanges();
      checkBufferHealth();
    };

    const handleVolumeChange = () => {
      setVolumeState(video.volume);
      setIsMuted(video.muted);
    };

    const handleRateChange = () => {
      setPlaybackRateState(video.playbackRate);
    };

    const handleVideoError = () => {
      if (video.error) {
        const errorMessages: Record<number, string> = {
          1: 'Playback aborted by user or system.',
          2: 'Network error encountered during media download.',
          3: 'Media decoding error: File or stream format may be corrupted or unsupported.',
          4: 'Media source not supported or stream offline.',
        };
        const message = errorMessages[video.error.code] || `Media playback error (${video.error.message || 'unknown'}).`;
        setError(message);
        setIsBuffering(false);
        setIsPlaying(false);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('error', handleVideoError);
    };
  }, [updateBufferedRanges]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // PiP change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPictureInPicture(true);
    const handleLeavePiP = () => setIsPictureInPicture(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // Controller methods
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      setError(null);
      await video.play();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Autoplay/playback was prevented:', err);
      }
    }
  }, []);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clampedTime = clamp(targetTime, 0, video.duration || Infinity);
    const wasPlaying = !video.paused;

    setIsBuffering(true);
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);

    if (wasPlaying) {
      video.play().catch(() => {});
    }
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = video.currentTime + deltaSeconds;
    seek(target);
  }, [seek]);

  const setVolume = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = clamp(newVolume, 0, 1);
    video.volume = clamped;
    setVolumeState(clamped);
    if (clamped > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRateState(rate);
  }, []);

  const toggleFullscreen = useCallback(async (containerElement?: HTMLElement | null) => {
    const target = containerElement || document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await target.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && video.readyState >= 1) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Failed to toggle Picture-in-Picture:', err);
    }
  }, []);

  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isBuffering,
    playbackRate,
    isFullscreen,
    isPictureInPicture,
    bufferedRanges,
    bufferedAhead,
    error,
    setError,
    play,
    pause,
    togglePlay,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFullscreen,
    togglePictureInPicture,
  };
}
