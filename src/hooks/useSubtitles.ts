import { useState, useCallback } from 'react';
import { SubtitleTrack } from '../types/player';
import { parseSubtitleContent } from '../utils/subtitleParser';

export function useSubtitles() {
  const [subtitleTrack, setSubtitleTrack] = useState<SubtitleTrack | null>(null);
  const [isSubtitlesEnabled, setIsSubtitlesEnabled] = useState<boolean>(true);
  const [syncOffset, setSyncOffsetState] = useState<number>(0.0); // Offset in seconds (positive = delay, negative = advance)

  const loadSubtitleFromFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const cues = parseSubtitleContent(text);
      if (cues.length > 0) {
        setSubtitleTrack({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name.replace(/\.(srt|vtt)$/i, ''),
          cues,
        });
        setIsSubtitlesEnabled(true);
        setSyncOffsetState(0.0); // Reset sync offset on new file
      } else {
        alert('No valid subtitle cues found in file.');
      }
    } catch (err) {
      console.error('Failed to read subtitle file:', err);
    }
  }, []);

  const toggleSubtitles = useCallback(() => {
    setIsSubtitlesEnabled((prev) => !prev);
  }, []);

  const adjustSyncOffset = useCallback((deltaSeconds: number) => {
    setSyncOffsetState((prev) => {
      const updated = Math.round((prev + deltaSeconds) * 20) / 20; // Round to nearest 50ms (0.05s)
      return Math.max(-10, Math.min(10, updated)); // Clamped between -10s and +10s
    });
  }, []);

  const setSyncOffset = useCallback((offset: number) => {
    setSyncOffsetState(Math.max(-10, Math.min(10, offset)));
  }, []);

  const clearSubtitles = useCallback(() => {
    setSubtitleTrack(null);
    setSyncOffsetState(0.0);
  }, []);

  // Helper to compute active subtitle text given currentTime
  const getActiveSubtitleText = useCallback(
    (currentTime: number): string | null => {
      if (!isSubtitlesEnabled || !subtitleTrack || subtitleTrack.cues.length === 0) {
        return null;
      }

      // If offset > 0 (subtitle delayed to match later voice), effectiveTime is lower
      const effectiveTime = currentTime - syncOffset;

      // Binary search or find in cues
      const activeCues = subtitleTrack.cues.filter(
        (c) => effectiveTime >= c.startTime && effectiveTime <= c.endTime
      );

      if (activeCues.length === 0) return null;
      return activeCues.map((c) => c.text).join('\n');
    },
    [isSubtitlesEnabled, subtitleTrack, syncOffset]
  );

  return {
    subtitleTrack,
    isSubtitlesEnabled,
    syncOffset,
    loadSubtitleFromFile,
    toggleSubtitles,
    adjustSyncOffset,
    setSyncOffset,
    clearSubtitles,
    getActiveSubtitleText,
  };
}
