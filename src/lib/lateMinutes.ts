import type { AttendanceRecord, LeaveRecord, MonthTemplate, TimesheetRecord } from '../App';
import { calcLateMinutes } from '../components/PrintableTimesheet';

export interface MonthLate {
  lateDays: number;
  totalMinutes: number;
  lateDates: string; // "3(12), 7(40)" — day(minutes)
}

interface LateSources {
  attendanceRecords: AttendanceRecord[];
  timesheets: TimesheetRecord[];
  templates: MonthTemplate[];
  leaves: LeaveRecord[];
}

// Mirrors TimesheetView's Late row (04) so every report agrees with the timesheet:
// per day, prefer the attendance record's lateMinutes; where there is none (older months were
// never synced to attendance), derive it from the timesheet's in-time, as the sheet itself does.
// Holidays/weekly offs and full-day approved leaves are skipped; a half-day leave clears the late.
// Shared by the Late & Delay report and the salary sheet. `monthIdx` is 0-indexed.
export function getMonthLate(employeeId: string, year: number, monthIdx: number, src: LateSources): MonthLate {
  const rec = src.attendanceRecords.find(r => r.id === `${employeeId}-${year}-${monthIdx}`);
  const ts = src.timesheets.find(t => t.employeeId === employeeId && t.year === year && t.month === monthIdx);
  if (!rec?.entryDetails && !ts) return { lateDays: 0, totalMinutes: 0, lateDates: '' };

  const liveLate: Record<number, number> = {};
  for (const [d, det] of Object.entries(rec?.entryDetails || {}))
    if (det.lateMinutes && det.lateMinutes > 0) liveLate[+d] = det.lateMinutes;

  // Day -> leave shape, for approved leaves overlapping this month
  const leaveByDay: Record<number, { isPartial: boolean; isHalfDay: boolean }> = {};
  const MS = 24 * 60 * 60 * 1000;
  for (const lv of src.leaves) {
    if (lv.employeeId !== employeeId || lv.status !== 'Approved') continue;
    const parseLocal = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
    const isPartial = lv.days < 1 || (!!lv.partialHours && lv.partialHours > 0);
    const isHalfDay = lv.days === 0.5;
    for (let t = parseLocal(lv.startDate); t <= parseLocal(lv.endDate); t += MS) {
      const d = new Date(t);
      if (d.getFullYear() === year && d.getMonth() === monthIdx && !leaveByDay[d.getDate()])
        leaveByDay[d.getDate()] = { isPartial, isHalfDay };
    }
  }

  const tmpl = src.templates.find(t => t.year === year && t.month === monthIdx);
  const defaultClockIn = ts?.defaultClockIn || '08:30';
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const entries: { day: number; mins: number }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, monthIdx, day).getDay();
    const isWeekend = tmpl ? false : (dow === 5 || dow === 6); // Fri/Sat when no template
    if (isWeekend || tmpl?.holidays?.some(h => h.date === day)) continue;
    const lv = leaveByDay[day];
    if (lv && !lv.isPartial) continue; // full-day leave — nothing to be late for

    let mins = 0;
    if (liveLate[day] !== undefined) {
      mins = liveLate[day];
    } else {
      const ent = ts?.entries?.find(e => e.date === day);
      if (ent) {
        const stored = parseInt(ent.late || '0', 10) || 0;
        if (lv?.isHalfDay) {
          // Half-day leave: the sheet clears the late unless HR typed one in by hand
          mins = ent.manualLate ? stored : 0;
        } else if (ent.inTime) {
          // Same condition the sheet uses to auto-derive vs keep a hand-entered value
          const auto = !ent.manualLate || ent.late === '' || ent.isLeaveOverride || ent.isLeaveOverride === undefined;
          mins = auto ? (parseInt(calcLateMinutes(ent.inTime, defaultClockIn) || '0', 10) || 0) : stored;
        } else {
          mins = stored;
        }
      }
    }
    if (mins > 0) entries.push({ day, mins });
  }

  return {
    lateDays: entries.length,
    totalMinutes: entries.reduce((s, e) => s + e.mins, 0),
    lateDates: entries.map(e => `${e.day}(${e.mins})`).join(', '),
  };
}
