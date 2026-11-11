---
title: "How to Reduce PDF File Size for Email and Uploads"
description: "Why PDFs get large, which compression methods exist, and how to choose between lossless clean-up and image-based compression for the best result."
date: "2026-11-11"
topic: "PDF"
tools: ["compress-pdf", "image-compressor", "merge-pdf"]
readingMinutes: 6
---

Email services and web forms often reject large attachments, and the limits vary by provider. When a PDF is too big, the right fix depends on *why* it is big. This guide explains the causes and the trade-offs.

## Why PDFs get large

- **Scanned pages.** A scanner or phone app stores each page as a photograph. A 20-page scan can be tens of megabytes.
- **High-resolution images.** Photos pasted into a document at full camera resolution.
- **Embedded fonts.** Usually a small share, but many different fonts add up.
- **Wasteful structure.** Some tools write inefficient files that can be re-packed without any visible change.

A text-only PDF is typically small. A scan is typically large. Diagnose first, then choose a method.

## The two kinds of PDF compression

### Lossless clean-up

This re-writes the file structure more efficiently without touching page content. Nothing visible changes, and text remains selectable. The catch: if the size is mostly photographic data, there is little to gain. It is the right first try for text-based documents.

### Image-based compression

Every page is rendered to a picture, compressed as a JPEG at a chosen resolution, and rebuilt into a PDF. For scans this can reduce size dramatically, because scans are pictures already. The costs are real, so be aware of them:

- Text is no longer selectable or searchable.
- Links and form fields disappear.
- Fine print becomes softer, more so at lower settings.
- A text-based PDF can become *larger*, because a rendered picture of text can take more space than the text itself.

The [PDF Compressor](/tools/compress-pdf/) offers both and displays the real before and after size, so you can see whether the trade is worthwhile.

## A practical decision guide

1. Is the text selectable in your PDF viewer? If so, try **lossless clean-up** first.
2. Is it a scan or full of photos? Try **Balanced**. Zoom in and check that numbers, signatures and small print are still readable.
3. Still too large? Use **Smallest**, or split the document with the [PDF Splitter](/tools/split-pdf/) and send it in two emails.
4. Not smaller than the original? Keep the original.

## Prevent the problem at the source

- Scan at 150 DPI for ordinary documents. 300 DPI is mainly needed for print-quality archiving.
- Scan in black and white for text-only pages.
- Resize and compress photos with the [Image Compressor](/tools/image-compressor/) before inserting them into a document.

## FAQ

### Will the compressed PDF look the same?

Lossless clean-up looks identical. Image-based modes will look slightly softer, depending on the level.

### Can I compress a legal or official document?

Check the requirements first. Some authorities require searchable text or an unaltered original. In that case, send the original through another channel or split it.

### Is there a guaranteed size reduction?

No. Results depend on the content. The tool reports exactly what was achieved, including when no saving was possible.
