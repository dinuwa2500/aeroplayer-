import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  PictureInPicture2,
} from 'lucide-react';
import { Seekbar } from '../seekbar/Seekbar';
import { TimeBadge } from '../seekbar/TimeBadge';
import { VolumeSlider } from './VolumeSlider';
import { QualitySelector } from './QualitySelector';
import { PlaybackSpeedMenu } from './PlaybackSpeedMenu';
import { SubtitleMenu } from '../subtitles/SubtitleMenu';
import {
  BufferedRange,
  QualityLevel,
  HoverThumbnailState,
  SubtitleTrack,
} from '../../types/player';

interface ControlsOverlayProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  bufferedRanges: BufferedRange[];
  bufferedAhead?: number;
  currentQuality: number;
  qualities: QualityLevel[];
  isLive: boolean;
  thumbnailState: HoverThumbnailState;
  subtitleTrack: SubtitleTrack | null;
  isSubtitlesEnabled: boolean;
  syncOffset: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSeekBy: (delta: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onSelectQuality: (q: number) => void;
  onSelectSpeed: (speed: number) => void;
  onTogglePiP: () => void;
  onToggleFullscreen: () => void;
  onHoverProgress: (clientX: number, containerRect: DOMRect, duration: number) => void;
  onHoverLeave: () => void;
  onToggleSubtitles: () => void;
  onLoadSubtitleFile: (file: File) => void;
  onAdjustSyncOffset: (delta: number) => void;
  onResetSyncOffset: () => void;
  onClearSubtitles: () => void;
  previewCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  isVisible,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  isFullscreen,
  isPictureInPicture,
  bufferedRanges,
  bufferedAhead = 0,
  currentQuality,
  qualities,
  isLive,
  thumbnailState,
  subtitleTrack,
  isSubtitlesEnabled,
  syncOffset,
  onTogglePlay,
  onSeek,
  onSeekBy,
  onVolumeChange,
  onToggleMute,
  onSelectQuality,
  onSelectSpeed,
  onTogglePiP,
  onToggleFullscreen,
  onHoverProgress,
  onHoverLeave,
  onToggleSubtitles,
  onLoadSubtitleFile,
  onAdjustSyncOffset,
  onResetSyncOffset,
  onClearSubtitles,
  previewCanvasRef,
}) => {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-40 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-3 pt-12 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 1. Seekbar */}
      <div className="w-full mb-1">
        <Seekbar
          currentTime={currentTime}
          duration={duration}
          bufferedRanges={bufferedRanges}
          isLive={isLive}
          onSeek={onSeek}
          onHoverProgress={onHoverProgress}
          onHoverLeave={onHoverLeave}
          thumbnailState={thumbnailState}
          previewCanvasRef={previewCanvasRef}
        />
      </div>

      {/* 2. Control Row */}
      <div className="flex items-center justify-between">
        {/* Left Side: Playback & Volume */}
        <div className="flex items-center space-x-2">
          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:scale-105 hover:bg-white/20 active:scale-95"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-white" />
            ) : (
              <Play className="h-4 w-4 fill-white translate-x-0.5" />
            )}
          </button>

          {/* Replay 10s */}
          <button
            onClick={() => onSeekBy(-10)}
            className="rounded p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            title="Rewind 10s (Left Arrow)"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => onSeekBy(10)}
            className="rounded p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            title="Forward 10s (Right Arrow)"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Volume with expand slider */}
          <VolumeSlider
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          {/* Time Display */}
          <div className="ml-2">
            <TimeBadge
              currentTime={currentTime}
              duration={duration}
              isLive={isLive}
              bufferedAhead={bufferedAhead}
              isPaused={!isPlaying}
            />
          </div>
        </div>

        {/* Right Side: Quality, Speed, PiP, Fullscreen */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* ABR Quality Selector */}
          <QualitySelector
            qualities={qualities}
            currentQuality={currentQuality}
            onSelectQuality={onSelectQuality}
          />

          {/* Playback Speed Menu */}
          <PlaybackSpeedMenu
            playbackRate={playbackRate}
            onSelectSpeed={onSelectSpeed}
          />

          {/* Subtitles & Voice Sync Menu */}
          <SubtitleMenu
            subtitleTrack={subtitleTrack}
            isSubtitlesEnabled={isSubtitlesEnabled}
            syncOffset={syncOffset}
            onToggleSubtitles={onToggleSubtitles}
            onLoadSubtitleFile={onLoadSubtitleFile}
            onAdjustSyncOffset={onAdjustSyncOffset}
            onResetSyncOffset={onResetSyncOffset}
            onClearSubtitles={onClearSubtitles}
          />

          {/* Picture-in-Picture */}
          <button
            onClick={onTogglePiP}
            className={`rounded p-1.5 transition hover:bg-white/10 ${
              isPictureInPicture ? 'text-blue-400 bg-white/10' : 'text-zinc-300 hover:text-white'
            }`}
            title={isPictureInPicture ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
            aria-label="Toggle Picture-in-Picture"
          >
            <PictureInPicture2 className="h-4 w-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="rounded p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
