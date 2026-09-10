import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (newVol: number) => void;
  onToggleMute: () => void;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const effectiveVolume = isMuted ? 0 : volume;

  const renderIcon = () => {
    if (effectiveVolume === 0) {
      return <VolumeX className="h-5 w-5 text-red-400" />;
    }
    if (effectiveVolume < 0.5) {
      return <Volume1 className="h-5 w-5 text-zinc-200" />;
    }
    return <Volume2 className="h-5 w-5 text-zinc-200" />;
  };

  return (
    <div className="group/volume relative flex items-center space-x-2">
      <button
        onClick={onToggleMute}
        className="rounded p-1 text-zinc-300 transition hover:bg-white/10 hover:text-white"
        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        aria-label="Volume Mute Toggle"
      >
        {renderIcon()}
      </button>

      {/* Slider container with smooth expansion */}
      <div className="flex w-0 items-center overflow-hidden transition-all duration-200 ease-out group-hover/volume:w-24 group-focus-within/volume:w-24">
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={effectiveVolume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="range-slider h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-white/25 accent-blue-500 transition hover:bg-white/40 focus:outline-none"
          title={`Volume: ${Math.round(effectiveVolume * 100)}%`}
        />
      </div>
    </div>
  );
};
