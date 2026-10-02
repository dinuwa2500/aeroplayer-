import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Check,
  Compass,
} from 'lucide-react';
import { VideoRotation } from '../../types/player';

interface RotateMenuProps {
  rotation: VideoRotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  onSelectRotation: (angle: VideoRotation) => void;
  onToggleFlipHorizontal: () => void;
  onToggleFlipVertical: () => void;
  onResetTransform: () => void;
}

const ROTATION_OPTIONS: { angle: VideoRotation; label: string; desc: string }[] = [
  { angle: 0, label: '0°', desc: 'Standard' },
  { angle: 90, label: '90°', desc: 'Clockwise' },
  { angle: 180, label: '180°', desc: 'Inverted' },
  { angle: 270, label: '270°', desc: 'Counter-CW' },
];

export const RotateMenu: React.FC<RotateMenuProps> = ({
  rotation,
  flipHorizontal,
  flipVertical,
  onRotateClockwise,
  onRotateCounterClockwise,
  onSelectRotation,
  onToggleFlipHorizontal,
  onToggleFlipVertical,
  onResetTransform,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isTransformed = rotation !== 0 || flipHorizontal || flipVertical;

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
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center space-x-1 rounded p-1.5 transition hover:bg-white/10 ${
          isTransformed
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/20'
            : 'text-zinc-300 hover:text-white'
        }`}
        title={`Rotate Video (R)${rotation !== 0 ? ` - Currently ${rotation}°` : ''}`}
        aria-label="Rotate Video"
      >
        <RotateCw
          className={`h-4 w-4 transition-transform duration-300 ${
            rotation === 90
              ? 'rotate-90'
              : rotation === 180
              ? 'rotate-180'
              : rotation === 270
              ? '-rotate-90'
              : ''
          }`}
        />
        {rotation !== 0 && (
          <span className="font-mono text-[10px] font-bold leading-none tracking-tight text-blue-400">
            {rotation}°
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-11 right-0 z-50 w-72 rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-xl animate-fade-in text-zinc-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200">
              <Compass className="h-3.5 w-3.5 text-blue-400" />
              <span>Video Orientation</span>
            </div>
            {isTransformed && (
              <button
                onClick={() => {
                  onResetTransform();
                }}
                className="flex items-center space-x-1 rounded px-2 py-0.5 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                title="Reset to 0° normal orientation"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Quick 90° Stepper Buttons */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              onClick={onRotateCounterClockwise}
              className="flex items-center justify-center space-x-1.5 rounded-lg border border-zinc-800 bg-zinc-950/70 py-2 px-2.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white active:scale-95"
              title="Rotate Left 90° (Shift + R)"
            >
              <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
              <span>-90° Left</span>
              <kbd className="ml-1 rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-400">
                ⇧R
              </kbd>
            </button>

            <button
              onClick={onRotateClockwise}
              className="flex items-center justify-center space-x-1.5 rounded-lg border border-zinc-800 bg-zinc-950/70 py-2 px-2.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white active:scale-95"
              title="Rotate Right 90° (R)"
            >
              <RotateCw className="h-3.5 w-3.5 text-blue-400" />
              <span>+90° Right</span>
              <kbd className="ml-1 rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-400">
                R
              </kbd>
            </button>
          </div>

          {/* Preset Angles */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 px-0.5">
              Preset Orientation
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ROTATION_OPTIONS.map((opt) => {
                const isSelected = rotation === opt.angle;
                return (
                  <button
                    key={opt.angle}
                    onClick={() => {
                      onSelectRotation(opt.angle);
                    }}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30'
                        : 'bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800/60'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="leading-tight">{opt.label}</span>
                      <span
                        className={`text-[9px] ${
                          isSelected ? 'text-blue-100' : 'text-zinc-500'
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mirror / Invert Section */}
          <div className="border-t border-zinc-800/80 pt-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 px-0.5">
              Mirror & Flip
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Horizontal Flip */}
              <button
                onClick={onToggleFlipHorizontal}
                className={`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 px-2 text-xs font-medium transition border ${
                  flipHorizontal
                    ? 'border-blue-500/60 bg-blue-600/20 text-blue-300'
                    : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title="Mirror horizontally"
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
                <span>Flip Horiz</span>
              </button>

              {/* Vertical Flip */}
              <button
                onClick={onToggleFlipVertical}
                className={`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 px-2 text-xs font-medium transition border ${
                  flipVertical
                    ? 'border-blue-500/60 bg-blue-600/20 text-blue-300'
                    : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title="Flip vertically"
              >
                <FlipVertical className="h-3.5 w-3.5" />
                <span>Flip Vert</span>
              </button>
            </div>
          </div>

          {/* Keyboard Hint Footer */}
          <div className="mt-2.5 border-t border-zinc-800/80 pt-2 text-[10px] text-zinc-500 leading-normal">
            Hotkeys: Press <kbd className="rounded bg-zinc-800 px-1 text-zinc-300">R</kbd> to rotate clockwise, <kbd className="rounded bg-zinc-800 px-1 text-zinc-300">⇧ + R</kbd> counter-clockwise.
          </div>
        </div>
      )}
    </div>
  );
};
