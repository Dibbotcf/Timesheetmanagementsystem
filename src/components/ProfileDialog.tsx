import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Camera, KeyRound, Loader2, PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAppStore } from '../App';

// "My profile": opened from the user card at the bottom of the sidebar. Shows the signed-in person's own
// employee record (fresh from the store, not the login snapshot) and their signature on file.
// Closes only through ✕ / Close (app-wide modal rule, enforced in ui/dialog).

const roleBadge = (role: string) =>
  role === 'Superadmin' ? { bg: '#f3e8ff', fg: '#7c3aed' }
  : role === 'Admin/HR' ? { bg: '#eff6ff', fg: '#1d4ed8' }
  : { bg: '#f1f5f9', fg: '#475569' };

const fmtDate = (d?: string) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? format(t, 'd MMM yyyy') : '—';
};

/** "3 yrs 9 mos" since the joining date. */
const serviceLength = (joining?: string) => {
  const j = joining ? new Date(joining) : null;
  if (!j || isNaN(j.getTime())) return '—';
  const now = new Date();
  let months = (now.getFullYear() - j.getFullYear()) * 12 + (now.getMonth() - j.getMonth());
  if (now.getDate() < j.getDate()) months--;
  if (months < 0) return '—';
  const y = Math.floor(months / 12), m = months % 12;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return y ? `${part(y, 'yr')}${m ? ` ${part(m, 'mo')}` : ''}` : months ? part(m, 'mo') : 'Less than a month';
};

// Profile photo: the picked file may be up to 2 MB; what's saved is a 320 px square JPEG (~20–40 KB) on the
// employee record, so loading the employee list stays light.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const AVATAR_PX = 320;
const toAvatarDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = AVATAR_PX;
    const g = canvas.getContext('2d');
    if (!g) { URL.revokeObjectURL(url); return reject(new Error('no canvas')); }
    g.fillStyle = '#fff'; // transparent PNGs get a white background
    g.fillRect(0, 0, AVATAR_PX, AVATAR_PX);
    g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX); // centre crop
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
  img.src = url;
});

export const ProfileDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { currentUser, employees, signatures, updateEmployee } = useAppStore();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  if (!currentUser) return null;

  const record = employees.find(e => e.id === currentUser.id); // the photo is saved here (Superadmin may have none)
  const me = record || currentUser;

  const pickPhoto = async (file?: File) => {
    if (!file || !record) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error('Choose a JPG, PNG or WebP image.'); return; }
    if (file.size > MAX_PHOTO_BYTES) { toast.error(`That image is ${(file.size / 1048576).toFixed(1)} MB — the limit is 2 MB.`); return; }
    setSavingPhoto(true);
    try {
      await updateEmployee(record.id, { photoUrl: await toAvatarDataUrl(file) });
      toast.success('Profile photo updated');
    } catch { toast.error('Could not read that image — try another one.'); }
    finally { setSavingPhoto(false); }
  };
  const removePhoto = async () => {
    if (!record) return;
    setSavingPhoto(true);
    try { await updateEmployee(record.id, { photoUrl: undefined }); toast.success('Profile photo removed'); }
    finally { setSavingPhoto(false); }
  };
  const signature = signatures.find(s => !!s.employeeId && s.employeeId === me.id);
  const rb = roleBadge(me.role);
  const active = me.status === 'Active';
  const fields = [
    { label: 'Designation', value: me.jobTitle || '—' },
    { label: 'Position', value: me.designation === 'DIC' ? 'DIC' : 'Member' },
    { label: 'Gender', value: me.gender || 'Not set' },
    { label: 'Date of Birth', value: fmtDate(me.dob) },
    { label: 'Joining Date', value: fmtDate(me.joiningDate) },
    { label: 'Service', value: serviceLength(me.joiningDate) },
  ];

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="rounded-2xl" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
        <DialogTitle className="sr-only">My profile</DialogTitle>
        <DialogDescription className="sr-only">Your employee details</DialogDescription>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', padding: '24px 24px 20px', borderBottom: '1px solid #eef2f7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#6366f1', marginBottom: 10 }}>My profile</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar: photo or initial; the camera button uploads a photo (max 2 MB) */}
            <div style={{ position: 'relative', width: 60, height: 60, minWidth: 60 }}>
              <div style={{ width: 60, height: 60, borderRadius: 999, overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', color: '#1d4ed8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                {me.photoUrl
                  ? <img src={me.photoUrl} alt={`${me.name}'s photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : me.name.charAt(0).toUpperCase()}
              </div>
              {savingPhoto && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                  <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
                </div>
              )}
              {record && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={savingPhoto}
                  title="Upload a photo (JPG, PNG or WebP · max 2 MB)" aria-label="Upload profile photo"
                  style={{ position: 'absolute', right: -3, bottom: -3, width: 26, height: 26, borderRadius: 999, border: '2px solid #fff', background: '#1d4ed8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                  <Camera style={{ width: 13, height: 13 }} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {me.eid && <span className="rounded-full px-3 py-1" style={{ background: '#fff', color: '#1d4ed8', border: '1px solid #dbeafe', fontSize: 12, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{me.eid}</span>}
                <span className="rounded-full px-3 py-1" style={{ background: rb.bg, color: rb.fg, fontSize: 12, fontWeight: 600 }}>{me.role}</span>
                {me.status && (
                  <span className="rounded-full px-3 py-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: active ? '#f0fdf4' : '#fef2f2', color: active ? '#16a34a' : '#dc2626', fontSize: 12, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: active ? '#16a34a' : '#dc2626' }} />
                    {me.status}
                  </span>
                )}
              </div>
              {record && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11.5, color: '#64748b', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={savingPhoto}
                    style={{ border: 'none', background: 'transparent', padding: 0, color: '#1d4ed8', fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }}>
                    {me.photoUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  <span>JPG, PNG or WebP · max 2 MB</span>
                  {me.photoUrl && (
                    <button type="button" onClick={removePhoto} disabled={savingPhoto}
                      style={{ border: 'none', background: 'transparent', padding: 0, color: '#b91c1c', fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }}>
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '20px 24px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 16 }}>
          {fields.map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: '#94a3b8' }}>{f.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Signature on file */}
        <div style={{ margin: '18px 24px 0', padding: 12, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 110, height: 46, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#cbd5e1' }}>
            {signature?.imageUrl
              ? <img src={signature.imageUrl} alt="My signature" style={{ maxWidth: 100, maxHeight: 38, objectFit: 'contain' }} />
              : <PenLine style={{ width: 18, height: 18 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>My signature</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{signature ? 'Added automatically as the Maker Signature on your leave forms.' : 'Not on file yet — ask HR to add it.'}</div>
          </div>
          {signature && (
            <Button variant="outline" onClick={() => { onClose(); navigate('/settings'); }} className="gap-1.5" style={{ height: 32, fontSize: 12.5, flexShrink: 0 }}>
              <KeyRound className="h-3.5 w-3.5" /> PIN
            </Button>
          )}
        </div>

        <div style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
