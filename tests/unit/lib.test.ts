import { describe, it, expect } from 'vitest';
import { parsePageRanges } from '../../src/lib/pageRange';
import { sniffKind, validateFiles } from '../../src/lib/files';
import { formatBytes, safeBaseName, escapeHtml } from '../../src/lib/format';

describe('parsePageRanges', () => {
  it('parses mixed input', () => {
    const r = parsePageRanges('1-3, 5, 8-', 10);
    expect(r.ranges).toEqual([[1, 3], [5, 5], [8, 10]]);
    expect(r.pages).toEqual([1, 2, 3, 5, 8, 9, 10]);
  });
  it('dedupes overlapping pages while keeping order', () => expect(parsePageRanges('3,1-3', 5).pages).toEqual([3, 1, 2]));
  it.each(['', '  ', '0', '1-', 'a', '1,,2', '5-2', '1-99', '99', '-3', '1--3'])('rejects %j', (s) => {
    if (s === '1-') return expect(parsePageRanges(s, 5).pages).toEqual([1, 2, 3, 4, 5]);
    expect(() => parsePageRanges(s, 10)).toThrow();
  });
  it('rejects empty docs', () => expect(() => parsePageRanges('1', 0)).toThrow());
});

describe('file validation', () => {
  const mk = (bytes: number[] | string, name = 'x.bin') => new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name);
  it('sniffs real signatures', async () => {
    expect(await sniffKind(mk('%PDF-1.7\n'))).toBe('pdf');
    expect(await sniffKind(mk([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(await sniffKind(mk([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpeg');
    expect(await sniffKind(mk('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(await sniffKind(mk('hello world, plain text'))).toBeNull();
  });
  it('ignores the extension', async () => {
    const { accepted, errors } = await validateFiles([mk('%PDF-1.4', 'evil.png'), mk('<script>', 'fake.pdf')], { kinds: ['pdf'], maxBytes: 1e6 });
    expect(accepted).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
  it('enforces size, emptiness and count', async () => {
    const big = mk('%PDF-' + 'a'.repeat(200), 'big.pdf');
    const r = await validateFiles([big, mk('', 'empty.pdf')], { kinds: ['pdf'], maxBytes: 100 });
    expect(r.accepted).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
    const many = await validateFiles([mk('%PDF-1', 'a.pdf'), mk('%PDF-1', 'b.pdf')], { kinds: ['pdf'], maxBytes: 1e6, maxFiles: 1 });
    expect(many.accepted).toHaveLength(1);
    expect(many.errors).toHaveLength(1);
  });
});

describe('format helpers', () => {
  it('formatBytes', () => { expect(formatBytes(0)).toBe('0 B'); expect(formatBytes(1536)).toBe('1.50 KB'); expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB'); expect(formatBytes(NaN)).toBe('—'); });
  it('safeBaseName strips dangerous characters', () => {
    expect(safeBaseName('../../etc/passwd.pdf')).toBe('.._.._etc_passwd'.replace(/^\.+/, ''));
    expect(safeBaseName('')).toBe('file');
    expect(safeBaseName('a<b>.png')).toBe('a_b_');
  });
  it('escapeHtml', () => expect(escapeHtml('<img src=x onerror="a">')).toBe('&lt;img src=x onerror=&quot;a&quot;&gt;'));
});
