import React, { useState, useRef, useEffect } from 'react';
import {
  Subtitles,
  Upload,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  Clock,
} from 'lucide-react';
import { SubtitleTrack } from '../../types/player';

interface SubtitleMenuProps {
  subtitleTrack: SubtitleTrack | null;
  isSubtitlesEnabled: boolean;
  syncOffset: number;
  onToggleSubtitles: () => void;
  onLoadSubtitleFile: (file: File) => void;
  onAdjustSyncOffset: (delta: number) => void;
  onResetSyncOffset: () => void;
  onClearSubtitles: () => void;
}

export const SubtitleMenu: React.FC<SubtitleMenuProps> = ({
  subtitleTrack,
  isSubtitlesEnabled,
  syncOffset,
  onToggleSubtitles,
  onLoadSubtitleFile,
  onAdjustSyncOffset,
  onResetSyncOffset,
  onClearSubtitles,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadSubtitleFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const formattedOffset =
    syncOffset === 0
      ? '0.00s (Synced)'
      : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(2)}s`;

  const syncStatus =
    syncOffset === 0
      ? 'Default timing'
      : syncOffset > 0
      ? 'Delayed (sub appears later)'
      : 'Advanced (sub appears earlier)';

  return (
    <div ref={menuRef} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt,text/vtt,application/x-subrip"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1.5 rounded p-1.5 transition hover:bg-white/10 ${
          subtitleTrack && isSubtitlesEnabled
            ? 'text-blue-400 bg-white/10'
            : 'text-zinc-300 hover:text-white'
        }`}
        title="Subtitles & Voice Sync"
        aria-label="Subtitles"
      >
        <Subtitles className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-11 right-0 z-50 w-72 rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-xl animate-fade-in text-zinc-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200">
              <Subtitles className="h-3.5 w-3.5 text-blue-400" />
              <span>Subtitles & Voice Sync</span>
            </div>
            {subtitleTrack && (
              <button
                onClick={onToggleSubtitles}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                  isSubtitlesEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {isSubtitlesEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            )}
          </div>

          {/* Subtitle File Section */}
          <div className="space-y-2">
            {subtitleTrack ? (
              <div className="flex items-center justify-between rounded-lg bg-zinc-950/80 p-2 border border-zinc-800">
                <div className="flex flex-col max-w-[190px]">
                  <span className="truncate text-xs font-medium text-zinc-200" title={subtitleTrack.name}>
                    {subtitleTrack.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {subtitleTrack.cues.length} cues loaded
                  </span>
                </div>
                <button
                  onClick={onClearSubtitles}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition"
                  title="Remove subtitle"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-blue-500 hover:bg-blue-600/10 hover:text-blue-400"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Subtitle (.srt, .vtt)</span>
              </button>
            )}

            {subtitleTrack && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-center text-[11px] text-zinc-400 hover:text-zinc-200 transition underline decoration-dotted"
              >
                Choose another file...
              </button>
            )}
          </div>

          {/* Voice Sync Calibration */}
          {subtitleTrack && (
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1 text-[11px] font-semibold text-zinc-300">
                  <Clock className="h-3 w-3 text-amber-400" />
                  <span>Voice Synchronization</span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {formattedOffset}
                </span>
              </div>

              <p className="text-[10px] text-zinc-500 mb-2 leading-tight">
                {syncStatus}
              </p>

              {/* Stepper Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => onAdjustSyncOffset(-0.5)}
                  className="rounded bg-zinc-800 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  title="Advance 500ms"
                >
                  -0.5s
                </button>
                <button
                  onClick={() => onAdjustSyncOffset(-0.1)}
                  className="flex items-center justify-center space-x-0.5 rounded bg-zinc-800 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  title="Advance 100ms"
                >
                  <Minus className="h-3 w-3" />
                  <span>0.1s</span>
                </button>
                <button
                  onClick={() => onAdjustSyncOffset(0.1)}
                  className="flex items-center justify-center space-x-0.5 rounded bg-zinc-800 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  title="Delay 100ms"
                >
                  <Plus className="h-3 w-3" />
                  <span>0.1s</span>
                </button>
                <button
                  onClick={() => onAdjustSyncOffset(0.5)}
                  className="rounded bg-zinc-800 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  title="Delay 500ms"
                >
                  +0.5s
                </button>
              </div>

              {/* Reset button */}
              {syncOffset !== 0 && (
                <button
                  onClick={onResetSyncOffset}
                  className="mt-2 flex w-full items-center justify-center space-x-1 rounded bg-zinc-800/80 py-1 text-[10px] font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Reset to 0.00s</span>
                </button>
              )}

              {/* Sync Guidance */}
              <div className="mt-2.5 rounded bg-zinc-950/60 p-2 text-[10px] text-zinc-400 space-y-1">
                <div className="flex items-start space-x-1">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Early sub (before voice):</strong> Click <strong>+ Delay</strong></span>
                </div>
                <div className="flex items-start space-x-1">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Late sub (after voice):</strong> Click <strong>- Advance</strong></span>
                </div>
                <div className="mt-1 pt-1 border-t border-zinc-800/80 text-zinc-500">
                  Hotkeys: Press <kbd className="rounded bg-zinc-800 px-1 text-zinc-300">[</kbd> or <kbd className="rounded bg-zinc-800 px-1 text-zinc-300">]</kbd> to calibrate sync anytime.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
