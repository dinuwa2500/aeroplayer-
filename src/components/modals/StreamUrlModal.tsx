import React, { useState } from 'react';
import { X, Play, Link } from 'lucide-react';
import { StreamSource } from '../../types/player';
import { detectStreamType, validateStreamUrl } from '../../utils/streamDetector';

interface StreamUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStream: (source: StreamSource) => void;
}

export const StreamUrlModal: React.FC<StreamUrlModalProps> = ({
  isOpen,
  onClose,
  onLoadStream,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const detectedType = urlInput ? detectStreamType(urlInput) : null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validation = validateStreamUrl(urlInput);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid URL');
      return;
    }

    const type = detectStreamType(urlInput);
    const title = titleInput.trim() || urlInput.split('/').pop()?.split('?')[0] || 'Network Stream';

    onLoadStream({
      url: urlInput.trim(),
      title,
      type,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Link className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Open Network Stream</h2>
              <p className="text-xs text-zinc-400">Supports HLS (.m3u8), DASH (.mpd), and direct media URLs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Stream or Media URL
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://example.com/playlist.m3u8"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoFocus
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {detectedType && (
                <span className="absolute right-2.5 top-2.5 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                  {detectedType}
                </span>
              )}
            </div>
            {errorMessage && (
              <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Stream Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Live Sports Broadcast"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!urlInput.trim()}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Load Stream</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
