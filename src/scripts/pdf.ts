/** PDF helpers: friendly error mapping, pdf-lib loading and pdf.js rendering. Loaded only by PDF tools. */
import { PDFDocument, EncryptedPDFError } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const MAX_RENDER_PIXELS = 25_000_000;

export function pdfErrorMessage(err: unknown, name = 'This PDF'): string {
  if (err instanceof EncryptedPDFError) return `${name} is password-protected. Remove the password in a PDF viewer first, then try again.`;
  const e = err as { name?: string; message?: string };
  if (e?.name === 'PasswordException') return `${name} is password-protected. Remove the password in a PDF viewer first, then try again.`;
  if (e?.name === 'InvalidPDFException' || /No PDF header|Invalid PDF|Failed to parse|Expected instance of PDFDict|Invalid object ref/i.test(e?.message ?? '')) return `${name} appears to be damaged or is not a valid PDF.`;
  if (e?.name === 'RangeError' || /memory|allocation/i.test(e?.message ?? '')) return 'Your device ran out of memory. Try a smaller file or fewer files.';
  return e?.message ? `${name} could not be processed: ${e.message}` : `${name} could not be processed.`;
}

export async function loadPdfLib(file: Blob): Promise<PDFDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
}

export async function openPdfJs(file: Blob) {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data, isEvalSupported: false, useSystemFonts: false,
    cMapUrl: '/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdfjs/standard_fonts/',
  });
  return task.promise;
}
export type PdfJsDocument = Awaited<ReturnType<typeof openPdfJs>>;

/** Render one page (1-based) to a canvas at `scale` (1 = 72 DPI), scaling down if it would exceed the pixel budget. */
export async function renderPage(doc: PdfJsDocument, pageNumber: number, scale: number, background?: string) {
  const page = await doc.getPage(pageNumber);
  let viewport = page.getViewport({ scale });
  let scaledDown = false;
  const px = viewport.width * viewport.height;
  if (px > MAX_RENDER_PIXELS) {
    viewport = page.getViewport({ scale: scale * Math.sqrt(MAX_RENDER_PIXELS / px) });
    scaledDown = true;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d', { alpha: !background });
  if (!ctx) throw new Error('Your browser could not start its drawing surface.');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  await page.render({ canvasContext: ctx, viewport }).promise;
  const base = page.getViewport({ scale: 1 });
  page.cleanup();
  return { canvas, scaledDown, widthPt: base.width, heightPt: base.height };
}

export { PDFDocument };
