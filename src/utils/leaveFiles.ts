import { API_BASE_URL, getAuthHeaders } from './api';
import type { LeaveAttachmentKind } from '../App';

// Leave evidence (signed forms, medical certificates) is stored as its own KV item so the
// leaves list never carries the file bytes. Images are shrunk in the browser before upload.

export interface LeaveFile {
  id: string;
  leaveId: string;
  kind: LeaveAttachmentKind;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // policy: evidence files are capped at 5 MB before any compression
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.82;

const newId = () => Math.random().toString(36).substr(2, 9);

/** Re-encode an image as a bounded JPEG so a phone photo (3–6 MB) becomes a few hundred KB. */
async function compressImage(file: File): Promise<{ dataUrl: string; mime: string; size: number }> {
  const srcUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Could not read image'));
      i.src = srcUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const size = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
    return { dataUrl, mime: 'image/jpeg', size };
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

/** Validate + encode a picked file. Throws with a user-facing message on rejection. */
export async function prepareLeaveFile(file: File): Promise<{ dataUrl: string; mime: string; size: number; name: string }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) throw new Error('Only images (JPG/PNG) or PDF files are allowed');
  if (file.size > MAX_FILE_BYTES) throw new Error('File must be 5 MB or smaller');
  if (isPdf) {
    return { dataUrl: await readAsDataUrl(file), mime: 'application/pdf', size: file.size, name: file.name };
  }
  const c = await compressImage(file);
  return { ...c, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
}

export async function uploadLeaveFile(input: { leaveId: string; kind: LeaveAttachmentKind; file: File; uploadedBy?: string }): Promise<LeaveFile> {
  const prepared = await prepareLeaveFile(input.file);
  const rec: LeaveFile = {
    id: newId(),
    leaveId: input.leaveId,
    kind: input.kind,
    name: prepared.name,
    mime: prepared.mime,
    size: prepared.size,
    dataUrl: prepared.dataUrl,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
  };
  const res = await fetch(`${API_BASE_URL}/items/leave_files`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(rec) });
  if (!res.ok) throw new Error(res.status === 413 ? 'File too large for the server' : 'Upload failed');
  return rec;
}

export async function fetchLeaveFile(id: string): Promise<LeaveFile | null> {
  const res = await fetch(`${API_BASE_URL}/items/leave_files/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteLeaveFile(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/items/leave_files/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  return res.ok;
}

/** Open a stored file in a new tab (PDF) or return it for inline display (image). */
export function openLeaveFile(file: LeaveFile) {
  const [meta, b64] = file.dataUrl.split(',');
  const mime = meta.replace('data:', '').replace(';base64', '');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const formatBytes = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
