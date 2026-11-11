/** Builds a small two-page practice agreement in the browser (nothing is downloaded or uploaded). All parties are fictional. */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createSampleAgreement(): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, ink = rgb(0.1, 0.13, 0.22), grey = rgb(0.4, 0.45, 0.52), navy = rgb(0.06, 0.16, 0.3);
  const header = (p: ReturnType<typeof doc.addPage>, sub: string) => {
    p.drawRectangle({ x: 0, y: H - 78, width: W, height: 78, color: navy });
    p.drawText('SAMPLE CONSULTING AGREEMENT', { x: 40, y: H - 42, size: 18, font: bold, color: rgb(1, 1, 1) });
    p.drawText(sub, { x: 40, y: H - 62, size: 10, font, color: rgb(0.8, 0.86, 0.95) });
  };
  const section = (p: ReturnType<typeof doc.addPage>, y: number, title: string, lines: string[]) => {
    p.drawText(title, { x: 40, y, size: 12, font: bold, color: navy });
    lines.forEach((l, i) => p.drawText(l, { x: 46, y: y - 20 - i * 16, size: 10.5, font, color: ink }));
    return y - 20 - lines.length * 16 - 24;
  };

  const p1 = doc.addPage([W, H]);
  header(p1, 'Practice document for trying the PDF signer. The parties and terms are fictional.');
  let y = H - 120;
  y = section(p1, y, '1. PARTIES', ['This agreement is between Example Client Ltd ("Client") and Example Consultant Ltd ("Consultant").', 'Both parties agree to the terms below.']);
  y = section(p1, y, '2. SERVICES', ['Consultant will provide a written review of Client\'s website and a short list of recommendations,', 'delivered within thirty (30) days of the start date.']);
  y = section(p1, y, '3. FEES AND PAYMENT', ['Client will pay the agreed fee within thirty (30) days of receiving an invoice.', 'Expenses must be approved in writing before they are incurred.']);
  y = section(p1, y, '4. CONFIDENTIALITY', ['Each party will keep the other\'s non-public information confidential and use it only for this work.']);
  p1.drawRectangle({ x: 40, y: y - 52, width: W - 80, height: 52, color: rgb(0.93, 0.96, 1), borderColor: rgb(0.78, 0.86, 0.97), borderWidth: 1 });
  p1.drawText('This is a sample. It is not a real contract and has no legal effect.', { x: 54, y: y - 22, size: 10.5, font: bold, color: navy });
  p1.drawText('Use it to practise placing a signature, a date and a stamp.', { x: 54, y: y - 38, size: 10.5, font, color: ink });
  p1.drawText('Page 1 of 2', { x: W / 2 - 25, y: 34, size: 9, font, color: grey });

  const p2 = doc.addPage([W, H]);
  header(p2, 'Signature page');
  y = H - 120;
  y = section(p2, y, '5. GOVERNING LAW', ['This agreement is governed by the law of the place the parties agree on.', 'If any part is found invalid, the rest remains in effect.']);
  p2.drawText('Signed by the parties on the dates shown:', { x: 40, y, size: 12, font: bold, color: navy });
  y -= 30;
  const box = (x: number, who: string, name: string) => {
    p2.drawRectangle({ x, y: y - 150, width: 240, height: 150, borderColor: rgb(0.7, 0.75, 0.82), borderWidth: 1 });
    p2.drawText(who, { x: x + 12, y: y - 20, size: 10, font: bold, color: navy });
    p2.drawText('Signature:', { x: x + 12, y: y - 40, size: 9, font, color: grey });
    p2.drawLine({ start: { x: x + 12, y: y - 100 }, end: { x: x + 228, y: y - 100 }, thickness: 0.8, color: grey });
    p2.drawText(name, { x: x + 12, y: y - 116, size: 10, font, color: ink });
    p2.drawText('Date: ____________________', { x: x + 12, y: y - 136, size: 9.5, font, color: grey });
  };
  box(40, 'CLIENT', 'Jane Sample, Example Client Ltd');
  box(W - 40 - 240, 'CONSULTANT', 'Sam Example, Example Consultant Ltd');
  p2.drawText('Page 2 of 2', { x: W / 2 - 25, y: 34, size: 9, font, color: grey });

  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'Sample Agreement.pdf', { type: 'application/pdf' });
}
