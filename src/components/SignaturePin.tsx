import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { KeyRound, Loader2, PenLine, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee, LeaveRecord, Signature } from '../App';
import { API_BASE_URL as API_BASE, getAuthHeaders } from '../utils/api';
import { confirmDialog } from './ConfirmDialog';

// 4-digit PINs on signatures — a signature can only be used to sign (as HR, or to approve a leave) with its PIN.
// - Master PIN (the Superadmin's): opens every signature, whoever is logged in.
//   Only its SHA-256 is in the code.
// - Own PIN: salted SHA-256 in `signature_pins:{signatureId}`. Set or changed by the employee the signature
//   belongs to (linked by EID); the Superadmin sees every signature's PIN status and can set, reset or remove it.
// NOTE: a workflow check, not security — the items API is open and a 4-digit PIN can be recovered from its hash.

const MASTER_PIN_SHA256 = '6b0e19e2927744cdcfebb2218edef3a82b698e366a056e6f9f0163da44343b10';
export const PIN_RE = /^\d{4}$/;

export interface SignaturePin { id: string; signatureId: string; salt: string; hash: string; updatedAt: string; updatedBy?: string }
type User = Pick<Employee, 'id' | 'name' | 'role'> | null | undefined;

const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const C = { ink: '#111827', body: '#374151', muted: '#6b7280', line: '#e5e7eb', navy: '#1e3a8a', red: '#b91c1c' };

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const pinHash = (pin: string, signatureId: string, salt: string) => sha256Hex(`${salt}|${signatureId}|${pin}`);
const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
const isMaster = async (pin: string, _user?: User) => (await sha256Hex(pin)) === MASTER_PIN_SHA256;

export async function fetchSignaturePins(): Promise<Record<string, SignaturePin>> {
  const res = await fetch(`${API_BASE}/items/signature_pins`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Could not load signature PINs');
  const list: SignaturePin[] = await res.json();
  return Object.fromEntries(list.map(p => [p.signatureId, p]));
}
async function savePin(signatureId: string, pin: string, by?: string): Promise<SignaturePin> {
  const salt = newSalt();
  const rec: SignaturePin = { id: signatureId, signatureId, salt, hash: await pinHash(pin, signatureId, salt), updatedAt: new Date().toISOString(), updatedBy: by };
  const res = await fetch(`${API_BASE}/items/signature_pins`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(rec) });
  if (!res.ok) throw new Error('save failed');
  return rec;
}
async function removePin(signatureId: string) {
  const res = await fetch(`${API_BASE}/items/signature_pins/${encodeURIComponent(signatureId)}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('remove failed');
}
/** 'master' / 'own' when the PIN opens this signature, otherwise null. */
async function checkPin(signatureId: string, pin: string, rec: SignaturePin | undefined, user: User): Promise<'master' | 'own' | null> {
  if (await isMaster(pin, user)) return 'master';
  if (rec && (await pinHash(pin, signatureId, rec.salt)) === rec.hash) return 'own';
  return null;
}

// ── Shared bits ─────────────────────────────────────────────────────────────────
// Closes only through its own ✕ / Cancel (app-wide modal rule).
const Shell: React.FC<{ titleId: string; title: string; subtitle: React.ReactNode; icon: React.ReactNode; onClose: () => void; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode }> =
  ({ titleId, title, subtitle, icon, onClose, onSubmit, children }) => (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }}>
      <form onSubmit={onSubmit} style={{ background: '#fff', borderRadius: 14, width: 400, maxWidth: '100%', padding: '22px 22px 18px', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', position: 'relative' }}>
        <button type="button" aria-label="Close" onClick={onClose}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
        <h2 id={titleId} style={{ fontSize: 17, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h2>
        <div style={{ fontSize: 13, color: C.muted, margin: '4px 0 0', lineHeight: 1.45 }}>{subtitle}</div>
        {children}
      </form>
    </div>
  );

export const PinField: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean; error?: boolean }> =
  ({ id, label, value, onChange, autoFocus, error }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
    return (
      <div style={{ marginTop: 12 }}>
        <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, color: C.body }}>{label}</label>
        {/* digits only, first 4 kept — no maxLength, so a pasted "12-34" still becomes 1234 */}
        <input id={id} ref={ref} type="password" inputMode="numeric" autoComplete="new-password" placeholder="••••"
          value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{ display: 'block', marginTop: 4, width: 150, height: 42, borderRadius: 8, border: `1px solid ${error ? '#fca5a5' : C.line}`, padding: '0 12px', fontSize: 20, letterSpacing: 10, fontFamily: FONT, outline: 'none', color: C.ink }} />
      </div>
    );
  };

const Buttons: React.FC<{ onCancel: () => void; label: string; disabled: boolean; busy: boolean; extra?: React.ReactNode }> = ({ onCancel, label, disabled, busy, extra }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
    {extra}
    <span style={{ flex: 1 }} />
    <button type="button" onClick={onCancel}
      style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', fontSize: 13, fontWeight: 600, color: C.body, cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
    <button type="submit" disabled={disabled || busy}
      style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: disabled || busy ? '#93a5cf' : C.navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: disabled || busy ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT }}>
      {busy && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />} {label}
    </button>
  </div>
);
const ErrorLine: React.FC<{ text: string }> = ({ text }) => text ? <div role="alert" style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{text}</div> : null;

// ── Set / change / reset a signature's PIN ──────────────────────────────────────
// mode 'own'   — the signature's own employee: sets it, or changes it with the current PIN.
// mode 'admin' — the Superadmin: sets or resets any signature's PIN (no current PIN needed), or removes it.
export const SetPinDialog: React.FC<{ signature: Signature; mode: 'own' | 'admin'; current?: SignaturePin; user: User; onClose: () => void; onSaved: () => void }> =
  ({ signature, mode, current, user, onClose, onSaved }) => {
    const needsOld = mode === 'own' && !!current;
    const [oldPin, setOldPin] = useState('');
    const [pin1, setPin1] = useState('');
    const [pin2, setPin2] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (needsOld && !PIN_RE.test(oldPin)) return setError('Enter your current 4-digit PIN.');
      if (!PIN_RE.test(pin1)) return setError('The new PIN must be exactly 4 digits.');
      if (pin1 !== pin2) return setError('The two new PINs do not match.');
      setBusy(true);
      try {
        if (needsOld && !(await checkPin(signature.id, oldPin, current, user))) { setError('Current PIN is incorrect.'); setOldPin(''); return; }
        await savePin(signature.id, pin1, user?.name);
        toast.success(current ? `PIN changed for ${signature.name}` : `PIN set for ${signature.name}`);
        onSaved();
        onClose();
      } catch { setError('Could not save the PIN. Please try again.'); }
      finally { setBusy(false); }
    };
    const remove = async () => {
      if (!(await confirmDialog({
        title: `Remove ${signature.name}'s PIN?`, icon: 'lock', tone: 'danger', confirmLabel: 'Remove PIN',
        message: <>The signature can't be used to sign as HR until a new PIN is set (the master PIN still works).</>,
      }))) return;
      setBusy(true);
      try { await removePin(signature.id); toast.success(`PIN removed for ${signature.name}`); onSaved(); onClose(); }
      catch { setError('Could not remove the PIN.'); }
      finally { setBusy(false); }
    };

    const title = mode === 'admin' ? (current ? 'Reset signature PIN' : 'Set signature PIN') : (current ? 'Change my signature PIN' : 'Set my signature PIN');
    return (
      <Shell titleId="sig-pin-title" title={title} icon={<KeyRound style={{ width: 20, height: 20 }} />} onClose={onClose} onSubmit={submit}
        subtitle={<><b style={{ color: C.ink }}>{signature.name}</b> — a 4-digit PIN is needed whenever this signature is used to sign (Confirm By HR or approval).</>}>
        {needsOld && <PinField id="sig-pin-old" label="Current PIN" value={oldPin} onChange={v => { setOldPin(v); setError(''); }} autoFocus />}
        <PinField id="sig-pin-new" label="New PIN (4 digits)" value={pin1} onChange={v => { setPin1(v); setError(''); }} autoFocus={!needsOld} />
        <PinField id="sig-pin-confirm" label="Confirm new PIN" value={pin2} onChange={v => { setPin2(v); setError(''); }} error={!!pin2 && pin1 !== pin2} />
        <ErrorLine text={error} />
        <Buttons onCancel={onClose} label={current ? 'Save new PIN' : 'Set PIN'} disabled={(needsOld && oldPin.length !== 4) || pin1.length !== 4 || pin2.length !== 4} busy={busy}
          extra={mode === 'admin' && current ? (
            <button type="button" onClick={remove} disabled={busy}
              style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>Remove PIN</button>
          ) : undefined} />
      </Shell>
    );
  };

// ── Sign with a signature + PIN: HR sign (Confirm By HR) or Final sign (approves the leave) ─────
export type SignPurpose = 'hr' | 'approve';
const PURPOSE = {
  hr: { title: 'HR sign', label: 'HR signature', action: 'Sign & confirm', lead: (subject: string) => <>Confirm the signed form for <b style={{ color: C.ink }}>{subject}</b> has reached HR. Choose your signature and enter its PIN.</> },
  approve: { title: 'Final sign', label: 'Final signature', action: 'Sign & approve', lead: (subject: string) => <>Final sign for <b style={{ color: C.ink }}>{subject}</b> — the leave is approved once signed. Choose the signature and enter its PIN.</> },
};

/** Final sign (approval) is done only with these people's signatures: Fumihiro Abe and Showkat Akber (by EID). */
export const FINAL_SIGNER_EIDS = ['TCF-61', 'TCF-15'];
const isFinalSigner = (s: Signature, employees?: Employee[]) => {
  const emp = employees?.find(e => e.id === s.employeeId);
  return !!emp && FINAL_SIGNER_EIDS.includes(emp.eid);
};

/** For HR signing: 'hr' when the signature's role is HR, 'admin' when its role says Admin or its employee has an
 *  Admin/HR (or Superadmin) account, otherwise null — staff signatures can't sign as HR. */
const hrGroupOf = (s: Signature, employees?: Employee[]): 'hr' | 'admin' | null => {
  const role = (s.role || '').toLowerCase();
  if (/\bhr\b/.test(role) && !/admin/.test(role)) return 'hr';
  const emp = employees?.find(e => e.id === s.employeeId);
  if (/admin/.test(role) || emp?.role === 'Admin/HR' || emp?.role === 'Superadmin') return 'admin';
  return null;
};

const SignDialog: React.FC<{ signatures: Signature[]; employees?: Employee[]; user: User; subject: string; purpose: SignPurpose; onDone: (s: Signature | null) => void }> = ({ signatures, employees, user, subject, purpose, onDone }) => {
  const P = PURPOSE[purpose];
  // HR sign lists HR signatures first, then Admin ones; Final sign lists only the final signers' signatures
  const groups = purpose === 'hr'
    ? [{ label: 'HR', list: signatures.filter(s => hrGroupOf(s, employees) === 'hr') }, { label: 'Admin', list: signatures.filter(s => hrGroupOf(s, employees) === 'admin') }]
    : [{ label: '', list: signatures.filter(s => isFinalSigner(s, employees)) }];
  const allowed = groups.flatMap(g => g.list);
  const own = allowed.find(s => s.employeeId && s.employeeId === user?.id);
  const [sigId, setSigId] = useState(own?.id || '');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sig = allowed.find(s => s.id === sigId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sig) return setError(`Choose the ${P.label.toLowerCase()}.`);
    if (!PIN_RE.test(pin)) return setError('Enter the 4-digit PIN.');
    setBusy(true);
    try {
      const pins = await fetchSignaturePins();
      const rec = pins[sig.id];
      if (!rec && !(await isMaster(pin, user))) { setError(`${sig.name}'s signature has no PIN yet — set one in Settings → My Signature PIN.`); setPin(''); return; }
      if (!(await checkPin(sig.id, pin, rec, user))) { setError('Incorrect PIN.'); setPin(''); return; }
      onDone(sig);
    } catch { setError('Could not check the PIN — is the server running?'); }
    finally { setBusy(false); }
  };

  return (
    <Shell titleId="hr-sign-title" title={P.title} icon={<PenLine style={{ width: 20, height: 20 }} />} onClose={() => onDone(null)} onSubmit={submit}
      subtitle={P.lead(subject)}>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="hr-sign-sig" style={{ fontSize: 12, fontWeight: 600, color: C.body }}>{P.label}</label>
        <select id="hr-sign-sig" value={sigId} onChange={e => { setSigId(e.target.value); setPin(''); setError(''); }}
          style={{ display: 'block', width: '100%', marginTop: 4, height: 40, borderRadius: 8, border: `1px solid ${C.line}`, padding: '0 10px', fontSize: 14, fontFamily: FONT, color: C.ink, background: '#fff', cursor: 'pointer' }}>
          <option value="">Choose a signature…</option>
          {groups.map(g => {
            const opts = g.list.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` (${s.role})` : ''}</option>);
            return g.label ? (g.list.length > 0 && <optgroup key={g.label} label={g.label}>{opts}</optgroup>) : opts;
          })}
        </select>
        {allowed.length === 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: C.red }}>
            {purpose === 'approve' ? "Final sign needs Fumihiro Abe's or Showkat Akber's signature — add it under Employees → Signatures." : 'No HR or Admin signature found — add one under Employees → Signatures.'}
          </div>
        )}
        {sig?.imageUrl && (
          <div style={{ marginTop: 8, height: 64, border: `1px solid ${C.line}`, borderRadius: 8, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={sig.imageUrl} alt={`${sig.name} signature`} style={{ maxHeight: 54, maxWidth: '90%', objectFit: 'contain' }} />
          </div>
        )}
      </div>
      <PinField id="hr-sign-pin" label="PIN" value={pin} onChange={v => { setPin(v); setError(''); }} autoFocus={!!own} error={!!error} />
      <ErrorLine text={error} />
      <Buttons onCancel={() => onDone(null)} label={P.action} disabled={!sig || pin.length !== 4} busy={busy} />
    </Shell>
  );
};

/** "Confirm By HR": ask for the HR signature + PIN; returns the leave fields to save, or null when cancelled. */
export async function signAsHr(opts: { signatures: Signature[]; employees?: Employee[]; user: User; subject: string }): Promise<Partial<LeaveRecord> | null> {
  const sig = await requestSignature({ ...opts, purpose: 'hr' });
  return sig ? { hardCopyCollected: true, hrSignatureId: sig.id, hrSignedAt: new Date().toISOString(), hrSignedBy: opts.user?.name } : null;
}
/** Final sign (approves the leave): ask for a final signer's signature + PIN; returns the leave fields to save, or null when cancelled. */
export async function signToApprove(opts: { signatures: Signature[]; employees: Employee[]; user: User; subject: string }): Promise<Partial<LeaveRecord> | null> {
  const sig = await requestSignature({ ...opts, purpose: 'approve' });
  return sig ? { status: 'Approved', approvedSignatureId: sig.id, approvedAt: new Date().toISOString(), approvedBy: opts.user?.name } : null;
}
/** Undo of "Confirm By HR": the form is no longer received, and its HR signature goes with it. */
export const HR_SIGN_UNDO: Partial<LeaveRecord> = { hardCopyCollected: false, hrSignatureId: undefined, hrSignedAt: undefined, hrSignedBy: undefined };

/** Ask for a signature + its PIN. Resolves the signature once the PIN checks out, or null when cancelled. */
export function requestSignature(opts: { signatures: Signature[]; employees?: Employee[]; user: User; subject: string; purpose: SignPurpose }): Promise<Signature | null> {
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (s: Signature | null) => { root.unmount(); host.remove(); resolve(s); };
    root.render(<SignDialog {...opts} onDone={done} />);
  });
}
