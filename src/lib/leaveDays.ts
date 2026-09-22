import type { MonthTemplate } from '../App';

// Working days in an inclusive date range, skipping template holidays (shared by the Record Leave dialog and the form editor).
export function countLeaveDays(startStr: string, endStr: string, templates: MonthTemplate[]): { working: number; skipped: number; skippedReasons: string[] } {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  let working = 0;
  let skipped = 0;
  const skippedReasons: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth(); // 0-indexed
    const d = cur.getDate();
    const tpl = templates.find(t => t.year === y && t.month === m);
    const holiday = tpl?.holidays.find(h => h.date === d);
    if (holiday) {
      skipped++;
      if (!skippedReasons.includes(holiday.reason)) skippedReasons.push(holiday.reason);
    } else {
      working++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { working, skipped, skippedReasons };
}

// ── Hard-copy deadline ─────────────────────────────────────────────────────────
// A leave's paper form must reach HR within N working days after the leave ENDS.
// "Working day" follows the month template: template holidays are off; months
// without a template fall back to the Fri/Sat weekend (same rule as the timesheet).

export function getHardCopyDeadlineDays(type: string, isPartial: boolean): number | null {
  if (type === 'Sick') return 5;
  if (type === 'Casual' || type === 'Annual') return 2;
  if (type === 'Other' && !isPartial) return 2;
  return null; // Maternity or partial/hourly Other — not applicable
}

export function isOffDay(d: Date, templates: MonthTemplate[]): boolean {
  const tpl = templates.find(t => t.year === d.getFullYear() && t.month === d.getMonth());
  if (tpl) return tpl.holidays.some(h => h.date === d.getDate());
  const dow = d.getDay();
  return dow === 5 || dow === 6;
}

/** Local-midnight Date for a YYYY-MM-DD string (avoids the UTC+6 off-by-one of `new Date('YYYY-MM-DD')`). */
export function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Day the deadline clock starts: the last day of the leave. */
export function hardCopyBaseDate(leave: { startDate: string; endDate: string }): Date {
  return localDate(leave.endDate || leave.startDate);
}

/** The next `count` working days after `from` (exclusive of `from`). */
export function getWorkingDayPath(from: Date, count: number, templates: MonthTemplate[]): Date[] {
  const days: Date[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (!isOffDay(d, templates)) days.push(new Date(d));
  }
  return days;
}

/** The date `days` working days after `from` — i.e. the hard-copy deadline. */
export function addWorkingDays(from: Date, days: number, templates: MonthTemplate[]): Date {
  const path = getWorkingDayPath(from, days, templates);
  return path[path.length - 1] ?? new Date(from);
}
