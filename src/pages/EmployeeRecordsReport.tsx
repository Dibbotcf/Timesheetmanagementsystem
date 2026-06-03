import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore, Employee, LeaveType } from '../App';
import { calcLateMinutes } from '../components/PrintableTimesheet';
import { parseISO, format, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, differenceInYears } from 'date-fns';
import { Users, Calendar, ChartBar, Leaf, Clock, CalendarCheck, Check, Percent, Moon, AlertCircle, Table, Coffee, Heart, MoreHorizontal, List } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Standard Tailwind mapping for custom badges
const BADGES = {
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-yellow-100 text-yellow-800',
  coral: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800'
};

const DOTS = {
  amber: 'bg-yellow-500',
  coral: 'bg-red-500',
  green: 'bg-green-500'
};

const safeFormatDate = (dateStr: string | undefined, fmt: string) => {
  if (!dateStr) return 'N/A';
  const parsed = parseISO(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return format(parsed, fmt);
};

export const EmployeeRecordsReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { employees, otRecords, leaves, timesheets, getTemplate } = useAppStore();
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'leaves'>('monthly');
  const [selectedEmpIndex, setSelectedEmpIndex] = useState<number>(0);

  const activeEmployees = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter(e => !e.status || e.status.toLowerCase() === 'active')
      .sort((a, b) => (a.eid || '').localeCompare(b.eid || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees]);

  // Ensure selected index is valid
  useEffect(() => {
    if (activeEmployees.length > 0 && selectedEmpIndex >= activeEmployees.length) {
      setSelectedEmpIndex(0);
    }
  }, [activeEmployees, selectedEmpIndex]);

  const selectedEmp = activeEmployees[selectedEmpIndex];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Helper to calculate leave balance dynamically matching LeaveManagement logic
  const getLeaveBalance = (emp: Employee, type: LeaveType) => {
    const limits: Record<LeaveType, number> = { Casual: 10, Sick: 14, Annual: 16, Maternity: 120, Other: 9999 };
    
    // Limit
    let max = 0;
    if (emp.customLeaveLimits?.[type] !== undefined) {
        max = emp.customLeaveLimits[type]!;
    } else {
        if (type === 'Annual') {
            const yos = differenceInYears(new Date(), parseISO(emp.joiningDate));
            max = (yos >= 1) ? yos * 16 : 0;
        } else {
            max = limits[type];
        }
    }

    // Used
    let usedFromRecords = 0;
    let full = 0;
    let half = 0;
    
    leaves.filter(l => {
        if (l.employeeId !== emp.id || l.status !== 'Approved') return false;
        if (l.type !== type) return false;
        if (l.partialHours && l.partialHours > 0) return false; // skip hourly
        return true; // Match LeaveManagement: Do NOT filter by year to get total actual balance!
    }).forEach(l => {
        usedFromRecords += l.days;
        if (l.days === 0.5) half++;
        else full += Math.floor(l.days);
    });

    const usedFromCustom = emp.customLeaveUsed?.[type] || 0;
    const taken = usedFromRecords + usedFromCustom;

    return { total: max, taken, remaining: max - taken, full, half };
  };

  // Monthly computed data
  const monthlyData = useMemo(() => {
    if (!selectedEmp) return null;
    
    const ts = timesheets.find(t => t.employeeId === selectedEmp.id && t.year === selectedYear && t.month === selectedMonth);
    const tmpl = getTemplate(selectedYear, selectedMonth);
    
    let workingDays = 0;
    let presentDays = 0;
    
    // Calculate working days
    const mStart = new Date(selectedYear, selectedMonth, 1);
    const daysInMonth = eachDayOfInterval({ start: mStart, end: endOfMonth(mStart) });
    daysInMonth.forEach(d => {
        const isWknd = tmpl ? false : isWeekend(d);
        const isHol = tmpl?.holidays?.some(h => h.date === d.getDate());
        if (!isWknd && !isHol) workingDays++;
    });

    // Calculate present days and lates
    const lates: any[] = [];
    if (ts && ts.entries) {
        ts.entries.forEach(ent => {
            if (ent.inTime && ent.outTime && ent.inTime.trim() !== '' && ent.outTime.trim() !== '') {
                presentDays++;
            }
            if (ent.late && parseInt(ent.late, 10) > 0) {
                const dateObj = new Date(selectedYear, selectedMonth, ent.date || 1);
                lates.push({
                    date: `${ent.date || 1} ${MONTHS[selectedMonth]}`,
                    day: isNaN(dateObj.getTime()) ? '' : format(dateObj, 'EEE'),
                    min: parseInt(ent.late, 10)
                });
            }
        });
    }

    // OT Records
    const ots = otRecords.filter(r => {
        if (r.employeeId !== selectedEmp.id || r.status !== 'Approved') return false;
        const d = parseISO(r.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    }).map(r => ({
        date: safeFormatDate(r.date, 'MMM d'),
        day: safeFormatDate(r.date, 'EEE'),
        hours: r.hours,
        note: r.reason
    }));

    // Leave Records
    const lvs: any[] = [];
    leaves.filter(l => {
        if (l.employeeId !== selectedEmp.id || l.status !== 'Approved') return false;
        const s = parseISO(l.startDate);
        const e = parseISO(l.endDate);
        const sm = new Date(selectedYear, selectedMonth, 1);
        const em = endOfMonth(sm);
        return s <= em && e >= sm;
    }).forEach(l => {
        const s = parseISO(l.startDate);
        const e = parseISO(l.endDate);
        const mStartDay = new Date(selectedYear, selectedMonth, 1);
        const mEndDay = endOfMonth(mStartDay);
        const actualStart = s < mStartDay ? mStartDay : s;
        const actualEnd = e > mEndDay ? mEndDay : e;
        const span = eachDayOfInterval({ start: actualStart, end: actualEnd });
        
        span.forEach(d => {
            const isWknd = tmpl ? false : isWeekend(d);
            const isHol = tmpl?.holidays?.some(h => h.date === d.getDate());
            if (!isWknd && !isHol) {
                lvs.push({
                    date: !isNaN(d.getTime()) ? format(d, 'MMM d') : 'N/A',
                    day: !isNaN(d.getTime()) ? format(d, 'EEE') : 'N/A',
                    type: l.type,
                    dur: (l.partialHours && l.partialHours > 0) ? `${l.partialHours} hours` : (l.days === 0.5 && span.length === 1) ? 'Half day' : 'Full day',
                    days: (l.partialHours && l.partialHours > 0) ? 0 : (l.days === 0.5 && span.length === 1) ? 0.5 : 1,
                    status: (l.partialHours && l.partialHours > 0) ? `${l.status} (Hourly)` : l.status
                });
            }
        });
    });

    const attPct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
    const totalOtMins = ots.reduce((acc, r) => acc + (r.hours * 60), 0);
    const totalLateMin = lates.reduce((acc, r) => acc + r.min, 0);
    const totalLvDays = lvs.reduce((acc, r) => acc + r.days, 0);
    const fullL = lvs.filter(l => l.days === 1).length;
    const halfL = lvs.filter(l => l.days === 0.5).length;

    return {
        tsIn: ts?.defaultClockIn || '08:30', // Fallback to assumed default if not set
        tsOut: ts?.defaultClockOut || '17:30',
        wd: workingDays,
        present: presentDays,
        ots, lates, lvs,
        attPct, totalOtMins, totalLateMin, totalLvDays, fullL, halfL
    };
  }, [selectedEmp, selectedYear, selectedMonth, timesheets, getTemplate, otRecords, leaves]);

  // Yearly computations
  const yearlyData = useMemo(() => {
      if (!selectedEmp) return null;
      return MONTHS.map((_, mIdx) => {
        const ts = timesheets.find(t => t.employeeId === selectedEmp.id && t.year === selectedYear && t.month === mIdx);
        const tmpl = getTemplate(selectedYear, mIdx);
        
        let workingDays = 0;
        let presentDays = 0;
        let lateMin = 0;
        
        const mStart = new Date(selectedYear, mIdx, 1);
        const daysInMonth = eachDayOfInterval({ start: mStart, end: endOfMonth(mStart) });
        daysInMonth.forEach(d => {
            const isWknd = tmpl ? false : isWeekend(d);
            const isHol = tmpl?.holidays?.some(h => h.date === d.getDate());
            if (!isWknd && !isHol) workingDays++;
        });

        if (ts && ts.entries) {
            ts.entries.forEach(ent => {
                if (ent.inTime && ent.outTime) presentDays++;
                if (ent.late && parseInt(ent.late, 10) > 0) lateMin += parseInt(ent.late, 10);
            });
        }

        const mOts = otRecords.filter(r => {
            if (r.employeeId !== selectedEmp.id || r.status !== 'Approved') return false;
            const d = parseISO(r.date);
            return d.getFullYear() === selectedYear && d.getMonth() === mIdx;
        }).reduce((acc, r) => acc + r.hours, 0);

        let mLvs = 0;
        leaves.filter(l => {
            if (l.employeeId !== selectedEmp.id || l.status !== 'Approved') return false;
            if (l.partialHours && l.partialHours > 0) return false;
            const s = parseISO(l.startDate);
            const e = parseISO(l.endDate);
            const sm = new Date(selectedYear, mIdx, 1);
            const em = endOfMonth(sm);
            return s <= em && e >= sm;
        }).forEach(l => {
            const s = parseISO(l.startDate);
            const e = parseISO(l.endDate);
            const mStartDay = new Date(selectedYear, mIdx, 1);
            const mEndDay = endOfMonth(mStartDay);
            const span = eachDayOfInterval({ start: s < mStartDay ? mStartDay : s, end: e > mEndDay ? mEndDay : e });
            span.forEach(d => {
                const isWknd = tmpl ? false : isWeekend(d);
                const isHol = tmpl?.holidays?.some(h => h.date === d.getDate());
                if (!isWknd && !isHol) {
                    mLvs += (l.days === 0.5 && span.length === 1) ? 0.5 : 1;
                }
            });
        });

        const attPct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
        
        return { present: presentDays, leaves: mLvs, late: lateMin, ot: mOts, att: attPct, hasData: !!ts };
      });
  }, [selectedEmp, selectedYear, timesheets, getTemplate, otRecords, leaves]);

  const allLeavesTakenThisYear = useMemo(() => {
      if (!selectedEmp) return [];
      const res: any[] = [];
      leaves.filter(l => l.employeeId === selectedEmp.id && l.status === 'Approved').forEach(l => {
          const sDate = parseISO(l.startDate);
          if (sDate.getFullYear() === selectedYear) {
              res.push({
                  date: !isNaN(sDate.getTime()) ? format(sDate, 'MMM d, yyyy') : l.startDate || 'N/A',
                  type: l.type,
                  dur: (l.partialHours && l.partialHours > 0) ? `${l.partialHours} hours` : (l.days === 0.5 ? 'Half day' : 'Full day'),
                  days: (l.partialHours && l.partialHours > 0) ? 0 : l.days,
                  status: (l.partialHours && l.partialHours > 0) ? `${l.status} (Hourly)` : l.status
              });
          }
      });
      return res.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [leaves, selectedEmp, selectedYear]);


  if (!selectedEmp) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 flex flex-col items-center justify-center min-h-[700px] text-gray-500 relative">
        <div className="absolute top-2 right-4 z-50 print:hidden">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500 hover:text-gray-900 border border-gray-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
          </Button>
        </div>
        No active employees found.
      </div>
    );
  }

  const lbAnnual = getLeaveBalance(selectedEmp, 'Annual');
  const lbCasual = getLeaveBalance(selectedEmp, 'Casual');
  const lbSick = getLeaveBalance(selectedEmp, 'Sick');
  const lbOther = getLeaveBalance(selectedEmp, 'Other');

  // Convert "HH:MM" to "HH:MM AM/PM" roughly
  const formatTimeStr = (ts: string) => {
      if (!ts) return '';
      const [h, m] = ts.split(':');
      if (!h || !m) return ts;
      let hh = parseInt(h, 10);
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12;
      if (hh === 0) hh = 12;
      return `${hh.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const getBadgeForLeave = (t: string) => {
      switch(t) {
          case 'Annual': return BADGES.purple;
          case 'Casual': return BADGES.blue;
          case 'Sick': return BADGES.coral;
          case 'Other': return BADGES.amber;
          default: return BADGES.blue;
      }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print:border-none shadow-sm flex flex-col h-full max-h-[85vh] relative min-h-[700px] max-w-6xl mx-auto">
      
      <div className="flex flex-row h-full">
        {/* Sidebar */}
        <div className="w-60 shrink-0 bg-gray-50 border-r border-gray-200 py-4 flex flex-col h-full overflow-y-auto">
          <div className="px-4 pb-3 border-b border-gray-200 mb-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="w-full justify-start text-gray-500 hover:text-gray-900 border border-gray-200 bg-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
            </Button>
            <div className="text-sm font-medium text-gray-900 flex items-center gap-2"><Users className="w-4 h-4"/> Employees</div>
            <div className="text-xs text-gray-500 mt-1">{activeEmployees.length} active members</div>
          </div>
          {activeEmployees.map((emp, i) => {
              const isActive = i === selectedEmpIndex;
              const inits = (emp.name || 'U').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
              return (
                  <div 
                    key={emp.id} 
                    onClick={() => setSelectedEmpIndex(i)}
                    className={`flex items-center gap-3 py-3 px-4 cursor-pointer transition-colors ${isActive ? 'bg-white border-r-2 border-purple-700' : 'hover:bg-gray-100'}`}
                  >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 ${isActive ? BADGES.purple : 'bg-gray-200 text-gray-600'}`}>
                          {inits}
                      </div>
                      <div className="overflow-hidden">
                          <div className="text-[13px] font-medium text-gray-900 truncate">{emp.name || 'Unnamed Employee'}</div>
                          <div className="text-[11px] text-gray-500 truncate">{emp.role}</div>
                      </div>
                  </div>
              );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto bg-white">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium ${BADGES.purple}`}>
                        {(selectedEmp.name || 'U E').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-base font-medium text-gray-900 flex items-center gap-2">
                            {selectedEmp.name || 'Unnamed Employee'}
                            <span className={`${BADGES.purple} px-2 py-1 rounded-full text-xs`}>Active</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {selectedEmp.designation} &nbsp;&middot;&nbsp; {selectedEmp.eid} &nbsp;&middot;&nbsp; Joined {safeFormatDate(selectedEmp.joiningDate, 'MMM yyyy')}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <select 
                        className="text-sm px-3 py-2 rounded-md border border-gray-300 bg-white outline-none focus:border-blue-500"
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                    >
                        {Array.from({length: 27}, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select 
                        className="text-sm px-3 py-2 rounded-md border border-gray-300 bg-white outline-none focus:border-blue-500"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                        disabled={activeTab !== 'monthly'}
                    >
                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 self-start">
                <button 
                  onClick={() => setActiveTab('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'monthly' ? 'bg-white text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                >
                    <Calendar className="w-4 h-4"/> Monthly
                </button>
                <button 
                  onClick={() => setActiveTab('yearly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'yearly' ? 'bg-white text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                >
                    <ChartBar className="w-4 h-4"/> Yearly overview
                </button>
                <button 
                  onClick={() => setActiveTab('leaves')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'leaves' ? 'bg-white text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                >
                    <Leaf className="w-4 h-4"/> Leave balance
                </button>
            </div>

            {/* Panels */}
            {activeTab === 'monthly' && monthlyData && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                    
                    {/* Timesheet info bar */}
                    <div className="flex gap-6 p-4 bg-gray-50 rounded-lg text-sm border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500"><Clock className="w-4 h-4 text-blue-600"/> Office in: <strong className="text-gray-900 ml-1">{formatTimeStr(monthlyData.tsIn)}</strong></div>
                        <div className="flex items-center gap-2 text-gray-500"><Clock className="w-4 h-4 text-gray-500"/> Office out: <strong className="text-gray-900 ml-1">{formatTimeStr(monthlyData.tsOut)}</strong></div>
                        <div className="flex items-center gap-2 text-gray-500"><CalendarCheck className="w-4 h-4 text-green-600"/> Working days: <strong className="text-gray-900 ml-1">{monthlyData.wd}</strong></div>
                        <div className="flex items-center gap-2 text-gray-500"><Check className="w-4 h-4 text-green-600"/> Present: <strong className="text-gray-900 ml-1">{monthlyData.present}</strong></div>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${DOTS.amber}`}></div> OT this month</div>
                            <div className="text-2xl font-medium text-gray-900 leading-none">{Math.round(monthlyData.totalOtMins/60 * 10)/10}h</div>
                            <div className="text-xs text-gray-500 mt-2">{monthlyData.ots.length} OT dates</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${DOTS.coral}`}></div> Late arrivals</div>
                            <div className="text-2xl font-medium text-gray-900 leading-none">{monthlyData.totalLateMin} min</div>
                            <div className="text-xs text-gray-500 mt-2">{monthlyData.lates.length} late dates</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${DOTS.green}`}></div> Leaves taken</div>
                            <div className="text-2xl font-medium text-gray-900 leading-none">{monthlyData.totalLvDays}d</div>
                            <div className="text-xs text-gray-500 mt-2">{monthlyData.fullL} full + {monthlyData.halfL} half</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="text-sm text-gray-500 mb-2 flex items-center gap-2"><Percent className="w-4 h-4"/> Attendance</div>
                            <div className="text-2xl font-medium text-gray-900 leading-none">{monthlyData.attPct}%</div>
                            <div className="text-xs text-gray-500 mt-2">of working days</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* OT Table */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                            <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <span className={`${BADGES.amber} px-3 py-1 rounded-full inline-flex items-center whitespace-nowrap`}><Moon className="w-3 h-3 mr-2"/> OT records</span>
                            </div>
                            <table className="w-full text-xs text-left border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th className="w-20 font-medium text-gray-500 border-b border-gray-200 pb-2 pl-3">Date</th>
                                        <th className="w-16 font-medium text-gray-500 border-b border-gray-200 pb-2">Day</th>
                                        <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Hours</th>
                                        <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.ots.length ? monthlyData.ots.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="py-2 border-b border-gray-100 text-gray-900 pl-3">{r.date}</td>
                                            <td className="py-2 border-b border-gray-100 text-gray-500">{r.day}</td>
                                            <td className="py-2 border-b border-gray-100"><span className={`${BADGES.amber} px-2 py-1 rounded`}>{r.hours}h</span></td>
                                            <td className="py-2 border-b border-gray-100 text-gray-500 text-xs truncate" title={r.note}>{r.note}</td>
                                        </tr>
                                    )) : <tr><td colSpan={4} className="py-4 text-center text-gray-400">No OT records</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        {/* Late Table */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                            <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <span className={`${BADGES.coral} px-3 py-1 rounded-full inline-flex items-center whitespace-nowrap`}><AlertCircle className="w-3 h-3 mr-2"/> Late records</span>
                            </div>
                            <table className="w-full text-xs text-left border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th className="w-20 font-medium text-gray-500 border-b border-gray-200 pb-2 pl-3">Date</th>
                                        <th className="w-16 font-medium text-gray-500 border-b border-gray-200 pb-2">Day</th>
                                        <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Minutes late</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.lates.length ? monthlyData.lates.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="py-2 border-b border-gray-100 text-gray-900 pl-3">{r.date}</td>
                                            <td className="py-2 border-b border-gray-100 text-gray-500">{r.day}</td>
                                            <td className="py-2 border-b border-gray-100"><span className={`${BADGES.coral} px-2 py-1 rounded`}>{r.min} min</span></td>
                                        </tr>
                                    )) : <tr><td colSpan={3} className="py-4 text-center text-gray-400">No late records</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Leave Table */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                        <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <span className={`${BADGES.green} px-3 py-1 rounded-full inline-flex items-center whitespace-nowrap`}><Leaf className="w-3 h-3 mr-2"/> Leave records this month</span>
                        </div>
                        <table className="w-full text-xs text-left border-collapse table-fixed">
                            <thead>
                                <tr>
                                    <th className="w-24 font-medium text-gray-500 border-b border-gray-200 pb-2 pl-3">Date</th>
                                    <th className="w-16 font-medium text-gray-500 border-b border-gray-200 pb-2">Day</th>
                                    <th className="w-24 font-medium text-gray-500 border-b border-gray-200 pb-2">Type</th>
                                    <th className="w-20 font-medium text-gray-500 border-b border-gray-200 pb-2">Duration</th>
                                    <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.lvs.length ? monthlyData.lvs.map((r, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="py-2 border-b border-gray-100 text-gray-900 pl-3">{r.date}</td>
                                        <td className="py-2 border-b border-gray-100 text-gray-500">{r.day}</td>
                                        <td className="py-2 border-b border-gray-100"><span className={`${getBadgeForLeave(r.type)} px-2 py-1 rounded`}>{r.type}</span></td>
                                        <td className="py-2 border-b border-gray-100 text-gray-500">{r.dur}</td>
                                        <td className={`py-2 border-b border-gray-100 font-medium ${r.status?.includes('Hourly') ? 'text-gray-500' : 'text-green-600'}`}>{r.status}</td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="py-4 text-center text-gray-400">No leave records this month</td></tr>}
                            </tbody>
                        </table>
                    </div>

                </div>
            )}

            {activeTab === 'yearly' && yearlyData && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm animate-in fade-in">
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mb-3">
                        <Table className="w-4 h-4"/> Yearly overview &mdash; {selectedYear}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-center border-collapse min-w-[650px] table-fixed">
                            <thead>
                                <tr>
                                    <th className="w-28 text-left pl-2 py-2 font-medium text-gray-500 border-b border-gray-200">Metric</th>
                                    {MONTHS.map(m => <th key={m} className="py-2 font-medium text-gray-500 border-b border-gray-200">{m}</th>)}
                                    <th className="py-2 font-medium text-gray-700 bg-gray-50 border-b border-gray-200">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Present Days */}
                                <tr className="hover:bg-gray-50 group">
                                    <td className="text-left pl-2 py-2 font-medium text-gray-500 border-b border-gray-200">Present days</td>
                                    {yearlyData.map((d, i) => <td key={i} className={`py-2 border-b border-gray-200 ${!d.hasData ? 'text-gray-300' : 'text-gray-900'}`}>{d.hasData ? d.present : '—'}</td>)}
                                    <td className="py-2 font-medium text-gray-900 bg-gray-50 group-hover:bg-gray-100 border-b border-gray-200">{yearlyData.reduce((s, d) => s + d.present, 0)}</td>
                                </tr>
                                {/* Leaves Taken */}
                                <tr className="hover:bg-gray-50 group">
                                    <td className="text-left pl-2 py-2 font-medium text-gray-500 border-b border-gray-200">Leaves taken</td>
                                    {yearlyData.map((d, i) => <td key={i} className={`py-2 border-b border-gray-200 ${!d.hasData ? 'text-gray-300' : ''}`}>{d.hasData ? (d.leaves > 0 ? <span className={`${BADGES.green} px-2 py-1 rounded`}>{d.leaves}d</span> : '—') : '—'}</td>)}
                                    <td className="py-2 font-medium text-gray-900 bg-gray-50 group-hover:bg-gray-100 border-b border-gray-200">{yearlyData.reduce((s, d) => s + d.leaves, 0)}d</td>
                                </tr>
                                {/* Late min */}
                                <tr className="hover:bg-gray-50 group">
                                    <td className="text-left pl-2 py-2 font-medium text-gray-500 border-b border-gray-200">Total late (min)</td>
                                    {yearlyData.map((d, i) => <td key={i} className={`py-2 border-b border-gray-200 ${!d.hasData ? 'text-gray-300' : ''}`}>{d.hasData ? (d.late > 0 ? <span className={`${BADGES.coral} px-2 py-1 rounded`}>{d.late}</span> : '—') : '—'}</td>)}
                                    <td className="py-2 font-medium text-gray-900 bg-gray-50 group-hover:bg-gray-100 border-b border-gray-200">{yearlyData.reduce((s, d) => s + d.late, 0)}</td>
                                </tr>
                                {/* OT Hours */}
                                <tr className="hover:bg-gray-50 group">
                                    <td className="text-left pl-2 py-2 font-medium text-gray-500 border-b border-gray-200">OT hours</td>
                                    {yearlyData.map((d, i) => <td key={i} className={`py-2 border-b border-gray-200 ${!d.hasData ? 'text-gray-300' : ''}`}>{d.hasData ? (d.ot > 0 ? <span className={`${BADGES.amber} px-2 py-1 rounded`}>{d.ot}h</span> : '—') : '—'}</td>)}
                                    <td className="py-2 font-medium text-gray-900 bg-gray-50 group-hover:bg-gray-100 border-b border-gray-200">{yearlyData.reduce((s, d) => s + d.ot, 0)}h</td>
                                </tr>
                                {/* Attendance % */}
                                <tr className="hover:bg-gray-50 group">
                                    <td className="text-left pl-2 py-2 font-medium text-gray-500">Attendance %</td>
                                    {yearlyData.map((d, i) => <td key={i} className={`py-2 ${!d.hasData ? 'text-gray-300' : 'text-gray-900'}`}>{d.hasData ? d.att + '%' : '—'}</td>)}
                                    <td className="py-2 font-medium text-gray-900 bg-gray-50 group-hover:bg-gray-100">
                                        {Math.round(yearlyData.filter(d => d.hasData).reduce((s, d) => s + d.att, 0) / (yearlyData.filter(d => d.hasData).length || 1))}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'leaves' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                    
                    {/* Leave Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        
                        {/* Annual */}
                        <div className="rounded-lg p-4 border border-[#AFA9EC]">
                            <div className="text-xs font-medium mb-3 text-[#3C3489] flex items-center gap-1"><Calendar className="w-3 h-3"/> Annual leave</div>
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <div className="text-3xl font-medium text-gray-900 leading-none">{lbAnnual.taken}</div>
                                    <div className="text-xs text-gray-500 mt-1">days taken</div>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <div className="text-xs text-gray-500">Limit: <strong className="text-gray-900">{lbAnnual.total}</strong></div>
                                    <div className="text-xs text-gray-500">Remaining: <strong className="text-gray-900">{lbAnnual.remaining}</strong></div>
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200 mb-2 overflow-hidden"><div className="h-full rounded-full bg-[#7F77DD]" style={{width: `${Math.min(100, (lbAnnual.taken/lbAnnual.total)*100)}%`}}></div></div>
                            <div className="text-right text-xs text-gray-500">{lbAnnual.full} full &middot; {lbAnnual.half} half</div>
                        </div>

                        {/* Casual */}
                        <div className="rounded-lg p-4 border border-[#9FE1CB]">
                            <div className="text-xs font-medium mb-3 text-[#085041] flex items-center gap-1"><Coffee className="w-3 h-3"/> Casual leave</div>
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <div className="text-3xl font-medium text-gray-900 leading-none">{lbCasual.taken}</div>
                                    <div className="text-xs text-gray-500 mt-1">days taken</div>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <div className="text-xs text-gray-500">Limit: <strong className="text-gray-900">{lbCasual.total}</strong></div>
                                    <div className="text-xs text-gray-500">Remaining: <strong className="text-gray-900">{lbCasual.remaining}</strong></div>
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200 mb-2 overflow-hidden"><div className="h-full rounded-full bg-[#1D9E75]" style={{width: `${Math.min(100, (lbCasual.taken/lbCasual.total)*100)}%`}}></div></div>
                            <div className="text-right text-xs text-gray-500">{lbCasual.full} full &middot; {lbCasual.half} half</div>
                        </div>

                        {/* Sick */}
                        <div className="rounded-lg p-4 border border-[#F0997B]">
                            <div className="text-xs font-medium mb-3 text-[#712B13] flex items-center gap-1"><Heart className="w-3 h-3"/> Sick leave</div>
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <div className="text-3xl font-medium text-gray-900 leading-none">{lbSick.taken}</div>
                                    <div className="text-xs text-gray-500 mt-1">days taken</div>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <div className="text-xs text-gray-500">Limit: <strong className="text-gray-900">{lbSick.total}</strong></div>
                                    <div className="text-xs text-gray-500">Remaining: <strong className="text-gray-900">{lbSick.remaining}</strong></div>
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200 mb-2 overflow-hidden"><div className="h-full rounded-full bg-[#D85A30]" style={{width: `${Math.min(100, (lbSick.taken/lbSick.total)*100)}%`}}></div></div>
                            <div className="text-right text-xs text-gray-500">{lbSick.full} full &middot; {lbSick.half} half</div>
                        </div>

                        {/* Other */}
                        <div className="rounded-lg p-4 border border-[#FAC775]">
                            <div className="text-xs font-medium mb-3 text-[#633806] flex items-center gap-1"><MoreHorizontal className="w-3 h-3"/> Other leave</div>
                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <div className="text-3xl font-medium text-gray-900 leading-none">{lbOther.taken}</div>
                                    <div className="text-xs text-gray-500 mt-1">days taken</div>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <div className="text-xs text-gray-500">Limit: <strong className="text-gray-900">{lbOther.total}</strong></div>
                                    <div className="text-xs text-gray-500">Remaining: <strong className="text-gray-900">{lbOther.remaining}</strong></div>
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200 mb-2 overflow-hidden"><div className="h-full rounded-full bg-[#BA7517]" style={{width: `${Math.min(100, (lbOther.taken/lbOther.total)*100)}%`}}></div></div>
                            <div className="text-right text-xs text-gray-500">{lbOther.full} full &middot; {lbOther.half} half</div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm mt-4">
                        <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <List className="w-4 h-4"/> All leaves taken &mdash; {selectedYear}
                        </div>
                        <table className="w-full text-xs text-left border-collapse table-fixed">
                            <thead>
                                <tr>
                                    <th className="font-medium text-gray-500 border-b border-gray-200 pb-2 pl-3">Date</th>
                                    <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Type</th>
                                    <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Duration</th>
                                    <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Days counted</th>
                                    <th className="font-medium text-gray-500 border-b border-gray-200 pb-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allLeavesTakenThisYear.length ? allLeavesTakenThisYear.map((r, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="py-2 border-b border-gray-100 text-gray-900 pl-3">{r.date}</td>
                                        <td className="py-2 border-b border-gray-100"><span className={`${getBadgeForLeave(r.type)} px-2 py-1 rounded`}>{r.type}</span></td>
                                        <td className="py-2 border-b border-gray-100 text-gray-500">{r.dur}</td>
                                        <td className="py-2 border-b border-gray-100 font-medium text-gray-900">{r.days}</td>
                                        <td className={`py-2 border-b border-gray-100 font-medium ${r.status?.includes('Hourly') ? 'text-gray-500' : 'text-green-600'}`}>{r.status}</td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="py-6 text-center text-gray-400">No leave records found for {selectedYear}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
