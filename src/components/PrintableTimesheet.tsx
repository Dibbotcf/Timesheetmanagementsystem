import React, { useMemo } from 'react';
import { TimesheetRecord, MonthTemplate, DailyEntry, SummaryEntry, Signature } from '../App';
import TCF_LOGO_PATH from '../assets/tcf-logo-landscape.png';

interface InputCellProps {
    value: string;
    onChange: (v: string) => void;
    className?: string;
    align?: "left" | "center" | "right";
    isEditing?: boolean;
    prefix?: string;
}

const InputCell = React.memo(({ value, onChange, className = "", align = "center", isEditing, prefix = "" }: InputCellProps) => (
    isEditing ? (
        <div className={`w-full h-full flex items-center bg-transparent focus-within:bg-[#eff6ff] transition-colors ${align === 'left' ? 'pl-1' : align === 'right' ? 'pr-1' : ''}`}>
            {prefix && <span className={`whitespace-nowrap font-medium pr-1 ${className}`}>{prefix}</span>}
            <input 
                type="text" 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)}
                className={`flex-1 h-full bg-transparent border-none outline-none ${prefix ? '' : 'px-1'} ${className} ${align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'}`}
                style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', minWidth: 0, padding: 0 }}
            />
        </div>
    ) : (
        <div className={`w-full h-full flex items-center ${align === 'left' ? 'justify-start pl-1' : align === 'right' ? 'justify-end pr-1' : 'justify-center'}`}>
             <span className={`block truncate ${className}`}>
                 {prefix && <span className="font-medium pr-1">{prefix}</span>}
                 {value}
             </span>
        </div>
    )
));

export const parseToTimeInputVal = (timeStr: string): string => {
    if (!timeStr) return '';
    const cleaned = timeStr.replace('.', ':').trim().toUpperCase();
    const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (hhmmRegex.test(timeStr)) {
        return timeStr;
    }
    const singleHhmmRegex = /^([0-9]|1[0-9]|2[0-3]):([0-5]\d)$/;
    if (singleHhmmRegex.test(timeStr)) {
        const parts = timeStr.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    }
    const match = cleaned.match(/^(\d+):(\d+)\s*(AM|PM)?$/);
    if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3];
        if (ampm === 'PM' && h < 12) {
            h += 12;
        } else if (ampm === 'AM' && h === 12) {
            h = 0;
        }
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
};

export const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        return timeStr;
    }
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            const displayM = String(m).padStart(2, '0');
            return `${displayH}:${displayM} ${ampm}`;
        }
    }
    return timeStr;
};

interface TimeInputCellProps {
    value: string;
    onChange: (v: string) => void;
    className?: string;
    isEditing?: boolean;
    defaultTime?: string;
}

const TimeInputCell = React.memo(({ value, onChange, className = "", isEditing, defaultTime }: TimeInputCellProps) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handlePopulateDefault = () => {
        if (!value && defaultTime) {
            onChange(formatDisplayTime(defaultTime));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onChange("");
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    return isEditing ? (
        <div className="relative w-full h-full group flex items-center justify-center">
            <input 
                ref={inputRef}
                type="time" 
                value={parseToTimeInputVal(value)} 
                onFocus={handlePopulateDefault}
                onMouseDown={handlePopulateDefault}
                onChange={(e) => onChange(formatDisplayTime(e.target.value))}
                className={`w-full h-full bg-transparent border-none outline-none text-center p-0 m-0 focus:bg-[#eff6ff] transition-colors ${className}`}
                style={{ fontFamily: 'inherit', fontSize: '9px', fontWeight: 'inherit', height: '100%', border: 'none', paddingRight: value ? '14px' : '0' }}
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 flex items-center justify-center text-[8px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full font-bold transition-colors z-20"
                    title="Clear time"
                    style={{ lineHeight: 1 }}
                >
                    ✕
                </button>
            )}
        </div>
    ) : (
        <div className="w-full h-full flex items-center justify-center">
             <span className={`block truncate ${className}`}>{formatDisplayTime(value)}</span>
        </div>
    );
});

export const timeToMinutes = (timeStr: string): number | null => {
    const hhmm = parseToTimeInputVal(timeStr);
    if (!hhmm) return null;
    const parts = hhmm.split(':');
    if (parts.length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
            return h * 60 + m;
        }
    }
    return null;
};

export const calcLateMinutes = (inTime: string, defaultIn: string): string => {
    if (!inTime) return "";
    const inMin = timeToMinutes(inTime);
    const defMin = timeToMinutes(defaultIn);
    if (inMin === null || defMin === null) return "";
    const diff = inMin - defMin;
    return diff > 0 ? String(diff) : "";
};

interface Props {
    timesheet: TimesheetRecord;
    template?: MonthTemplate;
    entries?: DailyEntry[];
    summary?: SummaryEntry[];
    isEditing?: boolean;
    onEntriesChange?: (entries: DailyEntry[]) => void;
    onSummaryChange?: (summary: SummaryEntry[]) => void;
    signatures?: Signature[];
    checkedBySignatureId?: string;
    approvedBySignatureId?: string;
    onCheckedByChange?: (id: string) => void;
    onApprovedByChange?: (id: string) => void;
    canEditSignatures?: boolean;
    defaultClockIn?: string;   // e.g. "08:30" — used as time-picker default
    defaultClockOut?: string;  // e.g. "17:30" — used as time-picker default
    /** Map of { [dayOfMonth]: approvedOTHours } — drives the read-only OT column */
    otByDay?: Record<number, number>;
    /** Approved OT on last working day of previous month */
    prevMonthEndOT?: number;
    /** Total OT = current month OT + prevMonthEndOT */
    totalOT?: number;
    /** Approved leave entries per day: { type label, reason, isPartial } */
    leavesByDay?: Record<number, { type: string; reason: string; isPartial?: boolean }>;
    /** Summed approved leave days per type for this month */
    leaveSummary?: { sick: number; casual: number; earn: number; other: number };
    /** Map of day-of-month -> live attendance lateMinutes */
    attendanceLateByDay?: Record<number, number>;
    /** When true, rows that have a signature set will be locked and non-editable */
    isStaff?: boolean;
    /** ISO date string of the actual last working day of the previous month (e.g. "2026-05-24") */
    prevLastWorkingDayStr?: string;
}

// LAYOUT CONSTANTS - Compressed for A4
const PAGE_WIDTH = 794;
const CONTENT_WIDTH = 730; // Approx content width
const PAD_TOP = 24;
const PAD_LEFT = 32;

const HEADER_H = 60;
const HEADER_GAP = 12;
const META_H = 52;
const META_GAP = 12;
const TABLE_HEADER_H = 22;
const ROW_H = 18;
const HR_GAP = 12;
const HR_LABEL_H = 16;
const SUMMARY_GAP = 8;
const SUMMARY_ROW_H = 20;
const SIG_GAP = 24;
const SIG_H = 100;

export const PrintableTimesheet: React.FC<Props> = ({ 
    timesheet, 
    template, 
    entries, 
    summary, 
    isEditing = false,
    onEntriesChange,
    onSummaryChange,
    signatures = [],
    checkedBySignatureId,
    approvedBySignatureId,
    onCheckedByChange,
    onApprovedByChange,
    canEditSignatures = true,
    defaultClockIn = '08:30',
    defaultClockOut = '17:30',
    otByDay = {},
    prevMonthEndOT = 0,
    totalOT = 0,
    leavesByDay = {},
    leaveSummary = { sick: 0, casual: 0, earn: 0, other: 0 },
    attendanceLateByDay = {},
    isStaff = false,
    prevLastWorkingDayStr,
}) => {
    // Format OT hours: show as integer if whole number, otherwise up to 2 decimal places
    const fmtOT = (h: number): string => {
        if (h <= 0) return '';
        return h % 1 === 0 ? String(h) : parseFloat(h.toFixed(2)).toString();
    };
    const daysInMonth = new Date(timesheet.year, timesheet.month + 1, 0).getDate();
    const monthName = new Date(timesheet.year, timesheet.month).toLocaleString('default', { month: 'long' });

    // Compute the last working day of the month (same logic as TimesheetView)
    const lastWorkingDay = useMemo((): number | null => {
        for (let day = daysInMonth; day >= 1; day--) {
            const d = new Date(timesheet.year, timesheet.month, day);
            const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6);
            const holiday = template?.holidays?.find(h => h.date === day);
            if (!isWeekend && !holiday) return day;
        }
        return null;
    }, [timesheet.year, timesheet.month, daysInMonth, template]);

    // Build the auto-remark for row 09: list of OT dates (excluding last working day)
    const otDatesRemark = useMemo((): string => {
        const dates = Object.keys(otByDay)
            .map(Number)
            .filter(d => d !== lastWorkingDay && otByDay[d] > 0)
            .sort((a, b) => a - b);
        if (dates.length === 0) return '';
        return dates.join(', ');
    }, [otByDay, lastWorkingDay]);

    // Compute the display label for the previous month's last working day (for row 07 remarks)
    const prevMonthLastDayLabel = useMemo((): string => {
        if (prevLastWorkingDayStr) {
            // Parse as local date to avoid timezone shifting
            const [y, m, d] = prevLastWorkingDayStr.split('-').map(Number);
            const prevDate = new Date(y, m - 1, d);
            return prevDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        // Fallback: last calendar day of previous month
        const prevMonthIndex = timesheet.month === 0 ? 11 : timesheet.month - 1;
        const prevYear = timesheet.month === 0 ? timesheet.year - 1 : timesheet.year;
        const lastDay = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
        return new Date(prevYear, prevMonthIndex, lastDay)
            .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }, [prevLastWorkingDayStr, timesheet.month, timesheet.year]);
    
    const days = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const date = i + 1;
            const d = new Date(timesheet.year, timesheet.month, date);
            const holiday = template?.holidays?.find(h => h.date === date);
            const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6); 
            
            const entry = entries?.find(e => e.date === date) || { date: date, inTime: '', outTime: '', ot: '', late: '', remarks: '', signatureId: '' };

            return {
                date,
                isWeekend,
                holiday,
                entry
            };
        });
    }, [timesheet, template, daysInMonth, entries]);

    const handleEntryChange = (date: number, field: keyof DailyEntry, value: string) => {
        if (!onEntriesChange || !entries) return;
        const newEntries = [...entries];
        const index = newEntries.findIndex(e => e.date === date);
        let targetEntry: DailyEntry;

        if (index >= 0) {
            targetEntry = { ...newEntries[index], [field]: value };
        } else {
            targetEntry = { date, inTime: '', outTime: '', ot: '', late: '', remarks: '', signatureId: '', [field]: value } as DailyEntry;
        }

        // Auto-calculate Late column when In Time is modified
        if (field === 'inTime') {
            const holiday = template?.holidays?.find(h => h.date === date);
            const d = new Date(timesheet.year, timesheet.month, date);
            const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6);
            const isHoliday = isWeekend || holiday;
            const leaveDay = leavesByDay?.[date];

            if (value === '') {
                targetEntry.late = '';
                targetEntry.manualLate = false;
                targetEntry.isLeaveOverride = false;
            } else if (!isHoliday && !(leaveDay && leaveDay.isHalfDay)) {
                targetEntry.late = calcLateMinutes(value, defaultClockIn || '08:30');
            } else if (isHoliday) {
                targetEntry.late = '';
            }
            // For partial leaves, we bypass auto-calculation to preserve any manual override.
        }

        if (field === 'late') {
            targetEntry.manualLate = true;
            targetEntry.late = value;
            const leaveDay = leavesByDay?.[date];
            if (leaveDay && leaveDay.isHalfDay) {
                targetEntry.isLeaveOverride = true;
            } else {
                targetEntry.isLeaveOverride = false;
            }
        }

        if (index >= 0) {
            newEntries[index] = targetEntry;
        } else {
            newEntries.push(targetEntry);
        }

        onEntriesChange(newEntries);
    };

    const handleSummaryChange = (sl: string, field: keyof SummaryEntry, value: string) => {
        if (!onSummaryChange || !summary) return;
        const newSummary = [...summary];
        const index = newSummary.findIndex(s => s.sl === sl);
        if (index >= 0) {
            newSummary[index] = { ...newSummary[index], [field]: value };
        }
        onSummaryChange(newSummary);
    }

    const getSignature = (id?: string) => signatures.find(s => s.id === id);

    const fontRegular = "font-['Times_New_Roman',serif]";
    const fontBold = "font-['Times_New_Roman',serif] font-bold";
    
    const DailySignatureCell = ({ entry }: { entry: DailyEntry }) => {
        const sig = getSignature(entry.signatureId);
        return (
            <div className="w-full h-full relative flex items-center justify-center">
                {sig && (
                    <img src={sig.imageUrl} alt="Sig" className="max-h-[14px] max-w-[90px] object-contain" crossOrigin="anonymous" />
                )}
                {isEditing && canEditSignatures && (
                    <select
                        value={entry.signatureId || ''}
                        onChange={(e) => {
                            if (!onEntriesChange || !entries) return;
                            const newSigId = e.target.value;
                            const newEntries = [...entries];
                            const idx = newEntries.findIndex(en => en.date === entry.date);
                            const base = idx >= 0 ? { ...newEntries[idx] } : { date: entry.date, inTime: '', outTime: '', ot: '', late: '', remarks: '' } as DailyEntry;
                            base.signatureId = newSigId;
                            // Stamp today when signing; clear when removing
                            base.signedAt = newSigId ? new Date().toISOString() : '';
                            if (idx >= 0) newEntries[idx] = base; else newEntries.push(base);
                            onEntriesChange(newEntries);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Click to select signature"
                    >
                        <option value="">None</option>
                        {signatures.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>
        );
    };

    // Calculate Sections Positions
    const headerTop = PAD_TOP;
    const metaTop = headerTop + HEADER_H + HEADER_GAP;
    const tableTop = metaTop + META_H + META_GAP;
    const tableBodyTop = tableTop + TABLE_HEADER_H;
    const tableHeight = TABLE_HEADER_H + (days.length * ROW_H);
    const hrLabelTop = tableTop + tableHeight + HR_GAP;
    const summaryTop = hrLabelTop + HR_LABEL_H + SUMMARY_GAP;
    
    // Summary Rows Calculation
    const summaryRows = [
        { sl: '01', label: 'Sick Leave', h: SUMMARY_ROW_H },
        { sl: '02', label: 'Casual Leave', h: SUMMARY_ROW_H },
        { sl: '03', label: 'Earn Leave', h: SUMMARY_ROW_H },
        { sl: '04', label: 'Late', h: SUMMARY_ROW_H },
        { sl: '05', label: 'Other Leave', h: SUMMARY_ROW_H },
        { sl: '06', label: 'Eligible for Attendance Bonus', h: SUMMARY_ROW_H },
        { sl: '07', label: 'Last Working day OT of Previous Month', h: SUMMARY_ROW_H },
        { sl: '08', label: 'Others', h: SUMMARY_ROW_H },
        { sl: '09', label: 'Total OT', h: SUMMARY_ROW_H },
    ];
    const summaryHeight = summaryRows.reduce((acc, row) => acc + row.h, 0) + TABLE_HEADER_H; // + header
    
    const sigTop = summaryTop + summaryHeight + SIG_GAP;

    return (
        <div data-name="PrintableTimesheet" className="w-[794px] min-h-[1123px] bg-white mx-auto relative text-black shadow-lg my-4 overflow-hidden"
             style={{ backgroundColor: '#ffffff', color: '#000000' }}>
             
             <div className="box-border flex flex-col items-start relative size-full">
                
                {/* Header & Metadata */}
                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${headerTop}px`, height: `${HEADER_H}px` }}>
                    <div className="absolute h-[40px] left-0 top-[10px] w-[84px]">
                        <p className={`${fontRegular} leading-[40px] text-[#99a1af] text-[24px] tracking-[-1.8px] whitespace-pre`}>Timesheet</p>
                    </div>
                    <div className="absolute h-full left-[562px] top-0 w-[135px]">
                         <img src={TCF_LOGO_PATH} alt="TCF" className="absolute inset-0 object-contain size-full" />
                    </div>
                </div>

                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${metaTop}px`, height: `${META_H}px` }}>
                    <div className="absolute flex flex-col gap-[4px] h-full items-start left-0 top-0 w-[364.844px]">
                         {/* Name */}
                         <div className="flex h-[24px] items-start relative shrink-0 w-full">
                            <div className="bg-[#f9fafb] h-full relative shrink-0 w-[96px]">
                                <div aria-hidden="true" className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 1px 1px' }} />
                                <div className="flex h-full items-center pl-[10px]">
                                    <p className={`${fontBold} text-[13px]`}>Name:</p>
                                </div>
                            </div>
                            <div className="flex-1 h-full relative shrink-0">
                                <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                                <div className="flex h-full items-center pl-[9px]">
                                     <p className={`${fontBold} text-[13px]`}>{timesheet.employeeName}</p>
                                </div>
                            </div>
                         </div>
                         {/* EID */}
                         <div className="flex h-[24px] items-start relative shrink-0 w-full">
                            <div className="bg-[#f9fafb] h-full relative shrink-0 w-[96px]">
                                <div aria-hidden="true" className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 1px 1px' }} />
                                <div className="flex h-full items-center pl-[10px]">
                                    <p className={`${fontBold} text-[13px]`}>EID No:</p>
                                </div>
                            </div>
                            <div className="flex-1 h-full relative shrink-0">
                                <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                                <div className="flex h-full items-center pl-[9px]">
                                     <p className={`${fontBold} text-[13px]`}>{timesheet.eid}</p>
                                </div>
                            </div>
                         </div>
                    </div>
                    
                    <div className="absolute h-[20px] left-[477px] bottom-0 w-[220px]">
                        <p className={`${fontBold} text-[13px] text-right absolute right-0 bottom-[2px]`}>For the Month of {monthName}, {timesheet.year}</p>
                    </div>
                </div>

                {/* MAIN TABLE */}
                <div className="absolute left-[32px] w-[730.688px]" style={{ top: `${tableTop}px`, height: `${tableHeight + 2}px` }}>
                     <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                     
                     {/* Table Header */}
                     <div className="absolute left-[0.5px] top-[0.5px] w-[729.688px]" style={{ height: `${TABLE_HEADER_H}px` }}>
                         <div className="absolute bg-[#e5e7eb] h-full left-0 top-0 w-full">
                             <div className="absolute h-full left-0 top-0 w-[40px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Date</p>
                             </div>
                             <div className="absolute h-full left-[40px] top-0 w-[80px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>In Time</p>
                             </div>
                             <div className="absolute h-full left-[120px] top-0 w-[80px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap`}>Out Time</p>
                             </div>
                             <div className="absolute h-full left-[200px] top-0 w-[56px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>OT</p>
                             </div>
                              <div className="absolute h-full top-0" style={{ left: '256px', width: '48px' }}>
                                  <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                  <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Late</p>
                              </div>
                              <div className="absolute h-full top-0" style={{ left: '304px', width: '329.688px' }}>
                                  <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                  <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Remarks</p>
                              </div>
                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Signature</p>
                             </div>
                         </div>
                     </div>

                     {/* Table Body */}
                     <div className="absolute left-[0.5px] w-[729.688px]" style={{ top: `${TABLE_HEADER_H}px` }}>
                         {days.map((day, i) => {
                             const top = i * ROW_H;
                             const isHoliday = day.isWeekend || day.holiday;
                             // Leave day only applies to non-holiday rows
                             const leaveDay = !isHoliday ? leavesByDay[day.date] : undefined;

                             let rowBg: string;
                             if (isHoliday) rowBg = '#d1d5dc';
                             else if (leaveDay) rowBg = '#d9bdbf';
                             else rowBg = 'transparent';
                             
                             return (
                                 <div key={day.date} className="absolute left-0 w-[729.688px]" style={{ top: `${top}px`, height: `${ROW_H}px`, backgroundColor: rowBg }}>
                                     <div className="absolute h-full left-0 top-0 w-[40px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>{day.date}</p>
                                     </div>

                                     {isHoliday ? (
                                         <>
                                             <div className="absolute h-full left-[40px] top-0 w-[160px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <p className={`${fontRegular} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                                                     {day.holiday ? day.holiday.reason : 'Weekly Holiday'}
                                                 </p>
                                             </div>
                                             <div className="absolute h-full left-[200px] top-0 w-[56px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 {otByDay[day.date] != null && otByDay[day.date] > 0 && (
                                                     <p className={`${fontBold} text-[11px] text-blue-700 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                                                         {fmtOT(otByDay[day.date])}
                                                     </p>
                                                 )}
                                             </div>
                                             <div className="absolute h-full top-0" style={{ left: '256px', width: '377.688px' }}>
                                                  <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                             </div>
                                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                                 <DailySignatureCell entry={day.entry} />
                                             </div>
                                         </>
                                     ) : leaveDay && !leaveDay.isPartial ? (
                                         <>
                                             <div className="absolute h-full left-[40px] top-0" style={{ width: '160px' }}>
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <p className={`${fontRegular} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap`}>
                                                     {leaveDay.type}
                                                 </p>
                                             </div>
                                             <div className="absolute h-full left-[200px] top-0 w-[56px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 {otByDay[day.date] != null && otByDay[day.date] > 0 && (
                                                     <p className={`${fontBold} text-[11px] text-blue-700 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                                                         {fmtOT(otByDay[day.date])}
                                                     </p>
                                                 )}
                                             </div>
                                             <div className="absolute h-full top-0" style={{ left: '256px', width: '48px' }}>
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                             </div>
                                             <div className="absolute h-full top-0" style={{ left: '304px', width: '329.688px' }}>
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <div className="w-full h-full flex items-center pl-1">
                                                     <span className={`${fontRegular} text-[10px] truncate`}>{leaveDay.reason}</span>
                                                 </div>
                                             </div>
                                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                                 <DailySignatureCell entry={day.entry} />
                                             </div>
                                         </>
                                     ) : (
                                         (() => {
                                             const isRowLocked = isStaff && !!day.entry.signatureId;
                                             const effectiveEditing = isEditing && !isRowLocked;
                                             return (
                                             <>
                                                 {isRowLocked && (
                                                     <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(254,226,226,0.45)', borderLeft: '3px solid #ef4444' }} />
                                                 )}
                                              <div className="absolute h-full left-[40px] top-0 w-[80px] overflow-hidden">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <TimeInputCell isEditing={effectiveEditing} value={day.entry.inTime} onChange={(v) => handleEntryChange(day.date, 'inTime', v)} defaultTime={defaultClockIn || '08:30'} className={`${fontRegular} text-[11px]`} />
                                             </div>
                                              <div className="absolute h-full left-[120px] top-0 w-[80px] overflow-hidden">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <TimeInputCell isEditing={effectiveEditing} value={day.entry.outTime} onChange={(v) => handleEntryChange(day.date, 'outTime', v)} defaultTime={defaultClockOut || '17:30'} className={`${fontRegular} text-[11px]`} />
                                             </div>
                                             <div className="absolute h-full left-[200px] top-0 w-[56px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <InputCell
                                                     isEditing={false}
                                                     value={fmtOT(otByDay[day.date] ?? 0)}
                                                     onChange={() => {}}
                                                     className={`${fontBold} text-[11px] text-blue-700`}
                                                 />
                                             </div>
                                              <div className="absolute h-full top-0" style={{ left: '256px', width: '48px' }}>
                                                  <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                  {(() => {
                                                      let displayLate = day.entry.late || '';
                                                      const isHalfDayLeave = !!(leaveDay && leaveDay.isHalfDay);
                                                      const canEditLate = !!(effectiveEditing && isHalfDayLeave);
                                                      if (isHalfDayLeave && !day.entry.manualLate && displayLate) {
                                                          displayLate = '';
                                                      }
                                                      return (
                                                          <div className="relative w-full h-full group">
                                                              <InputCell 
                                                                  isEditing={canEditLate} 
                                                                  value={displayLate} 
                                                                  onChange={(v) => handleEntryChange(day.date, 'late', v.replace(/[^0-9]/g, ''))} 
                                                                  className={`${fontBold} text-[11px] ${leaveDay && !leaveDay.isHalfDay ? 'text-green-600' : 'text-red-600'}`} 
                                                              />
                                                              {isHalfDayLeave && !displayLate && (
                                                                  <div className={`absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 transition-opacity ${canEditLate ? 'group-hover:opacity-100' : ''}`} title={canEditLate ? "Click to manually enter late minutes" : "Half-day leave: late minutes disabled. Enter Edit Mode to override."}>
                                                                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      );
                                                  })()}
                                              </div>
                                              <div className="absolute h-full top-0" style={{ left: '304px', width: '329.688px' }}>
                                                  <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                  <InputCell 
                                                      isEditing={effectiveEditing} 
                                                      value={day.entry.remarks} 
                                                      onChange={(v) => handleEntryChange(day.date, 'remarks', v)} 
                                                      className={`${fontRegular} text-[11px]`} 
                                                      align="left" 
                                                      prefix={leaveDay && leaveDay.isPartial ? `${leaveDay.type}(${leaveDay.partialHours ? `${leaveDay.partialHours} Hours` : `${leaveDay.days} days`}) -> ${leaveDay.reason}` : ''}
                                                  />
                                              </div>
                                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                                 <div className="w-full h-full relative flex items-center justify-center">
                                                     <DailySignatureCell entry={day.entry} />
                                                     {isRowLocked && (
                                                         <div className="absolute top-0.5 right-0.5 flex items-center justify-center" title="Row locked by Admin signature">
                                                             <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         </>
                                         );
                                         })()
                                     )}
                                 </div>
                             )
                         })}
                     </div>
                </div>

                {/* HR Comments Label */}
                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${hrLabelTop}px`, height: `${HR_LABEL_H}px` }}>
                    <p className={`${fontBold} text-[12px] leading-[16px]`}>H.R Comments :</p>
                </div>

                {/* SUMMARY TABLE */}
                <div className="absolute left-[32px] w-[730.688px]" style={{ top: `${summaryTop}px`, height: `${summaryHeight}px` }}>
                     <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                     
                     {/* Header */}
                     <div className="absolute left-[0.5px] top-[0.5px] w-[729.688px]" style={{ height: `${TABLE_HEADER_H}px` }}>
                         <div className="absolute h-full left-0 top-0 w-[40px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Sl.</p>
                         </div>
                         <div className="absolute h-full left-[40px] top-0 w-[192px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-[9px] top-1/2 -translate-y-1/2`}>Particulars</p>
                         </div>
                         <div className="absolute h-full left-[232px] top-0 w-[160px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap`}>Day/s, Hour, Minutes, Eligibility</p>
                         </div>
                         <div className="absolute h-full left-[392px] top-0 w-[337.688px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Remarks</p>
                         </div>
                     </div>

                     {/* Body */}
                     <div className="absolute left-[0.5px] w-[729.688px]" style={{ top: `${TABLE_HEADER_H}px` }}>
                        {summaryRows.map((row, idx) => {
                            // Calculate cumulative top
                            const rowTop = summaryRows.slice(0, idx).reduce((sum, r) => sum + r.h, 0);
                            const summaryItem = summary?.find(s => s.sl === row.sl) || { days: '', remarks: '' };
                            
                            return (
                                <div key={row.sl} className="absolute left-0 w-full" style={{ height: `${row.h}px`, top: `${rowTop}px` }}>
                                    <div className="absolute h-full left-0 top-0 w-[40px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>{row.sl}</p>
                                    </div>
                                    <div className="absolute h-full left-[40px] top-0 w-[192px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <p className={`${fontRegular} text-[11px] absolute left-[9px] top-1/2 -translate-y-1/2`}>{row.label}</p>
                                    </div>
                                    <div className="absolute h-full left-[232px] top-0 w-[160px]">
                                        <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         {(() => {
                                             // Auto-computed read-only rows
                                             const isReadOnly = ['01','02','03','04','05','06','07','09'].includes(row.sl);
                                             let displayValue = summaryItem.days;
                                             // Leave rows (auto from approved leaves)
                                             if (row.sl === '01') displayValue = leaveSummary.sick.toFixed(2);
                                             if (row.sl === '02') displayValue = leaveSummary.casual.toFixed(2);
                                             if (row.sl === '03') displayValue = leaveSummary.earn.toFixed(2);
                                             if (row.sl === '05') displayValue = leaveSummary.other.toFixed(2);
                                             // Bonus row
                                             if (row.sl === '06') {
                                                 const totalLeaves = leaveSummary.sick + leaveSummary.casual + leaveSummary.earn + leaveSummary.other;
                                                 const lateStr = summary?.find(s => s.sl === '04')?.days || '0';
                                                 const lateNum = parseInt(lateStr, 10) || 0;
                                                 displayValue = (totalLeaves === 0 && lateNum === 0) ? 'Yes' : 'No';
                                             }
                                             // OT rows
                                             if (row.sl === '07') displayValue = prevMonthEndOT > 0 ? fmtOT(prevMonthEndOT) : '0';
                                             if (row.sl === '09') displayValue = totalOT > 0 ? fmtOT(totalOT) : '0';
                                             const cellClass = row.sl === '04'
                                                 ? `${fontBold} text-red-600 text-[11px]`
                                                 : row.sl === '06'
                                                     ? `${fontBold} ${displayValue === 'Yes' ? 'text-green-600' : 'text-red-600'} text-[11px]`
                                                     : (row.sl === '07' || row.sl === '09')
                                                         ? `${fontBold} text-blue-700 text-[11px]`
                                                         : `${fontRegular} text-[11px]`;
                                             return (
                                                 <InputCell
                                                     isEditing={isReadOnly ? false : isEditing}
                                                     value={displayValue}
                                                     onChange={(v) => handleSummaryChange(row.sl, 'days', v)}
                                                     className={cellClass}
                                                 />
                                             );
                                         })()}
                                    </div>
                                    <div className="absolute h-full left-[392px] top-0 w-[337.688px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                         {row.sl === '07' ? (
                                             <InputCell
                                                 isEditing={false}
                                                 value={prevMonthLastDayLabel}
                                                 onChange={() => {}}
                                                 className={`${fontRegular} text-[11px] text-blue-700`}
                                                 align="left"
                                             />
                                         ) : row.sl === '09' ? (
                                             <InputCell
                                                 isEditing={false}
                                                 value={otDatesRemark}
                                                 onChange={() => {}}
                                                 className={`${fontRegular} text-[11px] text-blue-700`}
                                                 align="left"
                                             />
                                         ) : (
                                             <InputCell isEditing={isEditing} value={summaryItem.remarks} onChange={(v) => handleSummaryChange(row.sl, 'remarks', v)} className={`${fontRegular} text-[11px]`} align="left" />
                                         )}
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                </div>

                {/* SIGNATURES FOOTER */}
                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${sigTop}px`, height: `${SIG_H}px` }}>
                     {/* Checked By */}
                     <div className="absolute h-full left-[10px] top-0 w-[200px]">
                         <div className="absolute bottom-[40px] w-full flex justify-center">
                              {(() => {
                                const sig = getSignature(checkedBySignatureId);
                                return sig ? <img src={sig.imageUrl} alt="Sig" className="max-h-[50px] max-w-[180px] object-contain" /> : null;
                              })()}
                              {isEditing && canEditSignatures && onCheckedByChange && (
                                <select 
                                    value={checkedBySignatureId || ''} 
                                    onChange={(e) => onCheckedByChange(e.target.value)}
                                    className="absolute bottom-0 w-full h-[50px] opacity-0 cursor-pointer"
                                >
                                    <option value="">Select Signature</option>
                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             )}
                         </div>
                         <div className="absolute h-px left-0 bottom-[38px] w-[200px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 0px 0px' }} />
                         </div>
                         <div className="absolute left-[67.16px] bottom-[20px] w-[65.672px]">
                             <p className={`${fontBold} text-[12px] whitespace-pre`}>Checked By:</p>
                         </div>
                         {(() => {
                             const sig = getSignature(checkedBySignatureId);
                             return sig ? (
                                <div className="absolute left-[56.61px] bottom-[2px] w-[86.781px]">
                                    <p className={`${fontRegular} text-[10px]`}>{sig.name} - {sig.role}</p>
                                </div>
                             ) : null;
                         })()}
                     </div>

                     {/* Approved By */}
                     <div className="absolute h-full left-[487.69px] top-0 w-[200px]">
                         <div className="absolute bottom-[40px] w-full flex justify-center">
                              {(() => {
                                const sig = getSignature(approvedBySignatureId);
                                return sig ? <img src={sig.imageUrl} alt="Sig" className="max-h-[50px] max-w-[180px] object-contain" /> : null;
                              })()}
                              {isEditing && canEditSignatures && onApprovedByChange && (
                                <select 
                                    value={approvedBySignatureId || ''} 
                                    onChange={(e) => onApprovedByChange(e.target.value)}
                                    className="absolute bottom-0 w-full h-[50px] opacity-0 cursor-pointer"
                                >
                                    <option value="">Select Signature</option>
                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             )}
                         </div>
                         <div className="absolute h-px left-0 bottom-[38px] w-[200px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 0px 0px' }} />
                         </div>
                         <div className="absolute left-[64.59px] bottom-[20px] w-[70.797px]">
                             <p className={`${fontBold} text-[12px] whitespace-pre`}>Approved by:</p>
                         </div>
                         {(() => {
                             const sig = getSignature(approvedBySignatureId);
                             return sig ? (
                                <div className="absolute left-[56.61px] bottom-[2px] w-[86.781px]">
                                    <p className={`${fontRegular} text-[10px]`}>{sig.name} - {sig.role}</p>
                                </div>
                             ) : null;
                         })()}
                     </div>
                </div>

             </div>
        </div>
    );
}
