import React, { useState } from 'react';
import { X, Play, Link, Sparkles, CheckCircle2 } from 'lucide-react';
import { StreamSource, PresetStream } from '../../types/player';
import { detectStreamType, validateStreamUrl } from '../../utils/streamDetector';

interface StreamUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStream: (source: StreamSource) => void;
}

const PRESET_STREAMS: PresetStream[] = [
  {
    name: 'Big Buck Bunny (Multi-bitrate HLS)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls',
    description: 'Full VOD HLS stream with multiple ABR quality levels & fast seeking',
    isLive: false,
  },
  {
    name: 'Tears of Steel (HLS VOD)',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    type: 'hls',
    description: 'High definition 1080p open-source sci-fi cinematic stream',
    isLive: false,
  },
  {
    name: 'Akamai Live HLS Stream',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    type: 'hls',
    description: 'Live broadcast test stream with live sync & rolling window',
    isLive: true,
  },
  {
    name: 'Sintel Trailer (Direct MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'direct',
    description: 'Direct progressive download media with keyframe seeking',
    isLive: false,
  },
];

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

  const handleSelectPreset = (preset: PresetStream) => {
    onLoadStream({
      url: preset.url,
      title: preset.name,
      type: preset.type,
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

        {/* Quick Test Presets Section */}
        <div className="mt-5 border-t border-zinc-800/80 pt-4">
          <div className="flex items-center space-x-1 text-xs font-semibold text-zinc-400 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Instant Test Presets</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRESET_STREAMS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="group flex flex-col items-start rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-left transition hover:border-blue-500/50 hover:bg-zinc-800/50"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition">
                    {preset.name}
                  </span>
                  <span className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] uppercase font-bold text-zinc-400">
                    {preset.type}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1 leading-relaxed">
                  {preset.description}
                </p>
                {preset.isLive && (
                  <span className="mt-1 flex items-center space-x-1 text-[9px] font-bold text-red-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    <span>Live broadcast</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
