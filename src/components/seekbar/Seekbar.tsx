import React, { useRef, useState, useCallback, useEffect } from 'react';
import { BufferedRange, HoverThumbnailState } from '../../types/player';
import { ThumbnailTooltip } from './ThumbnailTooltip';
import { clamp } from '../../utils/clamp';

interface SeekbarProps {
  currentTime: number;
  duration: number;
  bufferedRanges: BufferedRange[];
  isLive: boolean;
  onSeek: (time: number) => void;
  onHoverProgress: (clientX: number, containerRect: DOMRect, duration: number) => void;
  onHoverLeave: () => void;
  thumbnailState: HoverThumbnailState;
  previewCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const Seekbar: React.FC<SeekbarProps> = ({
  currentTime,
  duration,
  bufferedRanges,
  isLive,
  onSeek,
  onHoverProgress,
  onHoverLeave,
  thumbnailState,
  previewCanvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const calculatePercentFromEvent = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      return clamp(offsetX / rect.width, 0, 1);
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLive || duration <= 0) return;
    setIsDragging(true);
    const pct = calculatePercentFromEvent(e.clientX);
    setDragPercent(pct);
    onSeek(pct * duration);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pct = calculatePercentFromEvent(e.clientX);
      setDragPercent(pct);
      onSeek(pct * duration);

      if (containerRef.current) {
        onHoverProgress(
          e.clientX,
          containerRef.current.getBoundingClientRect(),
          duration
        );
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragPercent(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculatePercentFromEvent, duration, onSeek, onHoverProgress]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || duration <= 0) return;
    onHoverProgress(
      e.clientX,
      containerRef.current.getBoundingClientRect(),
      duration
    );
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      onHoverLeave();
    }
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const activePercent = dragPercent !== null ? dragPercent * 100 : playedPercent;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex h-6 w-full cursor-pointer items-center transition-all ${
        isLive ? 'cursor-default pointer-events-none' : ''
      }`}
    >
      {/* Floating Thumbnail Tooltip */}
      {thumbnailState.isHovering && !isDragging && (
        <ThumbnailTooltip
          hoverTime={thumbnailState.hoverTime}
          hoverX={thumbnailState.hoverX}
          frameCanvasDataUrl={thumbnailState.frameCanvasDataUrl}
          hasFrame={thumbnailState.hasFrame}
          isDecoding={thumbnailState.isDecoding}
          isExact={thumbnailState.isExact}
          isLive={isLive}
          error={thumbnailState.error}
          canvasRef={previewCanvasRef}
        />
      )}

      {/* Seekbar Track (Expands height slightly on hover) */}
      <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-[height] duration-150 group-hover:h-2.5">
        {/* Render Buffered Segments */}
        {duration > 0 &&
          bufferedRanges.map((range, idx) => {
            const startPct = clamp((range.start / duration) * 100, 0, 100);
            const widthPct = clamp(((range.end - range.start) / duration) * 100, 0, 100 - startPct);

            return (
              <div
                key={idx}
                className="absolute top-0 bottom-0 rounded-full bg-white/30 transition-all"
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`,
                }}
              />
            );
          })}

        {/* Hover ghost highlight */}
        {thumbnailState.isHovering && !isLive && (
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-white/20 pointer-events-none"
            style={{ width: `${thumbnailState.hoverPercent * 100}%` }}
          />
        )}

        {/* Played Progress Bar */}
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"
          style={{ width: `${activePercent}%` }}
        />

        {/* Scrubber Thumb Knob */}
        {!isLive && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md shadow-black/50 transition-transform duration-100 group-hover:scale-125"
            style={{ left: `${activePercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
