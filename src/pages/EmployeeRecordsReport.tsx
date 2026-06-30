import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore, Employee, LeaveType } from '../App';
import { calcLateMinutes } from '../components/PrintableTimesheet';
import { parseISO, format, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, differenceInYears } from 'date-fns';
import { Users, Calendar, ChartBar, Leaf, Clock, CalendarCheck, Check, Percent, Moon, AlertCircle, Table, Coffee, Heart, MoreHorizontal, List } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';


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
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'leaves' | 'timesheet'>('monthly');
  const [selectedEmpIndex, setSelectedEmpIndex] = useState<number>(0);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!selectedEmp || !twelveMonthsData) return;
    setIsDownloading(true);
    try {
      // Create off-screen container for pure HTML generation
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:1400px; background:#fff; padding:20px; box-sizing:border-box; font-family:sans-serif;';

      // Title & Employee Info
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'text-align:center; margin-bottom:20px; font-family:Georgia,serif;';
      headerDiv.innerHTML = `
        <div style="font-size:24px; font-weight:bold; color:#000; margin-bottom:8px;">Tokyo Consulting Firm Limited</div>
        <div style="font-size:16px; font-weight:bold; color:#333; margin-bottom:12px;">12 Months Timesheet Report &mdash; ${selectedYear}</div>
        <div style="display:inline-block; border:1px solid #000; padding:8px 40px; background:#f9fafb; font-size:13px; font-weight:bold; font-family:sans-serif; color:#000;">
          Employee Name: <span style="font-weight:normal; margin-right:30px;">${selectedEmp.name}</span>
          Employee ID: <span style="font-weight:normal;">${selectedEmp.eid}</span>
        </div>
      `;
      container.appendChild(headerDiv);

      // Table construction
      const table = document.createElement('table');
      table.style.cssText = 'width:100%; border-collapse:collapse; font-size:11px; text-align:center;';
      
      // Thead
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      trHead.style.cssText = 'background:#f8fafc; color:#475569; font-weight:bold; font-size:10px; border:1px solid #cbd5e1;';
      
      const thMonth = document.createElement('th');
      thMonth.style.cssText = 'padding:8px 4px; border:1px solid #e2e8f0; width:60px; text-align:left;';
      thMonth.textContent = 'MONTH';
      trHead.appendChild(thMonth);

      for (let i = 1; i <= 31; i++) {
        const thDay = document.createElement('th');
        thDay.style.cssText = 'padding:8px 2px; border:1px solid #e2e8f0; width:28px;';
        thDay.textContent = String(i);
        trHead.appendChild(thDay);
      }

      ['L', 'A', 'D', 'Lates', 'Bonus'].forEach(lbl => {
        const thSum = document.createElement('th');
        thSum.style.cssText = 'padding:8px 2px; border:1px solid #e2e8f0; width:35px;';
        thSum.textContent = lbl;
        trHead.appendChild(thSum);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      // Tbody
      const tbody = document.createElement('tbody');
      twelveMonthsData.forEach((md, i) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid #e2e8f0;';
        
        const tdMonth = document.createElement('td');
        tdMonth.style.cssText = 'padding:6px 4px; border:1px solid #e2e8f0; text-align:left; font-weight:bold; color:#0f172a;';
        tdMonth.textContent = md.monthName;
        tr.appendChild(tdMonth);

        for (let day = 1; day <= 31; day++) {
          const td = document.createElement('td');
          td.style.cssText = 'padding:4px 2px; border:1px solid #e2e8f0; vertical-align:middle;';
          
          if (day > md.totalDays) {
            td.style.backgroundColor = '#f8fafc';
            td.innerHTML = '&nbsp;';
          } else {
            const status = md.dayStatuses[day];
            if (!status) {
              td.innerHTML = '<span style="color:#cbd5e1;">&mdash;</span>';
            } else if (status.isWeekend || status.isHoliday) {
              td.style.backgroundColor = '#f0f9ff';
              td.innerHTML = status.isHoliday ? '<span style="color:#3b82f6; font-weight:bold; font-size:10px;">H</span>' : '&mdash;';
              td.style.color = '#94a3b8';
            } else if (status.isLeave && !(status.inTime || status.outTime)) {
              td.style.backgroundColor = '#fdf2f8';
              td.innerHTML = `<span style="color:#db2777; font-weight:bold; font-size:10px;">${status.leaveCode || 'L'}</span>`;
            } else if (status.inTime || status.outTime) {
              td.style.backgroundColor = (status.late && status.late > 0) ? '#fff1f2' : '#f0fdf4';
              let content = '';
              if (status.inTime) {
                content += `<div style="color:#0f766e; font-size:8px;">${status.inTime}</div>`;
              }
              if (status.outTime) {
                content += `<div style="color:#475569; font-size:8px;">${status.outTime}</div>`;
              }
              if (status.late && status.late > 0) {
                content += `<div style="color:#e11d48; font-size:7px; font-weight:bold;">${status.late}m</div>`;
              }
              td.innerHTML = content;
            } else {
              td.innerHTML = '<span style="color:#cbd5e1;">&mdash;</span>';
            }
          }
          tr.appendChild(td);
        }

        if (md.hasData) {
          const makeTd = (val: any, color: string, isBg = false) => {
            const td = document.createElement('td');
            td.style.cssText = `padding:6px 2px; border:1px solid #e2e8f0; font-weight:bold; font-size:10px; color:${color}; ${isBg ? ('background-color:' + (val==='Yes'?'#d1fae5':'#ffe4e6') + ';') : ''}`;
            td.textContent = val;
            return td;
          };
          tr.appendChild(makeTd(md.leaveDaysCount > 0 ? md.leaveDaysCount : '-', '#7e22ce'));
          tr.appendChild(makeTd(md.presentDays > 0 ? md.presentDays : '-', '#e11d48'));
          tr.appendChild(makeTd(md.workingDays, '#16a34a'));
          tr.appendChild(makeTd(md.totalLates > 0 ? `${md.totalLates}m` : '-', '#475569'));
          tr.appendChild(makeTd(md.bonusEligible ? 'Yes' : 'No', md.bonusEligible ? '#065f46' : '#9f1239', true));
        } else {
          for (let i=0; i<5; i++) {
            const td = document.createElement('td');
            td.style.cssText = 'padding:6px 2px; border:1px solid #e2e8f0; color:#cbd5e1;';
            td.textContent = '-';
            tr.appendChild(td);
          }
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);

      // Legend
      const legendDiv = document.createElement('div');
      legendDiv.style.cssText = 'text-align:center; margin-top:15px; font-size:11px; color:#64748b; font-weight:500; font-family:sans-serif;';
      legendDiv.textContent = 'L = Leave Days · A = Present Days · D = Working Days · C = Casual · S = Sick · AL = Annual · H = Holiday';
      container.appendChild(legendDiv);

      document.body.appendChild(container);
      await new Promise(resolve => setTimeout(resolve, 200)); // Paint
      
      const canvas = await html2canvas(container, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      document.body.removeChild(container);

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pageWidth = 297;
      const pageHeight = 210;
      const margins = 10;
      
      const finalW = pageWidth - (margins * 2);
      const ratio = canvas.height / canvas.width;
      const finalH = finalW * ratio;
      
      // Top align with slight margin
      const startY = 10;

      pdf.addImage(imgData, 'JPEG', margins, startY, finalW, finalH);
      pdf.save(`Timesheet_${selectedEmp.name}_${selectedYear}.pdf`);
      
    } catch (err: any) {
      console.error(err);
      alert('PDF failed: ' + (err?.message || String(err)));
    } finally {
      setIsDownloading(false);
    }
  };



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

  const twelveMonthsData = useMemo(() => {
    if (!selectedEmp) return [];
    
    return MONTHS.map((monthName, mIdx) => {
      const ts = timesheets.find(t => t.employeeId === selectedEmp.id && t.year === selectedYear && t.month === mIdx);
      const tmpl = getTemplate(selectedYear, mIdx);
      
      const mStart = new Date(selectedYear, mIdx, 1);
      const daysInMonthObj = eachDayOfInterval({ start: mStart, end: endOfMonth(mStart) });
      const totalDays = daysInMonthObj.length;
      
      const approvedLeaves = leaves.filter(l => {
        if (l.employeeId !== selectedEmp.id || l.status !== 'Approved') return false;
        if (l.partialHours && l.partialHours > 0) return false;
        const s = parseISO(l.startDate);
        const e = parseISO(l.endDate);
        const sm = new Date(selectedYear, mIdx, 1);
        const em = endOfMonth(sm);
        return s <= em && e >= sm;
      });
      
      const dayStatuses: Record<number, {
        inTime?: string;
        outTime?: string;
        late?: number;
        isWeekend?: boolean;
        isHoliday?: boolean;
        holidayReason?: string;
        leaveCode?: string;
        leaveType?: string;
        isLeave?: boolean;
        leaveDays?: number;
      }> = {};
      
      daysInMonthObj.forEach(d => {
        const dayNum = d.getDate();
        const isWknd = tmpl ? false : isWeekend(d);
        const holEntry = tmpl?.holidays?.find(h => h.date === dayNum);
        const isHol = !!holEntry;
        
        dayStatuses[dayNum] = {
          isWeekend: isWknd || (holEntry && holEntry.reason.toLowerCase().includes('weekly holiday')),
          isHoliday: isHol && !holEntry.reason.toLowerCase().includes('weekly holiday'),
          holidayReason: holEntry?.reason
        };
      });
      
      approvedLeaves.forEach(l => {
        const s = parseISO(l.startDate);
        const e = parseISO(l.endDate);
        const mStartDay = new Date(selectedYear, mIdx, 1);
        const mEndDay = endOfMonth(mStartDay);
        const actualStart = s < mStartDay ? mStartDay : s;
        const actualEnd = e > mEndDay ? mEndDay : e;
        const span = eachDayOfInterval({ start: actualStart, end: actualEnd });
        
        const leaveCode = l.type === 'Casual' ? 'C' : l.type === 'Sick' ? 'S' : l.type === 'Annual' ? 'AL' : 'L';
        
        span.forEach(d => {
          const dayNum = d.getDate();
          if (dayStatuses[dayNum]) {
            dayStatuses[dayNum].isLeave = true;
            dayStatuses[dayNum].leaveCode = leaveCode;
            dayStatuses[dayNum].leaveType = l.type;
            dayStatuses[dayNum].leaveDays = l.days;
          }
        });
      });
      
      let presentDays = 0;
      let totalLates = 0;
      let workingDays = 0;
      let leaveDaysCount = 0;
      
      if (ts && ts.entries) {
        ts.entries.forEach(ent => {
          const dayNum = ent.date;
          if (dayStatuses[dayNum]) {
            dayStatuses[dayNum].inTime = ent.inTime;
            dayStatuses[dayNum].outTime = ent.outTime;
            if (ent.late) {
              dayStatuses[dayNum].late = parseInt(ent.late, 10);
            }
          }
        });
      }
      
      daysInMonthObj.forEach(d => {
        const dayNum = d.getDate();
        const status = dayStatuses[dayNum];
        
        const isOff = status.isWeekend || status.isHoliday;
        if (!isOff) {
          workingDays++;
        }
        
        if (status.isLeave) {
          leaveDaysCount += (status.leaveDays === 0.5 ? 0.5 : 1);
        }
        
        if (status.inTime && status.outTime && status.inTime.trim() !== '' && status.outTime.trim() !== '') {
          presentDays++;
          if (status.late && status.late > 0) {
            totalLates += status.late;
          }
        }
      });
      
      const bonusEligible = totalLates === 0 && leaveDaysCount === 0 && presentDays > 0;
      
      return {
        monthName,
        monthIdx: mIdx,
        dayStatuses,
        totalDays,
        presentDays,
        leaveDaysCount,
        workingDays,
        totalLates,
        bonusEligible,
        hasData: !!ts
      };
    });
  }, [selectedEmp, selectedYear, timesheets, getTemplate, leaves]);



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
                <button 
                  onClick={() => setActiveTab('timesheet')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'timesheet' ? 'bg-white text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                >
                    <Table className="w-4 h-4"/> Timesheet
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
                                            <td className="py-2 border-b border-gray-100 text-gray-500 text-xs truncate max-w-[150px]" title={r.note}>{r.note}</td>
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

            {activeTab === 'timesheet' && twelveMonthsData && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col animate-in fade-in">
                
                <style>{`
                  @media print {
                    /* Hide standard layout panels, headers, selectors and other non-print elements */
                    aside,
                    nav,
                    header,
                    footer,
                    [data-sonner-toaster],
                    .print\:hidden,
                    button,
                    select {
                      display: none !important;
                    }
                    
                    /* Hide internal dashboard panels in report view */
                    .w-60.shrink-0, /* Employee sidebar */
                    .flex.gap-2.bg-gray-50, /* Tabs */
                    .flex.items-center.justify-between { /* Dropdown row */
                      display: none !important;
                    }
                    
                    /* Reset all outer parent containers to not force height, overflow or layout constraints */
                    html, body, #root, #root > div, main,
                    .max-w-7xl,
                    .bg-white.rounded-lg.border,
                    .flex.flex-row.h-full,
                    .flex-1.p-6.md\:p-8 {
                      position: static !important;
                      display: block !important;
                      width: 100% !important;
                      height: auto !important;
                      min-height: 0 !important;
                      max-height: none !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: transparent !important;
                      overflow: visible !important;
                    }
                    
                    /* Set page-wide visibility fallback to hide remaining screen content */
                    body * {
                      visibility: hidden;
                    }
                    
                    /* Force the print area container and all its descendent elements to be visible */
                    #timesheet-print-area-root,
                    #timesheet-print-area-root * {
                      visibility: visible !important;
                    }
                    
                    /* Clean rendering layout container for print */
                    #timesheet-print-area-root {
                      display: block !important;
                      width: 100% !important;
                      background: white !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      overflow: visible !important;
                    }
                    
                    /* Preserve centered flexbox and gap for employee details in print */
                    #timesheet-print-area-root .flex {
                      display: flex !important;
                      justify-content: center !important;
                      gap: 3rem !important;
                    }
                    
                    @page {
                      size: A4 landscape;
                      margin: 6mm 6mm;
                    }
                    
                    /* Force background colors to print */
                    * {
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    
                    tr {
                      page-break-inside: avoid;
                    }
                    
                    .overflow-x-auto {
                      overflow: visible !important;
                    }
                    
                    table {
                      width: 100% !important;
                      table-layout: fixed !important;
                      font-size: 7.5pt !important;
                      border-collapse: collapse !important;
                    }
                    
                    th, td {
                      padding: 4px 2.5px !important;
                      height: auto !important;
                    }
                    
                    /* print fix for sticky headers/columns */
                    td.sticky, th.sticky {
                      background-color: inherit !important;
                      position: static !important;
                    }
                  }
                `}</style>

                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center print:hidden">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-purple-700"/> 12 Months Timesheet Grid &mdash; {selectedYear}
                    </div>
                    <button 
                      onClick={handleDownloadPdf}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm text-gray-600 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Download PDF"
                    >
                      {isDownloading ? <Loader2 className="w-3.5 h-3.5 text-purple-700 animate-spin" /> : <Download className="w-3.5 h-3.5 text-purple-700" />}
                      <span>{isDownloading ? 'Generating PDF...' : 'Download PDF'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">L = Leave Days · A = Present Days · D = Working Days · Lates = Total Lates · Bonus = Eligible</span>
                </div>

                <div id="timesheet-print-area-root" className="w-full">
                  {/* Print-only Header (Visible in prints only) */}
                  <div className="hidden print:block mb-6" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    <div className="text-center space-y-1 mb-4">
                      <h2 className="text-2xl font-bold text-black" style={{ fontFamily: 'Georgia, serif' }}>
                        Tokyo Consulting Firm Limited
                      </h2>
                      <h3 className="text-lg font-bold text-black">
                        12 Months Timesheet Report &mdash; {selectedYear}
                      </h3>
                    </div>
                    
                    <div className="border border-black p-3 bg-gray-50/50 rounded-lg flex justify-center gap-12 text-xs font-bold text-black mb-4 mx-auto w-fit px-12">
                      <div>Employee Name: <span className="font-medium">{selectedEmp.name}</span></div>
                      <div>Employee ID: <span className="font-medium">{selectedEmp.eid}</span></div>
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left select-none text-[11px]" style={{ minWidth: '1200px', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '90px' }} />
                      {Array.from({ length: 31 }).map((_, i) => (
                        <col key={i} style={{ width: 'calc((100% - 90px - 180px) / 31)' }} />
                      ))}
                      <col style={{ width: '32px' }} />
                      <col style={{ width: '32px' }} />
                      <col style={{ width: '32px' }} />
                      <col style={{ width: '48px' }} />
                      <col style={{ width: '40px' }} />
                    </colgroup>
                    
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th className="sticky left-0 z-20 pl-4 py-2.5 font-bold text-gray-500 uppercase tracking-wider bg-[#f8fafc] border-r border-gray-200">
                          Month
                        </th>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <th key={day} className="py-2 text-center font-bold text-gray-700 border-r border-gray-100">
                            {day}
                          </th>
                        ))}
                        {([
                          { key: 'L', label: 'L', title: 'Leave Days' },
                          { key: 'A', label: 'A', title: 'Present Days' },
                          { key: 'D', label: 'D', title: 'Working Days' },
                          { key: 'Lates', label: 'Lates', title: 'Late Minutes' },
                          { key: 'Bonus', label: 'Bonus', title: 'Bonus Eligibility (Zero Leaves & Lates)' },
                        ]).map(col => (
                          <th 
                            key={col.key} 
                            title={col.title}
                            className={`py-2 text-center font-bold border-l border-gray-200 cursor-help ${
                              col.key === 'L' ? 'text-purple-600 border-l-2' :
                              col.key === 'A' ? 'text-red-500' :
                              col.key === 'D' ? 'text-green-600' :
                              col.key === 'Bonus' ? 'text-amber-500' : 'text-gray-500'
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    
                    <tbody>
                      {twelveMonthsData.map((monthData, idx) => {
                        const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                        
                        return (
                          <tr key={monthData.monthIdx} className="hover:bg-purple-50/20" style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td className="sticky left-0 z-10 pl-4 py-3 font-semibold text-gray-900 bg-white border-r border-gray-200" style={{ background: rowBg }}>
                              {monthData.monthName}
                            </td>
                            
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                              const dayStatus = monthData.dayStatuses[day];
                              
                              if (day > monthData.totalDays) {
                                return (
                                  <td key={day} className="border-r border-gray-100 bg-gray-100/50" style={{ height: '48px' }} />
                                );
                              }
                              
                              let cellBg = rowBg;
                              let cellText = '—';
                              let textColor = '#94a3b8';
                              let cellTitle = `Day ${day} ${monthData.monthName}`;
                              
                              if (dayStatus) {
                                if (dayStatus.isWeekend || dayStatus.isHoliday) {
                                  cellBg = '#f0f9ff';
                                  textColor = '#60a5fa';
                                  cellText = dayStatus.isHoliday ? 'H' : '—';
                                  cellTitle = dayStatus.isHoliday ? `Holiday: ${dayStatus.holidayReason || 'Public Holiday'}` : 'Weekend / Day Off';
                                }
                                
                                if (dayStatus.isLeave) {
                                  cellBg = '#fdf2f8';
                                  textColor = '#db2777';
                                  cellText = dayStatus.leaveCode || 'L';
                                  cellTitle = `Leave: ${dayStatus.leaveType} (${dayStatus.leaveDays} day(s))`;
                                }
                                
                                if (dayStatus.inTime || dayStatus.outTime) {
                                  cellText = '';
                                  cellTitle = `In: ${dayStatus.inTime || '—'} | Out: ${dayStatus.outTime || '—'}`;
                                  if (dayStatus.late && dayStatus.late > 0) {
                                    cellBg = '#fff5f5';
                                    cellTitle += ` | Late: ${dayStatus.late} min`;
                                  } else {
                                    cellBg = '#f0fdf4';
                                  }
                                }
                              }
                              
                              return (
                                <td 
                                  key={day}
                                  title={cellTitle}
                                  className="border-r border-gray-100 text-center font-mono text-[9px]"
                                  style={{ background: cellBg, height: '48px', padding: '2px 1px' }}
                                >
                                  {dayStatus && (dayStatus.inTime || dayStatus.outTime) ? (
                                    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full font-semibold">
                                      {dayStatus.inTime && <span className="text-[#0f766e] scale-[0.95] leading-none">{dayStatus.inTime}</span>}
                                      {dayStatus.outTime && <span className="text-[#374151] scale-[0.95] leading-none">{dayStatus.outTime}</span>}
                                      {dayStatus.late && dayStatus.late > 0 ? (
                                        <span className="text-red-500 font-bold text-[8px] leading-none">{dayStatus.late}m</span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span className="font-bold text-[10px]" style={{ color: textColor }}>{cellText}</span>
                                  )}
                                </td>
                              );
                            })}
                            
                            {/* Summary Columns */}
                            {monthData.hasData ? (
                              <>
                                <td className="py-2 text-center font-semibold text-purple-700 bg-gray-50/30 border-l-2 border-gray-200">
                                  {monthData.leaveDaysCount > 0 ? monthData.leaveDaysCount : '—'}
                                </td>
                                <td className="py-2 text-center font-semibold text-red-600 bg-gray-50/30 border-l border-gray-200">
                                  {monthData.presentDays > 0 ? monthData.presentDays : '—'}
                                </td>
                                <td className="py-2 text-center font-semibold text-green-600 bg-gray-50/30 border-l border-gray-200">
                                  {monthData.workingDays > 0 ? monthData.workingDays : '—'}
                                </td>
                                <td className="py-2 text-center font-semibold text-gray-700 bg-gray-50/30 border-l border-gray-200 font-mono">
                                  {monthData.totalLates > 0 ? `${monthData.totalLates}m` : '—'}
                                </td>
                                <td className={`py-2 text-center font-bold border-l border-gray-200 ${
                                  monthData.bonusEligible ? 'text-emerald-700 bg-emerald-50/60' : 'text-rose-700 bg-rose-50/60'
                                }`}>
                                  {monthData.bonusEligible ? 'Yes' : 'No'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 text-center text-gray-300 bg-gray-50/30 border-l-2 border-gray-200 font-light">—</td>
                                <td className="py-2 text-center text-gray-300 bg-gray-50/30 border-l border-gray-200 font-light">—</td>
                                <td className="py-2 text-center text-gray-300 bg-gray-50/30 border-l border-gray-200 font-light">—</td>
                                <td className="py-2 text-center text-gray-300 bg-gray-50/30 border-l border-gray-200 font-light">—</td>
                                <td className="py-2 text-center text-gray-300 bg-gray-50/30 border-l border-gray-200 font-light">—</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
