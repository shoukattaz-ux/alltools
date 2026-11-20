/** Pure planning logic for the video compressor (no DOM, no media APIs). Fully unit-tested. */

export type VideoCodecChoice = 'avc' | 'vp9' | 'av1';
/** The id 'visually-lossless' is the top preset; its label is "Highest quality (near-lossless)". */
export type QualityPreset = 'visually-lossless' | 'balanced' | 'small' | 'smallest';

/** Bits per pixel (per frame) for H.264 at each preset. Other codecs scale by CODEC_FACTOR. */
export const PRESET_BPP: Record<QualityPreset, number> = { 'visually-lossless': 0.3, balanced: 0.1, small: 0.055, smallest: 0.03 };
/** Relative bitrate needed for similar visual quality. VP9 and AV1 are more efficient than H.264. */
export const CODEC_FACTOR: Record<VideoCodecChoice, number> = { avc: 1, vp9: 0.7, av1: 0.55 };
export const PRESET_LABEL: Record<QualityPreset, string> = {
  'visually-lossless': 'Highest quality (near-lossless)',
  balanced: 'Balanced (recommended)',
  small: 'Small file',
  smallest: 'Smallest file',
};

export const MIN_VIDEO_BITRATE = 80_000; // bits per second; below this a video is unwatchable
export const AUDIO_BITRATES = { keep: 0, good: 128_000, low: 64_000 } as const;
export type AudioMode = 'keep' | 'good' | 'low' | 'remove';

/** Encoders need even dimensions. Rounds to the nearest even number, at least 2. */
export const evenDim = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export interface SourceInfo {
  width: number; height: number; fps: number;
  /** Video bitrate in bits per second (best estimate). */
  videoBitrate: number;
  /** Audio bitrate in bits per second, 0 when there is no audio. */
  audioBitrate: number;
  duration: number;
  fileBytes: number;
  hasAudio: boolean;
}

export interface PlanOptions {
  codec: VideoCodecChoice;
  /** Either a quality preset or a target size in bytes. */
  preset?: QualityPreset;
  targetBytes?: number;
  /** 0 or undefined keeps the original height. Never upscales. */
  maxHeight?: number;
  /** 0 or undefined keeps the original frame rate. Never raises it. */
  fps?: number;
  audio: AudioMode;
  trimStart?: number;
  trimEnd?: number;
}

export interface Plan {
  width: number; height: number; fps: number;
  videoBitrate: number; audioBitrate: number;
  duration: number; estimatedBytes: number;
  scaled: boolean; resampled: boolean;
  /** Human-readable cautions: capped bitrate, target too small, and so on. */
  notes: string[];
  /** Set when the request cannot be met (for example the target size is impossibly small). */
  error?: string;
}

const CONTAINER_OVERHEAD = 1.02; // ~2% for container structures and timestamps

export function trimmedDuration(total: number, start = 0, end?: number): number {
  const s = Math.min(Math.max(0, start || 0), Math.max(0, total));
  const e = end === undefined || !Number.isFinite(end) || end <= 0 ? total : Math.min(end, total);
  return Math.max(0, e - s);
}

export function planCompression(src: SourceInfo, o: PlanOptions): Plan {
  const notes: string[] = [];
  const duration = trimmedDuration(src.duration, o.trimStart, o.trimEnd);
  if (!(duration > 0)) return { width: src.width, height: src.height, fps: src.fps, videoBitrate: 0, audioBitrate: 0, duration: 0, estimatedBytes: 0, scaled: false, resampled: false, notes, error: 'The selected time range is empty. Check the start and end times.' };

  let scale = 1;
  const scaled = !!o.maxHeight && o.maxHeight > 0 && o.maxHeight < src.height;
  if (scaled) scale = o.maxHeight! / src.height;
  const width = scaled ? evenDim(src.width * scale) : evenDim(src.width);
  const height = scaled ? evenDim(src.height * scale) : evenDim(src.height);

  const resampled = !!o.fps && o.fps > 0 && o.fps < src.fps - 0.5;
  const fps = resampled ? o.fps! : src.fps;

  let audioBitrate = 0;
  if (src.hasAudio && o.audio !== 'remove') {
    audioBitrate = o.audio === 'keep' ? Math.max(src.audioBitrate, 0) || 128_000 : Math.min(AUDIO_BITRATES[o.audio], src.audioBitrate > 0 ? src.audioBitrate : Infinity);
  }

  let videoBitrate: number;
  if (o.targetBytes && o.targetBytes > 0) {
    const budget = (o.targetBytes / CONTAINER_OVERHEAD) * 8 / duration - audioBitrate;
    if (budget < MIN_VIDEO_BITRATE) {
      return { width, height, fps, videoBitrate: 0, audioBitrate, duration, estimatedBytes: 0, scaled, resampled, notes, error: 'That target size is too small for this video length. Choose a larger size, trim the video, remove the audio, or lower the resolution.' };
    }
    videoBitrate = budget;
    const nominal = width * height * fps * 0.02 * CODEC_FACTOR[o.codec];
    if (videoBitrate < nominal) notes.push('At this size the video will look noticeably soft or blocky. Lower the resolution or trim the video for a better result.');
  } else {
    const preset = o.preset ?? 'balanced';
    videoBitrate = width * height * fps * PRESET_BPP[preset] * CODEC_FACTOR[o.codec];
    // Re-encoding can only help if the result is smaller than the source: never exceed ~90% of the source bitrate.
    const cap = src.videoBitrate > 0 ? src.videoBitrate * 0.9 : Infinity;
    if (videoBitrate > cap) {
      videoBitrate = cap;
      notes.push('This video is already efficiently compressed, so the bitrate was capped just below the original to guarantee a smaller file.');
    }
  }
  videoBitrate = Math.max(MIN_VIDEO_BITRATE, Math.round(videoBitrate));
  const estimatedBytes = Math.round(((videoBitrate + audioBitrate) * duration / 8) * CONTAINER_OVERHEAD);
  if (src.fileBytes > 0 && estimatedBytes >= src.fileBytes * (duration / Math.max(src.duration, 0.001)) * 0.98 && !o.targetBytes) {
    notes.push('The result may not be smaller than the original. This video is already well compressed.');
  }
  return { width, height, fps, videoBitrate, audioBitrate, duration, estimatedBytes, scaled, resampled, notes };
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

/** Parses "1:30", "90", "1:02:03" or "12.5" into seconds. Returns NaN for invalid input. */
export function parseTime(text: string): number {
  const t = (text ?? '').trim();
  if (!t) return NaN;
  const parts = t.split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return NaN;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

export const formatBitrate = (bps: number) => (bps >= 1_000_000 ? `${(bps / 1_000_000).toFixed(bps >= 10_000_000 ? 0 : 1)} Mbps` : `${Math.round(bps / 1000)} kbps`);
