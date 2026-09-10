import { useState, useRef, useCallback } from 'react';
import { TitleBar } from './components/common/TitleBar';
import { MediaPlayer } from './components/player/MediaPlayer';
import { StreamUrlModal } from './components/modals/StreamUrlModal';
import { StreamSource } from './types/player';

export default function App() {
  // Initial default stream for instant demonstration
  const [currentSource, setCurrentSource] = useState<StreamSource | null>({
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    title: 'Big Buck Bunny (HLS Adaptive Bitrate Stream)',
    type: 'hls',
  });

  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const localFileBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URL when switching sources
  const cleanupPreviousBlob = useCallback(() => {
    if (localFileBlobUrlRef.current) {
      URL.revokeObjectURL(localFileBlobUrlRef.current);
      localFileBlobUrlRef.current = null;
    }
  }, []);

  // Handle local file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      cleanupPreviousBlob();
      const objectUrl = URL.createObjectURL(file);
      localFileBlobUrlRef.current = objectUrl;

      setCurrentSource({
        url: objectUrl,
        title: file.name,
        type: 'local',
        isLocal: true,
        file,
      });
    },
    [cleanupPreviousBlob]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const triggerLocalFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleLoadNetworkStream = (source: StreamSource) => {
    cleanupPreviousBlob();
    setCurrentSource(source);
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-player-dark font-sans text-white select-none">
      {/* Hidden File Input for Native File Picker Dialog */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/x-matroska,.mkv,.mp4,.webm,.m3u8"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 1. Desktop Titlebar */}
      <TitleBar
        currentSource={currentSource}
        isLive={isLive}
        onOpenStreamModal={() => setIsStreamModalOpen(true)}
        onOpenLocalFile={triggerLocalFileDialog}
      />

      {/* 2. Main Media Player Viewport */}
      <main className="relative flex-1 overflow-hidden bg-black">
        <MediaPlayer
          source={currentSource}
          onOpenStreamModal={() => setIsStreamModalOpen(true)}
          onOpenLocalFile={triggerLocalFileDialog}
          onFileDrop={handleFileSelect}
          onLiveChange={setIsLive}
        />
      </main>

      {/* 3. Network Stream Input Modal */}
      <StreamUrlModal
        isOpen={isStreamModalOpen}
        onClose={() => setIsStreamModalOpen(false)}
        onLoadStream={handleLoadNetworkStream}
      />
    </div>
  );
}
