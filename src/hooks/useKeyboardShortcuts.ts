import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  togglePlay: () => void;
  toggleFullscreen: () => void;
  toggleMute: () => void;
  seekBy: (delta: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  onAdjustSubSync?: (delta: number) => void;
  isEnabled?: boolean;
}

export function useKeyboardShortcuts({
  togglePlay,
  toggleFullscreen,
  toggleMute,
  seekBy,
  volume,
  setVolume,
  onAdjustSubSync,
  isEnabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when focus is in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          seekBy(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'BracketLeft':
          e.preventDefault();
          onAdjustSubSync?.(-0.1);
          break;
        case 'BracketRight':
          e.preventDefault();
          onAdjustSubSync?.(0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isEnabled,
    togglePlay,
    toggleFullscreen,
    toggleMute,
    seekBy,
    volume,
    setVolume,
    onAdjustSubSync,
  ]);
}
