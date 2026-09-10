import React from 'react';
import { Loader2, Radio } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

interface ThumbnailTooltipProps {
  hoverTime: number;
  hoverX: number;
  frameCanvasDataUrl: string | null;
  hasFrame?: boolean;
  isDecoding: boolean;
  isExact?: boolean;
  isLive: boolean;
  error: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const ThumbnailTooltip: React.FC<ThumbnailTooltipProps> = ({
  hoverTime,
  hoverX,
  frameCanvasDataUrl,
  hasFrame = false,
  isDecoding,
  isExact = false,
  isLive,
  error,
  canvasRef,
}) => {
  return (
    <div
      className="pointer-events-none absolute bottom-5 -translate-x-1/2 z-40 flex flex-col items-center will-change-[left]"
      style={{ left: `${hoverX}px` }}
    >
      {/* Card container */}
      <div className="relative overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-md">
        {isLive ? (
          <div className="flex h-16 w-36 flex-col items-center justify-center space-y-1 rounded bg-zinc-950 px-3 text-center">
            <span className="flex items-center space-x-1 text-xs font-semibold text-red-400">
              <Radio className="h-3 w-3 animate-pulse" />
              <span>LIVE STREAM</span>
            </span>
            <span className="text-[10px] text-zinc-500">Thumbnail preview disabled for live broadcast</span>
          </div>
        ) : (
          <div className="relative h-[112px] w-[200px] overflow-hidden rounded bg-black">
            {/* Direct canvas rendering (CORS-immune, never blocked by toDataURL security) */}
            <canvas
              ref={canvasRef as React.RefObject<HTMLCanvasElement>}
              width={240}
              height={135}
              className={`h-full w-full object-cover ${hasFrame ? 'block' : 'hidden'}`}
            />

            {/* Decoded frame image fallback */}
            {frameCanvasDataUrl && !hasFrame && !error ? (
              <img
                src={frameCanvasDataUrl}
                alt="Hover preview"
                className="h-full w-full object-cover"
              />
            ) : null}

            {/* Non-blocking micro refining indicator when frame is already visible */}
            {isDecoding && (hasFrame || frameCanvasDataUrl) && (
              <div className="absolute top-1.5 right-1.5 flex items-center space-x-1 rounded-full bg-black/75 px-1.5 py-0.5 shadow-md backdrop-blur-sm">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-400" />
                <span className="text-[9px] font-medium text-zinc-300">
                  {isExact ? 'Decoding' : 'Refining'}
                </span>
              </div>
            )}

            {/* Skeleton loader ONLY when no frame is available yet */}
            {isDecoding && !hasFrame && !frameCanvasDataUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                <span className="mt-1 text-[10px] font-medium text-zinc-400">Loading preview...</span>
              </div>
            )}

            {/* Error fallback state (only if no frame was ever drawn) */}
            {error && !isDecoding && !hasFrame && !frameCanvasDataUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-2 text-center text-[10px] text-zinc-400">
                <span>Preview unavailable</span>
                <span className="text-[9px] text-zinc-500">Stream CORS or DRM restricted</span>
              </div>
            )}

            {/* Timestamp Badge overlaid on thumbnail */}
            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white shadow">
              {formatTime(hoverTime)}
            </div>
          </div>
        )}
      </div>

      {/* Downward triangle pointer */}
      <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-700/80" />
    </div>
  );
};
