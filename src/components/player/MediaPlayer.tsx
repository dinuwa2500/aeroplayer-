import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StreamSource } from '../../types/player';
import { useMediaPlayer } from '../../hooks/useMediaPlayer';
import { useHlsStream } from '../../hooks/useHlsStream';
import { useThumbnailSeeker } from '../../hooks/useThumbnailSeeker';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSubtitles } from '../../hooks/useSubtitles';
import { ControlsOverlay } from '../controls/ControlsOverlay';
import { SubtitleOverlay } from '../subtitles/SubtitleOverlay';
import { BufferingIndicator } from './BufferingIndicator';
import { ErrorBanner } from '../common/ErrorBanner';
import { Play, Pause, Film } from 'lucide-react';

interface MediaPlayerProps {
  source: StreamSource | null;
  onOpenStreamModal: () => void;
  onOpenLocalFile: () => void;
  onFileDrop: (file: File) => void;
  onLiveChange?: (isLive: boolean) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  source,
  onOpenStreamModal,
  onOpenLocalFile,
  onFileDrop,
  onLiveChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [playStateSplash, setPlayStateSplash] = useState<'play' | 'pause' | null>(null);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // 1. Core Media Player Hook
  const {
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
    error: playerError,
    setError: setPlayerError,
    togglePlay,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFullscreen,
    togglePictureInPicture,
  } = useMediaPlayer();

  // 2. HLS Adaptive Stream Engine Hook
  const {
    qualities,
    currentQuality,
    setQuality,
    isLive: isHlsLive,
    retryStream,
  } = useHlsStream({
    source,
    videoRef,
    onIsLiveChange: (live: boolean) => setIsLiveStream(live),
    onError: (err: string) => setPlayerError(err),
  });

  const effectiveIsLive = isLiveStream || isHlsLive;

  useEffect(() => {
    onLiveChange?.(effectiveIsLive);
  }, [effectiveIsLive, onLiveChange]);

  // 3. Auxiliary Hover Thumbnail Preview Pipeline Hook
  const {
    thumbnailState,
    handleSeekbarHover,
    handleSeekbarLeave,
    previewCanvasRef,
  } = useThumbnailSeeker({
    source,
    duration,
    isLive: effectiveIsLive,
    isBuffering,
    mainVideoRef: videoRef,
  });

  // 4. Subtitles & Voice Sync Hook
  const {
    subtitleTrack,
    isSubtitlesEnabled,
    syncOffset,
    loadSubtitleFromFile,
    toggleSubtitles,
    adjustSyncOffset,
    setSyncOffset,
    clearSubtitles,
    getActiveSubtitleText,
  } = useSubtitles();

  // 5. Desktop Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    togglePlay,
    toggleFullscreen: () => toggleFullscreen(containerRef.current),
    toggleMute,
    seekBy,
    volume,
    setVolume,
    onAdjustSubSync: adjustSyncOffset,
  });

  // Synchronize Direct Stream / Local File Source (VLC-style Pre-Roll Caching)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;

    if (source.type !== 'hls') {
      video.src = source.url;
      video.preload = 'auto';
      video.load();

      // Local files play immediately without network pre-buffering
      if (source.type === 'local') {
        video.play().catch(() => {});
        return;
      }

      // Network Streams (VLC :network-caching=1000 equivalent):
      // Wait for forward buffer cushion (>= 1.0s) or canplaythrough before initiating playback
      let started = false;
      const tryStartPlayback = () => {
        if (started) return;
        const b = video.buffered;
        let forward = 0;
        for (let i = 0; i < b.length; i++) {
          if (b.start(i) <= 0.1 && b.end(i) > 0) {
            forward = b.end(i);
            break;
          }
        }

        if (forward >= 1.0 || video.readyState >= 3) {
          started = true;
          cleanup();
          video.play().catch(() => {});
        }
      };

      const cleanup = () => {
        video.removeEventListener('canplaythrough', tryStartPlayback);
        video.removeEventListener('canplay', tryStartPlayback);
        video.removeEventListener('progress', tryStartPlayback);
      };

      video.addEventListener('canplaythrough', tryStartPlayback);
      video.addEventListener('canplay', tryStartPlayback);
      video.addEventListener('progress', tryStartPlayback);

      // Fallback timer: start playback after 2.5s maximum if progress event wasn't fired
      const fallbackTimer = setTimeout(tryStartPlayback, 2500);

      return () => {
        started = true;
        clearTimeout(fallbackTimer);
        cleanup();
      };
    }
  }, [source, videoRef]);

  // Handle Controls Auto-Hide
  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current !== null) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setControlsVisible(false);
    }
  };

  // Video Surface Click Gestures
  const handleSurfaceClick = (e: React.MouseEvent) => {
    // Avoid triggering when clicking overlay controls
    if ((e.target as HTMLElement).closest('.group\\/volume') || (e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    togglePlay();
    setPlayStateSplash(isPlaying ? 'pause' : 'play');
    window.setTimeout(() => setPlayStateSplash(null), 500);
  };

  const handleSurfaceDoubleClick = () => {
    toggleFullscreen(containerRef.current);
  };

  // Drag and Drop media file handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(srt|vtt)$/i)) {
        loadSubtitleFromFile(file);
        return;
      }
      if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mkv|webm|m3u8|mov)$/i)) {
        onFileDrop(file);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-black select-none"
    >
      {/* 1. HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        className="h-full w-full object-contain cursor-pointer"
        onClick={handleSurfaceClick}
        onDoubleClick={handleSurfaceDoubleClick}
      />

      {/* 2. Drag & Drop Overlay Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-900/60 backdrop-blur-sm border-2 border-dashed border-blue-400">
          <Film className="h-12 w-12 text-white animate-bounce" />
          <p className="mt-2 text-sm font-semibold text-white">Drop video file to play</p>
        </div>
      )}

      {/* 3. Empty State (No source loaded) */}
      {!source && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-blue-400 mb-4 shadow-xl">
            <Film className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">No Media Loaded</h2>
          <p className="mt-1 max-w-sm text-xs text-zinc-400">
            Open a network stream (HLS, DASH, direct URL) or drag and drop a local media file here.
          </p>
          <div className="mt-5 flex items-center space-x-3">
            <button
              onClick={onOpenStreamModal}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              Open Network Stream
            </button>
            <button
              onClick={onOpenLocalFile}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 border border-zinc-700 transition hover:bg-zinc-700 hover:text-white"
            >
              Choose Local File
            </button>
          </div>
        </div>
      )}

      {/* 4. Play / Pause Splash Animation */}
      {playStateSplash && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white shadow-2xl transition-transform scale-110">
            {playStateSplash === 'play' ? (
              <Play className="h-8 w-8 fill-white translate-x-0.5" />
            ) : (
              <Pause className="h-8 w-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* 5. Buffering Indicator */}
      <BufferingIndicator isBuffering={isBuffering} />

      {/* 6. Error Banner */}
      {playerError && (
        <ErrorBanner
          message={playerError}
          onRetry={retryStream}
          onDismiss={() => setPlayerError(null)}
        />
      )}

      {/* 7. Subtitle Overlay */}
      <SubtitleOverlay
        text={getActiveSubtitleText(currentTime)}
        controlsVisible={controlsVisible || !isPlaying}
      />

      {/* 8. Controls Overlay (Auto-Hiding) */}
      {source && (
        <ControlsOverlay
          isVisible={controlsVisible || !isPlaying}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          playbackRate={playbackRate}
          isFullscreen={isFullscreen}
          isPictureInPicture={isPictureInPicture}
          bufferedRanges={bufferedRanges}
          bufferedAhead={bufferedAhead}
          currentQuality={currentQuality}
          qualities={qualities}
          isLive={effectiveIsLive}
          thumbnailState={thumbnailState}
          subtitleTrack={subtitleTrack}
          isSubtitlesEnabled={isSubtitlesEnabled}
          syncOffset={syncOffset}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSeekBy={seekBy}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          onSelectQuality={setQuality}
          onSelectSpeed={setPlaybackRate}
          onTogglePiP={togglePictureInPicture}
          onToggleFullscreen={() => toggleFullscreen(containerRef.current)}
          onHoverProgress={(clientX, containerRect, dur) =>
            handleSeekbarHover(clientX, containerRect, dur)
          }
          onHoverLeave={handleSeekbarLeave}
          onToggleSubtitles={toggleSubtitles}
          onLoadSubtitleFile={loadSubtitleFromFile}
          onAdjustSyncOffset={adjustSyncOffset}
          onResetSyncOffset={() => setSyncOffset(0)}
          onClearSubtitles={clearSubtitles}
          previewCanvasRef={previewCanvasRef}
        />
      )}
    </div>
  );
};
