import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../App';
import {
  ArrowLeft, Building2, Check, ChevronDown, FileSpreadsheet, FileText, Loader2, Lock, LockOpen, MoreHorizontal,
  Printer, UserMinus, UserPlus, RotateCcw, Wallet, Clock3, Scissors, Sigma, CalendarDays, Users, Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL as API_BASE, getAuthHeaders } from '../utils/api';
import { getMonthLate } from '../lib/lateMinutes';
import {
  SalaryRow, SalarySheet, SalaryCalc, computeSalary, sheetId, prevMonth, attendanceMonthFor, otWindowFor, approvedOTHours,
  parseAmountExpr, fmtMoney, fmtHours, fmtJoin, takaInWords, MONTH_NAMES, buildDraftSheet, syncDraft, normalizeSheet,
} from '../lib/salary';
import { downloadStatementPdf, downloadPayslips, downloadPayslipsSeparately, downloadStatementAndPayslips, downloadStatementAndPayslipsSeparately, payslipFileName } from '../utils/salaryPdf';
import { SalaryDashboard } from '../components/SalaryDashboard';
import { SalaryEmployeePicker } from '../components/SalaryEmployeePicker';
import { lockSalary, SalaryPasswordDialog } from '../components/SalaryLock';
import { confirmDialog, chooseDownload } from '../components/ConfirmDialog';
import { SalaryBackupDialog, trashSheet, fetchTrash } from '../components/SalaryBackupDialog';

// HR's workbook "Statement of Salary & Allowances" (same columns, order and formulas) presented in the
// HR dashboard style: summary strip on top, then a clean per-employee breakdown. Drafts autosave.
// The Statement PDF / Excel export keep the workbook's own printed layout.

interface Props { onBack: () => void; }

// Sans stack scoped to this screen. Never put "Inter" first — a symbol font by that name is on the office PCs.
const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const C = {
  ink: '#111827', body: '#374151', muted: '#6b7280', faint: '#9ca3af', line: '#e5e7eb',
  strip: '#f1f3f6', head: '#eceef2', row: '#f8f9fb', rowHover: '#f1f4f9',
  blue: '#2563eb', blueSoft: '#dbeafe', blueBorder: '#bfdbfe', navy: '#1e3a8a',
  green: '#16a34a', red: '#dc2626', amber: '#f59e0b', orange: '#f97316',
  // must-fill columns (Gross Salary, Tax)
  prioHead: '#fde68a', prioHeadText: '#78350f', prioCell: '#fffbeb', prioHover: '#fef3c7', prioBorder: '#f59e0b', prioBorderFilled: '#fcd34d',
};
const EXCEL_HEAD = '#dbe5f1';
const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);
const TAKA = 'BDT'; // the ৳ glyph renders badly in the office PCs' fonts

async function apiList<T>(type: string): Promise<T[]> {
  const res = await fetch(`${API_BASE}/items/${type}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load ${type}`);
  return res.json();
}
async function apiSave(type: string, item: { id: string }) {
  const res = await fetch(`${API_BASE}/items/${type}`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(item) });
  if (!res.ok) throw new Error('Could not save the salary sheet');
}

// ── Columns: workbook order (A → W) ───────────────────────────────────────────
type ColKey = 'sl' | 'name' | 'designation' | 'join' | 'basic' | 'house' | 'conv' | 'medical' | 'special' | 'gross' | 'pfco'
  | 'days' | 'rate' | 'ot' | 'otAmt' | 'total' | 'tax' | 'pf' | 'salDed' | 'loan' | 'net' | 'remarks' | 'late' | 'action';
interface Col { key: ColKey; label: string; w: number; input?: 'num' | 'text' | 'expr'; align?: 'left' | 'right' | 'center'; priority?: boolean }
const COLS: Col[] = [
  { key: 'sl', label: '#', w: 44, align: 'center' },
  { key: 'name', label: 'Employee', w: 220, align: 'left' },
  { key: 'designation', label: 'Title', w: 150, align: 'left' },
  { key: 'join', label: 'Joined', w: 92, align: 'center' },
  { key: 'basic', label: 'Basic', w: 84 },
  { key: 'house', label: 'House Rent', w: 84 },
  { key: 'conv', label: 'Conveyance', w: 88 },
  { key: 'medical', label: 'Medical', w: 76 },
  { key: 'special', label: 'Special', w: 88, input: 'num' },
  { key: 'gross', label: 'Gross Salary', w: 128, input: 'num', priority: true },
  { key: 'pfco', label: 'Company PF', w: 88 },
  { key: 'days', label: 'Days', w: 64, input: 'num', align: 'center' },
  { key: 'rate', label: 'Rate / Hr', w: 76 },
  { key: 'ot', label: 'OT Hours', w: 84, input: 'num' },
  { key: 'otAmt', label: 'OT Amount', w: 88 },
  { key: 'tax', label: 'Tax', w: 92, input: 'num', priority: true },
  { key: 'pf', label: 'PF Ded.', w: 76 },
  { key: 'salDed', label: 'Late Ded.', w: 80 },
  { key: 'loan', label: 'Loan Adjustment', w: 158, input: 'expr', priority: true },
  { key: 'late', label: 'Late (min)', w: 80, input: 'num', align: 'center' },
  { key: 'remarks', label: 'Remarks', w: 150, input: 'text', align: 'left' },
  { key: 'total', label: 'Total Payable', w: 112 },
  { key: 'net', label: 'Net Payable', w: 112 },
  { key: 'action', label: 'Action', w: 76, align: 'center' },
];
const INPUT_COLS = COLS.filter(c => c.input).map(c => c.key);
const TABLE_W = COLS.reduce((s, c) => s + c.w, 0);
// Serial and employee stay pinned while the other columns scroll sideways
const STICKY: Partial<Record<ColKey, number>> = { sl: 0, name: 44 };
// Totals stay pinned on the right, beside Action, so the amounts are always in view
const STICKY_RIGHT: Partial<Record<ColKey, number>> = { action: 0, net: 76, total: 76 + 112 };
const isSticky = (k: ColKey) => STICKY[k] !== undefined || STICKY_RIGHT[k] !== undefined;
const pinSide = (k: ColKey): React.CSSProperties =>
  STICKY[k] !== undefined ? { left: STICKY[k] }
  : STICKY_RIGHT[k] !== undefined ? { right: STICKY_RIGHT[k], ...(k === 'total' ? { boxShadow: '-6px 0 6px -4px rgba(15,23,42,0.12)' } : {}) }
  : {};

// Just entered the cell (whole value selected): arrows move to the next cell, as in a spreadsheet
const allSelected = (el: HTMLInputElement) => el.value.length > 0 && el.selectionStart === 0 && el.selectionEnd === el.value.length;

// ── One editable value: formatted when idle, raw while typing ─────────────────
const Cell: React.FC<{
  kind: 'num' | 'text' | 'expr'; value: string | number; display: string; row: number; col: ColKey;
  onCommit: (v: string) => void; align?: 'left' | 'right' | 'center'; invalid?: boolean; color?: string; title?: string; flagged?: boolean; priority?: boolean;
}> = ({ kind, value, display, row, col, onCommit, align = 'right', invalid, color, title, flagged, priority }) => {
  const [text, setText] = useState<string | null>(null); // null = not editing
  const ref = useRef<HTMLInputElement>(null);
  const selectOnEdit = useRef(false);
  const cancelled = useRef(false);
  // Select the raw value as soon as editing starts — in the same commit, so no keystroke can slip in
  // between (selecting a frame later swallowed the first digit typed).
  useLayoutEffect(() => { if (selectOnEdit.current && text !== null) { selectOnEdit.current = false; ref.current?.select(); } }, [text]);
  const commit = (v: string) => { if (v !== String(value ?? '')) onCommit(v); };

  const move = (e: React.KeyboardEvent<HTMLInputElement>, dr: number, dc: number) => {
    const ci = INPUT_COLS.indexOf(col) + dc;
    if (ci < 0 || ci >= INPUT_COLS.length) return;
    const next = document.querySelector<HTMLInputElement>(`[data-cell="${row + dr}:${INPUT_COLS[ci]}"]`);
    if (next) { e.preventDefault(); next.focus(); }
  };

  return (
    <input
      ref={ref}
      data-cell={`${row}:${col}`}
      aria-label={`${col} row ${row + 1}`}
      value={text ?? display}
      title={title}
      inputMode={kind === 'num' ? 'decimal' : undefined}
      onFocus={() => { selectOnEdit.current = true; setText(value === 0 && kind !== 'text' ? '' : String(value ?? '')); }}
      onChange={e => {
        const v = kind === 'num' ? e.target.value.replace(/[^\d.]/g, '') : e.target.value;
        setText(v);
        if (kind !== 'num') onCommit(v); // text/expr apply live, so totals follow as you type
      }}
      onBlur={() => { if (text !== null && kind === 'num' && !cancelled.current) commit(text); cancelled.current = false; setText(null); }}
      onKeyDown={e => {
        const el = e.currentTarget;
        const flush = () => { if (kind === 'num' && text !== null) commit(text); };
        if (e.key === 'Enter') { flush(); move(e, e.shiftKey ? -1 : 1, 0); }
        else if (e.key === 'ArrowDown') { flush(); move(e, 1, 0); }
        else if (e.key === 'ArrowUp') { flush(); move(e, -1, 0); }
        else if (e.key === 'ArrowRight' && (allSelected(el) || (el.selectionStart === el.value.length && el.selectionEnd === el.value.length))) { flush(); move(e, 0, 1); }
        else if (e.key === 'ArrowLeft' && (allSelected(el) || (el.selectionStart === 0 && el.selectionEnd === 0))) { flush(); move(e, 0, -1); }
        else if (e.key === 'Escape') { cancelled.current = true; setText(null); el.blur(); }
      }}
      className="sal-input"
      style={{
        width: '100%', height: 32, borderRadius: 6, outline: 'none', font: 'inherit', padding: '0 8px', textAlign: align,
        border: priority && !value && !invalid ? `1.5px solid ${C.prioBorder}` : `1px solid ${invalid ? '#fca5a5' : flagged ? '#fdba74' : priority ? C.prioBorderFilled : C.line}`,
        background: invalid ? '#fef2f2' : flagged ? '#fff7ed' : '#ffffff', color: color || C.ink, ...NUM,
      }}
    />
  );
};

// ── Small presentational pieces ──────────────────────────────────────────────
const Trend: React.FC<{ cur: number; prev?: number; prevLabel?: string; invert?: boolean }> = ({ cur, prev, prevLabel, invert }) => {
  if (prev === undefined) return <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>No previous month</div>;
  const up = cur >= prev;
  const good = invert ? !up : up;
  return (
    <div style={{ fontSize: 11, color: C.faint, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', ...(up ? { borderBottom: `6px solid ${good ? C.green : C.red}` } : { borderTop: `6px solid ${good ? C.green : C.red}` }) }} />
      {TAKA} {fmtMoney(prev)} ({prevLabel})
    </div>
  );
};

const MetricCard: React.FC<{ title: string; icon: React.FC<any>; rows: { label: string; icon: React.FC<any>; value: string; trend?: React.ReactNode }[] }> = ({ title, rows }) => (
  <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', flex: '1 1 200px' }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{title}</div>
    {rows.map((r, i) => (
      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? `1px solid ${C.line}` : undefined }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.muted, width: 70, flexShrink: 0 }}>
          <r.icon style={{ width: 14, height: 14 }} /> {r.label}
        </span>
        <span style={{ width: 1, alignSelf: 'stretch', background: C.line }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, ...NUM }}>{r.value}</div>
          {r.trend}
        </div>
      </div>
    ))}
  </div>
);

const Ring: React.FC<{ pct: number; label: string }> = ({ pct, label }) => {
  const r = 27, circ = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }} role="img" aria-label={label}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e8edf5" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={C.blue} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${circ * p} ${circ}`} transform="rotate(-90 36 36)" />
        <circle cx="36" cy="36" r={r - 9} fill="none" stroke="#fde68a" strokeWidth="4" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{Math.round(p * 100)}%</span>
        <span style={{ fontSize: 8, color: C.muted, letterSpacing: 0.3 }}>ENTERED</span>
      </div>
    </div>
  );
};

const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', color: '#4b5563', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</span>;
};

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 6px 0 12px', borderRadius: 999, background: '#eef0f3', border: `1px solid ${C.line}` }}>{children}</span>
);

export const SalaryReport: React.FC<Props> = ({ onBack }) => {
  const { employees, otRecords, attendanceRecords, timesheets, templates, leaves, signatures, currentUser } = useAppStore();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11 — the SALARY month

  const [sheets, setSheets] = useState<Record<string, SalarySheet>>({});
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<SalarySheet | null>(null);
  const [persisted, setPersisted] = useState(false);            // is this month stored yet?
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [menu, setMenu] = useState<{ empId: string; x: number; y: number } | null>(null);
  const [view, setView] = useState<'dashboard' | 'sheet'>('dashboard');
  const [showPasswords, setShowPasswords] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [backupCount, setBackupCount] = useState(0);
  const isSuperadmin = currentUser?.role === 'Superadmin';
  useEffect(() => { if (isSuperadmin) fetchTrash().then(l => setBackupCount(l.length)); }, [isSuperadmin]);
  const [creating, setCreating] = useState<{ year: number; month: number; then: 'dashboard' | 'sheet' } | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const id = sheetId(year, month);
  const att = attendanceMonthFor(year, month);
  const otWin = otWindowFor(year, month, templates);
  const shortDate = (d: string) => { const [y, m, dd] = d.split('-'); return `${+dd} ${MONTH_NAMES[+m - 1].slice(0, 3)} ${y}`; };
  const otText = `${shortDate(otWin.carryIn)} + ${MONTH_NAMES[att.month]} (excl. ${shortDate(otWin.excluded)})`;

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'Active'), [employees]);
  // OT and late for a salary month = the attendance month's timesheet: Total OT (row 09, incl.
  // row 08 "Others") and Late minutes (row 04). Same rules, so the sheet always agrees with it.
  const figuresFor = useCallback((y: number, m: number) => {
    const aw = attendanceMonthFor(y, m), ow = otWindowFor(y, m, templates);
    return (empId: string) => {
      const ts = timesheets.find(t => t.employeeId === empId && t.year === aw.year && t.month === aw.month);
      const others = parseFloat(ts?.summary?.find(x => x.sl === '08')?.days || '0') || 0;
      return {
        ot: Math.round((approvedOTHours(otRecords, empId, ow) + others) * 100) / 100,
        late: getMonthLate(empId, aw.year, aw.month, { attendanceRecords, timesheets, templates, leaves }).totalMinutes,
      };
    };
  }, [otRecords, attendanceRecords, timesheets, templates, leaves]);
  const system = useMemo(() => figuresFor(year, month), [figuresFor, year, month]);

  useEffect(() => {
    apiList<SalarySheet>('salary_sheets')
      .then(list => setSheets(Object.fromEntries(list.map(s => [s.id, normalizeSheet(s)]))))
      .catch(e => toast.error(e.message))
      .finally(() => setLoaded(true));
  }, []);

  // Open the month: the stored sheet (a draft is brought up to date), or a fresh draft copied from the last sheet
  useEffect(() => {
    if (!loaded || !activeEmployees.length) return;
    window.clearTimeout(saveTimer.current);
    const stored = sheets[id];
    if (stored) {
      const synced = stored.status === 'draft' ? syncDraft(stored, activeEmployees, system) : stored;
      setSheet(synced);
      setPersisted(true);
      setSaveState(synced !== stored ? 'pending' : 'idle');
    } else {
      setSheet(null);
      setPersisted(false);
      setSaveState('idle');
    }
    setSavedAt(null);
    // Only when the month changes, data first arrives, or this month's sheet is created/deleted — not on every save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loaded, activeEmployees.length, !!sheets[id]]);

  const save = useCallback(async (s: SalarySheet) => {
    setSaveState('saving');
    try {
      const toSave = { ...s, updatedAt: new Date().toISOString() };
      await apiSave('salary_sheets', toSave);
      setSheets(prev => ({ ...prev, [toSave.id]: toSave }));
      setPersisted(true);
      setSaveState('saved');
      setSavedAt(new Date());
    } catch (e: any) {
      setSaveState('error');
      toast.error(e.message);
    }
  }, []);

  // Autosave: 800 ms after the last edit
  useEffect(() => {
    if (saveState !== 'pending' || !sheet) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(sheet), 800);
    return () => window.clearTimeout(saveTimer.current);
  }, [sheet, saveState, save]);

  const edit = (next: SalarySheet) => { setSheet(next); setSaveState('pending'); };
  const updateRow = (empId: string, patch: Partial<SalaryRow>) => {
    if (!sheet || sheet.status === 'final') return;
    edit({ ...sheet, rows: sheet.rows.map(r => r.employeeId === empId ? { ...r, ...patch } : r) });
  };

  const flushAndGo = (go: () => void) => {
    if (saveState === 'pending' && sheet) { window.clearTimeout(saveTimer.current); save(sheet); }
    setMenu(null);
    go();
  };

  const calcs: SalaryCalc[] = useMemo(() => sheet ? sheet.rows.map(r => computeSalary(r)) : [], [sheet]);
  const total = (f: (c: SalaryCalc, r: SalaryRow) => number) => calcs.reduce((s, c, i) => s + f(c, sheet!.rows[i]), 0);

  // Previous month's stored sheet, for the ▲/▼ comparisons
  const pm = prevMonth(year, month);
  const prevSheet = sheets[sheetId(pm.year, pm.month)];
  const prevTotals = useMemo(() => {
    if (!prevSheet) return undefined;
    const pc = prevSheet.rows.map(r => computeSalary(r));
    const sum = (f: (c: SalaryCalc) => number) => pc.reduce((s, c) => s + f(c), 0);
    return {
      gross: sum(c => c.gross), otAmt: sum(c => c.otAmount), taxPf: sum(c => c.tax + c.pfDeduction),
      lateDed: sum(c => c.salaryDeduction), net: sum(c => c.netPayable), count: pc.length,
    };
  }, [prevSheet]);
  const prevLabel = MONTH_NAMES[pm.month].slice(0, 3);

  const isFinal = sheet?.status === 'final';
  const editable = !!sheet && !isFinal;
  const withPay = sheet ? sheet.rows.filter(r => r.gross || r.otRateMode === 'fixed').length : 0;
  const missingGross = sheet ? sheet.rows.length - withPay : 0;
  const badLoan = sheet?.rows.find(r => parseAmountExpr(r.loanExpr) === null);

  const sigsOf = (sh: SalarySheet) => ({
    approvedBy: signatures.find(x => x.id === sh.signatures.approvedById),
  });
  const sigs = () => sigsOf(sheet!);
  // A sheet can only be finalized once someone is chosen under Approved By (a deleted signature counts as none)
  const approver = sheet ? sigsOf(sheet).approvedBy : undefined;
  const approverRef = useRef<HTMLSelectElement>(null);
  const [flagApprover, setFlagApprover] = useState(false);

  const finalize = async () => {
    if (!sheet) return;
    if (badLoan) { toast.error(`Fix the loan adjustment for ${badLoan.name} first — use an amount or a sum like 18750+318`); return; }
    if (!approver) {
      toast.error('Choose who approved this sheet under "Approved By" before finalizing.');
      setFlagApprover(true);
      approverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      approverRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!(await confirmDialog({
      title: `Finalize ${MONTH_NAMES[month]} ${year}?`, icon: 'lock', tone: 'primary', confirmLabel: 'Finalize',
      message: 'The salary sheet becomes read-only. Payslips and the statement use these figures. You can reopen it later if something needs to change.',
      note: <>Approved by <b>{approver.name}</b>{approver.role ? ` (${approver.role})` : ''}</>,
    }))) return;
    window.clearTimeout(saveTimer.current);
    const next = { ...sheet, status: 'final' as const, finalizedAt: new Date().toISOString(), finalizedBy: currentUser?.name };
    setSheet(next); await save(next);
  };
  const reopen = async () => {
    if (!sheet || !(await confirmDialog({
      title: `Reopen ${MONTH_NAMES[month]} ${year}?`, icon: 'unlock', tone: 'primary', confirmLabel: 'Reopen for editing',
      message: 'The finalized sheet becomes editable again. Finalize it once more when the changes are done.',
    }))) return;
    const next = { ...sheet, status: 'draft' as const, finalizedAt: undefined, finalizedBy: undefined };
    setSheet(next); await save(next);
  };

  // Excel export keeps the workbook's own layout (headings, merged "Deduction", totals, amount in words)
  const exportExcel = (sheet: SalarySheet) => {
    const calcs = sheet.rows.map(r => computeSalary(r));
    const total = (f: (c: SalaryCalc, r: SalaryRow) => number) => calcs.reduce((s, c, i) => s + f(c, sheet.rows[i]), 0);
    const [year, month] = [sheet.year, sheet.month];
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const th = (h: string, extra = '') => `<th ${extra} style="background:${EXCEL_HEAD};border:1px solid #000">${esc(h)}</th>`;
    const plain = ['SL No.', 'Name', 'Designation', 'Joining Date', 'Basic Salary', 'House Rent', 'Conveyance', 'Medical Allowance', 'Special Allowance', 'Gross Salary', 'Company contribution to PF', 'Days of Month', 'Rate Per Hour', 'Overtime Hours', 'Total Overtime', 'Total Payable'];
    const head1 = plain.map(h => th(h, 'rowspan="2"')).join('') + th('Deduction', 'colspan="4"') + ['Net Payable', 'Remarks', 'Late (Minutes)'].map(h => th(h, 'rowspan="2"')).join('');
    const head2 = ['Tax', 'PF Deduction', 'Salary Deduction', 'Loan Adjustment'].map(h => th(h)).join('');
    const td = (x: any) => `<td style="border:1px solid #000">${esc(x)}</td>`;
    const body = sheet.rows.map((r, i) => {
      const c = calcs[i];
      return `<tr>${[String(i + 1).padStart(2, '0'), r.name, r.designation, fmtJoin(r.joiningDate), c.basic, c.houseRent, c.conveyance, c.medical, c.special, c.gross, c.pfCompany, r.days, Math.round(c.ratePerHour), r.otHours, c.otAmount, c.totalPayable, c.tax, c.pfDeduction, c.salaryDeduction, c.loanDeduction, c.netPayable, r.remarks, r.lateMinutes].map(td).join('')}</tr>`;
    }).join('');
    const tot = ['', 'Total', '', '', total(c => c.basic), total(c => c.houseRent), total(c => c.conveyance), total(c => c.medical), total(c => c.special), total(c => c.gross), total(c => c.pfCompany), '', '', total((_, r) => r.otHours), total(c => c.otAmount), total(c => c.totalPayable), total(c => c.tax), total(c => c.pfDeduction), total(c => c.salaryDeduction), total(c => c.loanDeduction), total(c => c.netPayable), '', ''];
    const html = `<html><head><meta charset="utf-8"></head><body><table>
      <tr><th colspan="23" style="font-size:16pt">TOKYO CONSULTING FIRM LIMITED</th></tr>
      <tr><th colspan="23">Statement of Salary &amp; Allowances</th></tr>
      <tr><th colspan="23">For the month of  ${MONTH_NAMES[month]}, ${year}</th></tr>
      <tr>${head1}</tr><tr>${head2}</tr>${body}
      <tr style="font-weight:bold">${tot.map(td).join('')}</tr>
      <tr></tr><tr><td></td><td colspan="22">Taka In Word: ${esc(takaInWords(total(c => c.netPayable)))}.</td></tr>
    </table></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }));
    a.download = `Salary_Statement_${MONTH_NAMES[month]}_${year}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const paidRows = (sh: SalarySheet) => sh.rows.filter(r => r.gross || computeSalary(r).totalPayable);
  const people = (n: number) => `${n} employee${n === 1 ? '' : 's'}`;
  const run = (p: Promise<unknown> | void) => Promise.resolve(p).catch(e => toast.error(`Download failed: ${e?.message || e}`));

  // PDF button: statement + every payslip, as one PDF or as separate files.
  const exportPdf = async (sh: SalarySheet) => {
    const paid = paidRows(sh);
    if (!paid.length) { run(downloadStatementPdf(sh, sigsOf(sh))); return; } // nothing to add, so no question
    const choice = await chooseDownload({
      title: 'Download statement & payslips',
      subtitle: `${MONTH_NAMES[sh.month]} ${sh.year} · statement + ${people(paid.length)}`,
      all: { label: 'All in one PDF', description: `One file: the salary statement followed by ${paid.length} payslip${paid.length === 1 ? '' : 's'}.` },
      separate: { label: 'Separate files', description: `The statement as its own PDF, plus one PDF per employee (${paid.length + 1} files).` },
    });
    if (choice === 'all') run(downloadStatementAndPayslips(sh, paid, sigsOf(sh)));
    if (choice === 'separate') run(downloadStatementAndPayslipsSeparately(sh, paid, sigsOf(sh)));
  };

  // Payslips button: every payslip, as one PDF or one file per employee.
  const downloadAllPayslips = async (sh: SalarySheet) => {
    const paid = paidRows(sh);
    if (!paid.length) { toast.error('No one has pay on this sheet yet — enter gross salaries first.'); return; }
    if (paid.length === 1) { run(downloadPayslips(sh, paid, sigsOf(sh), payslipFileName(sh, paid[0]))); return; }
    const choice = await chooseDownload({
      title: 'Download payslips',
      subtitle: `${MONTH_NAMES[sh.month]} ${sh.year} · ${people(paid.length)}`,
      all: { label: 'All in one PDF', description: `One file with ${paid.length} payslips, one per page.` },
      separate: { label: 'Separate files', description: `One PDF per employee (${paid.length} files).` },
    });
    if (choice === 'all') run(downloadPayslips(sh, paid, sigsOf(sh)));
    if (choice === 'separate') run(downloadPayslipsSeparately(sh, paid, sigsOf(sh)));
  };
  const downloadOnePayslip = (r: SalaryRow) =>
    sheet && run(downloadPayslips(sheet, [r], sigs(), payslipFileName(sheet, r)));

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const menuRow = menu && sheet?.rows.find(r => r.employeeId === menu.empId);
  const removeRow = async (empId: string) => {
    if (!sheet) return;
    const r = sheet.rows.find(x => x.employeeId === empId);
    setMenu(null);
    if (!(await confirmDialog({
      title: `Remove ${r?.name}?`, icon: 'user-minus', tone: 'danger', confirmLabel: 'Remove',
      message: `${r?.name} is taken off the ${MONTH_NAMES[month]} ${year} salary sheet and stays off next month too.`,
      note: 'You can add them back with Add employees.',
    }))) return;
    edit({ ...sheet, rows: sheet.rows.filter(x => x.employeeId !== empId), excluded: [...(sheet.excluded || []), empId] });
  };

  // Add / remove several employees at once (the sheet header buttons)
  const [roster, setRoster] = useState<'add' | 'remove' | null>(null);
  const onSheet = useMemo(() => new Set(sheet?.rows.map(r => r.employeeId) || []), [sheet]);
  // resigned members can be added too (e.g. a final month's pay); rows stay once they are on the sheet
  const addable = useMemo(() => employees.filter(e => !onSheet.has(e.id)), [employees, onSheet]);
  const addableActive = addable.filter(e => e.status === 'Active').length;
  const removable = useMemo(() => employees.filter(e => onSheet.has(e.id)), [employees, onSheet]);
  const addEmployees = (ids: string[]) => {
    if (!sheet) return;
    const pool = [...activeEmployees, ...employees.filter(e => e.status !== 'Active' && ids.includes(e.id))];
    const next = syncDraft({ ...sheet, excluded: (sheet.excluded || []).filter(x => !ids.includes(x)) }, pool, system);
    edit(next);
    setRoster(null);
    toast.success(`${ids.length} employee${ids.length === 1 ? '' : 's'} added to ${MONTH_NAMES[month]} ${year}`);
  };
  const removeEmployees = async (ids: string[]) => {
    if (!sheet) return;
    const names = sheet.rows.filter(r => ids.includes(r.employeeId)).map(r => r.name);
    const typed = sheet.rows.some(r => ids.includes(r.employeeId) && (r.gross || r.tax || r.loan || r.specialAllowance));
    if (!(await confirmDialog({
      title: ids.length === 1 ? `Remove ${names[0]}?` : `Remove ${ids.length} employees?`, icon: 'user-minus', tone: 'danger', confirmLabel: 'Remove',
      message: <>{ids.length === 1 ? <b>{names[0]}</b> : <>{names.slice(0, 5).join(', ')}{names.length > 5 ? ` and ${names.length - 5} more` : ''}</>} {ids.length === 1 ? 'is' : 'are'} taken off the {MONTH_NAMES[month]} {year} salary sheet and stay{ids.length === 1 ? 's' : ''} off next month too.</>,
      note: typed ? 'Figures typed for them on this sheet are removed as well. You can add them back with Add employees.' : 'You can add them back with Add employees.',
    }))) return;
    edit({ ...sheet, rows: sheet.rows.filter(r => !ids.includes(r.employeeId)), excluded: [...new Set([...(sheet.excluded || []), ...ids])] });
    setRoster(null);
    toast.success(`${ids.length} employee${ids.length === 1 ? '' : 's'} removed from ${MONTH_NAMES[month]} ${year}`);
  };

  // ── Cells ────────────────────────────────────────────────────────────────────
  const money = (n: number) => fmtMoney(n);
  const renderCell = (col: Col, r: SalaryRow, c: SalaryCalc, i: number): React.ReactNode => {
    const align = col.align || 'right';
    const ro = (text: React.ReactNode, extra: React.CSSProperties = {}) =>
      <div style={{ padding: '0 8px', textAlign: align, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...NUM, ...extra }}>{text}</div>;
    const inp = (kind: 'num' | 'text' | 'expr', value: string | number, display: string, onCommit: (v: string) => void,
      opts: { invalid?: boolean; color?: string; title?: string; flagged?: boolean } = {}) =>
      editable ? <div style={{ padding: '0 4px' }}><Cell kind={kind} value={value} display={display} row={i} col={col.key} onCommit={onCommit} align={align} priority={col.priority} {...opts} /></div>
        : ro(display, { color: opts.color });
    const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
    switch (col.key) {
      case 'sl': return ro(String(i + 1).padStart(2, '0'), { color: C.muted, fontWeight: 600 });
      case 'name': return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', minWidth: 0 }}>
          <Avatar name={r.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{r.eid}</div>
          </div>
        </div>
      );
      case 'designation': return ro(r.designation || <span style={{ color: C.faint }} title="Set it in Employees → Edit → Designation">—</span>, { color: C.body });
      case 'join': return ro(fmtJoin(r.joiningDate), { color: C.body });
      case 'basic': return ro(money(c.basic));
      case 'house': return ro(money(c.houseRent));
      case 'conv': return ro(money(c.conveyance));
      case 'medical': return ro(money(c.medical));
      case 'special': return inp('num', r.specialAllowance, money(r.specialAllowance), v => updateRow(r.employeeId, { specialAllowance: num(v) }));
      case 'gross': return inp('num', r.gross, money(r.gross), v => updateRow(r.employeeId, { gross: num(v) }), { title: r.structure === 'flat' ? 'Flat salary — whole gross is basic' : 'Gross salary' });
      case 'pfco': return ro(money(c.pfCompany));
      case 'days': return inp('num', r.days, String(r.days), v => updateRow(r.employeeId, { days: num(v) || 30 }), { title: 'Days of month (late deduction divisor)' });
      case 'rate': return ro(money(c.ratePerHour), { color: C.muted });
      case 'ot': return inp('num', r.otHours, fmtHours(r.otHours), v => updateRow(r.employeeId, { otHours: num(v) }), {
        flagged: r.otHours !== r.otAuto,
        title: r.otHours !== r.otAuto ? `Changed by hand — the ${MONTH_NAMES[att.month]} timesheet shows ${r.otAuto} h (${otText})` : `${MONTH_NAMES[att.month]} timesheet Total OT: ${otText}`,
      });
      case 'otAmt': return ro(money(c.otAmount), { color: c.otAmount ? C.blue : undefined });
      case 'loan': return inp('expr', r.loanExpr, money(r.loan), v => {
        const n = parseAmountExpr(v);
        updateRow(r.employeeId, { loanExpr: v, ...(n !== null ? { loan: n } : {}) });
      }, { invalid: parseAmountExpr(r.loanExpr) === null, color: r.loan > 0 ? C.red : undefined, title: 'Loan adjustment — deducted from pay. Type an amount or a sum, e.g. 18750+318' });
      case 'total': return ro(money(c.totalPayable), { color: c.totalPayable < 0 ? C.red : C.ink });
      case 'tax': return inp('num', r.tax, money(r.tax), v => updateRow(r.employeeId, { tax: num(v) }));
      case 'pf': return ro(money(c.pfDeduction));
      case 'salDed': return ro(money(c.salaryDeduction), { color: c.salaryDeduction ? C.red : undefined });
      case 'net': return ro(money(c.netPayable), { fontWeight: 700, color: c.netPayable < 0 ? C.red : C.ink });
      case 'remarks': return inp('text', r.remarks, r.remarks, v => updateRow(r.employeeId, { remarks: v }));
      case 'late': return inp('num', r.lateMinutes, String(r.lateMinutes || 0), v => updateRow(r.employeeId, { lateMinutes: Math.round(num(v)) }), {
        flagged: r.lateMinutes !== r.lateAuto,
        title: r.lateMinutes !== r.lateAuto ? `Changed by hand — system counted ${r.lateAuto} min in ${MONTH_NAMES[att.month]}` : !r.lateDeduction ? 'Late deduction is off for this employee' : `Late minutes in ${MONTH_NAMES[att.month]} ${att.year}`,
      });
      case 'action': return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <IconBtn label={`Download payslip for ${r.name}`} onClick={() => downloadOnePayslip(r)}><FileText style={{ width: 17, height: 17 }} /></IconBtn>
          <IconBtn label={`Options for ${r.name}`} onClick={e => { e.stopPropagation(); const b = e.currentTarget.getBoundingClientRect(); setMenu(menu?.empId === r.employeeId ? null : { empId: r.employeeId, x: b.right - 290, y: b.bottom + 4 }); }}>
            <MoreHorizontal style={{ width: 17, height: 17 }} />
          </IconBtn>
        </div>
      );
    }
  };

  const saveLabel = isFinal ? <><Lock className="h-3.5 w-3.5" /> Finalized{sheet?.finalizedAt ? ` ${new Date(sheet.finalizedAt).toLocaleDateString('en-GB')}` : ''}{sheet?.finalizedBy ? ` by ${sheet.finalizedBy}` : ''}</>
    : saveState === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
    : saveState === 'pending' ? <>Unsaved changes…</>
    : saveState === 'error' ? <span style={{ color: C.red }}>Not saved — check the connection</span>
    : saveState === 'saved' ? <><Check className="h-3.5 w-3.5" style={{ color: C.green }} /> Saved {savedAt?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
    : persisted ? <><Check className="h-3.5 w-3.5" style={{ color: C.green }} /> All changes saved</>
    : <>New sheet — saves automatically once you type</>;

  const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${C.line}`, background: '#fff', color: C.body, fontFamily: FONT };
  const selectCss: React.CSSProperties = { appearance: 'none', background: 'transparent', border: 'none', outline: 'none', fontSize: 12.5, fontWeight: 600, color: C.ink, cursor: 'pointer', paddingRight: 2, fontFamily: FONT };

  const grossT = total(c => c.gross), otT = total(c => c.otAmount), taxPfT = total(c => c.tax + c.pfDeduction), lateT = total(c => c.salaryDeduction), netT = total(c => c.netPayable);
  const netPct = prevTotals && prevTotals.net ? (netT - prevTotals.net) / Math.abs(prevTotals.net) : undefined;

  // ── Create a sheet for the employees HR picked ────────────────────────────────
  const latestBefore = (sid: string) => Object.values(sheets).filter(x => x.id < sid).sort((a, b) => b.id.localeCompare(a.id))[0];
  const createSheet = async (y: number, m: number, ids: string[], then: 'dashboard' | 'sheet') => {
    const sid = sheetId(y, m);
    const sys = figuresFor(y, m);
    const pool = [...activeEmployees, ...employees.filter(e => e.status !== 'Active' && ids.includes(e.id))];
    const draft = buildDraftSheet({ year: y, month: m, employees: pool, prev: latestBefore(sid), system: sys, include: ids });
    try {
      await apiSave('salary_sheets', draft);
      setSheets(prev => ({ ...prev, [sid]: draft }));
      setCreating(null);
      toast.success(`${MONTH_NAMES[m]} ${y} salary sheet created with ${ids.length} employee${ids.length === 1 ? '' : 's'}`);
      if (then === 'sheet' && sid === id) { setSheet(draft); setPersisted(true); setSaveState('idle'); }
      setView(then);
    } catch (e: any) { toast.error(e.message); }
  };
  const deleteSheet = async (sh: SalarySheet) => {
    const label = `${MONTH_NAMES[sh.month]} ${sh.year} salary sheet`;
    if (!(await confirmDialog({
      title: `Delete the ${MONTH_NAMES[sh.month]} ${sh.year} salary sheet?`, icon: 'trash', tone: 'danger', confirmLabel: 'Delete sheet',
      message: <>{sh.status === 'final' ? <b>This sheet is finalized. </b> : null}It is removed from the dashboard for everyone, with its {sh.rows.length} employee{sh.rows.length === 1 ? '' : 's'} and all figures typed on it.</>,
    }))) return;
    try {
      if (sh.id === id) window.clearTimeout(saveTimer.current); // no pending autosave may bring it back
      await trashSheet(sh, currentUser?.name); // kept in the Superadmin's Backup, not destroyed
      setSheets(prev => { const n = { ...prev }; delete n[sh.id]; return n; });
      if (isSuperadmin) setBackupCount(c => c + 1);
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted`);
    } catch (e: any) { toast.error(e.message); }
  };

  const picker = creating && (
    <SalaryEmployeePicker
      year={creating.year} month={creating.month} employees={employees}
      initial={latestBefore(sheetId(creating.year, creating.month))?.rows.map(r => r.employeeId)}
      onCancel={() => setCreating(null)}
      onSubmit={ids => createSheet(creating.year, creating.month, ids, creating.then)}
    />
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <>
        <SalaryDashboard
          sheets={Object.values(sheets)}
          employees={activeEmployees}
          onBack={onBack}
          onOpen={(y, m) => { setYear(y); setMonth(m); setView('sheet'); }}
          onCreate={(y, m) => setCreating({ year: y, month: m, then: 'dashboard' })}
          onExportExcel={exportExcel}
          onPayslips={downloadAllPayslips}
          onDelete={deleteSheet}
          onDismiss={() => flushAndGo(() => { lockSalary(); onBack(); })}
          onPassword={() => setShowPasswords(true)}
          backupCount={isSuperadmin ? backupCount : undefined}
          onBackup={isSuperadmin ? () => setShowBackup(true) : undefined}
        />
        {picker}
        {showPasswords && <SalaryPasswordDialog employees={activeEmployees} currentUser={currentUser} onClose={() => setShowPasswords(false)} />}
        {showBackup && isSuperadmin && (
          <SalaryBackupDialog
            liveSheetIds={Object.keys(sheets)}
            onRestored={sh => setSheets(prev => ({ ...prev, [sh.id]: sh }))}
            onCountChange={setBackupCount}
            onClose={() => setShowBackup(false)}
          />
        )}
      </>
    );
  }

  return (
    <div style={{ fontFamily: FONT, color: C.ink }} className="space-y-4" onClick={() => menu && setMenu(null)}>
      <style>{`
        .sal-input:hover { border-color: #cbd5e1 !important; }
        .sal-input:focus { border-color: ${C.blue} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .sal-row:hover > td { background: ${C.rowHover} !important; }
        .sal-row:hover > td.sal-prio { background: ${C.prioHover} !important; }
      `}</style>

      {/* Tabs + header — full width, aligned with the sections below */}
      <FullBleed>
      <div role="tablist" style={{ background: C.strip, borderRadius: 10, padding: 4, display: 'flex', gap: 4 }}>
        {([['dashboard', 'Dashboard', Banknote], ['sheet', 'Salary Sheet', FileSpreadsheet]] as const).map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => k === 'dashboard' && flushAndGo(() => setView('dashboard'))}
            style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: view === k ? '#fff' : 'transparent', boxShadow: view === k ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', color: view === k ? C.ink : C.muted, fontSize: 13.5, fontWeight: view === k ? 600 : 500, fontFamily: FONT }}>
            <Icon style={{ width: 15, height: 15 }} /> {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => flushAndGo(() => setView('dashboard'))} aria-label="Back to salary dashboard" className="cursor-pointer"
            style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft style={{ width: 16, height: 16, color: C.body }} />
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.3, margin: 0 }}>Salary &amp; Payslips</h1>
          {sheet && (
            <button onClick={() => exportPdf(sheet)} className="cursor-pointer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 16px', borderRadius: 6, background: C.blueSoft, border: `1px solid ${C.blueBorder}`, color: C.navy, fontSize: 13, fontWeight: 500, fontFamily: FONT }}>
              Statement PDF <Printer style={{ width: 15, height: 15 }} />
            </button>
          )}
          <span style={{ fontSize: 12, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }} aria-live="polite">{saveLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill>
            <CalendarDays style={{ width: 14, height: 14, color: C.muted }} />
            <select aria-label="Salary month" value={month} onChange={e => flushAndGo(() => setMonth(+e.target.value))} style={selectCss}>
              {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <ChevronDown style={{ width: 14, height: 14, color: C.muted, marginLeft: -2 }} />
          </Pill>
          <Pill>
            <select aria-label="Salary year" value={year} onChange={e => flushAndGo(() => setYear(+e.target.value))} style={selectCss}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown style={{ width: 14, height: 14, color: C.muted, marginLeft: -2 }} />
          </Pill>
          {sheet && <>
            <button style={ghostBtn} onClick={() => exportExcel(sheet)}><FileSpreadsheet style={{ width: 14, height: 14 }} /> Excel</button>
            <button style={ghostBtn} onClick={() => downloadAllPayslips(sheet)} title="One payslip per employee with pay on this sheet"><FileText style={{ width: 14, height: 14 }} /> Payslips</button>
            {/* Finalize / Reopen sits at the right edge of the toolbar */}
            <span style={{ flex: 1 }} aria-hidden="true" />
            {isFinal
              ? <button style={ghostBtn} onClick={reopen}><LockOpen style={{ width: 14, height: 14 }} /> Reopen</button>
              : <button style={{ ...ghostBtn, background: approver ? C.navy : '#93a5cf', borderColor: approver ? C.navy : '#93a5cf', color: '#fff' }} onClick={finalize}
                  aria-describedby={approver ? undefined : 'approver-required'} title={approver ? 'Finalize this sheet' : 'Choose an Approved By signature first'}>
                  <Lock style={{ width: 14, height: 14 }} /> Finalize
                  {!approver && <span id="approver-required" style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 9999, background: 'rgba(255,255,255,.25)' }}>Approved By required</span>}
                </button>}
          </>}
        </div>
      </div>
      </FullBleed>

      {!loaded ? (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.line}`, padding: 40, textAlign: 'center', fontSize: 14, color: C.muted }}>Loading salary sheet…</div>
      ) : !sheet ? (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px dashed ${C.line}`, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No salary sheet for {MONTH_NAMES[month]} {year} yet</div>
          <div style={{ fontSize: 13, color: C.muted, margin: '6px 0 16px' }}>
            Create it and choose the employees to include. OT and late minutes fill in from the {MONTH_NAMES[att.month]} {att.year} timesheets.
          </div>
          <button onClick={() => setCreating({ year, month, then: 'sheet' })} className="cursor-pointer"
            style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: C.navy, color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: FONT }}>
            Create sheet
          </button>
        </div>
      ) : (<>
        {/* Summary strip — full width, one row of compact cards (wraps on narrow screens) */}
        <FullBleed>
        <div style={{ background: C.strip, borderRadius: 12, padding: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', flex: '1.15 1 250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
              <Building2 style={{ width: 16, height: 16, color: C.body }} /> Tokyo Consulting Firm Limited
            </div>
            {[
              ['Employees', String(sheet.rows.length)],
              ['Salary month', `${MONTH_NAMES[month]} ${year}`],
              ['Attendance', `${MONTH_NAMES[att.month]} ${att.year}`],
              ['Overtime', otText],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', fontSize: 12, padding: '1.5px 0' }}>
                <span style={{ width: 88, color: C.muted, flexShrink: 0 }}>{k}</span>
                <span style={{ color: C.line, margin: '0 8px' }}>|</span>
                <span style={{ color: C.ink, whiteSpace: 'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>

          <MetricCard title="Gross Salary" icon={Wallet} rows={[
            { label: 'Total', icon: Sigma, value: `${TAKA} ${fmtMoney(grossT)}`, trend: <Trend cur={grossT} prev={prevTotals?.gross} prevLabel={prevLabel} /> },
            { label: 'Average', icon: Users, value: `${TAKA} ${fmtMoney(withPay ? grossT / withPay : 0)}` },
          ]} />
          <MetricCard title="Overtime" icon={Clock3} rows={[
            { label: 'Amount', icon: Sigma, value: `${TAKA} ${fmtMoney(otT)}`, trend: <Trend cur={otT} prev={prevTotals?.otAmt} prevLabel={prevLabel} invert /> },
            { label: 'Hours', icon: Clock3, value: fmtHours(total((_, r) => r.otHours)) },
          ]} />
          <MetricCard title="Deductions" icon={Scissors} rows={[
            { label: 'Tax + PF', icon: Sigma, value: `${TAKA} ${fmtMoney(taxPfT)}`, trend: <Trend cur={taxPfT} prev={prevTotals?.taxPf} prevLabel={prevLabel} /> },
            { label: 'Late', icon: Clock3, value: `${TAKA} ${fmtMoney(lateT)}`, trend: <Trend cur={lateT} prev={prevTotals?.lateDed} prevLabel={prevLabel} invert /> },
            { label: 'Loan', icon: Wallet, value: `${TAKA} ${fmtMoney(total(c => c.loanDeduction))}` },
          ]} />

          <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', flex: '1.3 1 280px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Net Payable</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {netPct !== undefined && (
                  <span style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', ...(netPct >= 0 ? { borderBottom: `9px solid ${C.green}` } : { borderTop: `9px solid ${C.red}` }) }} />
                )}
                <span style={{ fontSize: 22, fontWeight: 700, ...NUM, color: netT < 0 ? C.red : C.ink }}>{TAKA} {fmtMoney(netT)}</span>
              </div>
              <div style={{ fontSize: 11, color: C.faint }}>
                {prevTotals ? <>{TAKA} {fmtMoney(prevTotals.net)} ({prevLabel}){netPct !== undefined && <> · {netPct >= 0 ? '+' : ''}{(netPct * 100).toFixed(1)}%</>}</> : 'No previous month to compare'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: C.muted }}>
                <span>Basic <b style={{ color: C.body, fontWeight: 600, ...NUM }}>{fmtMoney(total(c => c.basic))}</b></span>
                <span>Allowances <b style={{ color: C.body, fontWeight: 600, ...NUM }}>{fmtMoney(total(c => c.houseRent + c.conveyance + c.medical + c.special))}</b></span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Ring pct={sheet.rows.length ? withPay / sheet.rows.length : 0} label={`${withPay} of ${sheet.rows.length} salaries entered`} />
              <div style={{ fontSize: 10, color: C.muted }}>{withPay}/{sheet.rows.length} salaries</div>
            </div>
          </div>
        </div>
        </FullBleed>

        {/* Breakdown — stretched to the full width of the content area */}
        <FullBleed>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Individual Salary Breakdown</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {editable ? <>
                <span style={{ background: C.prioHead, color: C.prioHeadText, fontWeight: 600, padding: '1px 6px', borderRadius: 4 }}>Gross Salary</span>,{' '}
                <span style={{ background: C.prioHead, color: C.prioHeadText, fontWeight: 600, padding: '1px 6px', borderRadius: 4 }}>Tax</span>,{' '}
                <span style={{ background: C.prioHead, color: C.prioHeadText, fontWeight: 600, padding: '1px 6px', borderRadius: 4 }}>Loan Adjustment</span> need to be filled first ·
                boxed values are typed in · Enter and arrow keys move between them · changes save automatically</> : 'Finalized — read-only. Reopen to make changes.'}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {editable && (missingGross > 0 || badLoan) && (
              <div role="status" style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                {missingGross > 0 && <>{missingGross} employee{missingGross > 1 ? 's have' : ' has'} no gross salary yet. </>}
                {badLoan && <>Loan adjustment for {badLoan.name} isn't a valid amount.</>}
              </div>
            )}
            {editable && (
              <>
                <button onClick={() => setRoster('add')} disabled={!addable.length} className="cursor-pointer"
                  title={addable.length ? `${addableActive} active${addable.length > addableActive ? ` and ${addable.length - addableActive} resigned` : ''} not on this sheet` : 'Everyone is already on this sheet'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: addable.length ? C.navy : '#93a5cf', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: addable.length ? 'pointer' : 'not-allowed' }}>
                  <UserPlus style={{ width: 15, height: 15 }} /> Add employees
                  {addableActive > 0 && <span style={{ padding: '0 7px', borderRadius: 9999, background: 'rgba(255,255,255,.22)', fontSize: 11.5 }}>{addableActive}</span>}
                </button>
                <button onClick={() => setRoster('remove')} disabled={!removable.length} className="cursor-pointer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: removable.length ? '#b91c1c' : '#fca5a5', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: removable.length ? 'pointer' : 'not-allowed' }}>
                  <UserMinus style={{ width: 15, height: 15 }} /> Remove employees
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.line}`, contain: 'inline-size' }}>
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', padding: '0 0 8px' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: '0 6px', tableLayout: 'fixed', width: TABLE_W, fontSize: 13 }}>
              <colgroup>{COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}</colgroup>
              <thead>
                <tr>
                  {COLS.map((c, i) => (
                    <th key={c.key} style={{
                      position: 'sticky', top: 0, zIndex: isSticky(c.key) ? 5 : 3, ...pinSide(c.key),
                      background: c.priority && editable ? C.prioHead : C.head, color: c.priority && editable ? C.prioHeadText : C.body, fontSize: 11.5, fontWeight: c.priority && editable ? 700 : 600, letterSpacing: 0.3, textTransform: 'uppercase',
                      height: 42, padding: '0 8px', textAlign: c.key === 'name' ? 'left' : c.key === 'sl' ? 'center' : (c.align || 'right'), whiteSpace: 'nowrap',
                      borderTopLeftRadius: i === 0 ? 8 : 0, borderBottomLeftRadius: i === 0 ? 8 : 0,
                      borderTopRightRadius: i === COLS.length - 1 ? 8 : 0, borderBottomRightRadius: i === COLS.length - 1 ? 8 : 0,
                      ...(c.key === 'name' ? { paddingLeft: 54 } : {}),
                    }}>
                      {c.label}
                      {c.priority && editable
                        ? <span title="Fill this in first" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', background: C.prioBorder, color: '#fff', fontSize: 10, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>!</span>
                        : c.input && editable && <span aria-hidden style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: C.blue, marginLeft: 5, verticalAlign: 'middle' }} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((r, i) => (
                  <tr key={r.employeeId} className="sal-row">
                    {COLS.map((col, ci) => (
                      <td key={col.key} className={col.priority && editable ? 'sal-prio' : undefined} style={{
                        background: col.priority && editable ? C.prioCell : C.row, height: 50, padding: 0, whiteSpace: 'nowrap',
                        ...(isSticky(col.key) ? { position: 'sticky', zIndex: 2, ...pinSide(col.key) } : {}),
                        borderTopLeftRadius: ci === 0 ? 8 : 0, borderBottomLeftRadius: ci === 0 ? 8 : 0,
                        borderTopRightRadius: ci === COLS.length - 1 ? 8 : 0, borderBottomRightRadius: ci === COLS.length - 1 ? 8 : 0,
                      }}>
                        {renderCell(col, r, calcs[i], i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  {COLS.map((col, ci) => {
                    const v: Partial<Record<ColKey, string>> = {
                      name: `Total · ${sheet.rows.length} employees`, basic: fmtMoney(total(c => c.basic)), house: fmtMoney(total(c => c.houseRent)),
                      conv: fmtMoney(total(c => c.conveyance)), medical: fmtMoney(total(c => c.medical)), special: fmtMoney(total(c => c.special)),
                      gross: fmtMoney(grossT), pfco: fmtMoney(total(c => c.pfCompany)), ot: fmtHours(total((_, r) => r.otHours)), otAmt: fmtMoney(otT),
                      total: fmtMoney(total(c => c.totalPayable)), tax: fmtMoney(total(c => c.tax)),
                      pf: fmtMoney(total(c => c.pfDeduction)), salDed: fmtMoney(lateT), loan: fmtMoney(total(c => c.loanDeduction)), net: fmtMoney(netT),
                    };
                    return (
                      <td key={col.key} style={{
                        position: 'sticky', bottom: 0, zIndex: isSticky(col.key) ? 4 : 3, ...pinSide(col.key),
                        background: C.head, height: 44, fontWeight: 700, padding: '0 8px', whiteSpace: 'nowrap', ...NUM,
                        boxShadow: '0 14px 0 0 #ffffff', // hide rows scrolling through the gap below the sticky total
                        textAlign: col.key === 'name' ? 'left' : (col.align || 'right'),
                        borderTopLeftRadius: ci === 0 ? 8 : 0, borderBottomLeftRadius: ci === 0 ? 8 : 0,
                        borderTopRightRadius: ci === COLS.length - 1 ? 8 : 0, borderBottomRightRadius: ci === COLS.length - 1 ? 8 : 0,
                        ...(col.key === 'name' ? { paddingLeft: 12 } : {}),
                      }}>
                        {col.key === 'ot' || col.key === 'days' || col.key === 'late' ? <div style={{ textAlign: col.align || 'right' }}>{v[col.key] || ''}</div> : v[col.key] || ''}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Approval */}
          <div style={{ borderTop: `1px solid ${C.line}`, padding: '14px 20px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: C.muted }}>
              {editable && addableActive > 0 && (
                <>{addableActive} active employee{addableActive === 1 ? ' is' : 's are'} not on this sheet.{' '}
                  <button className="underline cursor-pointer" onClick={() => setRoster('add')}>Add employees</button></>
              )}
            </div>
            <label className="block" style={{ width: 340, maxWidth: '100%' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 }}>Approved By <span style={{ color: '#dc2626' }}>*</span></span>
              <select ref={approverRef} aria-label="Approved By signature" aria-required="true" aria-invalid={editable && !approver} disabled={!editable} value={approver ? sheet.signatures.approvedById : ''}
                onChange={e => { setFlagApprover(false); edit({ ...sheet, signatures: { ...sheet.signatures, approvedById: e.target.value || undefined } }); }}
                className="cursor-pointer disabled:cursor-default"
                style={{ display: 'block', width: '100%', marginTop: 4, height: 36, borderRadius: 8, fontSize: 13, fontFamily: FONT, color: C.ink, padding: '0 10px',
                  border: `1px solid ${editable && !approver ? (flagApprover ? '#dc2626' : '#fca5a5') : C.line}`,
                  background: editable && !approver && flagApprover ? '#fef2f2' : '#fff',
                  boxShadow: editable && !approver && flagApprover ? '0 0 0 3px rgba(220,38,38,.15)' : undefined }}>
                <option value="">{editable ? 'Choose signature…' : '—'}</option>
                {signatures.map(x => <option key={x.id} value={x.id}>{x.name} ({x.role})</option>)}
              </select>
              {editable && !approver && (
                <span style={{ display: 'block', fontSize: 11.5, color: '#b91c1c', marginTop: 4 }}>Required to finalize this sheet.</span>
              )}
            </label>
          </div>
        </div>
        </FullBleed>
      </>)}

      {/* Row options */}
      {menu && menuRow && sheet && (
        <div role="dialog" aria-label={`Options for ${menuRow.name}`} onClick={e => e.stopPropagation()}
          className="fixed z-50 bg-white rounded-lg border border-gray-200 shadow-xl text-sm"
          style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 300)), top: Math.max(8, Math.min(menu.y, window.innerHeight - 440)), width: 290, fontFamily: FONT }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <Avatar name={menuRow.name} />
            <div>
              <div className="font-semibold text-gray-900">{menuRow.name}</div>
              <div className="text-xs text-gray-500">{menuRow.eid} · settings carry to next month</div>
            </div>
          </div>
          <fieldset disabled={!editable} className="px-4 py-3 space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Salary structure</div>
              {([['split', 'Standard — Basic 60%, House Rent, Medical, Conveyance'], ['flat', 'Flat — whole gross is basic']] as const).map(([v, l]) => (
                <label key={v} className="flex items-start gap-2 py-0.5 cursor-pointer">
                  <input type="radio" className="mt-1" checked={menuRow.structure === v} onChange={() => updateRow(menuRow.employeeId, { structure: v })} /> <span>{l}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={menuRow.pf} onChange={e => updateRow(menuRow.employeeId, { pf: e.target.checked })} /> Provident fund
              </label>
              {menuRow.pf && (
                <span className="flex items-center gap-1 text-gray-600">
                  <input aria-label="PF rate percent" type="number" step="0.01" value={+(menuRow.pfRate * 100).toFixed(2)}
                    onChange={e => updateRow(menuRow.employeeId, { pfRate: (parseFloat(e.target.value) || 0) / 100 })}
                    className="w-16 border border-gray-300 rounded px-1 py-0.5 text-right" /> % of basic
                </span>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Overtime rate</div>
              <div className="flex items-center gap-2">
                <select aria-label="Overtime rate" value={menuRow.otRateMode} onChange={e => updateRow(menuRow.employeeId, { otRateMode: e.target.value as SalaryRow['otRateMode'] })}
                  className="border border-gray-300 rounded px-2 py-1 bg-white">
                  <option value="formula">Basic ÷ 208 × 2</option>
                  <option value="fixed">Fixed per hour</option>
                  <option value="none">No overtime</option>
                </select>
                {menuRow.otRateMode === 'fixed' && (
                  <input aria-label="Fixed rate per hour" type="number" value={menuRow.otRateFixed || ''} placeholder="110"
                    onChange={e => updateRow(menuRow.employeeId, { otRateFixed: parseFloat(e.target.value) || 0 })}
                    className="w-20 border border-gray-300 rounded px-1 py-1 text-right" />
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={menuRow.lateDeduction} onChange={e => updateRow(menuRow.employeeId, { lateDeduction: e.target.checked })} /> Deduct salary for late minutes
            </label>
            {(menuRow.otHours !== menuRow.otAuto || menuRow.lateMinutes !== menuRow.lateAuto) && (
              <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer"
                onClick={() => updateRow(menuRow.employeeId, { otHours: menuRow.otAuto, lateMinutes: menuRow.lateAuto })}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset OT &amp; late to system ({menuRow.otAuto} h, {menuRow.lateAuto} min)
              </button>
            )}
          </fieldset>
          {editable && (
            <div className="border-t border-gray-100 px-2 py-2 flex flex-col">
              <button className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-50 text-left cursor-pointer" style={{ color: '#b91c1c' }} onClick={() => removeRow(menuRow.employeeId)}><UserMinus className="h-4 w-4" /> Remove from this month</button>
            </div>
          )}
        </div>
      )}
      {picker}
      {roster && sheet && (
        <SalaryEmployeePicker key={roster} mode={roster} year={year} month={month}
          employees={roster === 'add' ? addable : removable}
          onCancel={() => setRoster(null)}
          onSubmit={ids => roster === 'add' ? addEmployees(ids) : removeEmployees(ids)} />
      )}
    </div>
  );
};

// Lets a section use the whole content area instead of the app's centred 1280px column
// (the salary table has 23 columns). Recomputed whenever the window or sidebar area resizes.
const FullBleed: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; marginLeft: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current, main = el?.closest('main');
    const inner = main?.firstElementChild as HTMLElement | null;
    if (!el || !main || !inner) return;
    const measure = () => {
      const pad = parseFloat(getComputedStyle(inner).paddingLeft) || 0;
      // From the viewport, not main.clientWidth: our own width would otherwise hold main open when the window shrinks
      const width = document.documentElement.clientWidth - main.getBoundingClientRect().left - pad * 2;
      const anchor = el.parentElement!.getBoundingClientRect().left;       // where the section would normally start
      const target = main.getBoundingClientRect().left + pad;
      setBox(prev => (prev && prev.width === width && prev.marginLeft === target - anchor) ? prev : { width, marginLeft: target - anchor });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 16, ...(box ? { width: box.width, marginLeft: box.marginLeft } : {}) }}>
      {children}
    </div>
  );
};

const IconBtn: React.FC<{ label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button aria-label={label} title={label} onClick={onClick}
    style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: 'transparent', color: C.body, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
    {children}
  </button>
);
