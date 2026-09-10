import React from 'react';

interface SubtitleOverlayProps {
  text: string | null;
  controlsVisible: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  text,
  controlsVisible,
}) => {
  if (!text) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center px-6 transition-all duration-300 ${
        controlsVisible ? 'bottom-20 sm:bottom-24' : 'bottom-8'
      }`}
    >
      <div className="max-w-3xl rounded-lg bg-black/75 px-4 py-1.5 text-center backdrop-blur-[2px] shadow-2xl">
        <p className="whitespace-pre-line text-sm sm:text-base md:text-lg font-medium text-white tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {text}
        </p>
      </div>
    </div>
  );
};
