---
title: "How to Extract Pages From a PDF (Split by Page Range)"
description: "Pull out just the pages you need from a PDF: write page ranges, keep a custom order, split into several files, and avoid the common mistakes."
date: "2026-11-20"
topic: "PDF"
tools: ["split-pdf", "merge-pdf", "compress-pdf"]
readingMinutes: 5
---

You rarely need a whole PDF. Maybe you want the signature page of a contract, one chapter of a report, or pages 3 to 7 of a long manual. Extracting pages gives you a smaller file that is easier to send, print and review.

## The quick way

1. Open the [PDF Splitter](/tools/split-pdf/) and add your file. The page count appears straight away.
2. Type the pages you want, for example `2-4, 9`.
3. Choose one combined PDF, or one separate PDF per range.
4. Download the result. Your original is never changed.

The tool runs in your browser, so a confidential document is not uploaded anywhere.

## How page ranges work

Separate items with commas:

| You type | You get |
| --- | --- |
| `5` | Page 5 only |
| `2-6` | Pages 2, 3, 4, 5 and 6 |
| `9-` | Page 9 to the last page |
| `1-3, 7, 10-` | Pages 1 to 3, page 7, and page 10 to the end |

Pages come out in the order you type them, so `5, 1-2` puts page 5 first. A page typed twice is included once.

### Removing pages instead

There is no "delete" box, but you can get the same result by choosing everything else. To drop page 4 from a 10-page document, type `1-3, 5-`.

## Splitting into several files

If you type `1-10, 11-24, 25-40` and choose "a separate PDF for each range", you receive a ZIP with three files. This suits a report that must be sent to different people in sections.

## Common mistakes

### The range is out of bounds

If the document has 8 pages and you type `9`, the tool tells you the page does not exist. Check the page count shown after you add the file.

### Page numbers on the page differ from PDF page numbers

A book might show "page 1" on the third physical page because of a cover and contents. The tool uses the physical position in the file, counting from 1. Look at the page number in your PDF viewer's toolbar, not the printed one.

### The PDF is password-protected

Encrypted PDFs cannot be processed. Remove the password in a PDF viewer first, if you are allowed to.

## After you extract

- To combine extracted pieces from several documents, use the [PDF Merger](/tools/merge-pdf/). Read [how to merge PDFs without losing quality](/blog/how-to-merge-pdf-files/).
- If the result is still too large for email, see [how to reduce PDF size](/blog/reduce-pdf-size-for-email/).

## What may not carry over

Links, bookmarks and form fields that point to pages outside your selection are not kept. Check the extracted file in a viewer before you send it.

## FAQ

### Does extracting pages reduce quality?

No. Pages are copied as they are, without re-compressing images or text.

### Can I extract pages from a scanned PDF?

Yes. A scan is just pages made of images, and they are copied the same way.

### Is there a page limit?

There is no fixed limit. Each file can be up to 100 MB, and your device's memory is the practical limit.
