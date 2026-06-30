import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, TimesheetRecord, DailyEntry, SummaryEntry, SubmissionHistory } from '../App';
import { PrintableTimesheet, calcLateMinutes } from '../components/PrintableTimesheet';
import { Button } from '../components/ui/button';
import { ArrowLeft, Save, Pencil, History, Download } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export const TimesheetView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { timesheets, getTemplate, updateTimesheet, signatures, currentUser, employees, otRecords, leaves, attendanceRecords } = useAppStore();
  
  const [timesheet, setTimesheet] = useState<TimesheetRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localEntries, setLocalEntries] = useState<DailyEntry[]>([]);
  const [localSummary, setLocalSummary] = useState<SummaryEntry[]>([]);
  const [checkedBy, setCheckedBy] = useState<string | undefined>(undefined);
  const [approvedBy, setApprovedBy] = useState<string | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const timesheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id && timesheets.length > 0) {
      const ts = timesheets.find(t => t.id === id);
      if (ts) {
        setTimesheet(ts);
        
        // Initialize entries if missing
        if (ts.entries && ts.entries.length > 0) {
            setLocalEntries(ts.entries);
        } else {
            // Init default entries
            const daysInMonth = new Date(ts.year, ts.month + 1, 0).getDate();
            const defaults: DailyEntry[] = Array.from({ length: daysInMonth }, (_, i) => ({
                date: i + 1,
                inTime: '',
                outTime: '',
                ot: '',
                late: '',
                remarks: ''
            }));
            setLocalEntries(defaults);
        }
        
        // Initialize summary if missing
        if (ts.summary && ts.summary.length > 0) {
            setLocalSummary(ts.summary);
        } else {
            const sls = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
            setLocalSummary(sls.map(sl => ({ sl, days: '', remarks: '' })));
        }

        // Initialize Signatures
        setCheckedBy(ts.checkedBySignatureId);
        setApprovedBy(ts.approvedBySignatureId);
      }
    }
  }, [id, timesheets]);

  // --- Compute OT from Approved Overtime Records ---
  const otByDay = useMemo((): Record<number, number> => {
    if (!timesheet) return {};
    const monthStr = `${timesheet.year}-${String(timesheet.month + 1).padStart(2, '0')}`;
    const approvedOT = otRecords.filter(r =>
      r.employeeId === timesheet.employeeId &&
      r.date.startsWith(monthStr) &&
      r.status === 'Approved'
    );
    const map: Record<number, number> = {};
    for (const r of approvedOT) {
      const day = parseInt(r.date.split('-')[2], 10);
      map[day] = (map[day] || 0) + r.hours;
    }
    return map;
  }, [timesheet, otRecords]);

  // Find the true last WORKING day of the previous month (respects that month's template)
  const prevLastWorkingDayStr = useMemo((): string => {
    if (!timesheet) return '';
    const prevMonthIndex = timesheet.month === 0 ? 11 : timesheet.month - 1;
    const prevYear = timesheet.month === 0 ? timesheet.year - 1 : timesheet.year;
    const prevTemplate = getTemplate(prevYear, prevMonthIndex);
    const daysInPrevMonth = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
    for (let day = daysInPrevMonth; day >= 1; day--) {
      const d = new Date(prevYear, prevMonthIndex, day);
      const isWeekend = prevTemplate ? false : (d.getDay() === 5 || d.getDay() === 6);
      const holiday = prevTemplate?.holidays?.find(h => h.date === day);
      if (!isWeekend && !holiday) {
        return `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    // Fallback: last calendar day
    const lastDay = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
    return `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }, [timesheet, getTemplate]);

  const prevMonthEndOT = useMemo((): number => {
    if (!timesheet || !prevLastWorkingDayStr) return 0;
    return otRecords
      .filter(r => r.employeeId === timesheet.employeeId && r.date === prevLastWorkingDayStr && r.status === 'Approved')
      .reduce((sum, r) => sum + r.hours, 0);
  }, [timesheet, otRecords, prevLastWorkingDayStr]);

  // Determine the last working day of the current month (to exclude its OT from the monthly sum)
  const lastWorkingDay = useMemo((): number | null => {
    if (!timesheet) return null;
    const tmpl = getTemplate(timesheet.year, timesheet.month);
    const daysInMonth = new Date(timesheet.year, timesheet.month + 1, 0).getDate();
    for (let day = daysInMonth; day >= 1; day--) {
      const d = new Date(timesheet.year, timesheet.month, day);
      // When no template, Fri(5)/Sat(6) are weekends; with template only explicit holidays apply
      const isWeekend = tmpl ? false : (d.getDay() === 5 || d.getDay() === 6);
      const holiday = tmpl?.holidays?.find(h => h.date === day);
      if (!isWeekend && !holiday) return day;
    }
    return null;
  }, [timesheet, getTemplate]);

  // Current month OT EXCLUDING the last working day (that day carries over to next month as row 07)
  const currentMonthOTExcludingLastDay = useMemo((): number => {
    return Object.entries(otByDay)
      .filter(([dayStr]) => parseInt(dayStr, 10) !== lastWorkingDay)
      .reduce((sum, [, hours]) => sum + hours, 0);
  }, [otByDay, lastWorkingDay]);

  // Row 08 "Others" — user-entered value from localSummary
  const othersValue = useMemo((): number => {
    const row08 = localSummary.find(s => s.sl === '08');
    const val = parseFloat(row08?.days || '0');
    return isNaN(val) ? 0 : val;
  }, [localSummary]);

  // Total OT = current month OT (excl. last day) + prevMonthEndOT (row 07) + others (row 08)
  const totalOT = useMemo((): number => {
    return currentMonthOTExcludingLastDay + prevMonthEndOT + othersValue;
  }, [currentMonthOTExcludingLastDay, prevMonthEndOT, othersValue]);

  // Sync OT-derived summary rows (07 and 09) into localSummary whenever computed values change
  useEffect(() => {
    if (localSummary.length === 0) return;
    setLocalSummary(prev => {
      const next = [...prev];
      const update = (sl: string, val: string) => {
        const i = next.findIndex(s => s.sl === sl);
        if (i >= 0) next[i] = { ...next[i], days: val };
      };
      update('07', prevMonthEndOT > 0 ? prevMonthEndOT.toFixed(2) : '0');
      update('09', totalOT > 0 ? totalOT.toFixed(2) : '0');
      return next;
    });
  }, [prevMonthEndOT, totalOT]);

  // --- Compute Leave data for Timesheet display ---
  /** Map of day-of-month -> { type display label, reason, isPartial, partialHours } for approved leaves */
  const leavesByDay = useMemo((): Record<number, { type: string; reason: string; isHalfDay?: boolean; isPartial?: boolean; days?: number; partialHours?: number }> => {
    if (!timesheet) return {};
    const map: Record<number, { type: string; reason: string; isHalfDay?: boolean; isPartial?: boolean; days?: number; partialHours?: number }> = {};
    const MS = 24 * 60 * 60 * 1000;
    for (const leave of leaves) {
      if (leave.employeeId !== timesheet.employeeId || leave.status !== 'Approved') continue;
      const parseLocal = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d).getTime(); };
      const startT = parseLocal(leave.startDate);
      const endT   = parseLocal(leave.endDate);
      for (let t = startT; t <= endT; t += MS) {
        const d = new Date(t);
        if (d.getFullYear() === timesheet.year && d.getMonth() === timesheet.month) {
          const dayNum = d.getDate();
          const label = leave.type === 'Annual' ? 'Earn Leave'
            : leave.type === 'Maternity' ? 'Maternity Leave'
            : `${leave.type} Leave`;
          // isPartial: half-day (0.5) or hourly/partial (partialHours > 0)
          const isPartialHourly = !!leave.partialHours && leave.partialHours > 0;
          const isHalfDay = leave.days === 0.5;
          if (!map[dayNum]) map[dayNum] = { type: label, reason: leave.reason, isPartial: leave.days < 1 || isPartialHourly, isHalfDay, days: leave.days, partialHours: leave.partialHours };
        }
      }
    }

    return map;
  }, [timesheet, leaves]);

  // Auto-clear or auto-restore late minutes based on leave changes
  useEffect(() => {
     if (localEntries.length === 0 || !timesheet) return;
     let changed = false;
     const template = getTemplate(timesheet.year, timesheet.month);
     const defaultClockIn = timesheet.defaultClockIn || '08:30';

     const newEntries = localEntries.map(ent => {
        const leaveDay = leavesByDay[ent.date];
        const holiday = template?.holidays?.find(h => h.date === ent.date);
        const d = new Date(timesheet.year, timesheet.month, ent.date);
        const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6);
        const isHoliday = isWeekend || !!holiday;

        if (leaveDay && leaveDay.isHalfDay) {
           if (!ent.manualLate && ent.late) {
              changed = true;
              return { ...ent, late: '' };
           }
        } else {
           if (ent.inTime && !isHoliday) {
              // On a normal workday, if they haven't explicitly set a number (it's blank), 
              // or if they never manually overrode it, OR if the override was specifically meant for a now-deleted half-day leave,
              // we MUST auto-calculate it. (We also treat undefined as true to retroactively fix old test data).
              if (!ent.manualLate || ent.late === '' || ent.isLeaveOverride || ent.isLeaveOverride === undefined) {
                 const autoLate = calcLateMinutes(ent.inTime, defaultClockIn);
                 if (ent.late !== autoLate) {
                    changed = true;
                    return { ...ent, late: autoLate, manualLate: false, isLeaveOverride: false };
                 }
              }
           } else if (isHoliday && !ent.manualLate && ent.late) {
              changed = true;
              return { ...ent, late: '' };
           }
        }
        return ent;
     });
     if (changed) {
        setLocalEntries(newEntries);
     }
  }, [leavesByDay, localEntries, timesheet, getTemplate]);

  /** Summed approved leave days per type for this month */
  const leaveSummary = useMemo(() => {
    const totals = { sick: 0, casual: 0, earn: 0, other: 0 };
    if (!timesheet) return totals;
    const monthStart = new Date(timesheet.year, timesheet.month, 1).getTime();
    const monthEnd   = new Date(timesheet.year, timesheet.month + 1, 0).getTime();
    const MS = 24 * 60 * 60 * 1000;
    for (const leave of leaves) {
      if (leave.employeeId !== timesheet.employeeId || leave.status !== 'Approved') continue;
      // Parse as local midnight to match monthStart/monthEnd (avoids UTC+offset skipping last-day leaves)
      const parseLocal = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d).getTime(); };
      const leaveStart = parseLocal(leave.startDate);
      const leaveEnd   = parseLocal(leave.endDate);
      if (leaveEnd < monthStart || leaveStart > monthEnd) continue;
      // Calculate overlap in days
      const overlapStart = Math.max(leaveStart, monthStart);
      const overlapEnd   = Math.min(leaveEnd, monthEnd);
      const totalDays    = Math.round((leaveEnd - leaveStart) / MS) + 1;
      const overlapDays  = Math.round((overlapEnd - overlapStart) / MS) + 1;
      const portion = totalDays > 0 ? (leave.days * overlapDays) / totalDays : 0;
      switch (leave.type) {
        case 'Sick':      totals.sick  += portion; break;
        case 'Casual':   totals.casual += portion; break;
        case 'Annual':   totals.earn   += portion; break; // Earn Leave = Annual
        case 'Maternity':
        case 'Other':    totals.other  += portion; break;
      }
    }
    return totals;
  }, [timesheet, leaves]);

  // Sync leave summary rows (01 Sick, 02 Casual, 03 Earn/Annual, 05 Other) into localSummary
  useEffect(() => {
    if (localSummary.length === 0) return;
    setLocalSummary(prev => {
      const next = [...prev];
      const update = (sl: string, val: string) => {
        const i = next.findIndex(s => s.sl === sl);
        if (i >= 0) next[i] = { ...next[i], days: val };
      };
      const fmt = (n: number) => n.toFixed(2);
      update('01', fmt(leaveSummary.sick));
      update('02', fmt(leaveSummary.casual));
      update('03', fmt(leaveSummary.earn));
      update('05', fmt(leaveSummary.other));
      return next;
    });
  }, [leaveSummary.sick, leaveSummary.casual, leaveSummary.earn, leaveSummary.other]);

  // Build a live map of day -> lateMinutes from the attendance records for this employee/month
  const attendanceLateByDay = useMemo((): Record<number, number> => {
    if (!timesheet) return {};
    const recId = `${timesheet.employeeId}-${timesheet.year}-${timesheet.month}`;
    const rec = attendanceRecords.find(r => r.id === recId);
    if (!rec?.entryDetails) return {};
    const map: Record<number, number> = {};
    for (const [dayStr, det] of Object.entries(rec.entryDetails)) {
      if (det.lateMinutes && det.lateMinutes > 0) {
        map[parseInt(dayStr, 10)] = det.lateMinutes;
      }
    }
    return map;
  }, [timesheet, attendanceRecords]);

  // Sync Late row (04) into localSummary — uses attendance record lateMinutes (live)
  // Falls back to manually-entered timesheet entry late if no attendance record exists
  useEffect(() => {
    if (localSummary.length === 0 || !timesheet) return;

    let totalLate = 0;
    const tmpl = getTemplate(timesheet.year, timesheet.month);
    const daysInMonth = new Date(timesheet.year, timesheet.month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const isWeekend = tmpl ? false : (new Date(timesheet.year, timesheet.month, d).getDay() === 5 || new Date(timesheet.year, timesheet.month, d).getDay() === 6);
      const isHoliday = isWeekend || tmpl?.holidays?.find(h => h.date === d);
      // Full-day approved leave? Skip. Partial/hourly leave? Still count lates.
      const isOnLeave = !!leavesByDay[d] && !leavesByDay[d].isPartial;

      if (isHoliday || isOnLeave) continue;

      // Prefer live attendance lateMinutes; fall back to manually-entered timesheet late
      const liveMin = attendanceLateByDay[d];
      if (liveMin !== undefined) {
        totalLate += liveMin;
      } else {
        const ent = localEntries.find(e => e.date === d);
        if (ent && ent.late) {
          const lateVal = parseInt(ent.late, 10);
          if (!isNaN(lateVal)) totalLate += lateVal;
        }
      }
    }

    setLocalSummary(prev => {
      const idx = prev.findIndex(s => s.sl === '04');
      if (idx >= 0 && prev[idx].days !== String(totalLate)) {
        const next = [...prev];
        next[idx] = { ...next[idx], days: String(totalLate) };
        return next;
      }
      return prev;
    });
  // Depend on live leaves, attendance records, and leave map so any change triggers recalc
  }, [localEntries, leavesByDay, leaves, attendanceLateByDay, attendanceRecords, timesheet, getTemplate, localSummary.length]);


  // Always resolve the LIVE employee so name/EID stay in sync with edits
  const liveEmployee = timesheet
    ? employees.find(e => e.id === timesheet.employeeId)
    : undefined;

  // Build a display-time-merged record that uses live employee values
  const displayTimesheet: TimesheetRecord | null = timesheet
    ? {
        ...timesheet,
        employeeName: liveEmployee?.name  ?? timesheet.employeeName,
        eid:          liveEmployee?.eid   ?? timesheet.eid,
      }
    : null;

  const lastSubmission = timesheet?.submissions && timesheet.submissions.length > 0 
    ? timesheet.submissions[timesheet.submissions.length - 1] 
    : null;

  const isToday = lastSubmission 
    ? new Date(lastSubmission.timestamp).toDateString() === new Date().toDateString()
    : false;

  // Auto-patch the stored record if name/EID have drifted
  useEffect(() => {
    if (!timesheet || !liveEmployee) return;
    const nameChanged = liveEmployee.name !== timesheet.employeeName;
    const eidChanged  = liveEmployee.eid  !== timesheet.eid;
    if (nameChanged || eidChanged) {
      updateTimesheet(timesheet.id, {
        employeeName: liveEmployee.name,
        eid: liveEmployee.eid,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEmployee?.eid, liveEmployee?.name, timesheet?.id]);

  // Merge live attendance details into localEntries for display/print when not editing
  const displayEntries = useMemo((): DailyEntry[] => {
    if (isEditing) return localEntries;
    
    const template = timesheet ? getTemplate(timesheet.year, timesheet.month) : null;
    const defaultClockIn = timesheet?.defaultClockIn || '08:30';

    return localEntries.map(ent => {
      const recId = timesheet ? `${timesheet.employeeId}-${timesheet.year}-${timesheet.month}` : '';
      const rec = attendanceRecords.find(r => r.id === recId);
      const det = rec?.entryDetails?.[ent.date];
      
      const inTime = det?.clockIn || ent.inTime || '';
      const outTime = det?.clockOut || ent.outTime || '';
      let late = ent.late || '';
      
      const leaveDay = leavesByDay[ent.date];
      const holiday = template?.holidays?.find(h => h.date === ent.date);
      const d = timesheet ? new Date(timesheet.year, timesheet.month, ent.date) : new Date();
      const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6);
      const isHoliday = isWeekend || !!holiday;

      if (leaveDay && leaveDay.isHalfDay) {
         if (!ent.manualLate) late = '';
      } else {
         if (inTime && !isHoliday && (!ent.manualLate || ent.late === '' || ent.isLeaveOverride || ent.isLeaveOverride === undefined)) {
             late = calcLateMinutes(inTime, defaultClockIn);
         } else if (isHoliday && (!ent.manualLate || ent.isLeaveOverride || ent.isLeaveOverride === undefined)) {
             late = '';
         }
      }
      
      return {
        ...ent,
        inTime,
        outTime,
        late
      };
    });
  }, [localEntries, timesheet, attendanceRecords, isEditing, leavesByDay, getTemplate]);

  if (!displayTimesheet) {
    return <div className="p-8">Loading or Timesheet not found...</div>;
  }

  const handleSave = () => {
      if (!timesheet) return;
      const newSubmission: SubmissionHistory = {
          timestamp: new Date().toISOString(),
      };
      const updatedSubmissions = [...(timesheet.submissions || []), newSubmission];

      updateTimesheet(timesheet.id, {
          entries: localEntries,
          summary: localSummary,
          checkedBySignatureId: checkedBy,
          approvedBySignatureId: approvedBy,
          submissions: updatedSubmissions
      });
      setIsEditing(false);
      toast.success("Timesheet saved and submitted successfully");
  };

  const handleDownloadPDF = async () => {
    if (!timesheetRef.current || !timesheet) return;
    setIsDownloading(true);
    toast.info('Generating PDF, please wait...');
    try {
      const element = timesheetRef.current;

      // html-to-image uses the browser's native SVG renderer — fully supports
      // oklch(), modern gradients, and all CSS features that html2canvas cannot.
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // A4 portrait in mm
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Load image to get its natural dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Scale to fit within A4 with 8 mm margins
      const margin = 8;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;
      const ratio = Math.min(availW / img.width, availH / img.height);
      const finalW = img.width * ratio;
      const finalH = img.height * ratio;
      const offsetX = margin + (availW - finalW) / 2;
      const offsetY = margin + (availH - finalH) / 2;

      pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, finalW, finalH);

      const monthName = new Date(timesheet.year, timesheet.month)
        .toLocaleString('default', { month: 'long' });
      const filename = `Timesheet_${timesheet.employeeName.replace(/\s+/g, '_')}_${monthName}_${timesheet.year}.pdf`;
      pdf.save(filename);
      toast.success('PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error(`PDF error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const template = getTemplate(timesheet.year, timesheet.month);

  return (
    <div className="min-h-screen bg-gray-100 pb-10 print:bg-white print:pb-0">
        {/* Toolbar - Hidden on Print */}
        <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 print:hidden shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{displayTimesheet.employeeName}</h1>
                    <p className="text-sm text-gray-500">
                        {new Date(timesheet.year, timesheet.month).toLocaleString('default', { month: 'long' })} {timesheet.year}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isEditing && (
                    <>
                        {lastSubmission && (
                            <div className="flex flex-col text-right mr-2 leading-none gap-0.5">
                                <span className={`font-bold text-xs ${isToday ? 'text-green-600' : 'text-red-600'}`}>
                                    Submitted
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                    {new Date(lastSubmission.timestamp).toLocaleDateString()} {new Date(lastSubmission.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} title="View Submission History">
                            <History className="h-5 w-5 text-gray-600" />
                        </Button>

                        <Button variant="outline" onClick={() => { setLocalEntries(displayEntries); setIsEditing(true); }} className="gap-2">
                            <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                        >
                            <Download className="h-4 w-4" />
                            {isDownloading ? 'Generating...' : 'Download PDF'}
                        </Button>
                    </>
                )}

                {isEditing && (
                    <>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
                            <Save className="h-4 w-4" /> Save Changes
                        </Button>
                    </>
                )}
            </div>
        </div>

        {/* Main Content */}
        <div className="py-8 print:py-0 flex justify-center">
            <div className="print:w-full">
                <div ref={timesheetRef}>
                <PrintableTimesheet 
                    timesheet={displayTimesheet} 
                    template={template}
                    entries={displayEntries}
                    summary={localSummary}
                    isEditing={isEditing}
                    onEntriesChange={setLocalEntries}
                    onSummaryChange={setLocalSummary}
                    signatures={signatures}
                    checkedBySignatureId={checkedBy}
                    approvedBySignatureId={approvedBy}
                    onCheckedByChange={setCheckedBy}
                    onApprovedByChange={setApprovedBy}
                    canEditSignatures={currentUser?.role !== 'Staff'}
                    defaultClockIn={displayTimesheet.defaultClockIn || '08:30'}
                    defaultClockOut={displayTimesheet.defaultClockOut || '17:30'}
                    otByDay={otByDay}
                    prevMonthEndOT={prevMonthEndOT}
                    prevLastWorkingDayStr={prevLastWorkingDayStr}
                    totalOT={totalOT}
                    leavesByDay={leavesByDay}
                    leaveSummary={leaveSummary}
                    attendanceLateByDay={attendanceLateByDay}
                    isStaff={currentUser?.role === 'Staff'}
                />
                </div>
            </div>
        </div>

        {/* History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submission History</DialogTitle>
                    <DialogDescription>
                        Record of timesheet submissions.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {timesheet.submissions && timesheet.submissions.length > 0 ? (
                        <div className="space-y-4">
                            {timesheet.submissions.slice().reverse().map((sub, i) => (
                                <div key={i} className="flex flex-col border-b pb-2 last:border-0">
                                    <span className="font-medium text-sm">
                                        Submission #{timesheet.submissions!.length - i}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(sub.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            No submissions yet.
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
};
