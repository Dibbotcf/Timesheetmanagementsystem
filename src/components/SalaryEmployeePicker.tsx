import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import type { Employee } from '../App';
import { MONTH_NAMES } from '../lib/salary';

// HR ticks employees: which go on a new month's sheet (create), which to add to a sheet, or which to take off it.

const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const C = { ink: '#111827', body: '#374151', muted: '#6b7280', faint: '#9ca3af', line: '#e5e7eb', navy: '#1e3a8a', blueSoft: '#eff6ff' };
const byEid = (a: Employee, b: Employee) => String(a.eid).localeCompare(String(b.eid), undefined, { numeric: true, sensitivity: 'base' });
const isActive = (e: Employee) => e.status === 'Active';
// Active members first, then resigned ones; each group in ID order
const byStatusThenEid = (a: Employee, b: Employee) => Number(isActive(b)) - Number(isActive(a)) || byEid(a, b);
const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span style={{ padding: '2px 10px', borderRadius: 9999, background: active ? '#16a34a' : '#6b7280', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
    {active ? 'Active' : 'Resigned'}
  </span>
);

interface Props {
  year: number;
  month: number;                 // 0-11
  employees: Employee[];         // active and resigned; resigned are listed last and never pre-ticked
  initial?: string[];            // pre-ticked ids (default: everyone)
  onCancel: () => void;
  onSubmit: (ids: string[]) => Promise<void> | void;
  mode?: 'create' | 'add' | 'remove'; // add/remove start with nobody ticked
}

const MODE_TEXT = {
  create: { title: (m: string) => `Create ${m} Salary Sheet`, sub: "Select the employees to include on this month's sheet.", submit: () => 'Create sheet', empty: 'No active employees.' },
  add: { title: (m: string) => `Add employees to ${m}`, sub: 'Tick the employees to add. Their OT and late figures come in from the system.', submit: (n: number) => n ? `Add ${n} employee${n === 1 ? '' : 's'}` : 'Add', empty: 'Everyone is already on this sheet.' },
  remove: { title: (m: string) => `Remove employees from ${m}`, sub: 'Tick the employees to take off this sheet. They stay off next month too.', submit: (n: number) => n ? `Remove ${n} employee${n === 1 ? '' : 's'}` : 'Remove', empty: 'There is no one on this sheet.' },
};

export const SalaryEmployeePicker: React.FC<Props> = ({ year, month, employees, initial, onCancel, onSubmit, mode = 'create' }) => {
  const text = MODE_TEXT[mode];
  const danger = mode === 'remove';
  const list = useMemo(() => [...employees].sort(byStatusThenEid), [employees]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(mode !== 'create' ? []
    : initial?.length ? initial.filter(id => list.some(e => e.id === id && isActive(e))) : list.filter(isActive).map(e => e.id)));
  const activeCount = list.filter(isActive).length;
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const shown = list.filter(e => {
    const t = q.trim().toLowerCase();
    return !t || e.name.toLowerCase().includes(t) || String(e.eid).toLowerCase().includes(t) || (e.jobTitle || '').toLowerCase().includes(t);
  });
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShownPicked = shown.length > 0 && shown.every(e => picked.has(e.id));
  const toggleShown = () => setPicked(p => { const n = new Set(p); shown.forEach(e => allShownPicked ? n.delete(e.id) : n.add(e.id)); return n; });

  const submit = async () => {
    if (!picked.size || busy) return;
    setBusy(true);
    try { await onSubmit(list.filter(e => picked.has(e.id)).map(e => e.id)); }
    finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="picker-title" onClick={() => !busy && onCancel()}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: 520, maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 id="picker-title" style={{ fontSize: 17, fontWeight: 600, margin: 0, color: C.ink }}>{text.title(`${MONTH_NAMES[month]} ${year}`)}</h2>
            <p style={{ fontSize: 12.5, color: C.muted, margin: '4px 0 0' }}>{text.sub}</p>
          </div>
          <button aria-label="Close" onClick={onCancel} disabled={busy}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Search + select all */}
        <div style={{ padding: '0 20px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 8 }}>
            <Search style={{ width: 15, height: 15, color: C.faint }} />
            <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ID or title" aria-label="Search employees"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: FONT, color: C.ink, background: 'transparent' }} />
          </label>
          <button onClick={toggleShown}
            style={{ height: 36, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', fontSize: 12.5, fontWeight: 600, color: C.body, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT }}>
            {allShownPicked ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {/* List */}
        <div role="listbox" aria-multiselectable="true" aria-label="Employees" style={{ overflowY: 'auto', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, minHeight: 120 }}>
          {shown.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: C.muted }}>{list.length === 0 ? text.empty : <>No employee matches “{q}”.</>}</div>}
          {shown.map((e, i) => {
            const on = picked.has(e.id);
            const act = isActive(e);
            const heading = (i === 0 || isActive(shown[i - 1]) !== act)
              ? <div key={`h-${act}`} role="presentation" style={{ position: 'sticky', top: 0, zIndex: 1, padding: '6px 20px', background: '#f8fafc', borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: act ? '#15803d' : C.muted }}>
                  {act ? 'Active members' : 'Resigned members'} · {shown.filter(x => isActive(x) === act).length}
                </div>
              : null;
            const tick = danger ? '#b91c1c' : C.navy;
            return (<React.Fragment key={e.id}>{heading}
              <div role="option" aria-selected={on} tabIndex={0} onClick={() => toggle(e.id)}
                onKeyDown={ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggle(e.id); } }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', cursor: 'pointer', background: on ? (danger ? '#fef2f2' : C.blueSoft) : '#fff', borderBottom: `1px solid #f3f4f6` }}>
                <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? tick : '#cbd5e1'}`, background: on ? tick : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {on && <Check style={{ width: 13, height: 13, color: '#fff' }} strokeWidth={3} />}
                </span>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {e.name.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: C.faint }}>{e.eid}{e.jobTitle ? ` · ${e.jobTitle}` : ''}</span>
                </span>
                <StatusPill active={act} />
              </div>
            </React.Fragment>);
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: C.muted }} aria-live="polite"><b style={{ color: C.ink }}>{picked.size}</b> of {list.length} selected
            <span style={{ color: C.faint }}> · {activeCount} active{list.length > activeCount ? `, ${list.length - activeCount} resigned` : ''}</span></span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} disabled={busy}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', fontSize: 13, fontWeight: 600, color: C.body, cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
            <button onClick={submit} disabled={!picked.size || busy}
              style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: danger ? '#dc2626' : C.navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: picked.size && !busy ? 'pointer' : 'not-allowed', opacity: picked.size ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: FONT }}>
              {busy && <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} />} {text.submit(picked.size)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
