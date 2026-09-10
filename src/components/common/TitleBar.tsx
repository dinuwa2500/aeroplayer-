import React from 'react';
import { Play, Globe, FolderOpen, Minus, Square, X, Radio } from 'lucide-react';
import { StreamSource } from '../../types/player';

interface TitleBarProps {
  currentSource: StreamSource | null;
  isLive: boolean;
  onOpenStreamModal: () => void;
  onOpenLocalFile: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentSource,
  isLive,
  onOpenStreamModal,
  onOpenLocalFile,
}) => {
  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    // Check if running inside Electron or Tauri
    if (typeof window !== 'undefined' && 'electron' in window) {
      const electronApi = (window as unknown as { electron?: { sendWindowAction?: (act: string) => void } }).electron;
      electronApi?.sendWindowAction?.(action);
    }
  };

  return (
    <header className="app-drag-region relative z-50 flex h-10 w-full items-center justify-between border-b border-player-border/60 bg-player-dark/95 px-3 backdrop-blur-md">
      {/* Left: App Logo & Current Media Badge */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 shadow-sm shadow-blue-500/30">
            <Play className="h-3.5 w-3.5 fill-white text-white" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-zinc-100">
            Aero<span className="text-blue-400">Player</span>
          </span>
        </div>

        {currentSource && (
          <div className="flex items-center space-x-2 border-l border-zinc-700/60 pl-3">
            <span
              className="max-w-[220px] truncate text-xs text-zinc-300 font-medium"
              title={currentSource.title || currentSource.url}
            >
              {currentSource.title || 'Untitled Stream'}
            </span>

            {/* Stream Format Badge */}
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              {currentSource.type}
            </span>

            {isLive && (
              <span className="flex items-center space-x-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-red-400">
                <Radio className="h-3 w-3 animate-pulse" />
                <span>LIVE</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Fast Action Controls */}
      <div className="app-no-drag flex items-center space-x-2">
        <button
          onClick={onOpenStreamModal}
          className="flex items-center space-x-1.5 rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Open Network Stream (HLS, DASH, Direct URL)"
        >
          <Globe className="h-3.5 w-3.5 text-blue-400" />
          <span>Open Stream</span>
        </button>

        <button
          onClick={onOpenLocalFile}
          className="flex items-center space-x-1.5 rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Open Local Media File (MP4, MKV, WebM)"
        >
          <FolderOpen className="h-3.5 w-3.5 text-emerald-400" />
          <span>Open File</span>
        </button>
      </div>

      {/* Right: Window Controls (Desktop-ready) */}
      <div className="app-no-drag flex items-center">
        <button
          onClick={() => handleWindowControl('minimize')}
          className="flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleWindowControl('maximize')}
          className="flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Maximize"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleWindowControl('close')}
          className="flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:bg-red-600 hover:text-white"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
