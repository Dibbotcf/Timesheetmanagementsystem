import type { Employee, MonthTemplate, OTRecord } from '../App';

// Salary rules follow HR's "Statement of Salary & Allowances" workbook, formula for formula.
// A salary month pays the SAME month's attendance (HR's choice, 30 Sep 2026): the June sheet uses the
// June timesheets' Total OT (row 09) and late minutes (row 04). HR's workbook labelled that sheet "July".

export type SalaryStructure = 'split' | 'flat';
export type OTRateMode = 'formula' | 'fixed' | 'none';

/**
 * One employee's line on a monthly sheet — the workbook row. Pay settings (gross, structure, PF, OT
 * rate) live here and carry forward to next month, exactly like copying last month's workbook.
 */
export interface SalaryRow {
  employeeId: string;
  name: string;
  eid: string;
  designation: string;   // the employee's job title (Employees → Designation), snapshotted on the sheet
  joiningDate: string;
  gross: number;
  structure: SalaryStructure; // split: basic 60% / house rent / medical / conveyance. flat: whole gross is basic
  pf: boolean;
  pfRate: number;            // workbook uses 8.33% of basic, matched by the company
  otRateMode: OTRateMode;
  otRateFixed?: number;      // per hour, when otRateMode = 'fixed'
  lateDeduction: boolean;
  specialAllowance: number;
  days: number;              // "Days of Month" — divisor for the late deduction
  otHours: number;
  otAuto: number;            // what the system counted — differs when HR overrode it
  lateMinutes: number;
  lateAuto: number;
  loan: number;              // Loan Adjustment — a deduction, entered positive
  loanExpr: string;          // as typed, e.g. "18750+318" (installment + interest)
  tax: number;
  remarks: string;
}

/** A month's salary sheet. Stored as `salary_sheets:{YYYY-MM}`. */
export interface SalarySheet {
  id: string;      // "YYYY-MM" (1-indexed month)
  year: number;
  month: number;   // 0-11, like timesheets
  status: 'draft' | 'final';
  rows: SalaryRow[];
  excluded?: string[]; // employee ids removed from this sheet — kept out of refreshes and next month
  signatures: { preparedById?: string; checkedById?: string; approvedById?: string };
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface SalaryCalc {
  basic: number;
  houseRent: number;
  conveyance: number;
  medical: number;
  special: number;
  gross: number;       // incl. special allowance
  pfCompany: number;
  ratePerHour: number;
  otAmount: number;
  totalPayable: number;
  tax: number;
  pfDeduction: number;
  salaryDeduction: number;
  loanDeduction: number;
  netPayable: number;
}

export const OT_HOURS_BASE = 26 * 8; // workbook: basic / (26 days × 8 h), OT paid at double rate
export const PF_RATE = 0.0833;
export const DEFAULT_DAYS = 30;

export function computeSalary(row: SalaryRow): SalaryCalc {
  const baseGross = row.gross || 0;
  const special = row.specialAllowance || 0;
  const days = row.days || DEFAULT_DAYS;
  let basic: number, houseRent = 0, medical = 0, conveyance = 0;
  if (row.structure === 'flat') {
    basic = baseGross;
  } else {
    basic = baseGross * 0.6;
    houseRent = basic * 0.5;
    medical = basic * 0.1;
    conveyance = baseGross - basic - houseRent - medical;
  }
  const gross = baseGross + special;
  // Formulas use the unrounded basic, as the workbook does
  const pfDeduction = row.pf ? Math.round(basic * (row.pfRate ?? PF_RATE)) : 0;
  const ratePerHour = row.otRateMode === 'formula' ? (basic / OT_HOURS_BASE) * 2
    : row.otRateMode === 'fixed' ? (row.otRateFixed || 0) : 0;
  const otAmount = Math.round(ratePerHour * (row.otHours || 0));
  // The workbook's Adjust column now sits under Deduction as "Loan Adjustment"; net is unchanged
  const totalPayable = Math.round(gross + otAmount);
  const loanDeduction = Math.round(row.loan || 0);
  const salaryDeduction = row.lateDeduction ? Math.round(gross / days / 8 / 60 * (row.lateMinutes || 0)) : 0;
  const tax = row.tax || 0;
  // Displayed components are whole taka; conveyance takes the rounding so they still add up to gross
  if (row.structure !== 'flat') {
    basic = Math.round(basic); houseRent = Math.round(houseRent); medical = Math.round(medical);
    conveyance = Math.round(baseGross) - basic - houseRent - medical;
  }
  return {
    basic, houseRent, conveyance, medical, special, gross,
    pfCompany: pfDeduction, ratePerHour, otAmount, totalPayable, tax, pfDeduction, salaryDeduction, loanDeduction,
    netPayable: Math.round(totalPayable - tax - pfDeduction - salaryDeduction - loanDeduction),
  };
}

// ── Building sheets ────────────────────────────────────────────────────────────
type EmployeeLike = Pick<Employee, 'id' | 'name' | 'eid' | 'jobTitle' | 'joiningDate'>;
export type SystemFigures = (employeeId: string) => { ot: number; late: number };

/** Rows are always listed by Employee ID (natural order: TCF-9 before TCF-15). */
const byEid = (a: { eid: string }, b: { eid: string }) => String(a.eid).localeCompare(String(b.eid), undefined, { numeric: true, sensitivity: 'base' });

/** A fresh row with the workbook's defaults. */
export const newRow = (emp: EmployeeLike): SalaryRow => ({
  employeeId: emp.id, name: emp.name, eid: emp.eid, designation: emp.jobTitle || '', joiningDate: emp.joiningDate || '',
  gross: 0, structure: 'split', pf: true, pfRate: PF_RATE, otRateMode: 'formula', lateDeduction: true,
  specialAllowance: 0, days: DEFAULT_DAYS, otHours: 0, otAuto: 0, lateMinutes: 0, lateAuto: 0,
  loan: 0, loanExpr: '', tax: 0, remarks: '',
});

/** "-18750-318" -> "18750+318": flips every sign, for the old signed Adjustment column. */
function negateExpr(expr: string): string {
  let t = (expr || '').replace(/\s/g, '');
  if (!t) return '';
  if (t[0] !== '+' && t[0] !== '-') t = '+' + t;
  t = t.replace(/[+-]/g, c => (c === '+' ? '-' : '+'));
  return t[0] === '+' ? t.slice(1) : t;
}

/**
 * Fills fields added after a sheet was stored (e.g. the first July 2026 sheet had no pfRate/days) and
 * converts the old signed `adjustment` (negative = deduction) into the positive Loan Adjustment.
 */
export function normalizeRow(raw: any, fallbackDays = DEFAULT_DAYS): SalaryRow {
  const { adjustment, adjustmentExpr, ...rest } = raw;
  const migrated = raw.loan === undefined && adjustment !== undefined
    ? { loan: -(adjustment || 0), loanExpr: adjustmentExpr ? negateExpr(adjustmentExpr) : (adjustment ? String(-adjustment) : '') }
    : {};
  return {
    ...newRow({ id: raw.employeeId, name: raw.name, eid: raw.eid, jobTitle: raw.designation, joiningDate: raw.joiningDate }),
    ...rest,
    ...migrated,
    pfRate: raw.pfRate ?? PF_RATE,
    days: raw.days ?? fallbackDays,
  };
}

export function normalizeSheet(raw: any): SalarySheet {
  const { daysOfMonth, ...rest } = raw;
  return { ...rest, signatures: raw.signatures || {}, rows: (raw.rows || []).map((r: any) => normalizeRow(r, daysOfMonth || DEFAULT_DAYS)).sort(byEid) };
}

/**
 * The sheet a month opens with before anything is saved — like copying last month's workbook:
 * previous rows (pay, settings, tax) for employees still active, plus any other active employee
 * with defaults, listed by Employee ID. OT and late always come from the system; loan adjustment/remarks start blank.
 */
export function buildDraftSheet(o: { year: number; month: number; employees: EmployeeLike[]; prev?: SalarySheet; system: SystemFigures; include?: string[] }): SalarySheet {
  // `include`: the employees HR ticked when creating the sheet; everyone else is left off
  const excluded = o.include ? o.employees.filter(e => !o.include!.includes(e.id)).map(e => e.id) : [...(o.prev?.excluded || [])];
  const active = new Map(o.employees.filter(e => !excluded.includes(e.id)).map(e => [e.id, e]));
  const carried = (o.prev?.rows || []).filter(r => active.has(r.employeeId)).map(r => {
    const e = active.get(r.employeeId)!;
    return { ...r, name: e.name, eid: e.eid, joiningDate: e.joiningDate || r.joiningDate, designation: e.jobTitle || '',
      loan: 0, loanExpr: '', remarks: '' };
  });
  const added = [...active.values()].filter(e => !carried.some(r => r.employeeId === e.id)).sort(byEid).map(newRow);
  const rows = [...carried, ...added].sort(byEid).map(r => {
    const s = o.system(r.employeeId);
    return { ...r, otHours: s.ot, otAuto: s.ot, lateMinutes: s.late, lateAuto: s.late };
  });
  const now = new Date().toISOString();
  return { id: sheetId(o.year, o.month), year: o.year, month: o.month, status: 'draft', rows, excluded,
    signatures: { ...(o.prev?.signatures || {}) }, createdAt: now, updatedAt: now };
}

/**
 * Brings an open draft up to date: system OT/late refresh wherever HR has not typed over them,
 * designation follows the employee record, and employees who became active are appended.
 * Returns the same object when nothing changed.
 */
export function syncDraft(sheet: SalarySheet, employees: EmployeeLike[], system: SystemFigures): SalarySheet {
  let changed = false;
  const byId = new Map(employees.map(e => [e.id, e]));
  const rows = sheet.rows.map(r => {
    const s = system(r.employeeId);
    const e = byId.get(r.employeeId);
    const designation = e ? (e.jobTitle || '') : r.designation;
    if (r.otAuto === s.ot && r.lateAuto === s.late && r.designation === designation) return r;
    changed = true;
    return {
      ...r, designation,
      otHours: r.otHours === r.otAuto ? s.ot : r.otHours, otAuto: s.ot,
      lateMinutes: r.lateMinutes === r.lateAuto ? s.late : r.lateMinutes, lateAuto: s.late,
    };
  });
  for (const e of [...employees].sort(byEid)) {
    if (rows.some(r => r.employeeId === e.id) || sheet.excluded?.includes(e.id)) continue;
    const s = system(e.id);
    rows.push({ ...newRow(e), otHours: s.ot, otAuto: s.ot, lateMinutes: s.late, lateAuto: s.late });
    changed = true;
  }
  const sorted = [...rows].sort(byEid);
  if (sorted.some((r, i) => r !== rows[i])) changed = true;
  return changed ? { ...sheet, rows: sorted } : sheet;
}

// ── Month arithmetic ───────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
export const sheetId = (year: number, month0: number) => `${year}-${pad(month0 + 1)}`;
export const prevMonth = (year: number, month0: number) => month0 === 0 ? { year: year - 1, month: 11 } : { year, month: month0 - 1 };
const lastDay = (year: number, month0: number) => new Date(year, month0 + 1, 0).getDate();
const iso = (year: number, month0: number, day: number) => `${year}-${pad(month0 + 1)}-${pad(day)}`;

/** Attendance month a salary month pays for — the same month. */
export const attendanceMonthFor = (year: number, month0: number) => ({ year, month: month0 });

/**
 * Last WORKING day of a month, as the timesheet decides it: template holidays are off; a month
 * without a template treats Friday and Saturday as the weekend.
 */
export function lastWorkingDay(year: number, month0: number, templates: Pick<MonthTemplate, 'year' | 'month' | 'holidays'>[]): number {
  const tpl = templates.find(t => t.year === year && t.month === month0);
  for (let d = lastDay(year, month0); d >= 1; d--) {
    const dow = new Date(year, month0, d).getDay();
    const weekend = tpl ? false : (dow === 5 || dow === 6);
    if (!weekend && !tpl?.holidays?.some(h => h.date === d)) return d;
  }
  return lastDay(year, month0);
}

export interface OTPeriod {
  carryIn: string;   // previous month's last working day — its OT is paid this time (timesheet row 07)
  month: string;     // "YYYY-MM" attendance month
  excluded: string;  // this month's last working day — its OT is paid next time
}

/**
 * OT counted for a salary month = the attendance month's timesheet Total OT (row 09):
 * the previous month's last working day + the attendance month without its own last working day.
 * Verified against HR's workbook (July 2026 salary: 18/18 employees) and every saved timesheet.
 */
export function otWindowFor(year: number, month0: number, templates: Pick<MonthTemplate, 'year' | 'month' | 'holidays'>[]): OTPeriod {
  const att = attendanceMonthFor(year, month0);
  const before = prevMonth(att.year, att.month);
  return {
    carryIn: iso(before.year, before.month, lastWorkingDay(before.year, before.month, templates)),
    month: `${att.year}-${pad(att.month + 1)}`,
    excluded: iso(att.year, att.month, lastWorkingDay(att.year, att.month, templates)),
  };
}

export function approvedOTHours(otRecords: OTRecord[], employeeId: string, p: OTPeriod): number {
  const total = otRecords
    .filter(o => o.employeeId === employeeId && o.status === 'Approved'
      && (o.date === p.carryIn || (o.date.startsWith(p.month) && o.date !== p.excluded)))
    .reduce((s, o) => s + (Number(o.hours) || 0), 0);
  return Math.round(total * 100) / 100;
}

// ── Input helpers ──────────────────────────────────────────────────────────────
/** Evaluates a sum like "-18750-318" or "5000 + 1200". Returns null if it is not one. */
export function parseAmountExpr(expr: string): number | null {
  const s = expr.replace(/[,\s]/g, '');
  if (!s) return 0;
  if (!/^[+-]?\d+(\.\d+)?([+-]\d+(\.\d+)?)*$/.test(s)) return null;
  return (s.match(/[+-]?\d+(\.\d+)?/g) || []).reduce((a, t) => a + parseFloat(t), 0);
}

// ── Formatting ─────────────────────────────────────────────────────────────────
/** Accounting style used by the workbook: 1,234 · (1,234) for negatives · "-" for zero. */
export function fmtMoney(n: number): string {
  const r = Math.round(n);
  if (r === 0) return '-';
  const s = Math.abs(r).toLocaleString('en-US');
  return r < 0 ? `(${s})` : s;
}

export const fmtHours = (n: number) => (n ? n.toFixed(1) : '-');

/** "12.07.2019" — the workbook's date style. Accepts ISO dates. */
export function fmtJoin(d?: string): string {
  if (!d) return 'NA';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below100 = (n: number) => n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
const below1000 = (n: number) => {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ');
};

/** Bangladeshi numbering: "Eleven Lac Eighty Two Thousand Four Hundred Forty Eight Taka Only". */
export function takaInWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Taka Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lac = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${crore >= 100 ? below1000(crore) : below100(crore)} Crore`);
  if (lac) parts.push(`${below100(lac)} Lac`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return `${amount < 0 ? 'Minus ' : ''}${parts.join(' ')} Taka Only`;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
