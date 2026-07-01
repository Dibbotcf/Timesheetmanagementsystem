import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '../App';
import { Button } from '../components/ui/button';
import { ArrowLeft, Download, Users, Clock, TrendingUp, CalendarDays, FileText, ChevronDown, Search, Check, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface Props { onBack: () => void; }

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

const nil = <span className="text-slate-300 select-none">—</span>;
const fmt  = (n: number) => n > 0 ? (n % 1 === 0 ? String(n) : n.toFixed(1)) : null;

export const LateDelayReport: React.FC<Props> = ({ onBack }) => {
  const { employees, leaves, attendanceRecords } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState<number>(new Date().getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeEmployees = useMemo(() =>
    employees
      .filter(e => e.status === 'Active')
      .sort((a, b) => a.eid.localeCompare(b.eid, undefined, { numeric: true, sensitivity: 'base' })),
    [employees]
  );

  const getLateData = (employeeId: string) => {
    // Attendance records are keyed with 0-indexed month
    const rec = attendanceRecords.find(r => r.id === `${employeeId}-${selectedYear}-${selectedMonth - 1}`);
    if (!rec?.entryDetails) return { lateDays: 0, totalMinutes: 0, lateDates: '' };
    const entries: { day: number; mins: number }[] = [];
    for (const [d, det] of Object.entries(rec.entryDetails))
      if (det.lateMinutes && det.lateMinutes > 0) entries.push({ day: +d, mins: det.lateMinutes });
    entries.sort((a, b) => a.day - b.day);
    return {
      lateDays: entries.length,
      totalMinutes: entries.reduce((s, e) => s + e.mins, 0),
      lateDates: entries.map(e => `${e.day}(${e.mins})`).join(', '),
    };
  };

  const getLeavesByType = (employeeId: string) => {
    const result = { casual: 0, sick: 0, earn: 0, other: 0 };
    for (const lv of leaves.filter(l => l.employeeId === employeeId && l.status === 'Approved')) {
      if ((lv.partialHours && lv.partialHours > 0) || lv.days === 0) continue;
      const sp = lv.startDate.split('-'), ep = lv.endDate.split('-');
      if (sp.length < 3 || ep.length < 3) continue;
      const add = (days: number) => {
        const t = lv.type ?? '';
        if (t === 'Casual Leave') result.casual += days;
        else if (t === 'Sick Leave') result.sick += days;
        else if (t === 'Earn Leave' || t === 'Annual Leave') result.earn += days;
        else result.other += days;
      };
      if (lv.days === 0.5) {
        if (+sp[0] === selectedYear && +sp[1] === selectedMonth) add(0.5);
        continue;
      }
      const start = new Date(+sp[0], +sp[1] - 1, +sp[2]);
      const end   = new Date(+ep[0], +ep[1] - 1, +ep[2]);
      for (let c = new Date(start); c <= end; c.setDate(c.getDate() + 1))
        if (c.getFullYear() === selectedYear && c.getMonth() + 1 === selectedMonth) add(1);
    }
    return result;
  };

  const rows = useMemo(() =>
    activeEmployees.map((emp, idx) => {
      const late = getLateData(emp.id);
      const lv   = getLeavesByType(emp.id);
      return { sl: idx + 1, emp, ...late, ...lv, totalLeave: lv.casual + lv.sick + lv.earn + lv.other };
    }),
    [activeEmployees, attendanceRecords, leaves, selectedMonth, selectedYear]
  );

  const stats = useMemo(() => {
    const empWithLate   = rows.filter(r => r.lateDays > 0).length;
    const totalLateDays = rows.reduce((s, r) => s + r.lateDays, 0);
    const totalMinutes  = rows.reduce((s, r) => s + r.totalMinutes, 0);
    const avgMinPerLate = empWithLate > 0 ? Math.round(totalMinutes / empWithLate) : 0;
    return { empWithLate, totalLateDays, totalMinutes, avgMinPerLate };
  }, [rows]);

  // Apply employee filter
  const displayRows = useMemo(() =>
    selectedEmpIds.length > 0 ? rows.filter(r => selectedEmpIds.includes(r.emp.id)) : rows,
    [rows, selectedEmpIds]
  );

  const displayStats = useMemo(() => ({
    empWithLate:   displayRows.filter(r => r.lateDays > 0).length,
    totalLateDays: displayRows.reduce((s, r) => s + r.lateDays, 0),
    totalMinutes:  displayRows.reduce((s, r) => s + r.totalMinutes, 0),
    avgMinPerLate: displayRows.filter(r => r.lateDays > 0).length > 0
      ? Math.round(displayRows.reduce((s, r) => s + r.totalMinutes, 0) / displayRows.filter(r => r.lateDays > 0).length)
      : 0,
  }), [displayRows]);

  // Employees shown in the filter dropdown (search-filtered)
  const filterEmployees = useMemo(() =>
    activeEmployees.filter(e =>
      e.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      e.eid.toLowerCase().includes(filterSearch.toLowerCase())
    ),
    [activeEmployees, filterSearch]
  );

  const monthLabel  = MONTHS.find(m => m.value === selectedMonth)?.label ?? '';
  const reportTitle = `${monthLabel} ${selectedYear}`;

  const lateSeverity = (d: number) =>
    d >= 6 ? { row: 'bg-red-50/60',    badge: 'bg-red-100 text-red-700 ring-1 ring-red-200'    } :
    d >= 3 ? { row: 'bg-amber-50/60',  badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' } :
    d >= 1 ? { row: 'bg-yellow-50/40', badge: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200' } :
             { row: '',                badge: '' };

  const minColor = (m: number) =>
    m >= 150 ? 'text-red-600 font-bold' :
    m >= 60  ? 'text-amber-600 font-semibold' :
    m > 0    ? 'text-yellow-600 font-semibold' : 'text-slate-300';

  // ── PDF ───────────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210, lm = 10, tableW = W - lm * 2;

      // header
      pdf.setFillColor(15, 23, 42);
      pdf.rect(lm, 8, tableW, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
      pdf.text('Tokyo Consulting Firm Limited', W / 2, 15.5, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Late & Delay Report  ·  For the month of ${reportTitle}`, W / 2, 22.5, { align: 'center' });

      // stats strip
      const sx = lm, sy = 32, sw = tableW / 3, sh = 11;
      const sStats = [
        { label: 'Employees with Late', val: `${displayStats.empWithLate} / ${displayRows.length}` },
        { label: 'Total Late Days',      val: String(displayStats.totalLateDays) },
        { label: 'Total Delay (min)',     val: String(displayStats.totalMinutes) },
      ];
      sStats.forEach((s, i) => {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(sx + i * sw, sy, sw, sh, 'F');
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(sx + i * sw, sy, sw, sh, 'S');
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
        pdf.text(s.label, sx + i * sw + sw / 2, sy + 4, { align: 'center' });
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(15, 23, 42);
        pdf.text(s.val, sx + i * sw + sw / 2, sy + 9, { align: 'center' });
      });

      // table
      type Col = { label: string; w: number; align?: 'left' | 'center' };
      const cols: Col[] = [
        { label: 'SL', w: 9, align: 'center' },
        { label: 'Employee Name', w: 70, align: 'left' },
        { label: 'Late Days', w: 22, align: 'center' },
        { label: 'Total Min', w: 22, align: 'center' },
        { label: 'Late Dates  (day·min)', w: 120, align: 'left' },
        { label: 'Other Lv.', w: 20, align: 'center' },
        { label: 'Total Lv.', w: 14, align: 'center' },
      ];
      const tY = sy + sh + 3, rowH = 6, hH = 8;

      // thead
      pdf.setFillColor(30, 41, 59);
      pdf.rect(lm, tY, tableW, hH, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(226, 232, 240);
      let cx = lm;
      for (const col of cols) {
        const tx = col.align === 'center' ? cx + col.w / 2 : cx + 2;
        pdf.text(col.label, tx, tY + hH / 2 + 2.5, { align: col.align === 'center' ? 'center' : 'left' });
        if (cols.indexOf(col) < cols.length - 1) {
          pdf.setDrawColor(51, 65, 85);
          pdf.line(cx + col.w, tY, cx + col.w, tY + hH);
        }
        cx += col.w;
      }

      // rows
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.8);
      let ry = tY + hH;
      const fD = (n: number) => n > 0 ? (n % 1 === 0 ? String(n) : n.toFixed(1)) : '-';

      displayRows.forEach((row, i) => {
        if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(lm, ry, tableW, rowH, 'F'); }
        if (row.lateDays >= 6) { pdf.setFillColor(254, 242, 242); pdf.rect(lm, ry, tableW, rowH, 'F'); }
        else if (row.lateDays >= 3) { pdf.setFillColor(255, 251, 235); pdf.rect(lm, ry, tableW, rowH, 'F'); }
        else if (row.lateDays >= 1) { pdf.setFillColor(254, 252, 232); pdf.rect(lm, ry, tableW, rowH, 'F'); }
        pdf.setDrawColor(226, 232, 240); pdf.rect(lm, ry, tableW, rowH, 'S');

        const vals = [String(row.sl), row.emp.name, row.lateDays > 0 ? String(row.lateDays) : '-',
          row.totalMinutes > 0 ? String(row.totalMinutes) : '-', row.lateDates || '-',
          fD(row.other), fD(row.totalLeave)];

        cx = lm;
        vals.forEach((v, vi) => {
          const col = cols[vi];
          if (vi === 2 && row.lateDays > 0) pdf.setTextColor(185, 28, 28);
          else if (vi === 3 && row.totalMinutes > 150) pdf.setTextColor(185, 28, 28);
          else if (vi === 3 && row.totalMinutes > 0)  pdf.setTextColor(180, 83, 9);
          else if (vi === 4 && row.lateDates) pdf.setTextColor(92, 83, 56);
          else pdf.setTextColor(30, 41, 59);
          const tx = col.align === 'center' ? cx + col.w / 2 : cx + 2;
          const txt = pdf.getTextWidth(v) > col.w - 2 ? pdf.splitTextToSize(v, col.w - 2)[0] : v;
          pdf.text(txt, tx, ry + rowH / 2 + 2, { align: col.align === 'center' ? 'center' : 'left' });
          if (vi < cols.length - 1) { pdf.setDrawColor(226, 232, 240); pdf.line(cx + col.w, ry, cx + col.w, ry + rowH); }
          cx += col.w;
        });
        ry += rowH;
      });

      // totals
      pdf.setFillColor(30, 41, 59); pdf.rect(lm, ry, tableW, rowH + 1, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(226, 232, 240);
      const tots = ['', 'TOTAL', String(displayStats.totalLateDays), String(displayStats.totalMinutes), '',
        displayRows.reduce((s,r)=>s+r.other,0).toFixed(1),
        displayRows.reduce((s,r)=>s+r.totalLeave,0).toFixed(1)];
      cx = lm;
      tots.forEach((v, vi) => {
        const col = cols[vi];
        const tx = vi === 1 ? cx + 2 : col.align === 'center' ? cx + col.w / 2 : cx + 2;
        if (v) pdf.text(v, tx, ry + (rowH + 1) / 2 + 2.5, { align: vi === 1 ? 'left' : col.align === 'center' ? 'center' : 'left' });
        if (vi < cols.length - 1) { pdf.setDrawColor(51, 65, 85); pdf.line(cx + col.w, ry, cx + col.w, ry + rowH + 1); }
        cx += col.w;
      });

      // footer
      pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6); pdf.setTextColor(148, 163, 184);
      pdf.text(`Format: day(minutes) · e.g. 3(15) = Day 3, 15 min late  |  Generated by TCF HRM System  |  ${reportTitle}`, W / 2, H - 6, { align: 'center' });

      pdf.save(`Late_Delay_Report_${monthLabel}_${selectedYear}.pdf`);
      toast.success('PDF downloaded!');
    } catch (err: any) {
      toast.error('PDF failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setIsDownloading(false);
    }
  };

  const totalOther    = displayRows.reduce((s, r) => s + r.other, 0);
  const totalLeaveAll = displayRows.reduce((s, r) => s + r.totalLeave, 0);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">

      {/* ━━ Top bar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Late &amp; Delay Report</h1>
            <p className="text-xs text-slate-400 mt-0.5">Tokyo Consulting Firm Limited &nbsp;·&nbsp; {reportTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {/* ── Employee filter dropdown ── */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => { setFilterOpen(p => !p); setFilterSearch(''); }}
              className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                selectedEmpIds.length > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">
                {selectedEmpIds.length === 0
                  ? 'All Employees'
                  : selectedEmpIds.length === 1
                    ? (activeEmployees.find(e => e.id === selectedEmpIds[0])?.name ?? '1 selected')
                    : `${selectedEmpIds.length} employees`}
              </span>
              {selectedEmpIds.length > 0
                ? <X className="h-3 w-3 text-indigo-400 hover:text-indigo-700" onClick={e => { e.stopPropagation(); setSelectedEmpIds([]); }} />
                : <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />}
            </button>

            {filterOpen && (
              <div className="absolute top-full mt-1.5 right-0 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Search box */}
                <div className="p-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search employees…"
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    {filterSearch && (
                      <button onClick={() => setFilterSearch('')}><X className="h-3 w-3 text-slate-400" /></button>
                    )}
                  </div>
                </div>

                {/* Select all / Clear */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                  <button
                    onClick={() => setSelectedEmpIds(activeEmployees.map(e => e.id))}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Select All
                  </button>
                  {selectedEmpIds.length > 0 && (
                    <button
                      onClick={() => setSelectedEmpIds([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Clear ({selectedEmpIds.length})
                    </button>
                  )}
                </div>

                {/* Employee list */}
                <div className="max-h-56 overflow-y-auto">
                  {filterEmployees.length === 0 ? (
                    <p className="px-3 py-5 text-sm text-slate-400 text-center">No employees found</p>
                  ) : filterEmployees.map(emp => {
                    const checked = selectedEmpIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => setSelectedEmpIds(prev =>
                          checked ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        )}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${checked ? 'bg-indigo-50/60' : ''}`}
                      >
                        <div className={`h-4 w-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                          checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.eid}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setFilterOpen(false)}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(+e.target.value)}
              className="bg-transparent text-sm text-slate-700 font-medium px-2 py-1 outline-none cursor-pointer"
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="w-px h-5 bg-slate-200" />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(+e.target.value)}
              className="bg-transparent text-sm text-slate-700 font-medium px-2 py-1 outline-none cursor-pointer"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 h-9 text-sm font-medium gap-2"
          >
            <Download className="h-3.5 w-3.5" />
            {isDownloading ? 'Generating…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* ━━ Stat cards (single row) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-4 gap-3">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500 rounded-l-2xl" />
          <div className="ml-2 p-2.5 rounded-xl bg-indigo-50">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Employees Late</p>
            <p className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
              {displayStats.empWithLate}
              <span className="text-sm font-normal text-slate-400 ml-1">/ {displayRows.length}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {displayRows.length > 0 ? Math.round(displayStats.empWithLate / displayRows.length * 100) : 0}% of workforce
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-amber-500 rounded-l-2xl" />
          <div className="ml-2 p-2.5 rounded-xl bg-amber-50">
            <CalendarDays className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Total Late Days</p>
            <p className="text-2xl font-bold text-amber-600 leading-tight mt-0.5">{displayStats.totalLateDays}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">across all employees</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-red-500 rounded-l-2xl" />
          <div className="ml-2 p-2.5 rounded-xl bg-red-50">
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Total Delay</p>
            <p className="text-2xl font-bold text-red-600 leading-tight mt-0.5">
              {displayStats.totalMinutes.toLocaleString()}
              <span className="text-sm font-normal text-slate-400 ml-1">min</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ≈ {Math.floor(displayStats.totalMinutes / 60)}h {displayStats.totalMinutes % 60}m total
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500 rounded-l-2xl" />
          <div className="ml-2 p-2.5 rounded-xl bg-emerald-50">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Avg per Late Emp.</p>
            <p className="text-2xl font-bold text-emerald-600 leading-tight mt-0.5">
              {displayStats.avgMinPerLate}
              <span className="text-sm font-normal text-slate-400 ml-1">min</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">average delay minutes</p>
          </div>
        </div>
      </div>

      {/* ━━ Report table ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Document header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm tracking-wide">TOKYO CONSULTING FIRM LIMITED</p>
            <p className="text-slate-400 text-xs mt-0.5">Late, Delay &amp; Leave Report &nbsp;·&nbsp; {reportTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-slate-500 text-xs">HR Report</span>
          </div>
        </div>

        {/* Legend chips */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
          <span className="text-[11px] text-slate-500 font-medium">Severity:</span>
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="text-slate-600">1–2 days late</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-600">3–5 days late</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-slate-600">6+ days late</span>
          </span>
          <span className="ml-auto text-[11px] text-slate-400">
            Format: <code className="bg-slate-100 px-1 rounded text-[10px]">day(min)</code> e.g. 3(15) = Day 3, 15 min late
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '44px' }} />
              <col style={{ width: '175px' }} />
              <col style={{ width: '78px' }} />
              <col style={{ width: '78px' }} />
              <col />   {/* Late Dates — flexible */}
              <col style={{ width: '72px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>

            <thead>
              <tr className="text-left border-b-2 border-slate-200">
                <th colSpan={4} className="px-4 pt-3 pb-1 text-[10px] font-semibold text-indigo-500 uppercase tracking-widest bg-slate-50">
                  Attendance
                </th>
                <th className="px-3 pt-3 pb-1 bg-slate-50" />
                <th colSpan={2} className="px-3 pt-3 pb-1 text-[10px] font-semibold text-teal-600 uppercase tracking-widest bg-slate-50 text-center">
                  Leave (days)
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-3 text-center font-semibold text-[11px]">SL</th>
                <th className="py-3 px-4 text-left font-semibold text-[11px]">Employee Name</th>
                <th className="py-3 px-3 text-center font-semibold text-[11px]">Late Days</th>
                <th className="py-3 px-3 text-center font-semibold text-[11px]">Total Min</th>
                <th className="py-3 px-3 text-left font-semibold text-[11px] border-r border-slate-200">Late Dates</th>
                <th className="py-3 px-2 text-center font-semibold text-[11px] text-teal-700">Other</th>
                <th className="py-3 px-2 text-center font-semibold text-[11px] text-teal-700 bg-teal-50/50">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row) => {
                const sev = lateSeverity(row.lateDays);
                return (
                  <tr key={row.emp.id} className={`${sev.row} hover:bg-slate-50/80 transition-colors`}>
                    <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">{row.sl}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-slate-800 text-[12px] truncate block">{row.emp.name}</span>
                      {row.emp.eid && <span className="text-[10px] text-slate-400">{row.emp.eid}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.lateDays > 0
                        ? <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold ${sev.badge}`}>{row.lateDays}</span>
                        : nil}
                    </td>
                    <td className={`py-2.5 px-3 text-center text-[12px] tabular-nums ${minColor(row.totalMinutes)}`}>
                      {row.totalMinutes > 0 ? row.totalMinutes : nil}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100">
                      <span className="font-mono text-[10.5px] text-slate-500 leading-relaxed">
                        {row.lateDates || nil}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 text-[11px] tabular-nums">{fmt(row.other) ?? nil}</td>
                    <td className="py-2.5 px-2 text-center bg-teal-50/30">
                      {row.totalLeave > 0
                        ? <span className="font-semibold text-teal-700 text-[11px] tabular-nums">{row.totalLeave % 1 === 0 ? row.totalLeave : row.totalLeave.toFixed(1)}</span>
                        : nil}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-semibold">
                <td className="py-3 px-3" colSpan={2}>
                  <span className="text-[11px] uppercase tracking-wider text-slate-300">Total</span>
                </td>
                <td className="py-3 px-3 text-center text-[12px] text-amber-400">{displayStats.totalLateDays}</td>
                <td className="py-3 px-3 text-center text-[12px] text-red-400 tabular-nums">{displayStats.totalMinutes.toLocaleString()}</td>
                <td className="py-3 px-3 border-r border-slate-700">
                  <span className="text-[10px] text-slate-500">
                    ≈ {Math.floor(displayStats.totalMinutes / 60)}h {displayStats.totalMinutes % 60}m
                  </span>
                </td>
                <td className="py-3 px-2 text-center text-[11px] tabular-nums text-teal-300">{totalOther  > 0 ? totalOther.toFixed(1)  : '—'}</td>
                <td className="py-3 px-2 text-center bg-teal-900/30">
                  <span className="text-[12px] font-bold text-teal-300 tabular-nums">
                    {totalLeaveAll > 0 ? totalLeaveAll.toFixed(1) : '—'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
