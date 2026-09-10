import React, { useState, useRef, useEffect } from 'react';
import { Gauge, Check } from 'lucide-react';

interface PlaybackSpeedMenuProps {
  playbackRate: number;
  onSelectSpeed: (speed: number) => void;
}

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const PlaybackSpeedMenu: React.FC<PlaybackSpeedMenuProps> = ({
  playbackRate,
  onSelectSpeed,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 rounded px-2 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
        title="Playback Speed"
      >
        <Gauge className="h-4 w-4" />
        <span>{playbackRate === 1 ? '1x' : `${playbackRate}x`}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 z-50 min-w-[130px] rounded-lg border border-zinc-700/80 bg-zinc-900/95 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="border-b border-zinc-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Speed
          </div>

          {SPEEDS.map((speed) => {
            const isSelected = playbackRate === speed;
            return (
              <button
                key={speed}
                onClick={() => {
                  onSelectSpeed(speed);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition hover:bg-blue-600/20 hover:text-blue-300"
              >
                <span className={`font-medium ${isSelected ? 'text-blue-400' : 'text-zinc-200'}`}>
                  {speed === 1 ? 'Normal (1.0x)' : `${speed}x`}
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
