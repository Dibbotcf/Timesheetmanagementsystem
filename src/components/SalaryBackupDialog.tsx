import React, { useEffect, useState } from 'react';
import { Archive, Eye, EyeOff, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL as API_BASE, getAuthHeaders } from '../utils/api';
import { SalarySheet, computeSalary, fmtMoney, fmtHours, MONTH_NAMES, normalizeSheet } from '../lib/salary';
import { confirmDialog } from './ConfirmDialog';

// Superadmin-only recycle bin for salary sheets. Deleting a sheet moves it here
// (`salary_trash:{id}`); only the Superadmin can see it, restore it, or delete it for good.

export interface TrashedSheet { id: string; sheet: SalarySheet; deletedAt: string; deletedBy?: string }

const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const C = { ink: '#111827', body: '#374151', muted: '#6b7280', line: '#e5e7eb', navy: '#1e3a8a', red: '#b91c1c', green: '#15803d' };

export async function fetchTrash(): Promise<TrashedSheet[]> {
  const res = await fetch(`${API_BASE}/items/salary_trash`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  const list: TrashedSheet[] = await res.json();
  return list.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/** Move a sheet into the backup, then remove it from the live sheets. */
export async function trashSheet(sheet: SalarySheet, deletedBy?: string) {
  const item: TrashedSheet = { id: `${sheet.id}_${Date.now()}`, sheet, deletedAt: new Date().toISOString(), deletedBy };
  const res = await fetch(`${API_BASE}/items/salary_trash`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(item) });
  if (!res.ok) throw new Error('Could not move the sheet to Backup');
  const del = await fetch(`${API_BASE}/items/salary_sheets/${sheet.id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!del.ok) throw new Error('Could not delete the salary sheet');
}

export const SalaryBackupDialog: React.FC<{
  liveSheetIds: string[];
  onRestored: (sheet: SalarySheet) => void;
  onClose: () => void;
  onCountChange?: (n: number) => void;
}> = ({ liveSheetIds, onRestored, onClose, onCountChange }) => {
  const [items, setItems] = useState<TrashedSheet[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const load = () => fetchTrash().then(list => { setItems(list); onCountChange?.(list.length); });
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = (s: SalarySheet) => `${MONTH_NAMES[s.month]} ${s.year} Salary Sheet`;

  const restore = async (t: TrashedSheet) => {
    if (liveSheetIds.includes(t.sheet.id)) {
      toast.error(`A ${MONTH_NAMES[t.sheet.month]} ${t.sheet.year} sheet already exists. Delete it first, then restore this one.`);
      return;
    }
    setBusyId(t.id);
    try {
      const sheet = { ...t.sheet, updatedAt: new Date().toISOString() };
      const res = await fetch(`${API_BASE}/items/salary_sheets`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(sheet) });
      if (!res.ok) throw new Error();
      await fetch(`${API_BASE}/items/salary_trash/${encodeURIComponent(t.id)}`, { method: 'DELETE', headers: getAuthHeaders() });
      onRestored(normalizeSheet(sheet));
      toast.success(`${title(t.sheet)} restored`);
      await load();
    } catch { toast.error('Could not restore the sheet.'); }
    finally { setBusyId(null); }
  };

  const purge = async (t: TrashedSheet) => {
    if (!(await confirmDialog({
      title: 'Delete permanently?', icon: 'trash', tone: 'danger', confirmLabel: 'Delete permanently',
      message: <>The <b>{title(t.sheet)}</b> is removed from Backup for good. It cannot be recovered after this.</>,
    }))) return;
    setBusyId(t.id);
    try {
      const res = await fetch(`${API_BASE}/items/salary_trash/${encodeURIComponent(t.id)}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      toast.success(`${title(t.sheet)} permanently deleted`);
      await load();
    } catch { toast.error('Could not delete the sheet.'); }
    finally { setBusyId(null); }
  };

  const btn = (color: string, border: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${border}`,
    background: '#fff', color, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="salary-backup-title" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: 780, maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
        <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Archive style={{ width: 19, height: 19 }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 id="salary-backup-title" style={{ fontSize: 17, fontWeight: 600, margin: 0, color: C.ink }}>Backup — deleted salary sheets</h2>
            <p style={{ fontSize: 12.5, color: C.muted, margin: '3px 0 0' }}>Only the Superadmin sees this. Restore a sheet, or delete it permanently.</p>
          </div>
          <button aria-label="Close" onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', borderTop: `1px solid ${C.line}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items === null && <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading…</div>}
          {items?.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: C.muted, fontSize: 13.5 }}>Backup is empty — no deleted salary sheets.</div>}
          {items?.map(t => {
            const s = normalizeSheet(t.sheet);
            const net = s.rows.reduce((a, r) => a + computeSalary(r).netPayable, 0);
            const busy = busyId === t.id;
            const clash = liveSheetIds.includes(s.id);
            return (
              <div key={t.id} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{title(s)}</span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={s.status === 'final' ? { background: '#16a34a', color: '#fff' } : { background: '#fde047', color: '#713f12' }}>
                      {s.status === 'final' ? 'Finalized' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    {s.rows.length} employee{s.rows.length === 1 ? '' : 's'} · Net payable BDT {fmtMoney(net)}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    Deleted {new Date(t.deletedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{t.deletedBy ? ` by ${t.deletedBy}` : ''}
                  </div>
                  {clash && <div style={{ fontSize: 11.5, color: '#92400e', marginTop: 4 }}>A sheet for this month exists now — delete it first to restore this one.</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setViewId(viewId === t.id ? null : t.id)} aria-expanded={viewId === t.id} style={btn(C.navy, '#dbeafe')} title="Look at this sheet (read-only)">
                    {viewId === t.id ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />} {viewId === t.id ? 'Hide' : 'View'}
                  </button>
                  <button onClick={() => restore(t)} disabled={busy} style={{ ...btn(C.green, '#bbf7d0'), opacity: clash ? 0.6 : 1 }} title={clash ? 'This month already has a sheet' : 'Put this sheet back on the dashboard'}>
                    {busy ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <RotateCcw style={{ width: 14, height: 14 }} />} Restore
                  </button>
                  <button onClick={() => purge(t)} disabled={busy} style={btn(C.red, '#fecaca')}>
                    <Trash2 style={{ width: 14, height: 14 }} /> Delete permanently
                  </button>
                </div>
                {viewId === t.id && <SheetPreview sheet={s} />}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 20px 14px', fontSize: 12, color: C.muted }}>{items ? `${items.length} sheet${items.length === 1 ? '' : 's'} in Backup` : ''}</div>
      </div>
    </div>
  );
};

// Read-only look at a deleted sheet: one line per employee with the figures that matter.
const SheetPreview: React.FC<{ sheet: SalarySheet }> = ({ sheet }) => {
  const rows = sheet.rows.map(r => ({ r, c: computeSalary(r) }));
  const sum = (f: (x: { r: typeof rows[number]['r']; c: typeof rows[number]['c'] }) => number) => rows.reduce((a, x) => a + f(x), 0);
  const heads = ['#', 'Employee', 'Gross', 'OT h', 'OT amt', 'Tax', 'PF', 'Late ded.', 'Loan', 'Net payable'];
  const th: React.CSSProperties = { background: '#f1f5f9', color: '#374151', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', top: 0 };
  const td: React.CSSProperties = { padding: '7px 8px', fontSize: 12.5, textAlign: 'right', whiteSpace: 'nowrap', borderTop: '1px solid #f1f5f9', fontVariantNumeric: 'tabular-nums' };
  return (
    <div style={{ flexBasis: '100%', marginTop: 4 }}>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>
        Read-only view · {sheet.status === 'final' ? `finalized${sheet.finalizedBy ? ` by ${sheet.finalizedBy}` : ''}` : 'draft'} · created {new Date(sheet.createdAt).toLocaleDateString('en-GB')}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.muted, padding: '10px 0' }}>This sheet had no employees.</div>
      ) : (
        <div style={{ overflow: 'auto', maxHeight: 280, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{heads.map((h, i) => <th key={h} style={{ ...th, textAlign: i < 2 ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ r, c }, i) => (
                <tr key={r.employeeId}>
                  <td style={{ ...td, textAlign: 'left', color: C.muted }}>{String(i + 1).padStart(2, '0')}</td>
                  <td style={{ ...td, textAlign: 'left' }}><b style={{ fontWeight: 600, color: C.ink }}>{r.name}</b> <span style={{ color: C.muted, fontSize: 11 }}>{r.eid}</span></td>
                  <td style={td}>{fmtMoney(c.gross)}</td>
                  <td style={td}>{fmtHours(r.otHours)}</td>
                  <td style={td}>{fmtMoney(c.otAmount)}</td>
                  <td style={td}>{fmtMoney(c.tax)}</td>
                  <td style={td}>{fmtMoney(c.pfDeduction)}</td>
                  <td style={td}>{fmtMoney(c.salaryDeduction)}</td>
                  <td style={td}>{fmtMoney(c.loanDeduction)}</td>
                  <td style={{ ...td, fontWeight: 700, color: c.netPayable < 0 ? C.red : C.ink }}>{fmtMoney(c.netPayable)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc' }}>
                <td style={td} />
                <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>Total</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.gross))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtHours(sum(x => x.r.otHours))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.otAmount))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.tax))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.pfDeduction))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.salaryDeduction))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.loanDeduction))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(sum(x => x.c.netPayable))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
