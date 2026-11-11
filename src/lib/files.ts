/** Content-based file validation. Never trusts the extension or the browser-reported MIME type alone. */
export type FileKind = 'pdf' | 'jpeg' | 'png' | 'webp';

export const MB = 1024 * 1024;
export const LIMITS = {
  pdfBytes: 100 * MB,
  imageBytes: 30 * MB,
  base64Bytes: 10 * MB,
  maxFiles: 30,
  /** Largest image area (pixels) we will decode onto a canvas; guards against out-of-memory crashes. */
  maxPixels: 100_000_000,
} as const;

export async function sniffKind(file: Blob): Promise<FileKind | null> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  const asc = (from: number, len: number) => String.fromCharCode(...head.slice(from, from + len));
  if (head.length >= 5 && asc(0, 1024).includes('%PDF-')) return 'pdf';
  if (head.length >= 8 && head[0] === 0x89 && asc(1, 3) === 'PNG') return 'png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head.length >= 12 && asc(0, 4) === 'RIFF' && asc(8, 4) === 'WEBP') return 'webp';
  return null;
}

export const KIND_LABEL: Record<FileKind, string> = { pdf: 'PDF', jpeg: 'JPG', png: 'PNG', webp: 'WebP' };
export const KIND_MIME: Record<Exclude<FileKind, 'pdf'>, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const KIND_EXT: Record<FileKind, string> = { pdf: 'pdf', jpeg: 'jpg', png: 'png', webp: 'webp' };

export interface ValidatedFile { file: File; kind: FileKind }
export interface ValidationOptions { kinds: FileKind[]; maxBytes: number; maxFiles?: number; existing?: number }

export async function validateFiles(files: File[], opts: ValidationOptions): Promise<{ accepted: ValidatedFile[]; errors: string[] }> {
  const accepted: ValidatedFile[] = [];
  const errors: string[] = [];
  const room = (opts.maxFiles ?? LIMITS.maxFiles) - (opts.existing ?? 0);
  const allowed = opts.kinds.map((k) => KIND_LABEL[k]).join(', ');
  for (const file of files) {
    const name = file.name.slice(0, 60);
    if (accepted.length >= room) { errors.push(`Only ${opts.maxFiles ?? LIMITS.maxFiles} files are allowed at once; "${name}" was skipped.`); continue; }
    if (file.size === 0) { errors.push(`"${name}" is empty.`); continue; }
    if (file.size > opts.maxBytes) { errors.push(`"${name}" is larger than the ${Math.round(opts.maxBytes / MB)} MB limit.`); continue; }
    const kind = await sniffKind(file);
    if (!kind || !opts.kinds.includes(kind)) { errors.push(`"${name}" is not a supported file. Accepted: ${allowed}.`); continue; }
    accepted.push({ file, kind });
  }
  return { accepted, errors };
}
