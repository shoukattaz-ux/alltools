export type Category = 'pdf' | 'image' | 'calculator';
export interface Faq { q: string; a: string }
export interface Tool {
  slug: string;
  name: string;
  category: Category;
  icon: string;
  /** One-line card description. */
  short: string;
  /** Page <title> without the brand suffix. */
  seoTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  /** True when the tool processes files on the user's device. */
  local: boolean;
  steps: string[];
  features: string[];
  examples: { title: string; body: string }[];
  limits?: string[];
  faqs: Faq[];
  related: string[];
  search: string;
}

export const CATEGORIES: Record<Category, { name: string; path: string; title: string; description: string; blurb: string }> = {
  pdf: {
    name: 'PDF tools', path: '/pdf-tools/', title: 'Free Online PDF Tools',
    description: 'Merge, split, compress, sign and convert PDF files in your browser. No uploads, no sign-up: your documents stay on your device.',
    blurb: 'Combine documents, pull out the pages you need, sign them, shrink large files for email, or turn pages into images. Everything runs in your browser, so confidential documents are never sent to a server.',
  },
  image: {
    name: 'Image tools', path: '/image-tools/', title: 'Free Online Image Tools',
    description: 'Compress, resize, crop and convert JPG, PNG and WebP images in your browser. Private, fast and free, with no uploads.',
    blurb: 'Prepare photos and graphics for websites, email and social media. Resize to exact dimensions, crop to a ratio, change formats and cut file size, all locally in your browser.',
  },
  calculator: {
    name: 'Calculators', path: '/calculators/', title: 'Free Online Calculators',
    description: 'Free BMI, percentage, age and discount calculators with clear formulas and stated assumptions. Instant results, nothing stored.',
    blurb: 'Quick, transparent calculators for everyday questions. Each page states its formula and assumptions, and your inputs never leave your device.',
  },
};

export const TOOLS: Tool[] = [
  /* ------------------------------- PDF ------------------------------- */
  {
    slug: 'merge-pdf', name: 'PDF Merger', category: 'pdf', icon: 'merge',
    short: 'Combine several PDFs into one document, in the order you choose.',
    seoTitle: 'Merge PDF Files Online (Free, Private)',
    metaDescription: 'Combine multiple PDF files into one document in your browser. Reorder files, merge instantly and download. Free, no sign-up, and your files are never uploaded.',
    h1: 'Merge PDF Files Online',
    intro: 'Join two or more PDF files into a single document. Add your files, put them in the right order, and download the combined PDF. The merge happens inside your browser, so your documents are not uploaded anywhere.',
    local: true,
    steps: ['Select or drag in two or more PDF files.', 'Use the up and down arrows to arrange them in the order you want. Pages keep their original order inside each file.', 'Choose "Merge PDFs".', 'Download the merged file when it is ready.'],
    features: ['Combine up to 30 PDFs per merge, up to 100 MB each.', 'Reorder or remove files before merging.', 'Shows each file\'s page count so you can check the total.', 'Processing happens on your device. Nothing is uploaded.', 'Pages, text and images are copied unchanged. Nothing is re-compressed.'],
    examples: [
      { title: 'Assemble a job application', body: 'Merge your cover letter, CV and certificates into one PDF so the recruiter opens a single attachment.' },
      { title: 'Bundle monthly invoices', body: 'Combine twelve monthly invoices into one annual file for your accountant, ordered January to December.' },
    ],
    limits: ['Password-protected (encrypted) PDFs cannot be merged. Remove the password first.', 'Form fields, bookmarks and tagged-accessibility structure from the source files may not carry over into the merged file.', 'Very large merges use your device\'s memory. If a merge fails, try fewer or smaller files.'],
    faqs: [
      { q: 'Are my PDFs uploaded to a server?', a: 'No. The files are read and combined by code running in your browser tab. Closing the tab discards everything.' },
      { q: 'Will merging reduce the quality?', a: 'No. Pages are copied as they are, without re-rendering or re-compressing images, so the quality is the same as in the originals.' },
      { q: 'Why does my PDF fail to load?', a: 'The most common reasons are that the file is password-protected, damaged, or is not really a PDF. Open it in a PDF viewer to check, and remove any password.' },
      { q: 'Is there a limit on the number of pages?', a: 'There is no fixed page limit, but each file can be up to 100 MB and you can merge up to 30 files at once. Your device\'s available memory is the practical limit.' },
    ],
    related: ['split-pdf', 'sign-pdf', 'compress-pdf', 'image-to-pdf'],
    search: 'merge combine join pdf files together concatenate',
  },
  {
    slug: 'sign-pdf', name: 'PDF Signer', category: 'pdf', icon: 'sign',
    short: 'Add a drawn or typed signature, an image, or a date and text stamp to a PDF.',
    seoTitle: 'Sign PDF Online: Add Signature, Date & Stamp',
    metaDescription: 'Sign a PDF in your browser: draw or type a signature, add a photo of one, or stamp a date or text. Move, resize and rotate, then download. Files are not uploaded.',
    h1: 'Sign a PDF Online',
    intro: 'Open a PDF, place your signature where it belongs, and download the signed copy. You can draw or type a signature, insert a picture of a handwritten one, and add date or text stamps such as APPROVED. Everything happens in your browser, so the document is never uploaded.',
    local: true,
    steps: ['Select your PDF, or choose "Try a sample agreement" to practise. The first page appears.', 'Choose "Draw or type signature", "Add image" or "Add date or text". The item is placed in the middle of the current page.', 'Drag it into position. Use the round corner handle to resize, the top handle to rotate, or the buttons under the page. Use "Copy to all pages" for initials.', 'Switch pages with the page menu, then choose "Sign and download PDF".'],
    features: ['Draw with a mouse, finger or stylus (undo, clear, five colours, three pen thicknesses), or type your name in a handwriting-style font.', 'Insert a photo of a signature, stamp or logo, with automatic background removal and margin trimming.', 'Date stamps in four formats and custom text stamps with colour, bold and italic.', 'Move, resize, rotate and delete items; keyboard arrows and Delete also work. Place items on any page.', 'Optionally save signatures in this browser for reuse.', 'Signs the original pages directly, so existing text stays selectable and file size barely changes.', 'A built-in fictional sample agreement to practise with, and a Share button on phones and tablets that support it.'],
    examples: [
      { title: 'Return a signed contract', body: 'Draw your signature, drag it onto the signature line on the last page, add a date stamp beside it, and send the signed PDF back.' },
      { title: 'Initial every page', body: 'Insert your initials once, position them in the footer, and choose "Copy to all pages".' },
      { title: 'Stamp a document APPROVED', body: 'Choose a text stamp, pick the preset, set the colour to green, and place it in the top corner.' },
    ],
    limits: ['This adds a picture of your signature. It is not a cryptographic digital signature or certificate-based signature, and it does not make the document tamper-evident.', 'Whether an image signature is legally acceptable depends on the document, the recipient and your country. Some situations require a qualified or certified electronic signature, a witness, or an original.', 'Password-protected (encrypted) PDFs cannot be opened. Fillable form fields are left as they are; this tool does not fill them in.', 'Typed signatures use a handwriting-style font that your device provides, so the look differs between devices.', 'Saved signatures are kept in this browser\'s local storage on this device only. Clearing site data deletes them, and they do not follow you to other devices.'],
    faqs: [
      { q: 'Is my document uploaded?', a: 'No. The PDF is opened and signed by code running in your browser. Nothing is sent to a server, and nothing is kept after you close the tab, except signatures you choose to save in your own browser.' },
      { q: 'Is this a legally binding signature?', a: 'It places an image of your signature on the page. Many everyday documents accept this, but legal requirements vary by country and document type, and some require a qualified electronic signature or a wet-ink original. Check with the recipient or a legal professional if it matters.' },
      { q: 'Does it change the rest of my PDF?', a: 'No. Your pages, text and images are kept as they are. The signature, image or stamp is added on top of the page content you choose.' },
      { q: 'Can I sign with my phone?', a: 'Yes. The signature pad responds to touch and stylus, and the layout adapts to small screens. Drag items with one finger.' },
      { q: 'Can I remove a signature after downloading?', a: 'The signed PDF has the items added into the page, so they cannot be moved afterwards. Keep your original, and use this tool again from the original if you need changes.' },
      { q: 'How do I make a photographed signature transparent?', a: 'Sign on plain white paper in good light, take a straight-on photo, choose "Add image", and keep "Remove background" ticked. Check the preview before inserting.' },
    ],
    related: ['merge-pdf', 'compress-pdf', 'image-to-pdf', 'split-pdf'],
    search: 'sign pdf signature esign electronic sign add signature stamp date initials fill',
  },
  {
    slug: 'split-pdf', name: 'PDF Splitter', category: 'pdf', icon: 'split',
    short: 'Extract chosen pages or page ranges from a PDF.',
    seoTitle: 'Split PDF & Extract Pages Online (Free)',
    metaDescription: 'Extract pages from a PDF by range, such as 1-3, 5, 8-10. Download one file or a ZIP of separate parts. Free, private, runs in your browser.',
    h1: 'Split a PDF and Extract Pages',
    intro: 'Pull out only the pages you need from a PDF. Type the page numbers or ranges you want, and download them as one new PDF or as separate files. Your document stays on your device throughout.',
    local: true,
    steps: ['Select a PDF. The page count appears as soon as it loads.', 'Type the pages to keep, for example "1-3, 5, 8-". A trailing dash means "to the last page".', 'Choose whether you want one PDF with all selected pages, or a separate PDF for each range (downloaded as a ZIP).', 'Select "Extract pages" and download the result.'],
    features: ['Flexible ranges: single pages, spans and open-ended ranges.', 'Pages can be extracted in any order you type them.', 'Output as one combined PDF or one PDF per range.', 'Clear messages for invalid or out-of-range input.', 'Runs locally in your browser.'],
    examples: [
      { title: 'Send only the signature page', body: 'Enter the last page number of a contract to extract just the page that needs signing.' },
      { title: 'Split a report into chapters', body: 'Type "1-10, 11-24, 25-40" and choose "separate PDF for each range" to get three chapter files in one ZIP.' },
    ],
    limits: ['Encrypted PDFs cannot be processed until the password is removed.', 'Bookmarks and links that point to pages outside the extracted selection are not kept.'],
    faqs: [
      { q: 'How do I write the page ranges?', a: 'Separate items with commas. "4" is one page, "2-6" is pages 2 to 6, and "9-" is page 9 to the end. Example: 1-3, 7, 10-.' },
      { q: 'Does the original file change?', a: 'No. Your original stays untouched; the tool creates a new file for download.' },
      { q: 'Can I reorder pages?', a: 'Yes. Pages are output in the order you type them, so "5, 1-2" gives page 5 first and then pages 1 and 2. Repeated pages are included once.' },
      { q: 'Is my PDF uploaded?', a: 'No. The splitting is done with code in your browser, and nothing is sent to a server.' },
    ],
    related: ['merge-pdf', 'pdf-to-image', 'compress-pdf'],
    search: 'split extract pages pdf separate divide cut range',
  },
  {
    slug: 'compress-pdf', name: 'PDF Compressor', category: 'pdf', icon: 'compress',
    short: 'Reduce PDF file size with lossless clean-up or stronger image-based compression.',
    seoTitle: 'Compress PDF Online: Reduce File Size',
    metaDescription: 'Make PDFs smaller for email and uploads. Choose lossless clean-up or stronger compression, see the real before and after size, and download. Runs in your browser.',
    h1: 'Compress a PDF',
    intro: 'Shrink a PDF to make it easier to email or upload. There are two modes with different trade-offs, and the tool reports the actual size before and after, so you always know what you are getting.',
    local: true,
    steps: ['Select a PDF.', 'Pick a mode. "Lossless clean-up" keeps text selectable but usually saves little. The stronger levels turn each page into a compressed image for much larger savings.', 'Select "Compress PDF". Stronger modes render every page, so large files take a little longer.', 'Compare the sizes shown, then download the result. If the new file is not smaller, the tool tells you so.'],
    features: ['Lossless clean-up: re-packs the file structure without touching page content.', 'Three image-based levels (High quality, Balanced, Smallest) with different resolution and JPEG quality.', 'Honest results: shows original size, new size and the percentage saved.', 'Never presents a larger file as an improvement.', 'Runs locally in your browser.'],
    examples: [
      { title: 'Scanned document over an email limit', body: 'A 24 MB scan made of page photographs often drops to a few MB with the Balanced level, because the pages are images anyway.' },
      { title: 'Text-heavy contract', body: 'A mostly-text PDF is already small. Lossless clean-up keeps the text searchable; image-based modes can make such files larger, which the tool will flag.' },
    ],
    limits: ['Image-based modes convert pages to pictures: text is no longer selectable or searchable, links and form fields are lost, and very fine print gets softer at low settings.', 'Lossless clean-up cannot shrink embedded images; savings depend on how wastefully the file was originally written.', 'Encrypted PDFs are not supported.', 'Pages are rendered with a limit of about 25 million pixels each to protect your device\'s memory.'],
    faqs: [
      { q: 'Which mode should I choose?', a: 'If you need selectable text, start with Lossless clean-up. If the PDF is a scan or full of photos and the main goal is a small file, use Balanced. Use Smallest only if readability at reduced sharpness is acceptable.' },
      { q: 'Why is my compressed file bigger?', a: 'Rendering a text-based page as an image can take more space than the original text and fonts. In that case use Lossless clean-up, or keep the original.' },
      { q: 'Does compression lose quality?', a: 'Lossless clean-up does not change page content. Image-based modes use lossy JPEG compression and a reduced resolution, which does reduce sharpness. Higher levels preserve more detail.' },
      { q: 'Is my PDF uploaded?', a: 'No. The pages are rendered and rebuilt inside your browser.' },
    ],
    related: ['merge-pdf', 'sign-pdf', 'image-compressor', 'pdf-to-image'],
    search: 'compress reduce shrink pdf size smaller email optimize',
  },
  {
    slug: 'pdf-to-image', name: 'PDF to Image Converter', category: 'pdf', icon: 'pdfimg',
    short: 'Turn PDF pages into PNG or JPG images.',
    seoTitle: 'PDF to JPG & PNG Converter (Free, Private)',
    metaDescription: 'Convert PDF pages to PNG or JPG images in your browser. Choose pages and resolution, then download images individually or as a ZIP. No uploads.',
    h1: 'Convert PDF Pages to Images',
    intro: 'Convert any pages of a PDF into PNG or JPG pictures. Choose which pages, the output format and the resolution, then download the images one by one or all together in a ZIP. Pages are rendered locally in your browser.',
    local: true,
    steps: ['Select a PDF. Its page count appears.', 'Choose pages (leave "all pages" or type a range like 1-3, 6), the format and the resolution (DPI).', 'Select "Convert to images". Each page is rendered in turn.', 'Download single images from the preview list, or download everything as a ZIP.'],
    features: ['PNG (lossless, supports transparency) or JPG (smaller files) output.', 'Resolution from 72 to 300 DPI.', 'Select all pages or specific ranges.', 'Preview thumbnails, individual downloads, plus a ZIP of everything.', 'Runs locally in your browser.'],
    examples: [
      { title: 'Use a slide as a picture', body: 'Convert one page of a presentation exported as PDF to PNG at 150 DPI for a document or website.' },
      { title: 'Share a page on social media', body: 'Pick the page, choose JPG at 150 DPI, and upload the image where PDFs are not accepted.' },
    ],
    limits: ['Output dimensions are capped (about 25 million pixels per page) to protect browser memory; very large pages at 300 DPI may be scaled down automatically and the tool will say so.', 'Encrypted PDFs are not supported.', 'Some rarely used PDF features (certain JPEG 2000 images, for example) may not render exactly like a desktop PDF reader.'],
    faqs: [
      { q: 'What DPI should I use?', a: '72 matches screen size, 150 is a good balance for web and slides, and 300 is suited to printing. Higher DPI means larger images and longer processing.' },
      { q: 'PNG or JPG?', a: 'PNG is lossless and best for text and graphics. JPG is smaller and better for photographic pages, but is lossy.' },
      { q: 'Why was my image smaller than expected?', a: 'Very large pages are scaled down to stay within the safe pixel limit. The result message tells you when this happened.' },
      { q: 'Are my files uploaded?', a: 'No. Rendering uses your browser, and nothing is sent to any server.' },
    ],
    related: ['image-to-pdf', 'split-pdf', 'image-converter'],
    search: 'pdf to jpg png image convert pages export picture',
  },
  {
    slug: 'image-to-pdf', name: 'Image to PDF Converter', category: 'pdf', icon: 'imgpdf',
    short: 'Combine JPG, PNG and WebP images into one PDF.',
    seoTitle: 'Image to PDF Converter: JPG, PNG, WebP',
    metaDescription: 'Turn JPG, PNG and WebP images into a single PDF. Reorder pictures, choose page size and orientation, and download. Free and private, no uploads.',
    h1: 'Convert Images to PDF',
    intro: 'Combine photos, scans and screenshots into one PDF. Arrange the order, choose the page size and orientation, and download. All of it happens in your browser, so your pictures stay private.',
    local: true,
    steps: ['Add JPG, PNG or WebP images. You can select several at once.', 'Reorder with the arrows or remove any you do not want.', 'Choose page size (A4, US Letter or "fit to image"), orientation and margin.', 'Select "Create PDF" and download the file.'],
    features: ['JPG, PNG and WebP input, up to 30 images of 30 MB each.', 'Page size: A4, US Letter or exactly the size of each image.', 'Orientation: automatic (matches each image), portrait or landscape.', 'Margin options and centred fitting without stretching.', 'Photo orientation data (EXIF) is respected, so phone pictures are upright.'],
    examples: [
      { title: 'Scan receipts with your phone', body: 'Photograph each receipt, add the pictures here in date order, and send your expense claim as a single PDF.' },
      { title: 'Combine screenshots', body: 'Merge a series of screenshots into one document to document a bug or a process.' },
    ],
    limits: ['Images are re-encoded for embedding (JPEG at high quality, PNG and WebP losslessly), so very large photo sets can produce large PDFs. Use the PDF Compressor afterwards if needed.', 'Animated images use only their first frame.'],
    faqs: [
      { q: 'Does the tool keep my image quality?', a: 'JPEG photos are re-encoded at 92% quality, which is visually very close to the original. PNG and WebP images are embedded losslessly.' },
      { q: 'Can I mix JPG, PNG and WebP?', a: 'Yes. You can combine all three formats in one PDF.' },
      { q: 'What does "fit to image" do?', a: 'Each page is created at the same proportions as its image, with no white borders other than the margin you choose.' },
      { q: 'Are my images uploaded?', a: 'No. Everything is processed locally in your browser.' },
    ],
    related: ['merge-pdf', 'sign-pdf', 'compress-pdf', 'image-compressor'],
    search: 'image to pdf jpg png webp photo picture convert combine scan',
  },
  /* ------------------------------ Image ------------------------------ */
  {
    slug: 'image-compressor', name: 'Image Compressor', category: 'image', icon: 'imgcompress',
    short: 'Reduce JPG, PNG and WebP file sizes with an adjustable quality slider.',
    seoTitle: 'Image Compressor: Reduce JPG, PNG & WebP Size',
    metaDescription: 'Compress JPG, PNG and WebP images in your browser. Adjust quality, see original and compressed sizes and the savings, then download. Free and private.',
    h1: 'Compress Images Online',
    intro: 'Make images lighter without opening an editor. Drop in your photos, set a quality level, and see exactly how many bytes you save before downloading. Compression runs on your device, and nothing is uploaded.',
    local: true,
    steps: ['Add one or more JPG, PNG or WebP images.', 'Choose an output format and set the quality. Around 75–85% is a good starting point for photos.', 'Optionally limit the longest side in pixels for extra savings.', 'Review each file\'s before and after size, then download individually or as a ZIP.'],
    features: ['Original size, compressed size and percentage saved for every file.', 'Output as the same format, JPG, or WebP.', 'Optional maximum dimension to downscale very large photos.', 'Batch processing with ZIP download.', 'Files never leave your device.'],
    examples: [
      { title: 'Speed up a web page', body: 'A 4 MB phone photo used as a blog header can often be reduced to a few hundred KB by limiting its width to 1600 px and using WebP at 80%.' },
      { title: 'Fit an email or form limit', body: 'When a portal rejects uploads over 2 MB, lower the quality in steps until the file is below the limit and still looks good.' },
    ],
    limits: ['PNG is a lossless format: the quality slider does not apply to PNG output. To shrink a PNG, convert to WebP or JPG, or reduce its dimensions.', 'JPG does not support transparency; transparent areas become white when converting to JPG.', 'Re-compressing an already heavily compressed JPEG gives small gains and may add visible artefacts.', 'WebP output requires a browser that can encode WebP (current Chrome, Edge, Firefox and Safari can).'],
    faqs: [
      { q: 'What quality setting should I use?', a: 'For photographs, 75–85% usually looks nearly identical to the original at a much smaller size. Check the preview-sized result before using very low values.' },
      { q: 'Why did my PNG not shrink?', a: 'PNG compression is lossless and the quality slider cannot change it. Switch output to WebP or JPG if the image has no need for transparency or exact pixels.' },
      { q: 'Will the result ever be bigger?', a: 'It can be, for images that were already highly optimised. The tool marks such results so you can keep the original.' },
      { q: 'Is metadata kept?', a: 'No. Re-encoding through the browser removes EXIF data such as camera model and GPS location, which is often a privacy benefit.' },
    ],
    related: ['image-resizer', 'image-converter', 'compress-pdf'],
    search: 'compress image reduce size jpg jpeg png webp optimize photo smaller',
  },
  {
    slug: 'image-resizer', name: 'Image Resizer', category: 'image', icon: 'resize',
    short: 'Resize an image to exact pixel dimensions or a percentage.',
    seoTitle: 'Image Resizer: Change Width & Height Online',
    metaDescription: 'Resize JPG, PNG and WebP images to exact pixel sizes or a percentage while keeping the aspect ratio. Free, private and done in your browser.',
    h1: 'Resize an Image',
    intro: 'Set the width and height you need and download the resized picture. The aspect ratio can be locked so nothing looks stretched. Processing is local, so your image is never uploaded.',
    local: true,
    steps: ['Select a JPG, PNG or WebP image. Its current dimensions appear.', 'Enter a new width or height. With "Keep aspect ratio" on, the other value updates automatically. Or choose a percentage.', 'Pick the output format and quality (for JPG and WebP).', 'Select "Resize image" and download the result.'],
    features: ['Exact pixel dimensions or percentage scaling.', 'Aspect-ratio lock to avoid distortion.', 'Output as JPG, PNG or WebP, with quality control.', 'Shows the new dimensions and file size.', 'Local processing: no upload.'],
    examples: [
      { title: 'Profile picture requirements', body: 'A site asks for 400×400 px. Crop to a square first with the Image Cropper, then resize to 400×400.' },
      { title: 'Prepare a blog image', body: 'Scale a 4000 px wide photo down to 1200 px wide; the height follows automatically.' },
    ],
    limits: ['Enlarging an image cannot add detail; it will look softer. The tool warns when you scale above the original size.', 'Output is capped at 100 million pixels in total to protect your browser.'],
    faqs: [
      { q: 'How do I avoid a stretched image?', a: 'Leave "Keep aspect ratio" ticked and change only one dimension. The other adjusts automatically.' },
      { q: 'Can I make the image larger?', a: 'Yes, but upscaling cannot add real detail, so the result will be softer than a photo taken at that size.' },
      { q: 'Which format should I choose?', a: 'Keep the same format unless you need something else. WebP and JPG give smaller files; PNG keeps transparency and exact pixels.' },
      { q: 'Is my image uploaded?', a: 'No. Resizing is done in your browser.' },
    ],
    related: ['image-cropper', 'image-compressor', 'image-converter'],
    search: 'resize image change dimensions width height pixels scale photo',
  },
  {
    slug: 'image-cropper', name: 'Image Cropper', category: 'image', icon: 'crop',
    short: 'Crop an image with a draggable selection and aspect-ratio presets.',
    seoTitle: 'Crop Image Online: Free Cropper with Ratios',
    metaDescription: 'Crop JPG, PNG and WebP images with a draggable selection, aspect-ratio presets (1:1, 4:3, 16:9) or exact pixel values. Private, runs in your browser.',
    h1: 'Crop an Image',
    intro: 'Drag a selection over the part of the picture you want to keep, or type exact pixel values. Presets for common aspect ratios make it easy to produce square, widescreen or portrait crops. Your image is processed in your browser only.',
    local: true,
    steps: ['Select an image.', 'Drag the box to move it and drag its handles to resize. Choose an aspect-ratio preset if you need one.', 'For precision, edit the X, Y, width and height fields (in original pixels).', 'Select "Crop and download".'],
    features: ['Interactive selection that works with mouse and touch.', 'Presets: Free, 1:1, 4:3, 3:2, 16:9, 9:16 and 4:5.', 'Exact numeric crop position and size.', 'Choose JPG, PNG or WebP output.', 'Crops are made from the full-resolution original, not the on-screen preview.'],
    examples: [
      { title: 'Square profile photo', body: 'Choose 1:1, centre the box on the face, and crop. Then use the Image Resizer for exact dimensions.' },
      { title: 'Widescreen thumbnail', body: 'Choose 16:9 to crop a photo to the shape used by most video and article thumbnails.' },
    ],
    limits: ['Rotation is not included in this tool.', 'Very large images (over 100 megapixels) are not supported.'],
    faqs: [
      { q: 'Is the crop full resolution?', a: 'Yes. The preview is scaled to fit your screen, but the crop is taken from the original pixels.' },
      { q: 'How do I crop to an exact size?', a: 'Type the width and height in pixels in the numeric fields. The selection is kept inside the image.' },
      { q: 'Can I use it on a phone?', a: 'Yes. The selection responds to touch, and the layout adapts to small screens.' },
      { q: 'Is my image uploaded?', a: 'No. Cropping happens entirely in your browser.' },
    ],
    related: ['image-resizer', 'image-compressor', 'image-converter'],
    search: 'crop image cut trim photo aspect ratio square 16:9 selection',
  },
  {
    slug: 'image-converter', name: 'Image Format Converter', category: 'image', icon: 'convert',
    short: 'Convert between JPG, PNG and WebP.',
    seoTitle: 'Image Converter: JPG, PNG & WebP Online',
    metaDescription: 'Convert images between JPG, PNG and WebP in your browser. Choose the format and quality, convert several files at once, and download. Free and private.',
    h1: 'Convert Image Formats',
    intro: 'Change JPG to PNG, PNG to WebP, WebP to JPG and every other combination of these three formats. You can convert several files at once. Conversion runs on your device and nothing is uploaded.',
    local: true,
    steps: ['Add one or more JPG, PNG or WebP images.', 'Choose the target format. For JPG and WebP, set the quality.', 'If converting transparent images to JPG, choose the background colour that replaces transparency.', 'Select "Convert" and download each file or a ZIP.'],
    features: ['All conversions between JPG, PNG and WebP.', 'Batch conversion with ZIP download.', 'Adjustable quality for lossy formats.', 'Background colour for transparency when converting to JPG.', 'Local processing.'],
    examples: [
      { title: 'WebP picture that will not open', body: 'Convert a downloaded WebP image to JPG or PNG so older software or an upload form accepts it.' },
      { title: 'Smaller website images', body: 'Convert large PNG photographs to WebP to reduce page weight, while keeping transparency where needed.' },
    ],
    limits: ['JPG has no transparency; transparent regions are filled with your chosen colour.', 'Converting from a lossy format (JPG, WebP) to PNG does not restore lost detail; the file may even get larger.', 'Animated images are converted using their first frame only.', 'WebP output needs a browser that can encode WebP; the tool tells you if yours cannot.'],
    faqs: [
      { q: 'Which format is best?', a: 'JPG suits photographs and is universally supported. PNG suits graphics, screenshots and transparency. WebP is usually smaller than both and is supported by all current browsers.' },
      { q: 'Will conversion lose quality?', a: 'Converting to PNG is lossless. Converting to JPG or WebP is lossy at the quality you choose; a higher quality keeps more detail.' },
      { q: 'Why does my PNG get bigger as JPG→PNG?', a: 'PNG stores every pixel without lossy compression, so photographs are often larger as PNG than as JPG.' },
      { q: 'Are my files uploaded?', a: 'No. Conversion runs in your browser.' },
    ],
    related: ['image-compressor', 'image-resizer', 'image-to-base64'],
    search: 'convert image format jpg to png png to jpg webp to jpg jpeg converter',
  },
  {
    slug: 'image-to-base64', name: 'Image to Base64 Converter', category: 'image', icon: 'code',
    short: 'Encode an image as a Base64 string or data URI for HTML and CSS.',
    seoTitle: 'Image to Base64 Converter (Data URI)',
    metaDescription: 'Convert an image to a Base64 string, data URI, HTML img tag or CSS background. Copy or download the output. Private: encoding happens in your browser.',
    h1: 'Convert an Image to Base64',
    intro: 'Encode a JPG, PNG or WebP image as Base64 text you can paste straight into HTML, CSS or JSON. Choose the output style, copy it, or download it as a text file. Encoding is done locally in your browser.',
    local: true,
    steps: ['Select an image (up to 10 MB).', 'The Base64 output and details such as MIME type and size appear immediately.', 'Choose the format: data URI, raw Base64, HTML <img> tag or CSS background.', 'Copy the text or download it as a .txt file.'],
    features: ['Four output styles: data URI, raw Base64, HTML <img> and CSS background.', 'Shows the MIME type, original size and encoded length.', 'One-click copy and text-file download.', 'Live preview of the encoded image.', 'No upload.'],
    examples: [
      { title: 'Embed a tiny icon in CSS', body: 'Encode a 1 KB icon and paste the CSS background rule to avoid an extra network request.' },
      { title: 'Send an image in a JSON API request', body: 'Use the raw Base64 output as the value of an "image" field, adding the MIME type separately if the API requires it.' },
    ],
    limits: ['Base64 makes data about 33% larger than the binary original, so it is best suited to small images.', 'Very long strings can be slow to paste into some editors.'],
    faqs: [
      { q: 'What is a data URI?', a: 'A data URI is the Base64 text with a prefix such as data:image/png;base64, which browsers can use directly as an image source.' },
      { q: 'When should I not use Base64 images?', a: 'For large images. Base64 inflates size by about a third and cannot be cached separately, so normal image files are better for anything beyond small icons.' },
      { q: 'Does the tool keep my image?', a: 'No. The image is read in your browser and discarded when you close or reload the page.' },
      { q: 'Can I decode Base64 back into an image?', a: 'This tool only encodes. To decode, paste a data URI into a browser address bar or use an image tag with it as the source.' },
    ],
    related: ['image-converter', 'image-compressor', 'image-resizer'],
    search: 'image to base64 encode data uri string html css embed',
  },
  /* ---------------------------- Calculators --------------------------- */
  {
    slug: 'bmi-calculator', name: 'BMI Calculator', category: 'calculator', icon: 'heart',
    short: 'Calculate body mass index in metric or imperial units.',
    seoTitle: 'BMI Calculator (Metric & Imperial)',
    metaDescription: 'Calculate your body mass index in kg/cm or lb/ft-in. See your BMI category, the healthy weight range for your height, and what BMI can and cannot tell you.',
    h1: 'BMI Calculator',
    intro: 'Body mass index (BMI) compares your weight with your height. Enter your measurements in metric or imperial units to see your BMI, the standard category it falls into, and the weight range that corresponds to a BMI of 18.5–24.9 at your height.',
    local: false,
    steps: ['Choose metric (kg, cm) or imperial (lb, ft, in).', 'Enter your weight and height.', 'Select "Calculate BMI".', 'Read your BMI, category and healthy weight range for your height.'],
    features: ['Metric and imperial units.', 'World Health Organization adult categories.', 'Healthy weight range for your height.', 'Input validation with clear messages.', 'Calculated on your device; nothing is stored or sent.'],
    examples: [
      { title: 'Metric example', body: '70 kg at 175 cm: 70 ÷ (1.75 × 1.75) = 22.9, which is in the normal-weight range.' },
      { title: 'Imperial example', body: '154 lb at 5 ft 9 in: weight in lb × 703 ÷ height in inches² gives about 22.7. This tool converts to metric internally for accuracy.' },
    ],
    limits: ['BMI is a screening number for adults aged 18 and over. It is not a diagnosis and not designed for children, teenagers, pregnant women or older adults with low muscle mass.', 'BMI does not distinguish muscle from fat, and does not account for body-fat distribution, ethnicity or health conditions.'],
    faqs: [
      { q: 'What are the BMI categories?', a: 'For adults: below 18.5 underweight; 18.5 to 24.9 normal weight; 25 to 29.9 overweight; 30 and above obesity (class I 30–34.9, class II 35–39.9, class III 40 and above).' },
      { q: 'How is BMI calculated?', a: 'BMI = weight in kilograms ÷ (height in metres)². For imperial units the tool first converts pounds and inches to kilograms and centimetres.' },
      { q: 'Is BMI accurate for athletes?', a: 'Often not. Muscular people can have a high BMI without excess body fat. Other measures, such as waist circumference or body-fat percentage, give additional context.' },
      { q: 'Does this tool give medical advice?', a: 'No. It is an educational calculator. Speak to a doctor or qualified health professional about your weight and health.' },
    ],
    related: ['percentage-calculator', 'discount-calculator', 'age-calculator'],
    search: 'bmi calculator body mass index weight height healthy kg lb',
  },
  {
    slug: 'percentage-calculator', name: 'Percentage Calculator', category: 'calculator', icon: 'percent',
    short: 'Percent of a number, percent change, difference and more.',
    seoTitle: 'Percentage Calculator: Percent, Change & Difference',
    metaDescription: 'Calculate X% of a number, what percent one number is of another, percentage increase or decrease, and percentage difference, each with a worked example.',
    h1: 'Percentage Calculator',
    intro: 'Five common percentage questions in one place. Each calculator below has its own inputs and shows the formula behind the answer, so you can check the working or learn how to do it yourself.',
    local: false,
    steps: ['Find the question that matches yours, such as "What is 15% of 200?".', 'Type your numbers into that card. The answer updates as you type.', 'Read the result and the formula underneath.', 'Use a different card for a different question; they work independently.'],
    features: ['Percent of a value.', 'One number as a percentage of another.', 'Percentage increase or decrease between two values.', 'Percentage difference between two values.', 'Add or subtract a percentage from a value.'],
    examples: [
      { title: 'Tip', body: 'What is 18% of 64? Use "What is X% of Y?": 18 ÷ 100 × 64 = 11.52.' },
      { title: 'Price rise', body: 'A subscription goes from 20 to 24. Percentage change: (24 − 20) ÷ 20 × 100 = 20% increase.' },
    ],
    limits: ['Percentage change from zero is undefined, and the tool says so instead of showing a misleading number.', 'Percentage difference uses the average of the two values as the base and is not the same as percentage change.'],
    faqs: [
      { q: 'What is the difference between percentage change and percentage difference?', a: 'Percentage change measures movement from an old value to a new one, using the old value as the base. Percentage difference compares two values symmetrically, using their average as the base, so the order does not matter.' },
      { q: 'How do I calculate a percentage of a number?', a: 'Divide the percentage by 100 and multiply by the number. 25% of 80 is 0.25 × 80 = 20.' },
      { q: 'Why is a 50% decrease not undone by a 50% increase?', a: 'Because the second percentage applies to a smaller number. 100 reduced by 50% is 50; increasing 50 by 50% gives 75, not 100.' },
      { q: 'Are results rounded?', a: 'Results are displayed to at most four decimal places, so they can differ slightly from a calculation rounded earlier.' },
    ],
    related: ['discount-calculator', 'bmi-calculator', 'age-calculator'],
    search: 'percentage calculator percent of increase decrease change difference',
  },
  {
    slug: 'age-calculator', name: 'Age Calculator', category: 'calculator', icon: 'calendar',
    short: 'Work out exact age in years, months and days, plus the next birthday.',
    seoTitle: 'Age Calculator: Years, Months & Days',
    metaDescription: 'Enter a date of birth to get your exact age in years, months and days, total days lived, and the date and weekday of your next birthday.',
    h1: 'Age Calculator',
    intro: 'Find an exact age from a date of birth. The calculator breaks the answer into years, months and days, shows the total number of days, and tells you when the next birthday is and which weekday it falls on.',
    local: false,
    steps: ['Enter the date of birth.', 'Leave "Age on" as today, or choose another date to find the age on that day.', 'Select "Calculate age".', 'Read the age, totals and next birthday.'],
    features: ['Age in years, months and days.', 'Total months, weeks and days.', 'Next birthday date, weekday and countdown.', 'Calculate the age on any date, not just today.', 'Impossible dates are rejected.'],
    examples: [
      { title: 'Eligibility check', body: 'Set "Age on" to the closing date of an application to see whether someone will have reached the minimum age by then.' },
      { title: 'Countdown', body: 'Born 15 May 1990, on 20 August 2024: 34 years, 3 months, 5 days. Next birthday 15 May 2025 (a Thursday), 268 days away.' },
    ],
    limits: ['Month lengths vary, so "months and days" follows a calendar convention: whole months are counted from the birth date, clamped to the end of shorter months (31 January + 1 month = 28/29 February).', 'People born on 29 February are shown as having their birthday on 28 February in non-leap years. Legal conventions differ between countries; this is a display choice.', 'Uses your device\'s date and calendar days, with no time-of-day or time-zone adjustment.'],
    faqs: [
      { q: 'How is age calculated?', a: 'Whole years and months are counted from the date of birth to the chosen date. The days are what remain after the last complete month.' },
      { q: 'Can I calculate age on a past or future date?', a: 'Yes. Change the "Age on" date. It must not be earlier than the date of birth.' },
      { q: 'What about leap-day birthdays?', a: 'Someone born on 29 February is shown as celebrating on 28 February in non-leap years. Some jurisdictions treat 1 March as the legal date instead.' },
      { q: 'Is my date of birth stored?', a: 'No. The calculation happens in your browser, and nothing is saved or sent.' },
    ],
    related: ['bmi-calculator', 'percentage-calculator', 'discount-calculator'],
    search: 'age calculator date of birth how old years months days birthday',
  },
  {
    slug: 'discount-calculator', name: 'Discount Calculator', category: 'calculator', icon: 'tag',
    short: 'Final price and savings after a discount, with optional second discount and tax.',
    seoTitle: 'Discount Calculator: Sale Price & Savings',
    metaDescription: 'Find the sale price and amount saved after a percentage discount. Add a second discount or sales tax, and display results in your currency. Free and instant.',
    h1: 'Discount Calculator',
    intro: 'Work out what something really costs after a sale. Enter the original price and the discount percentage to get the final price and the amount you save. Optionally stack a second discount, such as a coupon, and add sales tax.',
    local: false,
    steps: ['Choose a display currency and enter the original price.', 'Enter the discount percentage.', 'Optionally enter a second discount (applied after the first) and sales tax or VAT (applied last).', 'Read the final price, the amount saved and the effective discount.'],
    features: ['Final price and savings.', 'Optional second discount applied sequentially.', 'Optional sales tax / VAT on the discounted price.', 'Effective total discount percentage.', '16 display currencies (formatting only).'],
    examples: [
      { title: 'Simple sale', body: 'A 80.00 jacket at 25% off: saves 20.00, final price 60.00.' },
      { title: 'Stacked discounts', body: '100.00 with 20% off, then a further 10% coupon: 72.00, a total saving of 28.00 (28%), not 30%.' },
    ],
    limits: ['Two discounts do not add up. A second percentage applies to the already reduced price.', 'Tax is added after discounts. Rules differ by country and by product; check your local rules.', 'Currency selection affects formatting only; there is no exchange-rate conversion.'],
    faqs: [
      { q: 'Why is 20% off plus 10% off not 30% off?', a: 'The second discount is applied to the price after the first one, so it removes less money. 20% then 10% is an effective 28% reduction.' },
      { q: 'How do I find the discount percentage from two prices?', a: 'Use the Percentage Calculator\'s "percentage change" card: (new − original) ÷ original × 100. A negative result is a decrease.' },
      { q: 'Is tax calculated before or after the discount?', a: 'In this calculator, after. Some retailers or regions treat coupons differently, so your receipt may vary.' },
      { q: 'Is my data stored?', a: 'No. Calculations run in your browser and nothing is saved or transmitted.' },
    ],
    related: ['percentage-calculator', 'bmi-calculator', 'age-calculator'],
    search: 'discount calculator sale price percent off savings coupon tax',
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
export const toolUrl = (t: Tool) => `/tools/${t.slug}/`;
export const toolsByCategory = (c: Category) => TOOLS.filter((t) => t.category === c);

/**
 * Approximate desktop height (px) of each tool's initial interface. The tool container reserves this space
 * before its script loads, so the page does not shift (Cumulative Layout Shift) when the tool appears.
 * Measured from the real interface; re-measure if you change a tool's initial layout.
 */
export const TOOL_UI_HEIGHT: Record<string, number> = {
  'merge-pdf': 361, 'sign-pdf': 325, 'split-pdf': 277, 'compress-pdf': 277, 'pdf-to-image': 295, 'image-to-pdf': 361,
  'image-compressor': 361, 'image-resizer': 277, 'image-cropper': 277, 'image-converter': 361, 'image-to-base64': 277,
  'bmi-calculator': 334, 'percentage-calculator': 1047, 'age-calculator': 150, 'discount-calculator': 585,
};
