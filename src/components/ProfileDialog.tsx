import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { KeyRound, PenLine } from 'lucide-react';
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

export const ProfileDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { currentUser, employees, signatures } = useAppStore();
  const navigate = useNavigate();
  if (!currentUser) return null;

  const me = employees.find(e => e.id === currentUser.id) || currentUser;
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
            <div style={{ width: 60, height: 60, minWidth: 60, borderRadius: 999, background: '#fff', border: '1px solid #e2e8f0', color: '#1d4ed8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
              {me.name.charAt(0).toUpperCase()}
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
