import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Lock, Search, ShieldCheck, UserMinus, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee } from '../App';
import { API_BASE_URL as API_BASE, getAuthHeaders } from '../utils/api';
import { confirmDialog } from './ConfirmDialog';

// Password step before Salary & Payslips opens.
// - Master password (the owner's): works for anyone who is logged in. Only its SHA-256 is in the code.
// - Personal passwords (e.g. the Director's): set per employee, stored as salted SHA-256 in
//   `salary_access:{employeeId}`, and accepted only while that employee is the one logged in.
// NOTE: a screen lock, not security — the data itself is protected only once the API requires a
// login (see DD files/salary.md). Hashes are readable through the open API, so passwords need length.

const MASTER_SHA256 = '6cb925e09105e3ddc66f64635c3845876f0b3941f8b7a7ccc8ebbea0368136a9';
const UNLOCK_KEY = 'tcf_salary_unlocked'; // 'master' | 'personal' — until the tab closes, Dismiss or logout
const MIN_LEN = 6;

const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const C = { ink: '#111827', body: '#374151', muted: '#6b7280', line: '#e5e7eb', navy: '#1e3a8a', red: '#b91c1c', green: '#15803d' };

export type UnlockMethod = 'master' | 'personal';
interface AccessRecord { id: string; employeeId: string; salt: string; hash: string; updatedAt: string; updatedBy?: string }

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export const personalHash = (password: string, employeeId: string, salt: string) => sha256Hex(`${salt}|${employeeId}|${password}`);
const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');

async function fetchAccess(employeeId: string): Promise<AccessRecord | null> {
  const res = await fetch(`${API_BASE}/items/salary_access/${encodeURIComponent(employeeId)}`, { headers: getAuthHeaders() });
  return res.ok ? res.json() : null;
}
async function fetchAllAccess(): Promise<AccessRecord[]> {
  const res = await fetch(`${API_BASE}/items/salary_access`, { headers: getAuthHeaders() });
  return res.ok ? res.json() : [];
}

/** Who may see Salary & Payslips at all: the Superadmin (owner of the master password) and
 *  anyone who has been given a personal password. Everyone else never sees the card. */
export async function canSeeSalary(user: { id?: string; role?: string } | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'Superadmin') return true;
  if (!user.id) return false;
  try { return !!(await fetchAccess(user.id)); } catch { return false; }
}

/** Dismiss: lock Salary & Payslips again so the password is asked next time. */
export const lockSalary = () => {
  try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
};
export const unlockMethod = (): UnlockMethod | null => {
  try { const v = sessionStorage.getItem(UNLOCK_KEY); return v === 'master' || v === 'personal' ? v : null; } catch { return null; }
};
export const isSalaryUnlocked = () => unlockMethod() !== null;

const inputCss = (error?: boolean): React.CSSProperties => ({
  width: '100%', height: 40, borderRadius: 8, border: `1px solid ${error ? '#fca5a5' : C.line}`, padding: '0 40px 0 12px',
  fontSize: 14, fontFamily: FONT, outline: 'none', color: C.ink, background: '#fff',
});
const Overlay: React.FC<{ onClose: () => void; labelledBy: string; children: React.ReactNode }> = ({ onClose, labelledBy, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }}>
      {children}
    </div>
  );
};
const PasswordField: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; error?: boolean; autoFocus?: boolean; describedBy?: string; isNew?: boolean }> =
  ({ id, label, value, onChange, error, autoFocus, describedBy, isNew }) => {
    const [show, setShow] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
    return (
      <div style={{ marginTop: 12 }}>
        <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, color: C.body }}>{label}</label>
        <div style={{ position: 'relative', marginTop: 4 }}>
          <input id={id} ref={ref} type={show ? 'text' : 'password'} value={value} autoComplete={isNew ? 'new-password' : 'off'} onChange={e => onChange(e.target.value)}
            aria-invalid={!!error} aria-describedby={describedBy} style={inputCss(error)} />
          <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? `Hide ${label}` : `Show ${label}`}
            style={{ position: 'absolute', right: 4, top: 4, width: 32, height: 32, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
          </button>
        </div>
      </div>
    );
  };
const Buttons: React.FC<{ onCancel: () => void; submitLabel: string; disabled: boolean; busy: boolean; extra?: React.ReactNode }> = ({ onCancel, submitLabel, disabled, busy, extra }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
    {extra}
    <span style={{ flex: 1 }} />
    <button type="button" onClick={onCancel}
      style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', fontSize: 13, fontWeight: 600, color: C.body, cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
    <button type="submit" disabled={disabled || busy}
      style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: !disabled && !busy ? 'pointer' : 'not-allowed', opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: FONT }}>
      {busy && <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} />} {submitLabel}
    </button>
  </div>
);
const Card: React.FC<{ onSubmit: (e: React.FormEvent) => void; onClose: () => void; icon: React.ReactNode; title: string; titleId: string; subtitle: string; children: React.ReactNode }> =
  ({ onSubmit, onClose, icon, title, titleId, subtitle, children }) => (
    <form onSubmit={onSubmit} onClick={e => e.stopPropagation()}
      style={{ background: '#fff', borderRadius: 14, width: 400, maxWidth: '100%', padding: '22px 22px 18px', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', position: 'relative' }}>
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <X style={{ width: 18, height: 18 }} />
      </button>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
      <h2 id={titleId} style={{ fontSize: 17, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{subtitle}</p>
      {children}
    </form>
  );

// ── Lock screen ──────────────────────────────────────────────────────────────
export const SalaryLock: React.FC<{ currentUserId?: string; onUnlock: () => void; onCancel: () => void }> = ({ currentUserId, onUnlock, onCancel }) => {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    try {
      let method: UnlockMethod | null = null;
      if ((await sha256Hex(pw)) === MASTER_SHA256) method = 'master';
      else if (currentUserId) {
        const rec = await fetchAccess(currentUserId);
        if (rec && (await personalHash(pw, currentUserId, rec.salt)) === rec.hash) method = 'personal';
      }
      if (method) {
        try { sessionStorage.setItem(UNLOCK_KEY, method); } catch { /* private mode: unlock just this once */ }
        onUnlock();
      } else {
        setError('Incorrect password. Please try again.');
        setPw('');
      }
    } catch {
      setError('Could not check the password — is the server running?');
    } finally { setBusy(false); }
  };

  return (
    <Overlay onClose={onCancel} labelledBy="salary-lock-title">
      <Card onSubmit={submit} onClose={onCancel} icon={<Lock style={{ width: 20, height: 20 }} />} title="Salary & Payslips is locked" titleId="salary-lock-title" subtitle="Enter your password to open it.">
        <PasswordField id="salary-password" label="Password" value={pw} onChange={v => { setPw(v); setError(''); }} error={!!error} autoFocus describedBy={error ? 'salary-password-error' : undefined} />
        {error && <div id="salary-password-error" role="alert" style={{ fontSize: 12.5, color: C.red, marginTop: 6 }}>{error}</div>}
        <Buttons onCancel={onCancel} submitLabel="Unlock" disabled={!pw} busy={busy} />
      </Card>
    </Overlay>
  );
};

// ── Salary access: who can see and open Salary & Payslips ────────────────────
// Superadmin: the managed list — give access, reset anyone's password, remove access.
// Everyone else (e.g. an Admin): only their own entry, where they can reset their own password.
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const strengthOf = (pw: string) => {
  let s = 0;
  if (pw.length >= MIN_LEN) s++;
  if (pw.length >= 10) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const level = !pw ? 0 : pw.length < MIN_LEN ? 1 : s <= 2 ? 2 : s <= 3 ? 3 : 4;
  return { level, label: ['', 'Too short', 'Weak', 'Good', 'Strong'][level], color: ['#e5e7eb', '#dc2626', '#d97706', '#2563eb', '#15803d'][level] };
};
const Avatar: React.FC<{ name?: string; tone?: 'navy' | 'green' }> = ({ name, tone = 'navy' }) => (
  <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 9999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700,
    background: tone === 'green' ? '#dcfce7' : '#e0e7ff', color: tone === 'green' ? '#166534' : '#3730a3' }}>{initials(name)}</span>
);
const smallBtn = (fg: string, border: string): React.CSSProperties => ({
  height: 30, padding: '0 10px', borderRadius: 7, border: `1px solid ${border}`, background: '#fff', color: fg, fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
});
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: disabled ? '#93a5cf' : C.navy, color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6,
});

/** New password + confirm + a strength bar. */
const NewPasswordFields: React.FC<{ pw1: string; pw2: string; setPw1: (v: string) => void; setPw2: (v: string) => void; autoFocus?: boolean; idPrefix: string; mismatch?: boolean }> =
  ({ pw1, pw2, setPw1, setPw2, autoFocus, idPrefix, mismatch }) => {
    const st = strengthOf(pw1);
    return (
      <>
        <PasswordField id={`${idPrefix}-new`} label="New password" value={pw1} onChange={setPw1} autoFocus={autoFocus} isNew />
        <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {[1, 2, 3, 4].map(i => <span key={i} style={{ height: 4, borderRadius: 4, background: st.level >= i ? st.color : '#e5e7eb' }} />)}
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: st.level ? st.color : C.muted, minWidth: 64, textAlign: 'right' }}>{st.label || `${MIN_LEN}+ characters`}</span>
        </div>
        <PasswordField id={`${idPrefix}-confirm`} label="Confirm new password" value={pw2} onChange={setPw2} error={mismatch} isNew />
        {pw2 && pw1 !== pw2 && <div style={{ fontSize: 12, color: C.red, marginTop: 5 }}>The two passwords do not match yet.</div>}
      </>
    );
  };
const pwProblem = (pw1: string, pw2: string) =>
  pw1.length < MIN_LEN ? `Use at least ${MIN_LEN} characters.` : pw1 !== pw2 ? 'The two passwords do not match.' : '';

async function saveAccess(employeeId: string, password: string, by?: string): Promise<AccessRecord> {
  const salt = newSalt();
  const rec: AccessRecord = { id: employeeId, employeeId, salt, hash: await personalHash(password, employeeId, salt), updatedAt: new Date().toISOString(), updatedBy: by };
  const res = await fetch(`${API_BASE}/items/salary_access`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(rec) });
  if (!res.ok) throw new Error('save failed');
  return rec;
}

export const SalaryPasswordDialog: React.FC<{ employees: Employee[]; currentUser: Employee | null; onClose: () => void }> = ({ employees, currentUser, onClose }) =>
  currentUser?.role === 'Superadmin'
    ? <AccessManager employees={employees} currentUser={currentUser} onClose={onClose} />
    : <ChangeOwnPassword currentUser={currentUser} onClose={onClose} />;

// Personal: change my own password
const ChangeOwnPassword: React.FC<{ currentUser: Employee | null; onClose: () => void }> = ({ currentUser, onClose }) => {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mine, setMine] = useState<AccessRecord | null>(null);
  useEffect(() => { if (currentUser?.id) fetchAccess(currentUser.id).then(setMine).catch(() => {}); }, [currentUser?.id]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = !currentUser?.id ? 'You need to be logged in.' : pwProblem(pw1, pw2);
    if (p) { setError(p); return; }
    setBusy(true);
    try { await saveAccess(currentUser!.id, pw1, currentUser!.name); toast.success('Your salary password is reset'); onClose(); }
    catch { setError('Could not save the password. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Overlay onClose={onClose} labelledBy="salary-pw-title">
      <Card onSubmit={save} onClose={onClose} icon={<KeyRound style={{ width: 20, height: 20 }} />} title="My salary password" titleId="salary-pw-title" subtitle="Reset the password you use to open Salary & Payslips. Only you can change it.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: `1px solid ${C.line}` }}>
          <Avatar name={currentUser?.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{currentUser?.name}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{currentUser?.eid}{currentUser?.jobTitle ? ` · ${currentUser.jobTitle}` : ''}</div>
            {mine && <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>Password set {fmtDate(mine.updatedAt)}{mine.updatedBy ? ` by ${mine.updatedBy}` : ''}</div>}
          </div>
        </div>
        <NewPasswordFields idPrefix="salary-pw" pw1={pw1} pw2={pw2} setPw1={v => { setPw1(v); setError(''); }} setPw2={v => { setPw2(v); setError(''); }} autoFocus mismatch={!!error && pw1 !== pw2} />
        {error && <div role="alert" style={{ fontSize: 12.5, color: C.red, marginTop: 6 }}>{error}</div>}
        <Buttons onCancel={onClose} submitLabel="Reset password" disabled={!pw1 || !pw2} busy={busy} />
      </Card>
    </Overlay>
  );
};

// Superadmin: the managed access list
type Editing = { mode: 'add' } | { mode: 'reset'; employeeId: string } | null;
const AccessManager: React.FC<{ employees: Employee[]; currentUser: Employee | null; onClose: () => void }> = ({ employees, currentUser, onClose }) => {
  const [records, setRecords] = useState<AccessRecord[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [pick, setPick] = useState('');
  const [query, setQuery] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => { setLoadError(false); fetchAllAccess().then(setRecords).catch(() => { setRecords([]); setLoadError(true); }); };
  useEffect(load, []);

  const byId = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const eidSort = (a?: string, b?: string) => String(a || '').localeCompare(String(b || ''), undefined, { numeric: true });
  const withAccess = useMemo(() => (records || []).map(r => ({ r, e: byId.get(r.employeeId) }))
    .sort((x, y) => eidSort(x.e?.eid, y.e?.eid)), [records, byId]);
  const hasAccess = useMemo(() => new Set((records || []).map(r => r.employeeId)), [records]);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(e => !hasAccess.has(e.id) && e.role !== 'Superadmin')
      .filter(e => !q || [e.name, e.eid, e.jobTitle].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => eidSort(a.eid, b.eid));
  }, [employees, hasAccess, query]);

  const startEdit = (ed: Editing) => { setEditing(ed); setPick(''); setQuery(''); setPw1(''); setPw2(''); setError(''); };
  const targetId = editing?.mode === 'reset' ? editing.employeeId : pick;
  const targetName = byId.get(targetId)?.name || 'this person';
  const pickedEmp = byId.get(pick);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = !targetId ? 'Choose who gets access.' : pwProblem(pw1, pw2);
    if (p) { setError(p); return; }
    setBusy(true);
    try {
      const rec = await saveAccess(targetId, pw1, currentUser?.name);
      setRecords(rs => [...(rs || []).filter(r => r.employeeId !== targetId), rec]);
      toast.success(editing?.mode === 'reset' ? `Password reset for ${targetName}` : `${targetName} now has access to Salary & Payslips`);
      startEdit(null);
    } catch { setError('Could not save. Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = async (employeeId: string) => {
    const name = byId.get(employeeId)?.name || 'this person';
    if (!(await confirmDialog({
      title: `Remove ${name}'s access?`, icon: 'user-minus', tone: 'danger', confirmLabel: 'Remove access',
      message: <>Salary &amp; Payslips will disappear from <b>{name}</b>'s Reports page and their password stops working. You can give access again later.</>,
    }))) return;
    try {
      const res = await fetch(`${API_BASE}/items/salary_access/${encodeURIComponent(employeeId)}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      setRecords(rs => (rs || []).filter(r => r.employeeId !== employeeId));
      if (editing?.mode === 'reset' && editing.employeeId === employeeId) startEdit(null);
      toast.success(`Access removed for ${name}`);
    } catch { toast.error('Could not remove access. Please try again.'); }
  };

  const formDisabled = busy || !targetId || !pw1 || !pw2;
  const formPanel = (
    <form onSubmit={save} style={{ marginTop: 10, padding: '4px 14px 14px', borderRadius: 10, border: '1px solid #c7d2fe', background: '#f8faff' }}>
      {editing?.mode === 'add' && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="salary-access-search" style={{ fontSize: 12, fontWeight: 600, color: C.body }}>Employee</label>
          {pickedEmp ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff' }}>
              <Avatar name={pickedEmp.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{pickedEmp.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{pickedEmp.eid}{pickedEmp.jobTitle ? ` · ${pickedEmp.jobTitle}` : ''}</div>
              </div>
              <button type="button" onClick={() => { setPick(''); setError(''); }} style={smallBtn(C.body, C.line)}>Change</button>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <Search style={{ position: 'absolute', left: 11, top: 12, width: 16, height: 16, color: C.muted }} />
                <input id="salary-access-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, ID or designation" autoComplete="off" autoFocus
                  style={{ ...inputCss(), paddingLeft: 34 }} />
              </div>
              <div role="listbox" aria-label="Employees" style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff' }}>
                {candidates.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12.5, color: C.muted }}>{query ? 'No employee matches that search.' : 'Everyone already has access.'}</div>
                ) : candidates.map(e => (
                  <button type="button" role="option" aria-selected={false} key={e.id} onClick={() => { setPick(e.id); setError(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 10px', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#f8fafc')} onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                    <Avatar name={e.name} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink }}>{e.name}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{e.eid}{e.jobTitle ? ` · ${e.jobTitle}` : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {(editing?.mode === 'reset' || pickedEmp) && (
        <NewPasswordFields idPrefix="salary-access" pw1={pw1} pw2={pw2} setPw1={v => { setPw1(v); setError(''); }} setPw2={v => { setPw2(v); setError(''); }}
          autoFocus mismatch={!!error && pw1 !== pw2} />
      )}
      {error && <div role="alert" style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={() => startEdit(null)} style={{ ...smallBtn(C.body, C.line), height: 36, padding: '0 14px', fontSize: 13 }}>Cancel</button>
        <button type="submit" disabled={formDisabled} style={primaryBtn(formDisabled)}>
          {busy && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
          {editing?.mode === 'reset' ? 'Save new password' : 'Give access'}
        </button>
      </div>
    </form>
  );

  return (
    <Overlay onClose={onClose} labelledBy="salary-pw-title">
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: 580, maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', position: 'relative' }}>
        <button type="button" aria-label="Close" onClick={onClose}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ display: 'flex', gap: 12, padding: '20px 22px 14px', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck style={{ width: 20, height: 20 }} />
          </div>
          <div style={{ minWidth: 0, paddingRight: 24 }}>
            <h2 id="salary-pw-title" style={{ fontSize: 17, fontWeight: 600, color: C.ink, margin: 0 }}>Salary access</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0', lineHeight: 1.45 }}>
              Only the people listed here can see Salary &amp; Payslips. Each person opens it with their own password, and only while they are logged in.
            </p>
          </div>
        </div>

        <div style={{ padding: '14px 22px 18px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.body, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
              People with access
              {records && <span style={{ padding: '1px 8px', borderRadius: 9999, background: C.navy, color: '#fff', fontSize: 11 }}>{withAccess.length + 1}</span>}
            </div>
            {editing?.mode !== 'add' && (
              <button type="button" onClick={() => startEdit({ mode: 'add' })} style={{ ...primaryBtn(false), height: 32, padding: '0 12px', fontSize: 12.5 }}>
                <UserPlus style={{ width: 15, height: 15 }} /> Give access
              </button>
            )}
          </div>

          {editing?.mode === 'add' && formPanel}

          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, border: `1px solid ${C.line}`, borderRadius: 10 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
              <Avatar name="Super Admin" tone="green" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>Superadmin</div>
                <div style={{ fontSize: 12, color: C.muted }}>Opens with the master password · always has access</div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 9999, background: '#15803d', color: '#fff', fontSize: 11, fontWeight: 600 }}>Owner</span>
            </li>
            {records === null ? (
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 14, borderTop: `1px solid ${C.line}`, fontSize: 13, color: C.muted }}>
                <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Loading…
              </li>
            ) : loadError ? (
              <li style={{ padding: '12px 14px', borderTop: `1px solid ${C.line}`, fontSize: 13, color: C.red }}>
                Could not load the access list. <button type="button" onClick={load} style={{ ...smallBtn(C.navy, '#c7d2fe'), marginLeft: 6 }}>Try again</button>
              </li>
            ) : withAccess.length === 0 ? (
              <li style={{ padding: 14, borderTop: `1px solid ${C.line}`, fontSize: 13, color: C.muted }}>
                No one else has access yet. Use <b>Give access</b> to add someone.
              </li>
            ) : withAccess.map(({ r, e }) => {
              const resetting = editing?.mode === 'reset' && editing.employeeId === r.employeeId;
              return (
                <li key={r.employeeId} style={{ padding: '11px 14px', borderTop: `1px solid ${C.line}`, background: resetting ? '#fafbff' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={e?.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>
                        {e?.name || 'Former employee'}
                        {r.employeeId === currentUser?.id && <span style={{ marginLeft: 6, fontSize: 11, color: C.navy, fontWeight: 600 }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {[e?.eid, e?.jobTitle].filter(Boolean).join(' · ') || r.employeeId}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>
                        Password set {fmtDate(r.updatedAt)}{r.updatedBy ? ` by ${r.updatedBy}` : ''}
                      </div>
                    </div>
                    {!resetting && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button type="button" onClick={() => startEdit({ mode: 'reset', employeeId: r.employeeId })} style={smallBtn(C.navy, '#c7d2fe')} title="Set a new password for this person">
                          <KeyRound style={{ width: 13, height: 13 }} /> Reset password
                        </button>
                        <button type="button" onClick={() => remove(r.employeeId)} style={smallBtn(C.red, '#fecaca')} aria-label={`Remove access for ${e?.name || r.employeeId}`}>
                          <UserMinus style={{ width: 13, height: 13 }} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {resetting && formPanel}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Overlay>
  );
};
