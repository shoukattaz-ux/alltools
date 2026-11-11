---
title: "How to Convert PDF Pages to JPG or PNG Images"
description: "Learn when to convert PDF pages to images, how to choose between PNG and JPG, which resolution to use, and what to do about large output files."
date: "2026-11-11"
topic: "PDF"
tools: ["pdf-to-image", "image-compressor", "image-to-pdf"]
readingMinutes: 5
---

Some places accept pictures but not PDFs: social posts, presentation slides, website content, some e-commerce and chat tools. Converting a page of a PDF into an image solves that.

## Choose your format

- **PNG** keeps text and lines perfectly crisp and is lossless. Files are larger.
- **JPG** produces smaller files and suits pages dominated by photographs. At low quality, text edges develop visible artefacts.

If the page is mostly text or a chart, choose PNG. If it is a photo spread, JPG is fine.

## Choose your resolution

PDFs are measured in points (1/72 inch), so the resolution you choose decides the pixel size:

| DPI | A4 page size (approx.) | Good for |
| --- | --- | --- |
| 72 | 595 × 842 px | Quick previews |
| 150 | 1240 × 1754 px | Web, slides, chat |
| 300 | 2480 × 3508 px | Printing |

Higher DPI creates much bigger files, because the number of pixels grows with the square of the resolution.

## Step by step

1. Open the [PDF to Image converter](/tools/pdf-to-image/) and add your file.
2. Pick the pages. Typing `2-4, 9` converts those pages only.
3. Select the format and DPI, then convert.
4. Download single images or the ZIP.

## Reducing the size afterwards

If the images are too large for the destination, resize them with the [Image Resizer](/tools/image-resizer/) or compress them with the [Image Compressor](/tools/image-compressor/). Converting PNG to WebP or JPG can also help.

## Going the other way

To combine images into a PDF again, use the [Image to PDF converter](/tools/image-to-pdf/).

## What to expect

- The result is a picture: the text in it can no longer be selected or searched. Keep the original PDF if you need that.
- Very large pages are scaled down automatically at high DPI to avoid exhausting memory. The tool tells you when that happens.
- Rare PDF features may render slightly differently from your desktop viewer. Check the output.

## FAQ

### Can I extract only the embedded photos from a PDF?

This tool renders whole pages. It does not extract individual embedded pictures.

### Why is my PNG so big?

PNG is lossless and the page is large. Lower the DPI, or choose JPG.

### Are my PDFs uploaded?

Not with this tool. Pages are rendered in your browser.
