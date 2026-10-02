export type StreamType = 'hls' | 'dash' | 'direct' | 'local';

export interface QualityLevel {
  id: number;
  height: number;
  width: number;
  bitrate: number;
  label: string;
}

export interface BufferedRange {
  start: number;
  end: number;
}

export interface StreamSource {
  url: string;
  title: string;
  type: StreamType;
  isLocal?: boolean;
  file?: File;
}

export type VideoRotation = 0 | 90 | 180 | 270;

export interface VideoTransform {
  rotation: VideoRotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isBuffering: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  bufferedRanges: BufferedRange[];
  currentQuality: number; // -1 represents Automatic Bitrate Selection (ABR)
  availableQualities: QualityLevel[];
  error: string | null;
  isLive: boolean;
  source: StreamSource | null;
  rotation: VideoRotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface HoverThumbnailState {
  isHovering: boolean;
  hoverTime: number;
  hoverX: number;
  hoverPercent: number;
  frameCanvasDataUrl: string | null;
  hasFrame: boolean;
  isDecoding: boolean;
  isExact?: boolean;
  error: boolean;
}


export interface SubtitleCue {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleTrack {
  id: string;
  name: string;
  cues: SubtitleCue[];
}
