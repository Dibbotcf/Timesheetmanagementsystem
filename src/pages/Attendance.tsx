import React, { useState, useMemo, useRef } from 'react';
import { useAppStore, Employee, AttendanceRecord } from '../App';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Plus, Printer, ArrowDownToLine, Users, Search, AlertCircle, Trash2, ChevronDown, X, Check, FileX
} from 'lucide-react';
import { toast } from 'sonner';

// --- Custom Status SVGs (matching premium SVGRepo styling) ---
const PresentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AbsentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HolidayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const DayOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const HalfDayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={props.className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
  </svg>
);

const LateIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const OnLeaveIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} {...props}>
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
  </svg>
);

export type AttendanceStatus = 'Holiday' | 'DayOff' | 'Present' | 'HalfDay' | 'Late' | 'Absent' | 'OnLeave';

export const StatusSymbol: React.FC<{ status: AttendanceStatus; className?: string }> = ({ status, className = "h-4 w-4" }) => {
  switch (status) {
    case 'Present':
      return <PresentIcon className={className} />;
    case 'Absent':
      return <AbsentIcon className={className} />;
    case 'Holiday':
      return <HolidayIcon className={className} />;
    case 'DayOff':
      return <DayOffIcon className={className} />;
    case 'HalfDay':
      return <HalfDayIcon className={className} />;
    case 'Late':
      return <LateIcon className={className} />;
    case 'OnLeave':
      return <OnLeaveIcon className={className} />;
    default:
      return null;
  }
};

// ── Premium compact cell matching reference design ──
const AttendanceCellContent: React.FC<{
  status?: AttendanceStatus;
  details?: { clockIn?: string; clockOut?: string; lateMinutes?: number };
  isWeekend?: boolean;
  leaveInfo?: { type: string; code: string; days: number; isPartial: boolean };
}> = ({ status, details, isWeekend: isWknd, leaveInfo }) => {
  const isMarked = !!(details?.clockIn && details?.clockOut);
  const isLate = status === 'Late';
  const isAbsent = status === 'Absent';
  const isHoliday = status === 'Holiday';
  const isDayOff = status === 'DayOff' || isWknd;
  const isOnLeave = status === 'OnLeave';
  const isHalfDay = status === 'HalfDay';

  // Weekend / Day Off placeholder
  if (isDayOff && !isMarked) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-[9px] font-bold tracking-widest" style={{ color: '#94a3b8' }}>—</span>
      </div>
    );
  }

  const inT = details?.clockIn  || '';
  const outT = details?.clockOut || '';
  const textCol  = '#374151'; // always normal color
  const letterCol = isLate ? '#dc2626' : isHalfDay ? '#f43f5e' : '';
  const letter = isLate ? (details?.lateMinutes ? `${details.lateMinutes} min` : 'Late') : isHalfDay ? 'H' : '';

  if (leaveInfo) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-0" style={{ padding: '2px 4px' }} title={leaveInfo.type}>
        <span className="text-[12px] font-extrabold text-[#b91c1c] leading-tight text-center mb-0.5" style={{ wordBreak: 'break-word', lineHeight: '1.1' }}>
          {leaveInfo.code}
        </span>
        {leaveInfo.isPartial && (inT || outT) && (
           <>
             {inT  && <span className="font-mono font-semibold leading-tight" style={{ fontSize: '9px', color: textCol }}>{inT}</span>}
             {outT && <span className="font-mono font-semibold leading-tight" style={{ fontSize: '9px', color: textCol }}>{outT}</span>}
             {letter && (
               <span className="font-extrabold leading-none mt-px" style={{ fontSize: '9px', color: letterCol }}>{letter}</span>
             )}
           </>
        )}
      </div>
    );
  }


  // Holiday
  if (isHoliday) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-0.5">
        <HolidayIcon className="h-3 w-3 text-[#60a5fa]" />
        <span className="text-[9px] font-extrabold text-[#60a5fa] leading-none">H</span>
      </div>
    );
  }

  // On Leave
  if (isOnLeave) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-0.5">
        <OnLeaveIcon className="h-3 w-3 text-purple-500" />
        <span className="text-[9px] font-extrabold text-purple-500 leading-none">L</span>
      </div>
    );
  }

  // Absent (not marked at all)
  if (isAbsent && !isMarked) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-0.5">
        <span className="text-[10px] text-slate-300 leading-none">—</span>
        <span className="text-[9px] font-extrabold text-red-500 leading-none">A</span>
      </div>
    );
  }

  // No status at all
  if (!status) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-[10px]" style={{ color: '#cbd5e1' }}>—</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-0" style={{ padding: '2px 4px' }}>
      {inT  && <span className="font-mono font-semibold leading-tight" style={{ fontSize: '9px', color: textCol }}>{inT}</span>}
      {outT && <span className="font-mono font-semibold leading-tight" style={{ fontSize: '9px', color: textCol }}>{outT}</span>}
      {letter && (
        <span className="font-extrabold leading-none mt-px" style={{ fontSize: '9px', color: letterCol }}>{letter}</span>
      )}
      {!inT && !outT && (
        <span className="font-mono font-semibold" style={{ fontSize: '9px', color: textCol }}>✓</span>
      )}
    </div>
  );
};

// ── Hours calculator ──
const calcHours = (timeIn?: string, timeOut?: string): number => {
  if (!timeIn || !timeOut) return 0;
  const [ih, im] = timeIn.split(':').map(Number);
  const [oh, om] = timeOut.split(':').map(Number);
  if (isNaN(ih) || isNaN(oh)) return 0;
  const diffMin = (oh * 60 + om) - (ih * 60 + im);
  return diffMin > 0 ? diffMin / 60 : 0;
};

const formatHrs = (hrs: number): string => {
  if (hrs <= 0) return '—';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i);

// Status Configuration with Icons, Color Badges, and Text Labels
const STATUS_CONFIG = {
  Present: { symbol: '✔️', label: 'Present', color: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200' },
  Absent: { symbol: '🗙', label: 'Absent', color: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200' },
  Holiday: { symbol: '⭐', label: 'Holiday', color: 'text-blue-500 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  DayOff: { symbol: '📅', label: 'Day Off', color: 'text-blue-500 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  HalfDay: { symbol: '🔴', label: 'Half Day', color: 'text-rose-500 bg-rose-50 hover:bg-rose-100 border-rose-200' },
  Late: { symbol: '💛', label: 'Late', color: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200' },
  OnLeave: { symbol: '✈️', label: 'On Leave', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200' },
};

type AttendanceStatus = keyof typeof STATUS_CONFIG;

export const Attendance: React.FC<{ dashboardMode?: boolean }> = ({ dashboardMode }) => {
  const { employees, attendanceRecords, saveAttendanceRecord, templates, getTemplate, currentUser, leaves, timesheets } = useAppStore();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  // Multi-select employee filter: empty array = All Employees
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([]);
  const [empDropdownSearch, setEmpDropdownSearch] = useState<string>('');
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Toggle: show only employees WITH a timesheet for the selected month/year
  const [showWithTimesheetOnly, setShowWithTimesheetOnly] = useState(false);

  // Modal States
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState('');
  const [modalDate, setModalDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [modalClockIn, setModalClockIn] = useState('08:30');
  const [modalClockOut, setModalClockOut] = useState('');

  const modalLateMinutes = useMemo(() => {
    if (!modalClockIn) return 0;
    const [hours, minutes] = modalClockIn.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const limitMinutes = 8 * 60 + 30; // 8:30 AM
    return totalMinutes > limitMinutes ? totalMinutes - limitMinutes : 0;
  }, [modalClockIn]);

  const isAdmin = currentUser?.role === 'Admin/HR';

  // 1. Get Days in Month & Weekday mapping
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const getDayName = (dayNum: number) => {
    const date = new Date(selectedYear, selectedMonth, dayNum);
    return date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. "Fri"
  };

  const getDayShort = (dayNum: number) => {
    return getDayName(dayNum).substring(0, 3);
  };

  const isWeekend = (dayNum: number) => {
    const tmpl = getTemplate(selectedYear, selectedMonth);
    if (tmpl) {
      return tmpl.holidays.some(h => h.date === dayNum && h.reason.toLowerCase().includes('weekly holiday'));
    }
    const date = new Date(selectedYear, selectedMonth, dayNum);
    const day = date.getDay();
    return day === 5 || day === 6; // 5 = Friday, 6 = Saturday
  };

  // 1b. Leaves map for rendering approved leaves in grid
  const leavesMap = useMemo(() => {
    const map: Record<string, Record<number, { type: string; code: string; reason: string; isPartial: boolean; days: number; partialHours?: number; daysContribution: number }>> = {};
    const MS = 24 * 60 * 60 * 1000;
    
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

    if (!leaves) return map;

    for (const leave of leaves) {
      if (leave.status !== 'Approved') continue;
      
      const leaveStart = new Date(leave.startDate).getTime();
      const leaveEnd = new Date(leave.endDate).getTime();
      
      if (leaveEnd < monthStart || leaveStart > monthEnd) continue;

      const overlapStart = Math.max(leaveStart, monthStart);
      const overlapEnd = Math.min(leaveEnd, monthEnd);
      
      const dStart = new Date(overlapStart).getDate();
      const dEnd = new Date(overlapEnd).getDate();

      if (!map[leave.employeeId]) {
        map[leave.employeeId] = {};
      }

      for (let dayNum = dStart; dayNum <= dEnd; dayNum++) {
        const label = leave.type === 'Annual' ? 'Earn Leave'
          : leave.type === 'Maternity' ? 'Maternity Leave'
          : `${leave.type} Leave`;
        const code = leave.type === 'Annual' ? 'A' : leave.type.charAt(0).toUpperCase();
        
        if (!map[leave.employeeId][dayNum]) {
            const isPartialHourly = leave.partialHours !== undefined && leave.partialHours > 0;
            // daysContribution: how much this single day contributes to the leave count
            // 0 for partial/hourly (not counted), 0.5 for half-day, 1 for each full day
            const daysContribution = isPartialHourly ? 0 : (leave.days === 0.5 ? 0.5 : 1);
            map[leave.employeeId][dayNum] = { type: label, code, reason: leave.reason, isPartial: leave.days < 1 || isPartialHourly, days: leave.days, partialHours: leave.partialHours, daysContribution };
        }
      }
    }
    return map;
  }, [leaves, selectedYear, selectedMonth]);

  // Helper: parse numeric portion of EID for sorting (e.g. "TCF-007" -> 7)
  const parseEidNumber = (eid: string): number => {
    const match = eid.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
  };

  const sortByEid = (a: Employee, b: Employee): number => {
    const eIdA = a.eid || '';
    const eIdB = b.eid || '';
    const aNum = parseEidNumber(eIdA);
    const bNum = parseEidNumber(eIdB);
    if (aNum !== bNum) return aNum - bNum;
    return eIdA.localeCompare(eIdB);
  };

  // 2. Filter active employees list
  const activeEmployees = useMemo(() => {
    return [...employees].filter(emp => emp.status === 'Active').sort(sortByEid);
  }, [employees]);

  // Set of employeeIds who have a timesheet for the selected month/year
  const employeesWithTimesheetIds = useMemo(() => {
    return new Set(
      timesheets
        .filter(ts => ts.year === selectedYear && ts.month === selectedMonth)
        .map(ts => ts.employeeId)
    );
  }, [timesheets, selectedYear, selectedMonth]);

  const filteredEmployees = useMemo(() => {
    // If current user is Staff, restrict view to only themselves
    const list = currentUser?.role === 'Staff' 
      ? activeEmployees.filter(e => e.id === currentUser.id)
      : activeEmployees;

    return [...list].filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.eid.toLowerCase().includes(searchQuery.toLowerCase());
      // Empty array = All Employees; otherwise only show selected IDs
      const matchFilter = employeeFilter.length === 0 || employeeFilter.includes(emp.id);
      // Timesheet filter: if toggle is on, only show employees with a timesheet
      const matchTimesheet = !showWithTimesheetOnly || employeesWithTimesheetIds.has(emp.id);
      return matchSearch && matchFilter && matchTimesheet;
    }).sort(sortByEid);
  }, [activeEmployees, employeeFilter, searchQuery, currentUser, showWithTimesheetOnly, employeesWithTimesheetIds]);

  // Employees shown inside the dropdown (filtered by dropdown search)
  const dropdownEmployees = useMemo(() => {
    if (!empDropdownSearch) return activeEmployees;
    const q = empDropdownSearch.toLowerCase();
    return activeEmployees.filter(e =>
      e.name.toLowerCase().includes(q) || e.eid.toLowerCase().includes(q)
    );
  }, [activeEmployees, empDropdownSearch]);

  // Toggle a single employee in the multi-select filter
  const toggleEmployeeFilter = (id: string) => {
    setEmployeeFilter(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 3. Helper to locate record and fetch cell values
  const getCellStatus = (empId: string, dayNum: number): AttendanceStatus | undefined => {
    const recId = `${empId}-${selectedYear}-${selectedMonth}`;
    const record = attendanceRecords.find(r => r.id === recId);
    return record?.statusMap?.[dayNum];
  };

  // 3b. Helper to get the template-based status for a given day (Holiday / DayOff)
  //     Returns 'Holiday' for named public holidays, 'DayOff' for 'Weekly Holiday' entries
  const getTemplateDayStatus = (dayNum: number): AttendanceStatus | undefined => {
    const tmpl = getTemplate(selectedYear, selectedMonth);
    if (!tmpl) return undefined;
    const entry = tmpl.holidays.find(h => h.date === dayNum);
    if (!entry) return undefined;
    // "Weekly Holiday" entries are shown as DayOff; anything else is a Holiday
    return entry.reason.toLowerCase().includes('weekly holiday') ? 'DayOff' : 'Holiday';
  };

  // 3c. Merge: explicit record wins; if nothing recorded, fall back to template
  const getEffectiveCellStatus = (empId: string, dayNum: number): AttendanceStatus | undefined => {
    const tmpl = getTemplate(selectedYear, selectedMonth);
    if (!tmpl) return undefined; // If no template configured, show blank

    const explicit = getCellStatus(empId, dayNum);
    if (explicit) return explicit;
    return getTemplateDayStatus(dayNum); // Holiday / DayOff from template
  };

  // 3d. Entry details (clock-in / clock-out times)
  const getCellDetails = (empId: string, dayNum: number) => {
    const tmpl = getTemplate(selectedYear, selectedMonth);
    if (!tmpl) return undefined; // If no template configured, show blank

    const recId = `${empId}-${selectedYear}-${selectedMonth}`;
    const record = attendanceRecords.find(r => r.id === recId);
    return record?.entryDetails?.[dayNum];
  };

  const handleCellChange = async (empId: string, dayNum: number, status: AttendanceStatus | 'Clear') => {
    if (!isAdmin) {
      toast.error('Only Admin/HR users can mark attendance');
      return;
    }

    const recId = `${empId}-${selectedYear}-${selectedMonth}`;
    const existingRecord = attendanceRecords.find(r => r.id === recId);

    const updatedStatusMap = existingRecord ? { ...existingRecord.statusMap } : {};
    const updatedEntryDetails = existingRecord?.entryDetails ? { ...existingRecord.entryDetails } : {};
    
    if (status === 'Clear') {
      delete updatedStatusMap[dayNum];
      delete updatedEntryDetails[dayNum];
    } else {
      updatedStatusMap[dayNum] = status;
      if (status !== 'Present' && status !== 'Late') {
        delete updatedEntryDetails[dayNum];
      }
    }

    const newRecord: AttendanceRecord = {
      id: recId,
      employeeId: empId,
      year: selectedYear,
      month: selectedMonth,
      statusMap: updatedStatusMap,
      entryDetails: updatedEntryDetails
    };

    try {
      await saveAttendanceRecord(newRecord);
      toast.success('Attendance updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save attendance record');
    }
  };

  // 5. Bulk Mark Present Tool (Working Days Auto-fill)
  const handleBulkMarkPresent = async () => {
    if (!isAdmin) {
      toast.error('Only Admin/HR users can bulk mark attendance');
      return;
    }

    // Load templates to get holiday schedules
    const templateId = `temp_${selectedYear}_${selectedMonth}`;
    const activeTemplate = templates.find(t => t.id === templateId);
    if (!activeTemplate) {
      toast.error('Please configure the Month Template first before bulk marking attendance!');
      return;
    }
    const templateHolidays = activeTemplate.holidays;

    let updatedCount = 0;

    for (const emp of filteredEmployees) {
      const recId = `${emp.id}-${selectedYear}-${selectedMonth}`;
      const existingRecord = attendanceRecords.find(r => r.id === recId);
      const updatedStatusMap = existingRecord ? { ...existingRecord.statusMap } : {};
      const updatedEntryDetails = existingRecord?.entryDetails ? { ...existingRecord.entryDetails } : {};

      daysArray.forEach(day => {
        // If already marked, skip it to avoid overwriting custom marks
        if (updatedStatusMap[day]) return;

        // check if defined template holiday
        const isHoliday = templateHolidays.some(h => h.date === day);
        // check weekend
        const isWeekEndDay = isWeekend(day);

        if (isHoliday) {
          updatedStatusMap[day] = 'Holiday';
        } else if (isWeekEndDay) {
          updatedStatusMap[day] = 'DayOff';
        } else {
          updatedStatusMap[day] = 'Present';
        }
      });

      const newRecord: AttendanceRecord = {
        id: recId,
        employeeId: emp.id,
        year: selectedYear,
        month: selectedMonth,
        statusMap: updatedStatusMap,
        entryDetails: updatedEntryDetails
      };

      await saveAttendanceRecord(newRecord);
      updatedCount++;
    }

    toast.success(`Marked Present on all working days for ${updatedCount} employees`);
  };

  // 5.1 Clear Marked Attendance for Selected Month
  const handleClearAttendance = async () => {
    if (!isAdmin) {
      toast.error('Only Admin/HR users can clear attendance');
      return;
    }

    const confirmClear = window.confirm(
      `Are you sure you want to clear marked attendance records for ${filteredEmployees.length} employees for ${MONTHS[selectedMonth]} ${selectedYear}? This action cannot be undone.`
    );
    if (!confirmClear) return;

    let clearedCount = 0;
    for (const emp of filteredEmployees) {
      const recId = `${emp.id}-${selectedYear}-${selectedMonth}`;
      const existingRecord = attendanceRecords.find(r => r.id === recId);
      
      // If no record exists or it is already empty, skip
      if (!existingRecord || Object.keys(existingRecord.statusMap).length === 0) continue;

      const newRecord: AttendanceRecord = {
        id: recId,
        employeeId: emp.id,
        year: selectedYear,
        month: selectedMonth,
        statusMap: {}, // empty
        entryDetails: {} // empty
      };

      await saveAttendanceRecord(newRecord);
      clearedCount++;
    }

    toast.success(`Successfully cleared attendance records for ${clearedCount} employees`);
  };

  // 5.2 Submit Marked Attendance Modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmployeeId) { toast.error('Please select an employee'); return; }
    if (!modalDate) { toast.error('Please select a date'); return; }
    if (!modalClockIn) { toast.error('Please enter at least a Clock In time'); return; }

    const dateObj = new Date(modalDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    const tmpl = getTemplate(year, month);
    if (!tmpl) {
      toast.error('Please configure the Month Template first before marking attendance for this date!');
      return;
    }

    const recId = `${modalEmployeeId}-${year}-${month}`;
    const existingRecord = attendanceRecords.find(r => r.id === recId);

    const updatedStatusMap = existingRecord ? { ...existingRecord.statusMap } : {};
    const updatedEntryDetails = existingRecord?.entryDetails ? { ...existingRecord.entryDetails } : {};

    // Calculate status: Late (💛) if lateMinutes > 0, otherwise Present (✔️)
    const late = modalLateMinutes;
    const status: AttendanceStatus = late > 0 ? 'Late' : 'Present';
    updatedStatusMap[day] = status;

    updatedEntryDetails[day] = {
      clockIn: modalClockIn,
      clockOut: modalClockOut || '',
      lateMinutes: late
    };

    const newRecord: AttendanceRecord = {
      id: recId,
      employeeId: modalEmployeeId,
      year: year,
      month: month,
      statusMap: updatedStatusMap,
      entryDetails: updatedEntryDetails
    };

    try {
      await saveAttendanceRecord(newRecord);
      toast.success('Attendance successfully marked!');
      setIsMarkModalOpen(false);
      // Reset clock times
      setModalClockIn('08:30');
      setModalClockOut('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark attendance');
    }
  };

  // 6. Excel Export — proper HTML table (opens natively in Excel, no warnings)
  const handleExportExcel = () => {
    const esc = (v: string | number) =>
      String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Status color map
    const statusColors: Record<string, string> = {
      Present:  '#d4edda',
      Late:     '#fff3cd',
      Absent:   '#f8d7da',
      Holiday:  '#cce5ff',
      DayOff:   '#e2e8f0',
      HalfDay:  '#ffe4e1',
      OnLeave:  '#e8d5f5',
    };

    // Build table header
    let headCells = `
      <th style="background:#1e293b;color:#fff;padding:6px 8px;font-size:11px;white-space:nowrap;border:1px solid #fff;">Employee</th>
      <th style="background:#1e293b;color:#fff;padding:6px 8px;font-size:11px;white-space:nowrap;border:1px solid #fff;">EID</th>`;
    daysArray.forEach(day => {
      const isWkEnd = isWeekend(day);
      const tmplSt = getTemplateDayStatus(day);
      const isOff = isWkEnd || tmplSt === 'Holiday' || tmplSt === 'DayOff';
      const bg = isOff ? '#c7d7f0' : '#1e293b';
      const col = isOff ? '#1e293b' : '#fff';
      headCells += `<th style="background:${bg};color:${col};padding:4px 2px;font-size:10px;text-align:center;border:1px solid #fff;min-width:28px;">
        ${getDayShort(day)}<br/>${day}
      </th>`;
    });
    headCells += `
      <th style="background:#4c1d95;color:#fff;padding:6px 4px;font-size:11px;text-align:center;border:1px solid #fff;">L</th>
      <th style="background:#991b1b;color:#fff;padding:6px 4px;font-size:11px;text-align:center;border:1px solid #fff;">A</th>
      <th style="background:#065f46;color:#fff;padding:6px 4px;font-size:11px;text-align:center;border:1px solid #fff;">D</th>
      <th style="background:#78350f;color:#fff;padding:6px 4px;font-size:10px;text-align:center;border:1px solid #fff;">Lates<br/>(min)</th>
      <th style="background:#92400e;color:#fff;padding:6px 4px;font-size:11px;text-align:center;border:1px solid #fff;">Bonus</th>`;

    // Build data rows
    let bodyRows = '';
    filteredEmployees.forEach((emp, rowIdx) => {
      const { present, leave, lates, workingDays } = getEmployeeMetrics(emp.id);
      const bonusEligible = lates === 0 && leave === 0;
      const rowBg = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';

      let cells = `
        <td style="background:${rowBg};padding:5px 8px;font-size:11px;font-weight:600;white-space:nowrap;border:1px solid #e2e8f0;">${esc(emp.name)}</td>
        <td style="background:${rowBg};padding:5px 8px;font-size:10px;font-family:monospace;white-space:nowrap;border:1px solid #e2e8f0;">${esc(emp.eid)}</td>`;

      daysArray.forEach(day => {
        const status = getEffectiveCellStatus(emp.id, day);
        const details = getCellDetails(emp.id, day);
        const leaveDay = leavesMap[emp.id]?.[day];
        const isWkEnd = isWeekend(day);
        const isOff = isWkEnd || status === 'Holiday' || status === 'DayOff';

        let cellBg = isOff ? '#e8f0fe' : (statusColors[status || ''] || rowBg);
        if (leaveDay && !leaveDay.isPartial) cellBg = '#e8d5f5';

        let cellContent = '';
        let cellStyle = `background:${cellBg};padding:2px 2px;font-size:9px;text-align:center;border:1px solid #e2e8f0;`;

        if (leaveDay && !leaveDay.isPartial) {
          cellContent = `<span style="color:#7c3aed;font-weight:700;">${esc(leaveDay.code)}</span>`;
        } else if (details?.clockIn) {
          const inT = details.clockIn;
          const outT = details.clockOut || '';
          const late = details.lateMinutes && details.lateMinutes > 0 ? details.lateMinutes : 0;
          cellContent = `<span style="color:#374151;">${esc(inT)}</span>`;
          if (outT) cellContent += `<br/><span style="color:#374151;">${esc(outT)}</span>`;
          if (late > 0) cellContent += `<br/><span style="color:#dc2626;font-weight:700;">${late}m</span>`;
        } else if (status === 'Holiday') {
          cellContent = `<span style="color:#1d4ed8;font-weight:700;">H</span>`;
        } else if (status === 'DayOff' || isOff) {
          cellContent = `<span style="color:#94a3b8;">—</span>`;
        } else if (status === 'Absent') {
          cellContent = `<span style="color:#dc2626;font-weight:700;">A</span>`;
        } else if (status === 'OnLeave') {
          cellContent = `<span style="color:#7c3aed;font-weight:700;">L</span>`;
        } else if (status === 'HalfDay') {
          cellContent = `<span style="color:#f43f5e;font-weight:700;">H/D</span>`;
        } else if (status === 'Present') {
          cellContent = `<span style="color:#16a34a;font-weight:700;">✓</span>`;
        } else {
          cellContent = `<span style="color:#cbd5e1;">—</span>`;
        }

        cells += `<td style="${cellStyle}">${cellContent}</td>`;
      });

      // Summary cols
      cells += `
        <td style="background:${rowBg};text-align:center;font-size:11px;font-weight:700;color:${leave > 0 ? '#7c3aed' : '#cbd5e1'};border:1px solid #e2e8f0;padding:4px;">${leave > 0 ? leave : '—'}</td>
        <td style="background:${rowBg};text-align:center;font-size:11px;font-weight:700;color:${present > 0 ? '#dc2626' : '#cbd5e1'};border:1px solid #e2e8f0;padding:4px;">${present > 0 ? present : '—'}</td>
        <td style="background:${rowBg};text-align:center;font-size:11px;font-weight:700;color:${workingDays > 0 ? '#059669' : '#cbd5e1'};border:1px solid #e2e8f0;padding:4px;">${workingDays > 0 ? workingDays : '—'}</td>
        <td style="background:${rowBg};text-align:center;font-size:11px;font-weight:700;color:${lates > 0 ? '#dc2626' : '#cbd5e1'};border:1px solid #e2e8f0;padding:4px;">${lates > 0 ? lates : '—'}</td>
        <td style="background:${bonusEligible ? '#d1fae5' : '#fee2e2'};text-align:center;font-size:11px;font-weight:700;color:${bonusEligible ? '#065f46' : '#991b1b'};border:1px solid #e2e8f0;padding:4px;">${bonusEligible ? 'Yes' : 'No'}</td>`;

      bodyRows += `<tr>${cells}</tr>`;
    });

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Attendance ${MONTHS[selectedMonth]} ${selectedYear}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  .title-row td { font-size: 14px; font-weight: bold; color: #1e293b; padding: 8px; }
  .sub-row td { font-size: 11px; color: #64748b; padding: 4px 8px 8px; }
</style>
</head>
<body>
<table>
  <tr class="title-row"><td colspan="${daysInMonth + 7}">TCF Attendance Sheet — ${MONTHS[selectedMonth]} ${selectedYear}</td></tr>
  <tr class="sub-row"><td colspan="${daysInMonth + 7}">${filteredEmployees.length} employees &nbsp;|&nbsp; L = Leave Days &nbsp;|&nbsp; A = Present Days &nbsp;|&nbsp; D = Working Days &nbsp;|&nbsp; Lates = Total Late Minutes &nbsp;|&nbsp; Bonus = Bonus Eligible</td></tr>
  <tr>${headCells}</tr>
  ${bodyRows}
</table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TCF_Attendance_${MONTHS[selectedMonth]}_${selectedYear}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  // 7. Print — opens a dedicated print window with clean HTML table
  const handlePrint = () => {
    const esc = (v: string | number) =>
      String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Build header cells
    let headCells = `
      <th class="emp-col">Employee</th>
      <th class="eid-col">EID</th>`;
    daysArray.forEach(day => {
      const isWkEnd = isWeekend(day);
      const tmplSt = getTemplateDayStatus(day);
      const isOff = isWkEnd || tmplSt === 'Holiday' || tmplSt === 'DayOff';
      headCells += `<th class="${isOff ? 'day-off-hdr' : 'day-hdr'}">${getDayShort(day)}<br/>${day}</th>`;
    });
    headCells += `
      <th class="sum-hdr leave-hdr">L</th>
      <th class="sum-hdr attend-hdr">A</th>
      <th class="sum-hdr work-hdr">D</th>
      <th class="sum-hdr late-hdr">Lates</th>
      <th class="sum-hdr bonus-hdr">Bonus</th>`;

    // Build body rows
    let bodyRows = '';
    filteredEmployees.forEach((emp, rowIdx) => {
      const { present, leave, lates, workingDays } = getEmployeeMetrics(emp.id);
      const bonusEligible = lates === 0 && leave === 0;
      const rowCls = rowIdx % 2 === 0 ? 'row-even' : 'row-odd';

      let cells = `
        <td class="emp-cell">${esc(emp.name)}<br/><span class="eid-tag">${esc(emp.eid)}</span></td>
        <td class="eid-cell">${esc(emp.eid)}</td>`;

      daysArray.forEach(day => {
        const status = getEffectiveCellStatus(emp.id, day);
        const details = getCellDetails(emp.id, day);
        const leaveDay = leavesMap[emp.id]?.[day];
        const isWkEnd = isWeekend(day);
        const isOff = isWkEnd || status === 'Holiday' || status === 'DayOff';

        let cls = 'day-cell';
        let content = '';

        if (isOff && !details?.clockIn) {
          cls += ' cell-off';
          content = '<span class="dash">—</span>';
        } else if (leaveDay && !leaveDay.isPartial) {
          cls += ' cell-leave';
          content = `<span class="leave-code">${esc(leaveDay.code)}</span>`;
        } else if (details?.clockIn) {
          cls += status === 'Late' ? ' cell-late' : ' cell-present';
          content = `<span class="time-in">${esc(details.clockIn)}</span>`;
          if (details.clockOut) content += `<span class="time-out">${esc(details.clockOut)}</span>`;
          if (details.lateMinutes && details.lateMinutes > 0) content += `<span class="late-badge">${details.lateMinutes}m</span>`;
        } else if (status === 'Present') {
          cls += ' cell-present';
          content = '<span class="check">✓</span>';
        } else if (status === 'Absent') {
          cls += ' cell-absent';
          content = '<span class="absent-x">A</span>';
        } else if (status === 'Holiday') {
          cls += ' cell-holiday';
          content = '<span class="holiday-h">H</span>';
        } else if (status === 'OnLeave') {
          cls += ' cell-leave';
          content = '<span class="leave-code">L</span>';
        } else if (status === 'HalfDay') {
          cls += ' cell-halfday';
          content = '<span class="half">H/D</span>';
        } else {
          content = '<span class="dash">—</span>';
        }

        cells += `<td class="${cls}">${content}</td>`;
      });

      // Summary
      cells += `
        <td class="sum-cell leave-val">${leave > 0 ? leave : '—'}</td>
        <td class="sum-cell attend-val">${present > 0 ? present : '—'}</td>
        <td class="sum-cell work-val">${workingDays > 0 ? workingDays : '—'}</td>
        <td class="sum-cell late-val">${lates > 0 ? lates : '—'}</td>
        <td class="sum-cell ${bonusEligible ? 'bonus-yes' : 'bonus-no'}">${bonusEligible ? 'Yes' : 'No'}</td>`;

      bodyRows += `<tr class="${rowCls}">${cells}</tr>`;
    });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TCF Attendance — ${MONTHS[selectedMonth]} ${selectedYear}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #1e293b; background: #fff; }

  .title { font-size: 13pt; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
  .subtitle { font-size: 7.5pt; color: #64748b; margin-bottom: 8px; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }

  /* Column widths */
  .emp-col  { width: 110px; }
  .eid-col  { display: none; }
  .day-hdr, .day-off-hdr { width: auto; }
  .sum-hdr  { width: 26px; }

  /* Header */
  th { padding: 4px 2px; text-align: center; font-size: 7pt; font-weight: 700; border: 1px solid #c7d2db; white-space: nowrap; }
  .emp-col  { text-align: left; padding-left: 6px; background: #1e293b; color: #fff; font-size: 8pt; }
  .day-hdr  { background: #1e293b; color: #fff; line-height: 1.2; }
  .day-off-hdr { background: #b8cde0; color: #1e293b; line-height: 1.2; }
  .leave-hdr  { background: #4c1d95; color: #fff; }
  .attend-hdr { background: #991b1b; color: #fff; }
  .work-hdr   { background: #065f46; color: #fff; }
  .late-hdr   { background: #78350f; color: #fff; font-size: 6.5pt; }
  .bonus-hdr  { background: #92400e; color: #fff; }

  /* Rows */
  .row-even td { background: #fff; }
  .row-odd  td { background: #f8fafc; }
  tr { page-break-inside: avoid; }

  /* Employee cell */
  .emp-cell { padding: 3px 5px; font-size: 7.5pt; font-weight: 600; text-align: left; border: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .eid-tag  { font-size: 6pt; color: #94a3b8; font-family: monospace; display: block; }
  .eid-cell { display: none; }

  /* Day cells */
  .day-cell { padding: 2px 1px; text-align: center; vertical-align: middle; border: 1px solid #e8eef2; font-size: 7pt; height: 34px; }
  .cell-off      { background: #e8f0f8 !important; }
  .cell-present  { background: #d4edda !important; }
  .cell-late     { background: #fff3cd !important; }
  .cell-absent   { background: #f8d7da !important; }
  .cell-holiday  { background: #cce5ff !important; }
  .cell-leave    { background: #e8d5f5 !important; }
  .cell-halfday  { background: #ffe4e1 !important; }

  /* Text in day cells */
  .time-in   { display: block; font-size: 6.5pt; color: #374151; line-height: 1.3; }
  .time-out  { display: block; font-size: 6.5pt; color: #374151; line-height: 1.3; }
  .late-badge { display: block; font-size: 6pt; color: #dc2626; font-weight: 700; line-height: 1.2; }
  .check     { color: #16a34a; font-weight: 700; font-size: 9pt; }
  .absent-x  { color: #dc2626; font-weight: 700; font-size: 8pt; }
  .holiday-h { color: #1d4ed8; font-weight: 700; font-size: 8pt; }
  .leave-code { color: #7c3aed; font-weight: 700; font-size: 8pt; }
  .half      { color: #f43f5e; font-weight: 700; font-size: 7pt; }
  .dash      { color: #cbd5e1; font-size: 9pt; }

  /* Summary cells */
  .sum-cell  { text-align: center; border: 1px solid #e2e8f0; font-weight: 700; font-size: 8pt; padding: 2px; }
  .leave-val  { color: #7c3aed; border-left: 2px solid #c4b5fd !important; }
  .attend-val { color: #dc2626; }
  .work-val   { color: #059669; }
  .late-val   { color: #dc2626; }
  .bonus-yes  { color: #065f46; background: #d1fae5 !important; }
  .bonus-no   { color: #991b1b; background: #fee2e2 !important; }

  /* Footer legend */
  .legend { margin-top: 6px; font-size: 6.5pt; color: #64748b; }
</style>
</head>
<body>
<div class="title">TCF Attendance Sheet — ${MONTHS[selectedMonth]} ${selectedYear}</div>
<div class="subtitle">${filteredEmployees.length} employees &nbsp;·&nbsp; L = Leave Days &nbsp;·&nbsp; A = Present Days &nbsp;·&nbsp; D = Working Days &nbsp;·&nbsp; Lates = Total Late Minutes (min) &nbsp;·&nbsp; Bonus = Bonus Eligible</div>
<table>
  <thead><tr>${headCells}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
<div class="legend">Printed: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1200,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };


  // 8. Calculations for individual Employee rows (incl. total hours)
  const getEmployeeMetrics = (empId: string) => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let lates = 0;
    let workingDays = 0;

    const tmpl = getTemplate(selectedYear, selectedMonth);

    daysArray.forEach(day => {
      const isWkEnd = isWeekend(day);
      const isHoliday = isWkEnd || tmpl?.holidays?.find(h => h.date === day);
      if (!isHoliday) {
        workingDays += 1;
      }

      const stat = getEffectiveCellStatus(empId, day);
      const det  = getCellDetails(empId, day);
      const leaveDay = leavesMap[empId]?.[day];

      if (leaveDay) {
         // daysContribution is per-day (0 for partial, 0.5 for half-day, 1 for full-day)
         leave += leaveDay.daysContribution;
      } else if (stat === 'OnLeave') {
         leave += 1;
      }

      if (stat === 'Present' || stat === 'Late' || stat === 'HalfDay') {
        present += (stat === 'HalfDay' ? 0.5 : 1);
        if (det?.lateMinutes && det.lateMinutes > 0) {
           lates += det.lateMinutes;
        }
      }
      
      if (stat === 'Absent') absent += 1;
    });

    return { present, absent, leave, lates, workingDays };
  };

  return (
    <div id="attendance-print-root" className={`flex flex-col ${dashboardMode ? '' : 'h-full'} print:bg-white print:p-0`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 6mm 5mm; }
          /* Hide everything on screen except attendance root */
          body > #root > * { display: none !important; }
          body > #root > * > *:not(#attendance-print-root),
          nav, aside, header { display: none !important; }
          #attendance-print-root { display: flex !important; flex-direction: column !important; }
          #attendance-print-area {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            flex: none !important;
          }
          #attendance-print-area table {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 7.5pt !important;
            border-collapse: collapse !important;
          }
          #attendance-print-area thead {
            display: table-header-group !important;
          }
          #attendance-print-area thead th {
            position: static !important;
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-scroll-container {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            flex: none !important;
          }
          #attendance-print-area tbody td {
            position: static !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 2px 1px !important;
          }
          #attendance-print-area tbody tr {
            page-break-inside: avoid;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ══ Premium Toolbar ══ */}
      {!dashboardMode && (
      <div className="flex flex-col print:hidden shrink-0" style={{ gap: '10px', marginBottom: '12px' }}>

        {/* Row 1: Title left, Print right */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#1e293b' }}>Attendance Sheet</h1>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {MONTHS[selectedMonth]} {selectedYear} &mdash; {filteredEmployees.length} employees
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-slate-100 active:scale-95"
            style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>

        {/* Row 2: All controls in ONE row, left-aligned, no justify-between */}
        <div className="flex items-center flex-wrap" style={{ gap: '8px' }}>

          {/* Action buttons */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" /> Export Excel
          </button>

          {/* Without Timesheet Toggle Button */}
          {currentUser?.role !== 'Staff' && (
            <button
              onClick={() => setShowWithTimesheetOnly(prev => !prev)}
              title={showWithTimesheetOnly ? 'Showing only employees with Timesheet — click to show all' : 'Click to show only employees WITH Timesheet'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: showWithTimesheetOnly ? '#fef3c7' : '#f1f5f9',
                color: showWithTimesheetOnly ? '#92400e' : '#334155',
                border: showWithTimesheetOnly ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                position: 'relative'
              }}
            >
              <FileX className="h-3.5 w-3.5" />
              {showWithTimesheetOnly ? 'With Timesheet' : 'Without Timesheet'}
              {showWithTimesheetOnly && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f59e0b',
                    color: '#fff',
                    borderRadius: '9999px',
                    fontSize: '9px',
                    fontWeight: 700,
                    width: '14px',
                    height: '14px',
                    lineHeight: '1',
                    marginLeft: '2px'
                  }}
                >
                  {employeesWithTimesheetIds.size}
                </span>
              )}
            </button>
          )}

          {/* Thin divider between actions and filters */}
          <span style={{ width: '1px', height: '22px', background: '#e2e8f0', margin: '0 4px', flexShrink: 0 }} />

          {/* Search */}
          {currentUser?.role !== 'Staff' && (
            <div className="relative flex items-center" style={{ height: '28px' }}>
              <Search className="absolute left-2.5 h-3.5 w-3.5" style={{ color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search name or EID"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{
                  width: '150px',
                  height: '28px',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  paddingLeft: '30px',
                  paddingRight: '12px',
                  borderRadius: '8px',
                  lineHeight: 'normal'
                }}
              />
            </div>
          )}

          {/* ── Multi-select Employee Filter ── */}
          {currentUser?.role !== 'Staff' && (
            <Popover open={empDropdownOpen} onOpenChange={open => { setEmpDropdownOpen(open); if (!open) setEmpDropdownSearch(''); }}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 text-xs rounded-lg transition-all hover:bg-slate-100 active:scale-95 relative"
                  style={{
                    height: '28px',
                    minWidth: '140px',
                    maxWidth: '200px',
                    background: employeeFilter.length > 0 ? '#eff6ff' : '#f8fafc',
                    border: employeeFilter.length > 0 ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                    color: employeeFilter.length > 0 ? '#1d4ed8' : '#334155',
                    paddingLeft: '10px',
                    paddingRight: '28px',
                    fontWeight: employeeFilter.length > 0 ? 600 : 400,
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span className="truncate flex-1 text-left" style={{ fontSize: '11px' }}>
                    {employeeFilter.length === 0
                      ? 'All Employees'
                      : employeeFilter.length === 1
                      ? (activeEmployees.find(e => e.id === employeeFilter[0])?.name ?? 'Employee')
                      : `${employeeFilter.length} Selected`}
                  </span>
                  {employeeFilter.length > 0 && (
                    <span
                      style={{
                        position: 'absolute', right: '20px',
                        background: '#1d4ed8', color: '#fff',
                        borderRadius: '9999px', fontSize: '9px',
                        fontWeight: 700, padding: '1px 5px', lineHeight: '14px'
                      }}
                    >
                      {employeeFilter.length}
                    </span>
                  )}
                  <ChevronDown
                    className="h-3 w-3 shrink-0"
                    style={{ position: 'absolute', right: '7px', color: '#94a3b8' }}
                  />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={4}
                className="p-0 shadow-xl border border-slate-200 rounded-xl bg-white"
                style={{ width: '240px', zIndex: 9999 }}
              >
                {/* Search box */}
                <div className="px-2 pt-2 pb-1 border-b border-slate-100">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5" style={{ color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search employees..."
                      value={empDropdownSearch}
                      onChange={e => setEmpDropdownSearch(e.target.value)}
                      className="w-full text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      style={{
                        height: '28px', boxSizing: 'border-box',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        color: '#334155', paddingLeft: '28px', paddingRight: '8px',
                        borderRadius: '8px', lineHeight: 'normal'
                      }}
                    />
                    {empDropdownSearch && (
                      <button onClick={() => setEmpDropdownSearch('')} className="absolute right-2" style={{ color: '#94a3b8' }}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Select All / Clear row */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100" style={{ background: '#f8fafc' }}>
                  <button
                    onClick={() => setEmployeeFilter(activeEmployees.map(e => e.id))}
                    className="text-[10px] font-semibold hover:underline"
                    style={{ color: '#1d4ed8' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>|</span>
                  <button
                    onClick={() => setEmployeeFilter([])}
                    className="text-[10px] font-semibold hover:underline"
                    style={{ color: employeeFilter.length > 0 ? '#dc2626' : '#94a3b8' }}
                  >
                    Clear
                  </button>
                </div>

                {/* All Employees option */}
                <div
                  onClick={() => setEmployeeFilter([])}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <div
                    className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      border: employeeFilter.length === 0 ? '2px solid #1d4ed8' : '2px solid #cbd5e1',
                      background: employeeFilter.length === 0 ? '#1d4ed8' : 'transparent'
                    }}
                  >
                    {employeeFilter.length === 0 && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#1e293b' }}>All Employees</span>
                  <span className="ml-auto text-[10px]" style={{ color: '#94a3b8' }}>{activeEmployees.length}</span>
                </div>

                {/* Employee list */}
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {dropdownEmployees.length === 0 ? (
                    <div className="py-6 text-center text-xs" style={{ color: '#94a3b8' }}>No employees found</div>
                  ) : (
                    dropdownEmployees.map(emp => {
                      const isChecked = employeeFilter.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmployeeFilter(emp.id)}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div
                            className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                            style={{
                              border: isChecked ? '2px solid #1d4ed8' : '2px solid #cbd5e1',
                              background: isChecked ? '#1d4ed8' : 'transparent',
                              transition: 'all 0.15s'
                            }}
                          >
                            {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium truncate" style={{ color: '#1e293b' }}>{emp.name}</span>
                            <span className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{emp.eid}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between" style={{ background: '#f8fafc' }}>
                  <span className="text-[10px]" style={{ color: '#64748b' }}>
                    {employeeFilter.length === 0 ? 'Showing all' : `${employeeFilter.length} selected`}
                  </span>
                  <button
                    onClick={() => setEmpDropdownOpen(false)}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all"
                    style={{ background: '#1d4ed8', color: '#fff' }}
                  >
                    Done
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Month */}
          <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="h-7 text-xs rounded-lg bg-slate-50 border-slate-200" style={{ width: '100px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="h-7 text-xs rounded-lg bg-slate-50 border-slate-200" style={{ width: '85px' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3: Status Legend — well-spaced pills */}
        <div className="flex flex-wrap items-center" style={{ gap: '16px', paddingTop: '4px' }}>
          {Object.entries(STATUS_CONFIG).filter(([key]) => key === 'Present').map(([key, config]) => (
            <div key={key} className="flex items-center gap-1" style={{ flexShrink: 0 }}>
              <StatusSymbol status={key as AttendanceStatus} className={`h-3.5 w-3.5 shrink-0 ${config.color.split(' ')[0]}`} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', whiteSpace: 'nowrap' }}>{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}></span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', whiteSpace: 'nowrap' }}>Weekend</span>
          </div>
        </div>
      </div>
      )}

      {/* ══ Main Attendance Grid ══ */}
      <div id="attendance-print-area" className={`${dashboardMode ? '' : 'flex-1 min-h-0'} rounded-xl overflow-hidden flex flex-col print:border-none print:shadow-none print:overflow-visible print:flex-none print:block`} style={{ border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        {/* Scroll Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible print:flex-none print-scroll-container">
          <table
            className="border-collapse text-left select-none"
            style={{ width: '100%', tableLayout: 'fixed' }}
          >
            {/* colgroup controls all column widths */}
            <colgroup>
              {/* Employee sticky column */}
              <col style={{ width: '170px' }} />
              {/* Day columns — fill remaining space equally */}
              {daysArray.map(day => (
                <col key={day} style={{ width: `calc((100% - 170px - 142px) / ${daysInMonth})` }} />
              ))}
              {/* Summary cols: L, A, D, Hrs, Bonus */}
              <col style={{ width: '30px' }} />
              <col style={{ width: '30px' }} />
              <col style={{ width: '30px' }} />
              <col style={{ width: '52px' }} />
              <col style={{ width: '45px' }} />
            </colgroup>

            {/* ─ Header Row ─ */}
            <thead className="sticky top-0 z-30">
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>

                {/* Employee column header */}
                <th
                  className="sticky left-0 z-40"
                  style={{
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRight: '1px solid #e2e8f0',
                    fontSize: '10px', fontWeight: 700,
                    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
                    overflow: 'hidden'
                  }}
                >
                  Employee ↑
                </th>

                {/* Day column headers */}
                {daysArray.map(day => {
                  const dayName = getDayName(day);
                  const isWkEnd = isWeekend(day);
                  const isToday = new Date().getDate() === day && new Date().getMonth() === selectedMonth && new Date().getFullYear() === selectedYear;
                  const tmplStatus = getTemplateDayStatus(day);
                  const tmplEntry = getTemplate(selectedYear, selectedMonth)?.holidays.find(h => h.date === day);

                  const isAnyOffDay = isWkEnd || tmplStatus === 'Holiday' || tmplStatus === 'DayOff';

                  // Header background: today > offday > normal
                  let hdrBg = isToday ? '#dbeafe' : isAnyOffDay ? '#eff6ff' : '#f8fafc';
                  if (isToday) hdrBg = '#dbeafe';                     // today always wins

                  const numCol = isToday ? '#1d4ed8' : isAnyOffDay ? '#60a5fa' : '#374151';
                  const abbCol = isToday ? '#1d4ed8' : isAnyOffDay ? '#93c5fd' : '#94a3b8';

                  return (
                    <th
                      key={day}
                      title={tmplEntry ? tmplEntry.reason : undefined}
                      style={{
                        padding: '7px 2px',
                        borderRight: '1px solid #e2e8f0',
                        textAlign: 'center',
                        background: hdrBg,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 600, color: abbCol, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {dayName.substring(0, 2)}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: numCol, lineHeight: 1 }}>
                          {day}
                        </span>
                      </div>
                      {isToday && (
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '18px', height: '2px', background: '#2563eb', borderRadius: '2px 2px 0 0' }} />
                      )}
                    </th>
                  );
                })}


                {/* Summary columns with tooltips */}
                {([
                  { key: 'L', label: 'L', title: 'Leave Days — Total approved leave days taken' },
                  { key: 'A', label: 'A', title: 'Present Days — Total days attended (including late)' },
                  { key: 'D', label: 'D', title: 'Working Days — Total scheduled working days this month' },
                  { key: 'Lates', label: 'Lates', title: 'Total Late Minutes — Sum of all late arrivals in minutes' },
                  { key: 'Bonus', label: 'Bonus', title: 'Bonus Eligibility — Yes if zero lates and zero leaves' },
                ] as { key: string; label: string; title: string }[]).map(col => (
                  <th key={col.key} title={col.title} style={{
                    padding: '10px 4px',
                    textAlign: 'center',
                    borderLeft: col.key === 'L' ? '2px solid #e2e8f0' : '1px solid #e2e8f0',
                    fontSize: '10px', fontWeight: 700,
                    color: col.key === 'A' ? '#ef4444' : col.key === 'L' ? '#8b5cf6' : col.key === 'D' ? '#10b981' : col.key === 'Bonus' ? '#f59e0b' : '#64748b',
                    background: '#f8fafc', textTransform: 'uppercase',
                    overflow: 'hidden',
                    cursor: 'help'
                  }}>{col.label}</th>
                ))}
              </tr>
            </thead>

            {/* ─ Body ─ */}
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 6} style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users style={{ width: 32, height: 32, opacity: 0.3 }} />
                      <span>No active employees matching filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, rowIdx) => {
                  const { present, absent, leave, workingDays, lates } = getEmployeeMetrics(emp.id);
                  const rowBg = rowIdx % 2 === 0 ? '#ffffff' : '#fafafa';
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>

                      {/* Sticky Employee Column */}
                      <td
                        className="sticky left-0 z-20"
                        style={{
                          padding: '0 10px',
                          height: '52px',
                          background: rowBg,
                          borderRight: '1px solid #e2e8f0',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                              {emp.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {emp.name}
                            </span>
                            <span style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              ID: {emp.eid}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysArray.map(day => {
                        const status = getEffectiveCellStatus(emp.id, day);
                        const details = getCellDetails(emp.id, day);
                        const isWkEnd = isWeekend(day);
                        const isToday = new Date().getDate() === day && new Date().getMonth() === selectedMonth && new Date().getFullYear() === selectedYear;

                        const tmpl = getTemplate(selectedYear, selectedMonth);
                        const tmplEntry = tmpl?.holidays.find(h => h.date === day);
                        const tmplReason = tmplEntry?.reason;

                        const cellTitle = details
                          ? `In: ${details.clockIn} | Out: ${details.clockOut}${details.lateMinutes && details.lateMinutes > 0 ? ` | Late: ${details.lateMinutes} min` : ' | On Time'}`
                          : tmplReason ?? (status || undefined);

                        const isOffDay = isWkEnd || !!getTemplateDayStatus(day);
                        let cellBg = isToday ? '#eff6ff' : isOffDay ? '#f0f9ff' : rowBg;
                        if (status === 'Late') cellBg = '#fef2f2';

                        const leaveDay = leavesMap[emp.id]?.[day];
                        let backgroundStyle = cellBg;
                        if (leaveDay) {
                          if (leaveDay.isPartial) {
                            const pct = Math.round(leaveDay.days * 100);
                            backgroundStyle = `linear-gradient(to bottom, #d9bdbf ${pct}%, ${cellBg} ${pct}%)`;
                          } else {
                            backgroundStyle = '#d9bdbf';
                          }
                        }

                        return (
                          <td
                            key={day}
                            title={cellTitle}
                            style={{
                              height: '52px',
                              padding: 0,
                              textAlign: 'center',
                              borderRight: '1px solid #f1f5f9',
                              background: backgroundStyle,
                              position: 'relative',
                              cursor: details && !isOffDay ? 'pointer' : 'default',
                              overflow: 'hidden'
                            }}
                          >
                            {details && !isOffDay ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    title={cellTitle}
                                    style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                                    className="focus:outline-none hover:brightness-95 transition-all"
                                  >
                                    <AttendanceCellContent status={status} details={details} isWeekend={isWkEnd} leaveInfo={leaveDay} />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-1.5 bg-white shadow-xl border border-slate-200 rounded-lg flex flex-col gap-1 z-50">
                                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider mb-1">
                                    Day {day} — Status
                                  </div>
                                  {details && (
                                    <div className="mx-1 mb-1 p-2 rounded text-[10px] space-y-0.5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                                      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Time Details</div>
                                      <div>In: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{details.clockIn}</span></div>
                                      <div>Out: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{details.clockOut}</span></div>
                                      {details.lateMinutes && details.lateMinutes > 0 && (
                                        <div style={{ color: '#dc2626', fontWeight: 700 }}>Late: {details.lateMinutes} min</div>
                                      )}
                                      {leaveDay ? (
                                        <div style={{ color: '#b91c1c', fontWeight: 700 }}>
                                          {leaveDay.type} {leaveDay.isPartial ? `(${leaveDay.days * 8} Hrs)` : ''}
                                        </div>
                                      ) : (!details.lateMinutes || details.lateMinutes <= 0) && (
                                        <div style={{ color: '#16a34a', fontWeight: 600 }}>On Time ✓</div>
                                      )}
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <AttendanceCellContent status={status} details={details} isWeekend={isWkEnd} leaveInfo={leaveDay} />
                            )}
                          </td>
                        );
                      })}

                      {/* L = leaves */}
                      <td
                        title={`Leave Days: ${leave > 0 ? leave + ' day(s) of approved leave' : 'No leaves taken'}`}
                        style={{
                          textAlign: 'center',
                          borderLeft: '2px solid #e2e8f0',
                          borderRight: '1px solid #f1f5f9',
                          background: rowBg,
                          fontSize: '11px', fontWeight: 700,
                          color: leave > 0 ? '#8b5cf6' : '#cbd5e1',
                          cursor: 'help'
                        }}>{leave > 0 ? leave : '—'}</td>
                      {/* A = attend */}
                      <td
                        title={`Present Days: ${present > 0 ? present + ' day(s) attended (incl. late days)' : 'No attendance recorded'}`}
                        style={{
                          textAlign: 'center',
                          borderRight: '1px solid #f1f5f9',
                          background: rowBg,
                          fontSize: '11px', fontWeight: 700,
                          color: present > 0 ? '#ef4444' : '#cbd5e1',
                          cursor: 'help'
                        }}>{present > 0 ? present : '—'}</td>
                      {/* D = working days */}
                      <td
                        title={`Working Days: ${workingDays} scheduled working days this month`}
                        style={{
                          textAlign: 'center',
                          borderRight: '1px solid #f1f5f9',
                          background: rowBg,
                          fontSize: '11px', fontWeight: 700,
                          color: workingDays > 0 ? '#10b981' : '#cbd5e1',
                          cursor: 'help'
                        }}>{workingDays > 0 ? workingDays : '—'}</td>
                      {/* Lates total */}
                      <td
                        title={`Total Late Minutes: ${lates > 0 ? lates + ' minutes late in total this month' : 'No late arrivals'}`}
                        style={{
                          textAlign: 'center',
                          borderRight: '1px solid #f1f5f9',
                          background: rowBg,
                          fontSize: '11px', fontWeight: 700,
                          color: lates > 0 ? '#ef4444' : '#cbd5e1',
                          overflow: 'hidden',
                          cursor: 'help'
                        }}>{lates > 0 ? lates : '—'}</td>
                      {/* Bonus Eligibility */}
                      <td
                        title={`Bonus Eligibility: ${(lates === 0 && leave === 0) ? 'Eligible — No lates and no leaves this month' : `Not eligible — ${lates > 0 ? lates + ' min late' : ''}${lates > 0 && leave > 0 ? ', ' : ''}${leave > 0 ? leave + ' leave day(s)' : ''}`}`}
                        style={{
                          textAlign: 'center',
                          borderRight: '1px solid #f1f5f9',
                          background: rowBg,
                          fontSize: '11px', fontWeight: 700,
                          color: (lates === 0 && leave === 0) ? '#10b981' : '#ef4444',
                          overflow: 'hidden',
                          cursor: 'help'
                        }}>{(lates === 0 && leave === 0) ? 'Yes' : 'No'}</td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }} className="text-xs print:hidden">
          <span style={{ color: '#94a3b8' }}>
            <strong style={{ color: '#475569' }}>{filteredEmployees.length}</strong> employees · {MONTHS[selectedMonth]} {selectedYear}
          </span>
          <span style={{ color: '#cbd5e1', fontSize: '10px' }}>L = Leave · A = Attend · D = Working Days · Lates = Total Lates · Bonus = Eligible</span>
        </div>

      </div>

      {/* ── Mark Attendance Modal ── */}
      {isMarkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#1a237e]" />
                <h3 className="text-base font-bold text-slate-800">Mark Employee Attendance</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMarkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {/* Employee and Date side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Select Employee */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Employee</label>
                  <select
                    value={modalEmployeeId}
                    onChange={e => setModalEmployeeId(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
                  >
                    <option value="">Choose an employee...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.eid})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Time Inputs grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Clock In */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Clock In Time</label>
                  <input
                    type="time"
                    value={modalClockIn}
                    onChange={e => setModalClockIn(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                  />
                </div>

                {/* Clock Out */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Clock Out Time (Optional)</label>
                  <input
                    type="time"
                    value={modalClockOut}
                    onChange={e => setModalClockOut(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                  />
                </div>
              </div>

              {/* Live calculations preview badge */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Late Status Preview (8:30 AM limit):</span>
                {modalLateMinutes > 0 ? (
                  <span className="font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 animate-pulse">
                    💛 Late by {modalLateMinutes} mins
                  </span>
                ) : (
                  <span className="font-semibold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                    ✔️ On Time
                  </span>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMarkModalOpen(false)}
                  className="h-9 px-4 text-xs font-semibold border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 px-6 text-xs font-semibold bg-[#1a237e] hover:bg-[#1a237e]/90 text-white"
                  style={{ minWidth: '130px', whiteSpace: 'nowrap' }}
                >
                  Submit &amp; Mark
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
