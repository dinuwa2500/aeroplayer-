import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center space-x-3 rounded-lg border border-red-500/40 bg-zinc-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md max-w-lg animate-slide-up">
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
      <div className="flex-1 text-xs text-zinc-200">
        <p className="font-semibold text-red-300">Stream Playback Warning</p>
        <p className="mt-0.5 text-zinc-400 leading-snug">{message}</p>
      </div>

      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-1 rounded bg-red-600/80 hover:bg-red-500 px-2 py-1 text-[11px] font-medium text-white transition"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
