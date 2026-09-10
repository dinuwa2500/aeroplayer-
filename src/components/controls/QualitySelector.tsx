import React, { useState, useRef, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';
import { QualityLevel } from '../../types/player';

interface QualitySelectorProps {
  qualities: QualityLevel[];
  currentQuality: number;
  onSelectQuality: (qualityIndex: number) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualities,
  currentQuality,
  onSelectQuality,
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

  if (qualities.length === 0) {
    return null;
  }

  const currentLabel =
    currentQuality === -1
      ? 'Auto'
      : qualities[currentQuality]?.label || 'Quality';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 rounded px-2 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
        title="Streaming Quality"
      >
        <Settings className="h-4 w-4" />
        <span className="max-w-[80px] truncate">{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 z-50 min-w-[180px] rounded-lg border border-zinc-700/80 bg-zinc-900/95 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="border-b border-zinc-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Quality (ABR)
          </div>

          {/* Auto Option */}
          <button
            onClick={() => {
              onSelectQuality(-1);
              setIsOpen(false);
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-blue-600/20 hover:text-blue-300"
          >
            <div className="flex flex-col">
              <span className="font-medium text-zinc-200">Auto (Adaptive)</span>
              <span className="text-[10px] text-zinc-500">Dynamic bandwidth switching</span>
            </div>
            {currentQuality === -1 && <Check className="h-3.5 w-3.5 text-blue-400" />}
          </button>

          {/* Manual Levels */}
          <div className="my-1 border-t border-zinc-800" />
          {qualities.map((q) => {
            const isSelected = currentQuality === q.id;
            return (
              <button
                key={q.id}
                onClick={() => {
                  onSelectQuality(q.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition hover:bg-blue-600/20 hover:text-blue-300"
              >
                <span className={`font-medium ${isSelected ? 'text-blue-400' : 'text-zinc-200'}`}>
                  {q.label}
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
