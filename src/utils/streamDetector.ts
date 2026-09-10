import { StreamType } from '../types/player';

export function detectStreamType(url: string, file?: File): StreamType {
  if (file) {
    return 'local';
  }

  const cleanUrl = url.split('?')[0].toLowerCase();

  if (cleanUrl.endsWith('.m3u8')) {
    return 'hls';
  }

  if (cleanUrl.endsWith('.mpd')) {
    return 'dash';
  }

  return 'direct';
}

export function validateStreamUrl(rawUrl: string): { isValid: boolean; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Protocol must be HTTP or HTTPS' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format (must be a valid http:// or https:// URL)' };
  }
}
