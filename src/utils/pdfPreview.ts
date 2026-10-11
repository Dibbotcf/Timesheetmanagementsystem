import { dataUrlToBytes } from './leavePdf';

// Draws each page of a stored PDF (data URL) to an image, for showing it on screen and printing it.
// pdf.js is loaded only when a PDF actually needs drawing, so it never weighs on the main bundle.

let workerPort: Worker | null = null;

/** One JPEG data URL per page, `widthPx` wide at 2× for sharp screen and print output. */
export async function renderPdfPages(dataUrl: string, widthPx: number): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  if (!workerPort) {
    // `?worker` makes Vite bundle it as a plain .js file — cPanel's Apache may not serve .mjs as JavaScript
    const { default: PdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker');
    workerPort = new PdfWorker();
  }
  pdfjs.GlobalWorkerOptions.workerPort = workerPort;

  const pdf = await pdfjs.getDocument({ data: dataUrlToBytes(dataUrl) }).promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: (widthPx * 2) / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(canvas.toDataURL('image/jpeg', 0.9));
    }
    return pages;
  } finally {
    await pdf.destroy();
  }
}
