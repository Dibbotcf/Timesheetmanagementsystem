import type { TimesheetRecord, MonthTemplate, LeaveRecord, DailyEntry } from '../App';

/**
 * True once the calendar month the timesheet is FOR has fully ended
 * (i.e. we are now in a later month/year than the sheet's month).
 */
export function isMonthOver(year: number, month: number, now: Date = new Date()): boolean {
  return now.getFullYear() > year || (now.getFullYear() === year && now.getMonth() > month);
}

/**
 * A timesheet is "complete" when every working day in its month has BOTH an
 * in-time and an out-time filled in. Days that need no input are skipped:
 *   - weekly holidays (Fri/Sat when there is no template, else template holidays)
 *   - template holidays
 *   - full-day approved leaves
 * Half-day / partial (hourly) approved leaves still count as worked days, so they
 * are expected to have in/out times. This mirrors the day-classification used by
 * PrintableTimesheet / TimesheetView so "complete" matches what the sheet shows.
 */
export function isTimesheetComplete(
  ts: TimesheetRecord,
  template: MonthTemplate | null | undefined,
  leaves: LeaveRecord[],
): boolean {
  const daysInMonth = new Date(ts.year, ts.month + 1, 0).getDate();

  // Collect FULL-day approved leave days for this employee/month (these need no punches).
  const MS = 24 * 60 * 60 * 1000;
  const fullLeaveDays = new Set<number>();
  for (const leave of leaves) {
    if (leave.employeeId !== ts.employeeId || leave.status !== 'Approved') continue;
    const isPartial = leave.days < 1 || (!!leave.partialHours && leave.partialHours > 0);
    if (isPartial) continue; // partial/half-day leave still expects worked in/out
    const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
    const startT = parseLocal(leave.startDate);
    const endT = parseLocal(leave.endDate);
    for (let t = startT; t <= endT; t += MS) {
      const d = new Date(t);
      if (d.getFullYear() === ts.year && d.getMonth() === ts.month) fullLeaveDays.add(d.getDate());
    }
  }

  const entryByDay = new Map<number, DailyEntry>();
  for (const e of ts.entries || []) entryByDay.set(e.date, e);

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(ts.year, ts.month, day);
    const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6);
    const holiday = template?.holidays?.find(h => h.date === day);
    if (isWeekend || holiday) continue;   // holiday / weekly-off → no input expected
    if (fullLeaveDays.has(day)) continue; // full-day leave covers the day

    const entry = entryByDay.get(day);
    const inT = entry?.inTime ? entry.inTime.trim() : '';
    const outT = entry?.outTime ? entry.outTime.trim() : '';
    if (!inT || !outT) return false;      // a worked day is missing a punch → not complete
  }
  return true;
}
