import React, { useState } from 'react';
import { formatTime } from '../../utils/formatters';

interface TimeBadgeProps {
  currentTime: number;
  duration: number;
  isLive: boolean;
  bufferedAhead?: number;
  isPaused?: boolean;
}

export const TimeBadge: React.FC<TimeBadgeProps> = ({
  currentTime,
  duration,
  isLive,
  bufferedAhead = 0,
  isPaused = false,
}) => {
  const [showRemaining, setShowRemaining] = useState<boolean>(false);

  if (isLive) {
    return (
      <div className="flex items-center space-x-1.5 font-mono text-xs text-zinc-300">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-semibold text-red-400">LIVE</span>
      </div>
    );
  }

  const remaining = Math.max(0, duration - currentTime);
  const formattedCurrent = formatTime(currentTime);
  const formattedDuration = formatTime(duration);
  const formattedRemaining = `-${formatTime(remaining)}`;

  return (
    <div className="flex items-center space-x-1.5">
      <button
        onClick={() => setShowRemaining(!showRemaining)}
        className="flex items-center space-x-1 font-mono text-xs text-zinc-300 hover:text-white transition cursor-pointer select-none"
        title="Click to toggle remaining time"
      >
        <span>{formattedCurrent}</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-400">
          {showRemaining ? formattedRemaining : formattedDuration}
        </span>
      </button>

      {/* Live Caching Progress Badge when Paused */}
      {isPaused && bufferedAhead > 1 && (
        <span
          className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-emerald-300 animate-pulse"
          title="Video is loading into local memory cache while paused"
        >
          Cached: +{Math.round(bufferedAhead)}s
        </span>
      )}
    </div>
  );
};
