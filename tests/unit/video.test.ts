import { describe, it, expect } from 'vitest';
import { planCompression, evenDim, trimmedDuration, parseTime, formatDuration, formatBitrate, MIN_VIDEO_BITRATE, type SourceInfo } from '../../src/lib/video';

const src: SourceInfo = { width: 1920, height: 1080, fps: 30, videoBitrate: 20_000_000, audioBitrate: 192_000, duration: 60, fileBytes: 160_000_000, hasAudio: true };

describe('planCompression: quality presets', () => {
  it('the highest-quality preset has the highest bitrate and is still below the source', () => {
    const p = planCompression(src, { codec: 'avc', preset: 'visually-lossless', audio: 'keep' });
    expect(p.error).toBeUndefined();
    expect(p.videoBitrate).toBeGreaterThan(8_000_000);
    expect(p.videoBitrate).toBeLessThanOrEqual(src.videoBitrate * 0.9);
    expect(p.estimatedBytes).toBeLessThan(src.fileBytes);
  });
  it('presets are ordered by size', () => {
    const sizes = (['visually-lossless', 'balanced', 'small', 'smallest'] as const).map((preset) => planCompression(src, { codec: 'avc', preset, audio: 'good' }).estimatedBytes);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(new Set(sizes).size).toBe(4);
  });
  it('VP9 and AV1 need less bitrate than H.264 for the same preset', () => {
    const b = (codec: 'avc' | 'vp9' | 'av1') => planCompression(src, { codec, preset: 'balanced', audio: 'good' }).videoBitrate;
    expect(b('vp9')).toBeLessThan(b('avc'));
    expect(b('av1')).toBeLessThan(b('vp9'));
  });
  it('caps the bitrate for an already efficient source and says so', () => {
    const low = { ...src, videoBitrate: 2_000_000, fileBytes: 17_000_000 };
    const p = planCompression(low, { codec: 'avc', preset: 'visually-lossless', audio: 'keep' });
    expect(p.videoBitrate).toBeLessThanOrEqual(1_800_000);
    expect(p.notes.join(' ')).toMatch(/already efficiently compressed/);
  });
});

describe('planCompression: resolution, frame rate, audio', () => {
  it('scales down, keeps aspect ratio, and uses even dimensions', () => {
    const p = planCompression(src, { codec: 'avc', preset: 'balanced', maxHeight: 720, audio: 'good' });
    expect([p.width, p.height]).toEqual([1280, 720]);
    expect(p.scaled).toBe(true);
    const odd = planCompression({ ...src, width: 1001, height: 563 }, { codec: 'avc', preset: 'balanced', maxHeight: 301, audio: 'good' });
    expect(odd.width % 2).toBe(0); expect(odd.height % 2).toBe(0);
  });
  it('never upscales or raises the frame rate', () => {
    const p = planCompression({ ...src, height: 480, width: 854 }, { codec: 'avc', preset: 'balanced', maxHeight: 1080, fps: 60, audio: 'good' });
    expect(p.scaled).toBe(false); expect(p.resampled).toBe(false);
    expect([p.width, p.height, p.fps]).toEqual([854, 480, 30]);
  });
  it('lowering the frame rate lowers the bitrate', () => {
    const full = planCompression({ ...src, fps: 60 }, { codec: 'avc', preset: 'balanced', audio: 'good' });
    const half = planCompression({ ...src, fps: 60 }, { codec: 'avc', preset: 'balanced', fps: 30, audio: 'good' });
    expect(half.resampled).toBe(true);
    expect(half.videoBitrate).toBeLessThan(full.videoBitrate);
  });
  it('audio modes', () => {
    expect(planCompression(src, { codec: 'avc', preset: 'balanced', audio: 'remove' }).audioBitrate).toBe(0);
    expect(planCompression(src, { codec: 'avc', preset: 'balanced', audio: 'low' }).audioBitrate).toBe(64_000);
    expect(planCompression({ ...src, hasAudio: false, audioBitrate: 0 }, { codec: 'avc', preset: 'balanced', audio: 'keep' }).audioBitrate).toBe(0);
    expect(planCompression({ ...src, audioBitrate: 48_000 }, { codec: 'avc', preset: 'balanced', audio: 'good' }).audioBitrate).toBe(48_000);
  });
});

describe('planCompression: target size', () => {
  it('hits the target within the container overhead', () => {
    const target = 25 * 1024 * 1024;
    const p = planCompression(src, { codec: 'avc', targetBytes: target, audio: 'good' });
    expect(p.error).toBeUndefined();
    expect(Math.abs(p.estimatedBytes - target) / target).toBeLessThan(0.03);
  });
  it('rejects a target that is too small, with advice', () => {
    const p = planCompression({ ...src, duration: 3600 }, { codec: 'avc', targetBytes: 1_000_000, audio: 'good' });
    expect(p.error).toMatch(/too small/);
  });
  it('warns when the target forces a very low quality', () => {
    const p = planCompression(src, { codec: 'avc', targetBytes: 3 * 1024 * 1024, audio: 'remove' });
    expect(p.error).toBeUndefined();
    expect(p.notes.join(' ')).toMatch(/soft or blocky/);
  });
  it('never goes below the minimum bitrate', () => {
    const p = planCompression(src, { codec: 'avc', preset: 'smallest', maxHeight: 240, audio: 'remove' });
    expect(p.videoBitrate).toBeGreaterThanOrEqual(MIN_VIDEO_BITRATE);
  });
});

describe('trimming and parsing', () => {
  it('trimmedDuration clamps to the video', () => {
    expect(trimmedDuration(60, 10, 40)).toBe(30);
    expect(trimmedDuration(60, 0, undefined)).toBe(60);
    expect(trimmedDuration(60, 50, 999)).toBe(10);
    expect(trimmedDuration(60, 70, undefined)).toBe(0);
  });
  it('an empty trim range is an error', () => {
    expect(planCompression(src, { codec: 'avc', preset: 'balanced', audio: 'keep', trimStart: 30, trimEnd: 30 }).error).toMatch(/empty/);
  });
  it('shorter clips are estimated smaller', () => {
    const full = planCompression(src, { codec: 'avc', preset: 'balanced', audio: 'good' });
    const part = planCompression(src, { codec: 'avc', preset: 'balanced', audio: 'good', trimStart: 0, trimEnd: 15 });
    expect(part.estimatedBytes).toBeCloseTo(full.estimatedBytes / 4, -4);
  });
  it('parseTime', () => {
    expect(parseTime('90')).toBe(90); expect(parseTime('1:30')).toBe(90); expect(parseTime('1:02:03')).toBe(3723); expect(parseTime('12.5')).toBe(12.5);
    for (const bad of ['', 'abc', '1:2:3:4', '-5', '1:-2', '1,5']) expect(parseTime(bad)).toBeNaN();
  });
  it('formatting helpers', () => {
    expect(formatDuration(65)).toBe('1:05'); expect(formatDuration(3725)).toBe('1:02:05'); expect(formatDuration(NaN)).toBe('0:00');
    expect(formatBitrate(2_500_000)).toBe('2.5 Mbps'); expect(formatBitrate(640_000)).toBe('640 kbps');
    expect(evenDim(719)).toBe(720); expect(evenDim(1)).toBe(2);
  });
});
