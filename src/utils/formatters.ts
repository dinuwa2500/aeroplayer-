/**
 * Formats seconds into hh:mm:ss or mm:ss
 */
export function formatTime(seconds: number, forceHours: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const formattedM = m.toString().padStart(2, '0');
  const formattedS = s.toString().padStart(2, '0');

  if (h > 0 || forceHours) {
    const formattedH = h.toString().padStart(2, '0');
    return `${formattedH}:${formattedM}:${formattedS}`;
  }

  return `${formattedM}:${formattedS}`;
}

/**
 * Formats bits per second into readable Mbps / kbps
 */
export function formatBitrate(bps: number): string {
  if (!bps || bps <= 0) return '';
  if (bps >= 1_000_000) {
    return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  }
  return `${Math.round(bps / 1_000)} kbps`;
}

/**
 * Formats resolution label
 */
export function formatResolution(width: number, height: number): string {
  if (!height && !width) return 'Unknown';
  if (height >= 2160 || width >= 3840) return '4K';
  if (height >= 1440 || width >= 2560) return '1440p QHD';
  if (height >= 1080 || width >= 1920) return '1080p FHD';
  if (height >= 720 || width >= 1280) return '720p HD';
  if (height >= 480 || width >= 854) return '480p SD';
  return `${height || width}p`;
}
