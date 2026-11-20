import { h, field, dropzone, statusArea, progressBar, selectControl, withBusy, downloadBlob } from '../ui';
import { Input, Output, Conversion, ConversionCanceledError, BlobSource, BufferTarget, MP4, QTFF, MATROSKA, WEBM, Mp4OutputFormat, WebMOutputFormat, Quality, canEncodeVideo, canEncodeAudio, type InputVideoTrack, type InputAudioTrack } from 'mediabunny';
import { LIMITS } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';
import { planCompression, trimmedDuration, parseTime, formatDuration, formatBitrate, PRESET_LABEL, type QualityPreset, type AudioMode, type VideoCodecChoice, type SourceInfo, type Plan } from '../../lib/video';

type Mode = 'preset' | 'target' | 'lossless';
interface Meta { src: SourceInfo; videoCodec: string; audioCodec: string | null; channels: number; sampleRate: number }
interface FormatChoice { id: VideoCodecChoice; label: string; container: 'mp4' | 'webm' }

const FORMAT_LABELS: Record<VideoCodecChoice, [string, 'mp4' | 'webm']> = {
  avc: ['MP4 (H.264): plays almost everywhere', 'mp4'],
  vp9: ['WebM (VP9): smaller files, fewer devices', 'webm'],
  av1: ['WebM (AV1): smallest, slow to encode', 'webm'],
};
/** Only the containers this tool accepts, so the bundle stays small. */
const INPUT_FORMATS = [MP4, QTFF, MATROSKA, WEBM];
const HEIGHTS = [2160, 1440, 1080, 720, 480, 360, 240];


export function mount(root: HTMLElement) {
  const status = statusArea();
  const progress = progressBar();
  let file: File | null = null;
  let meta: Meta | null = null;
  let mode: Mode = 'preset';
  let formats: FormatChoice[] = [];
  let running: Conversion | null = null;
  let cancelled = false;
  let previewUrl = '', resultUrl = '';

  const supported = typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';

  /* ---------- elements ---------- */
  const info = h('div', { class: 'result-grid', hidden: true });
  const player = h('video', { controls: true, preload: 'metadata', playsinline: true, 'aria-label': 'Preview of your video' });
  const playerBox = h('div', { class: 'video-box', hidden: true }, player);
  const panel = h('div', { hidden: true });

  const modeBtns = ([['preset', 'Quality preset'], ['target', 'Target file size'], ['lossless', 'Lossless (no re-encode)']] as [Mode, string][]).map(([id, label]) =>
    h('button', { type: 'button', 'aria-pressed': String(id === 'preset'), 'data-mode': id }, label));
  const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Compression mode' }, ...modeBtns);
  const modeNote = h('p', { class: 'hint' });

  const preset = selectControl(Object.entries(PRESET_LABEL) as [string, string][], 'balanced');
  const targetMb = h('input', { type: 'number', min: 1, step: 'any', value: '25', inputmode: 'decimal' });
  const targetChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Common size limits', style: 'margin:8px 0 0' },
    ...[8, 10, 25, 50, 100].map((n) => h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: () => { targetMb.value = String(n); refresh(); } }, `${n} MB`)));
  const presetField = field('Quality', preset);
  const targetField = field('Maximum file size (MB)', targetMb, 'The bitrate is calculated to land just under this size.');
  targetField.append(targetChips);
  const formatSel = selectControl([['avc', FORMAT_LABELS.avc[0]]], 'avc');
  const resSel = selectControl([['0', 'Original resolution']], '0');
  const fpsSel = selectControl([['0', 'Original frame rate']], '0');
  const audioSel = selectControl([['keep', 'Keep original audio (no re-encode)'], ['good', 'Compress audio (128 kbps)'], ['low', 'Small audio (64 kbps)'], ['remove', 'Remove audio']], 'keep');
  const startIn = h('input', { type: 'text', placeholder: '0:00', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': 'trim-hint' });
  const endIn = h('input', { type: 'text', placeholder: 'end of video', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': 'trim-hint' });
  const setStart = h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => { startIn.value = formatDuration(player.currentTime); refresh(); } }, 'Use current position');
  const setEnd = h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => { endIn.value = formatDuration(player.currentTime); refresh(); } }, 'Use current position');
  const startField = field('Trim: start', startIn); startField.append(setStart);
  const endField = field('Trim: end', endIn); endField.append(setEnd);

  const encodeRow = h('div', { class: 'row' }, presetField, targetField, field('Output format', formatSel));
  const scaleRow = h('div', { class: 'row', style: 'margin-top:16px' }, field('Resolution', resSel), field('Frame rate', fpsSel), field('Audio', audioSel));
  const trimRow = h('div', { class: 'row', style: 'margin-top:16px' }, startField, endField);
  const trimHint = h('p', { class: 'hint', id: 'trim-hint', text: 'Optional. Use minutes and seconds (1:30) or seconds (90). Play the preview and use “Use current position” to pick a point. Trimming first makes the file smaller.' });

  const estimate = h('div', { class: 'notice notice-info', 'aria-live': 'polite' });
  const notes = h('div', { 'aria-live': 'polite' });
  const goBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Compress video');
  const cancelBtn = h('button', { type: 'button', class: 'btn btn-secondary', hidden: true }, 'Cancel');
  const result = h('div', { hidden: true });

  panel.append(modeSeg, modeNote, encodeRow, scaleRow, trimRow, trimHint, estimate, notes, h('div', { class: 'actions' }, goBtn, cancelBtn));

  /* ---------- helpers ---------- */
  const revoke = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); if (resultUrl) URL.revokeObjectURL(resultUrl); previewUrl = resultUrl = ''; };
  const stat = (k: string, v: string, hl = false) => h('div', { class: hl ? 'stat hl' : 'stat' }, h('div', { class: 'k', text: k }), h('div', { class: 'v', text: v, style: 'font-size:1.15rem' }));

  function readTrim(): { start: number | undefined; end: number | undefined; error?: string } {
    const s = startIn.value.trim() ? parseTime(startIn.value) : undefined;
    const e = endIn.value.trim() ? parseTime(endIn.value) : undefined;
    if ((s !== undefined && Number.isNaN(s)) || (e !== undefined && Number.isNaN(e))) return { start: undefined, end: undefined, error: 'Enter times as minutes:seconds (for example 1:30) or as seconds (90).' };
    const total = meta?.src.duration ?? 0;
    if (s !== undefined && s >= total) return { start: s, end: e, error: `The start time must be before the end of the video (${formatDuration(total)}).` };
    if (s !== undefined && e !== undefined && e <= s) return { start: s, end: e, error: 'The end time must be after the start time.' };
    return { start: s, end: e };
  }

  function currentPlan(): { plan: Plan | null; trimError?: string } {
    if (!meta) return { plan: null };
    const trim = readTrim();
    if (trim.error) return { plan: null, trimError: trim.error };
    const f = formats.find((x) => x.id === formatSel.value) ?? formats[0];
    const target = mode === 'target' ? Number(targetMb.value) * 1024 * 1024 : undefined;
    if (mode === 'target' && !(target && target > 0)) return { plan: null, trimError: 'Enter the maximum file size in MB, for example 25.' };
    const plan = planCompression(meta.src, {
      codec: f?.id ?? 'avc', preset: preset.value as QualityPreset, targetBytes: target,
      maxHeight: Number(resSel.value) || 0, fps: Number(fpsSel.value) || 0, audio: audioSel.value as AudioMode,
      trimStart: trim.start, trimEnd: trim.end,
    });
    return { plan };
  }

  function refresh() {
    if (!meta) return;
    const lossless = mode === 'lossless';
    presetField.hidden = mode !== 'preset'; targetField.hidden = mode !== 'target';
    formatSel.closest('.field')!.toggleAttribute('hidden', lossless);
    resSel.closest('.field')!.toggleAttribute('hidden', lossless);
    fpsSel.closest('.field')!.toggleAttribute('hidden', lossless);
    for (const opt of [...audioSel.options]) opt.hidden = opt.disabled = lossless && (opt.value === 'good' || opt.value === 'low');
    if (lossless && (audioSel.value === 'good' || audioSel.value === 'low')) audioSel.value = 'keep';
    modeNote.textContent = mode === 'preset' ? 'Choose a quality level. The tool picks the bitrate for your resolution and codec.'
      : mode === 'target' ? 'Type the largest file size you can accept (for example an email or chat limit). The bitrate is calculated for you.'
      : 'Copies the existing video and audio without re-encoding, so the picture is untouched. You can trim or remove the audio, but the file barely shrinks.';
    notes.replaceChildren();
    estimate.replaceChildren();
    const { plan, trimError } = currentPlan();
    if (trimError) { estimate.className = 'notice notice-warn'; estimate.append(h('span', { text: trimError })); goBtn.disabled = true; return; }
    goBtn.disabled = false;
    if (lossless) {
      const t = readTrim();
      const d = trimmedDuration(meta.src.duration, t.start, t.end);
      const est = Math.round(((meta.src.videoBitrate + (audioSel.value === 'remove' ? 0 : meta.src.audioBitrate)) * d) / 8);
      estimate.className = 'notice notice-info';
      estimate.append(h('span', { text: `Lossless: video and audio are copied as they are. Expected size: about ${formatBytes(est)}${t.start || t.end ? ` for ${formatDuration(d)}. Cuts snap to the nearest keyframes.` : '. Same quality, nearly the same size.'}` }));
      return;
    }
    if (!plan) return;
    if (plan.error) { estimate.className = 'notice notice-error'; estimate.append(h('span', { text: plan.error })); goBtn.disabled = true; return; }
    const saved = 1 - plan.estimatedBytes / Math.max(1, meta.src.fileBytes * (plan.duration / Math.max(0.001, meta.src.duration)));
    estimate.className = 'notice notice-info';
    estimate.append(h('span', { text: `Estimated result: about ${formatBytes(plan.estimatedBytes)} at ${plan.width}×${plan.height}, ${Math.round(plan.fps)} fps, ${formatBitrate(plan.videoBitrate)} video${saved > 0 ? ` (roughly ${Math.round(saved * 100)}% smaller)` : ''}. The real size can differ by about 10–15%.` }));
    for (const n of plan.notes) notes.append(h('div', { class: 'notice notice-warn' }, h('span', { text: n })));
  }

  for (const el of [preset, targetMb, formatSel, resSel, fpsSel, audioSel, startIn, endIn]) { el.addEventListener('input', refresh); el.addEventListener('change', refresh); }
  modeBtns.forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode as Mode; modeBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); result.hidden = true; refresh(); }));

  /* ---------- loading a video ---------- */
  async function load(f: File) {
    status.clear(); result.hidden = true; panel.hidden = true; info.hidden = true; playerBox.hidden = true; revoke();
    const input = new Input({ source: new BlobSource(f), formats: INPUT_FORMATS });
    try {
      const vt: InputVideoTrack | null = await input.getPrimaryVideoTrack();
      if (!vt) throw new Error('No video was found in this file. It may be audio only or damaged.');
      if (!(await vt.canDecode())) throw new Error(`Your browser cannot decode this video (${vt.codec ?? 'unknown codec'}). Try a current Chrome, Edge or Safari, or convert the video to H.264 MP4 first.`);
      const at: InputAudioTrack | null = await input.getPrimaryAudioTrack();
      const duration = await input.computeDuration();
      if (!(duration > 0)) throw new Error('This video has no readable duration. It may be damaged.');
      const vStats = await vt.computePacketStats(150);
      const aStats = at ? await at.computePacketStats(150).catch(() => null) : null;
      const fps = Number.isFinite(vStats.averagePacketRate) && vStats.averagePacketRate > 0 ? Math.min(120, Math.round(vStats.averagePacketRate * 100) / 100) : 30;
      const audioBitrate = at ? (aStats && Number.isFinite(aStats.averageBitrate) ? aStats.averageBitrate : 128_000) : 0;
      const totalBits = (f.size * 8) / duration;
      const videoBitrate = Number.isFinite(vStats.averageBitrate) && vStats.averageBitrate > 0 ? vStats.averageBitrate : Math.max(100_000, totalBits - audioBitrate);
      meta = {
        src: { width: vt.displayWidth, height: vt.displayHeight, fps, videoBitrate, audioBitrate, duration, fileBytes: f.size, hasAudio: !!at },
        videoCodec: vt.codec ?? 'unknown', audioCodec: at?.codec ?? null, channels: at?.numberOfChannels ?? 0, sampleRate: at?.sampleRate ?? 0,
      };
      file = f;

      // Which output formats can this browser encode at this size?
      formats = [];
      for (const id of ['avc', 'vp9', 'av1'] as VideoCodecChoice[]) {
        if (await canEncodeVideo(id, { width: meta.src.width, height: meta.src.height }).catch(() => false)) formats.push({ id, label: FORMAT_LABELS[id][0], container: FORMAT_LABELS[id][1] });
      }
      if (!formats.length) throw new Error('Your browser cannot encode video at this size. Try a current desktop Chrome, Edge or Safari, or choose Lossless mode, which does not need an encoder.');
      formatSel.replaceChildren(...formats.map((x) => h('option', { value: x.id, text: x.label })));
      resSel.replaceChildren(h('option', { value: '0', text: `Original (${meta.src.width}×${meta.src.height})` }), ...HEIGHTS.filter((x) => x < meta!.src.height).map((x) => h('option', { value: String(x), text: `${x}p` })));
      fpsSel.replaceChildren(h('option', { value: '0', text: `Original (${Math.round(fps)} fps)` }), ...[60, 30, 24, 15].filter((x) => x < fps - 0.5).map((x) => h('option', { value: String(x), text: `${x} fps` })));
      audioSel.closest('.field')!.toggleAttribute('hidden', !at);
      startIn.value = endIn.value = '';

      info.replaceChildren(
        stat('Duration', formatDuration(duration)), stat('Resolution', `${meta.src.width}×${meta.src.height}`), stat('Frame rate', `${Math.round(fps)} fps`),
        stat('Video bitrate', formatBitrate(videoBitrate)), stat('Codecs', `${meta.videoCodec.toUpperCase()}${meta.audioCodec ? ` + ${meta.audioCodec.toUpperCase()}` : ' (no audio)'}`), stat('File size', formatBytes(f.size), true));
      previewUrl = URL.createObjectURL(f); player.src = previewUrl;
      info.hidden = playerBox.hidden = panel.hidden = false;
      refresh();
    } catch (e) {
      file = null; meta = null; panel.hidden = true;
      status.set('error', e instanceof Error ? e.message : 'This video could not be read.');
    } finally { input.dispose?.(); }
  }

  const dz = dropzone({
    kinds: ['mp4', 'webm'], multiple: false, maxBytes: LIMITS.videoBytes, title: 'Drop a video here',
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: ([v]) => load(v.file),
  });

  /* ---------- run ---------- */
  async function describe(blob: Blob): Promise<string> {
    const input = new Input({ source: new BlobSource(blob), formats: INPUT_FORMATS });
    try {
      const vt = await input.getPrimaryVideoTrack(); const at = await input.getPrimaryAudioTrack();
      const d = await input.computeDuration();
      const st = vt ? await vt.computePacketStats(150) : null;
      const bits = [vt ? `${vt.displayWidth}×${vt.displayHeight}` : 'no video', st && Number.isFinite(st.averagePacketRate) ? `${Math.round(st.averagePacketRate)} fps` : '', vt?.codec?.toUpperCase() ?? '', at ? `${at.codec?.toUpperCase() ?? 'audio'}` : 'no audio', st && Number.isFinite(st.averageBitrate) ? `${formatBitrate(st.averageBitrate)} video` : '', formatDuration(d)];
      return bits.filter(Boolean).join(' · ');
    } finally { input.dispose?.(); }
  }

  async function run() {
    if (!file || !meta) return;
    status.clear(); result.hidden = true; cancelled = false;
    const { plan, trimError } = currentPlan();
    if (trimError) return status.show('error', trimError);
    const trim = readTrim();
    const lossless = mode === 'lossless';
    if (!lossless && (!plan || plan.error)) return status.show('error', plan?.error ?? 'These settings cannot be used.');

    const fmt = formats.find((x) => x.id === formatSel.value) ?? formats[0];
    // Lossless mode keeps the source codec, so the container must be able to hold it.
    const container: 'mp4' | 'webm' = lossless ? (['vp8', 'vp9'].includes(meta.videoCodec) ? 'webm' : meta.videoCodec === 'av1' && file.type === 'video/webm' ? 'webm' : 'mp4') : fmt.container;
    const output = new Output({ format: container === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(), target: new BufferTarget() });
    const input = new Input({ source: new BlobSource(file), formats: INPUT_FORMATS });
    const started = performance.now();
    try {
      progress.set(0, 1000, 'Preparing…');
      const audioMode = audioSel.value as AudioMode;
      let audioOpts: Record<string, unknown> = {};
      if (!meta.src.hasAudio || audioMode === 'remove') audioOpts = { discard: true };
      else if (!lossless && audioMode !== 'keep') {
        const wanted = container === 'mp4' ? ['aac', 'opus'] : ['opus', 'vorbis'];
        let codec: string | undefined;
        for (const c of wanted) { if (await canEncodeAudio(c as never, { numberOfChannels: meta.channels || 2, sampleRate: meta.sampleRate || 48000 }).catch(() => false)) { codec = c; break; } }
        if (codec) audioOpts = { codec, quality: new Quality({ bitrate: plan!.audioBitrate || 96_000 }) };
        else status.show('warn', 'Your browser cannot re-encode audio here, so the original audio was kept.');
      }
      const conversion = await Conversion.init({
        input, output,
        video: lossless ? {} : {
          codec: fmt.id, forceTranscode: true,
          ...(plan!.scaled ? { width: plan!.width, height: plan!.height, fit: 'fill' as const } : {}),
          ...(plan!.resampled ? { frameRate: plan!.fps } : {}),
          quality: new Quality({ bitrate: plan!.videoBitrate, bitrateMode: 'variable' }),
        },
        audio: audioOpts,
        trim: trim.start !== undefined || trim.end !== undefined ? { start: trim.start, end: trim.end } : undefined,
        copy: lossless ? { mode: 'forced' } : undefined,
        showWarnings: false,
      });
      running = conversion;
      if (cancelled) throw new ConversionCanceledError();
      const videoDiscarded = conversion.discardedTracks.some((d) => d.track.type === 'video');
      if (!conversion.isValid || videoDiscarded) {
        const why = conversion.discardedTracks.find((d) => d.track.type === 'video')?.reason;
        throw new Error(lossless ? 'Lossless mode is not possible for this video (it cannot be copied into this container). Use a quality preset instead.'
          : why === 'undecodable_source_codec' ? 'Your browser cannot decode this video, so it cannot be compressed here.'
          : why === 'no_encodable_target_codec' ? 'Your browser cannot encode with these settings. Try another output format or resolution.'
          : 'These settings cannot be applied to this video. Try different options.');
      }
      conversion.onProgress = (p) => {
        const elapsed = (performance.now() - started) / 1000;
        const eta = p > 0.03 ? Math.max(0, elapsed / p - elapsed) : NaN;
        progress.set(Math.round(p * 1000), 1000, `Compressing… ${Math.round(p * 100)}%${Number.isFinite(eta) ? ` · about ${formatDuration(eta)} left` : ''}`);
      };
      cancelBtn.hidden = false; goBtn.disabled = true;
      await conversion.execute();
      const buffer = output.target.buffer;
      if (!buffer) throw new Error('The compressed video could not be created.');
      const blob = new Blob([buffer], { type: container === 'mp4' ? 'video/mp4' : 'video/webm' });
      await showResult(blob, container, lossless, performance.now() - started);
    } catch (e) {
      if (e instanceof ConversionCanceledError || cancelled) status.show('info', 'Cancelled. Nothing was saved.');
      else status.show('error', e instanceof Error ? e.message : 'The video could not be compressed.');
    } finally {
      running = null; cancelBtn.hidden = true; progress.hide(); input.dispose?.();
      goBtn.disabled = false; refresh();
    }
  }

  async function showResult(blob: Blob, container: 'mp4' | 'webm', lossless: boolean, ms: number) {
    if (!file || !meta) return;
    const trim = readTrim();
    const expected = trimmedDuration(meta.src.duration, trim.start, trim.end);
    const origShare = file.size * (expected / Math.max(0.001, meta.src.duration)); // the part of the original that was kept
    const saved = 1 - blob.size / origShare;
    const name = `${safeBaseName(file.name, 'video')}-${lossless ? 'trimmed' : 'compressed'}.${container}`;
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    const summary = await describe(blob).catch(() => '');
    const better = blob.size < origShare;
    result.replaceChildren(
      h('div', { class: `notice ${better ? 'notice-success' : 'notice-warn'}` }, h('span', {
        text: better ? `Done in ${formatDuration(ms / 1000)}. ${formatBytes(file.size)} → ${formatBytes(blob.size)} (${Math.round(saved * 100)}% smaller).`
          : `Done, but the result (${formatBytes(blob.size)}) is not smaller than the original${expected < meta.src.duration - 1 ? ' part you kept' : ''} (${formatBytes(Math.round(origShare))}). This video was already efficiently compressed. Try a smaller preset, a lower resolution or a target size, or keep the original.` })),
      h('div', { class: 'result-grid' }, stat('Original', formatBytes(file.size)), stat('Result', formatBytes(blob.size), true), stat(better ? 'Saved' : 'Change', `${better ? '' : '+'}${Math.abs(Math.round(saved * 100))}%`)),
      h('p', { class: 'hint', style: 'margin-top:10px', text: summary ? `Output: ${summary}` : '' }),
      h('div', { class: 'video-box', style: 'margin-top:14px' }, h('video', { controls: true, preload: 'metadata', playsinline: true, src: resultUrl, 'aria-label': 'Preview of the compressed video' })),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => downloadBlob(blob, name) }, `Download ${container.toUpperCase()}`),
        h('span', { class: 'hint', text: `${name} · ${formatBytes(blob.size)}` })));
    result.hidden = false;
    result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  goBtn.addEventListener('click', () => withBusy(goBtn, 'Compressing…', run));
  cancelBtn.addEventListener('click', async () => { cancelled = true; cancelBtn.disabled = true; try { await running?.cancel(); } catch { /* already finished */ } cancelBtn.disabled = false; });
  window.addEventListener('pagehide', revoke);

  /* ---------- layout ---------- */
  if (!supported) {
    status.show('error', 'Your browser does not support the video features this tool needs (WebCodecs). Please use a current version of Chrome, Edge or Safari on a computer or recent phone.');
  }
  root.append(supported ? dz.el : h('div'), status.el, info, playerBox, panel, progress.el, result);
}
