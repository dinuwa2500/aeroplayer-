import { SubtitleCue } from '../types/player';

/**
 * Parses a timestamp string in SRT or WebVTT format into seconds.
 * Formats supported:
 * - 00:01:23,456 (SRT)
 * - 00:01:23.456 (WebVTT)
 * - 01:23.456 (WebVTT short)
 */
function parseTimestamp(timeStr: string): number {
  const normalized = timeStr.trim().replace(',', '.');
  const parts = normalized.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }

  return 0;
}

/**
 * Strips HTML and WebVTT markup tags (e.g., <b>, <i>, <v Speaker>, <c.yellow>)
 */
function cleanSubtitleText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // remove HTML tags
    .replace(/\{[^}]+\}/g, '') // remove SSA/ASS style tags if present
    .trim();
}

/**
 * High-speed parser for .srt (SubRip) and .vtt (WebVTT) subtitle content.
 * Handles both Windows (\r\n) and Unix (\n) line endings, numbered and unnumbered cues.
 */
export function parseSubtitleContent(content: string): SubtitleCue[] {
  if (!content || typeof content !== 'string') return [];

  // Normalize line endings and strip BOM
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split content into cue blocks separated by blank lines
  const blocks = normalized.split(/\n\s*\n+/);
  const cues: SubtitleCue[] = [];
  let autoId = 1;

  // Regex to match timestamp lines: (HH:)?MM:SS[,.]mmm --> (HH:)?MM:SS[,.]mmm
  const timestampRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{2,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{2,3})/;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Find the line containing the timestamp arrow
    let timeLineIdx = -1;
    let match: RegExpMatchArray | null = null;

    for (let i = 0; i < lines.length; i++) {
      match = lines[i].match(timestampRegex);
      if (match) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1 || !match) continue;

    const startTime = parseTimestamp(match[1]);
    const endTime = parseTimestamp(match[2]);

    // Text consists of all subsequent lines
    const rawTextLines = lines.slice(timeLineIdx + 1);
    const text = cleanSubtitleText(rawTextLines.join('\n'));

    if (text.length > 0 && endTime >= startTime) {
      cues.push({
        id: autoId++,
        startTime,
        endTime,
        text,
      });
    }
  }

  // Sort cues chronologically by startTime
  return cues.sort((a, b) => a.startTime - b.startTime);
}
