---
title: "What Is Base64? When to Use Images as Data URIs"
description: "Base64 turns binary files into text. Learn what a data URI is, why it adds about a third to the size, and when embedding images this way helps or hurts."
date: "2026-11-20"
topic: "Images"
tools: ["image-to-base64", "image-converter", "image-compressor", "image-resizer"]
readingMinutes: 6
---

You may have seen a very long line of random-looking letters inside a web page or an API request, starting with `data:image/png;base64,`. That is an image written as text. This guide explains what it is, why it exists, and when it is a good idea.

## What Base64 is

Computers store images as bytes. Some places only accept plain text: JSON, HTML attributes, email bodies. **Base64** is a way of writing any bytes using only 64 safe characters (letters, digits, `+` and `/`). It is encoding, not encryption. Anyone can decode it, so it hides nothing.

## Size: about 33% bigger

Base64 writes every 3 bytes as 4 characters, so the text is about **one third larger** than the original file. A 30 KB icon becomes roughly 40 KB of text.

## What a data URI is

A data URI wraps the Base64 text with a label so a browser can use it directly as a file:

```
data:image/png;base64,iVBORw0KGgo...
```

You can use it in an HTML image tag or a CSS background without a separate image file. The [Image to Base64 converter](/tools/image-to-base64/) gives you four styles: the full data URI, the raw Base64, an HTML `<img>` tag and a CSS rule.

## When it helps

- **Tiny icons and logos** that appear on every page, where saving a network request matters more than the extra third.
- **Emails and standalone HTML files** that must work without outside files.
- **APIs and JSON** that accept images as text fields. Check what the API expects: some want the raw Base64 without the `data:` prefix.
- **Single-file prototypes** and tests.

## When it hurts

- **Large images.** A 500 KB photo becomes about 670 KB of text and slows the page down.
- **Caching.** A normal image file is cached once and reused on every page. A data URI embedded in a page is downloaded again with each page that contains it.
- **Editing.** A huge text block in your code is hard to read and review.

A good rule: use data URIs for images under a few kilobytes. For anything bigger, use a normal file.

## Make the image small first

Base64 multiplies whatever you give it, so shrink first:

1. Resize to the displayed size with the [Image Resizer](/tools/image-resizer/).
2. Compress with the [Image Compressor](/tools/image-compressor/) or convert to WebP with the [Image Format Converter](/tools/image-converter/). See [JPG vs PNG vs WebP](/blog/jpg-vs-png-vs-webp/) for the trade-offs.
3. Then encode.

## Decoding it back

To turn Base64 into a picture again, paste a full data URI into your browser's address bar, or use it as the source of an image tag. This tool encodes only.

## FAQ

### Is Base64 secure?

No. It is trivially reversible. Never use it to hide private data.

### Does my image get uploaded when I encode it?

Not with our tool. The file is read in your browser and encoded locally.

### Which images work?

JPG, PNG and WebP, up to 10 MB. For big files, a normal image file is almost always the better choice.
