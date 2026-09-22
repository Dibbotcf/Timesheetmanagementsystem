import { PDFDocument, PageSizes } from 'pdf-lib';

// Builds one merged PDF from rendered form images and uploaded evidence files (images or PDFs).
// jsPDF (used for single-form download) cannot embed existing PDFs, so bulk downloads go through pdf-lib.

const A4 = PageSizes.A4; // [595.28, 841.89] pt
const MM = 72 / 25.4;

export type PdfPart =
  | { kind: 'image'; dataUrl: string; fit: 'bleed' | 'margin' } // 'bleed' = the image already has its own margins (the form sheet)
  | { kind: 'pdf'; dataUrl: string };

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function addImagePage(doc: PDFDocument, dataUrl: string, fit: 'bleed' | 'margin') {
  const isPng = dataUrl.startsWith('data:image/png');
  const bytes = dataUrlToBytes(dataUrl);
  const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const page = doc.addPage(A4);
  const margin = fit === 'bleed' ? 0 : 8 * MM;
  const availW = A4[0] - margin * 2;
  const availH = A4[1] - margin * 2;
  const scale = Math.min(availW / img.width, availH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, { x: (A4[0] - w) / 2, y: (A4[1] - h) / 2, width: w, height: h });
}

async function addPdfPages(doc: PDFDocument, dataUrl: string) {
  const src = await PDFDocument.load(dataUrlToBytes(dataUrl), { ignoreEncryption: true });
  const pages = await doc.copyPages(src, src.getPageIndices());
  for (const p of pages) doc.addPage(p);
}

/** Assemble the parts in order into a single PDF and return its bytes. */
export async function buildMergedPdf(parts: PdfPart[], title?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  doc.setProducer('TCF Timesheet');
  for (const part of parts) {
    if (part.kind === 'image') await addImagePage(doc, part.dataUrl, part.fit);
    else await addPdfPages(doc, part.dataUrl);
  }
  return doc.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** A stored leave file (image or PDF data URL) as a merge part. */
export const filePart = (dataUrl: string, mime: string): PdfPart =>
  mime === 'application/pdf' ? { kind: 'pdf', dataUrl } : { kind: 'image', dataUrl, fit: 'margin' };
