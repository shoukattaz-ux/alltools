---
title: "Are Online PDF and Image Tools Safe? How to Check"
description: "What happens to your files in an online tool, how local browser processing differs from server uploads, and a checklist for sensitive documents."
date: "2026-11-11"
topic: "Privacy"
tools: ["merge-pdf", "compress-pdf", "image-compressor"]
readingMinutes: 6
---

PDFs often contain exactly the details you would least like to leak: ID numbers, contracts, bank statements, medical letters. Before dropping such a file into a website, it helps to know how the tool works.

## Two very different designs

### Server-side tools

You upload the file, a company's server processes it, and you download the result. This is how many older tools work. Whatever the site promises, your document has left your device and sits, at least briefly, on someone else's computer. You are trusting their retention policy, security and staff.

### Browser-side (local) tools

The website sends you code, and that code processes the file inside your browser. The file is read from your disk into the browser's memory, the result is created there, and you save it. No document content is transmitted. This is how the tools on this site work.

## How to verify a "private" claim yourself

You do not have to take anyone's word for it:

1. Open your browser's developer tools (usually F12) and select the **Network** tab.
2. Process a small, non-sensitive test file.
3. Watch the requests. A genuinely local tool will not send your file's contents anywhere. You will see only the page's own scripts and assets loading.
4. Even better: load the tool page, turn off your internet connection, and try it. A local tool will still work.

## A checklist before using any online tool

- Does the page say plainly whether files are uploaded? Vague wording is a warning sign.
- Is the connection HTTPS?
- Is there a privacy policy that matches what you observe?
- Does the site push unrelated downloads or "install our app" prompts? Avoid it.
- For anything truly sensitive (passport scans, medical records), consider offline software.

## What local processing does not do

Local processing protects the file from being uploaded. It does not make your device safer: if your computer has malware, it can still see your files. Also, shared computers keep downloads in the Downloads folder until you delete them.

## Metadata: the quiet leak

Files carry hidden data. Photos can include GPS coordinates and the camera model; PDFs can include the author's name and the software used. Re-encoding images through a browser canvas removes photo metadata. For PDFs, check the document properties before sharing.

## FAQ

### Is a "delete after one hour" promise good enough?

It is better than nothing, but it still requires trust. If you can avoid uploading at all, that is safer.

### Do local tools work offline?

After the page and its scripts have loaded, the processing itself does not need the internet, although the first load does.

### Does this site store my files?

No. Files are processed in your browser and are not sent to our servers. See the [Privacy Policy](/privacy/) for details.
