import React from 'react';
import { Loader2 } from 'lucide-react';

interface BufferingIndicatorProps {
  isBuffering: boolean;
}

export const BufferingIndicator: React.FC<BufferingIndicatorProps> = ({ isBuffering }) => {
  if (!isBuffering) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity">
      <div className="flex flex-col items-center space-y-2 rounded-2xl bg-zinc-900/95 px-5 py-4 shadow-2xl border border-zinc-800/80">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        <span className="text-xs font-semibold tracking-wide text-zinc-200">Buffering Stream</span>
        <span className="text-[10px] text-zinc-400 font-medium">Building playback cushion for smooth playback...</span>
      </div>
    </div>
  );
};
