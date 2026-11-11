/** Parse page selections such as "1-3, 5, 8-" into 1-based page numbers. */
export interface PageSelection { ranges: Array<[number, number]>; pages: number[] }

export function parsePageRanges(input: string, pageCount: number): PageSelection {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error('The document has no pages.');
  const text = (input ?? '').trim();
  if (!text) throw new Error('Enter at least one page or range, for example 1-3, 5.');
  const ranges: Array<[number, number]> = [];
  for (const raw of text.split(',')) {
    const token = raw.trim();
    if (!token) throw new Error('Remove the extra comma in your page list.');
    const m = /^(\d+)(?:\s*-\s*(\d*))?$/.exec(token);
    if (!m) throw new Error(`"${token.slice(0, 20)}" is not a valid page or range. Use numbers like 3 or 2-6.`);
    const start = Number(m[1]);
    const end = m[2] === undefined ? start : m[2] === '' ? pageCount : Number(m[2]);
    if (start < 1 || end < 1) throw new Error('Page numbers start at 1.');
    if (start > pageCount || end > pageCount) throw new Error(`This document has ${pageCount} page${pageCount === 1 ? '' : 's'}; "${token}" is out of range.`);
    if (end < start) throw new Error(`"${token}" is backwards. Write the lower page number first.`);
    ranges.push([start, end]);
  }
  const seen = new Set<number>();
  const pages: number[] = [];
  for (const [s, e] of ranges) for (let p = s; p <= e; p++) if (!seen.has(p)) { seen.add(p); pages.push(p); }
  return { ranges, pages };
}
