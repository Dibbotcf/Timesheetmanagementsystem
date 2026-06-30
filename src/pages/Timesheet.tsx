
import React, { useState, useMemo } from 'react';
import { useAppStore, TimesheetRecord } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Save, CheckCircle2, XCircle, ClipboardList,
  Search, Users, AlertCircle, ChevronDown, Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useNavigate } from 'react-router-dom';
import { PrintableTimesheet } from '../components/PrintableTimesheet';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Checkbox } from '../components/ui/checkbox';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 2050 - (new Date().getFullYear() - 2) + 1 }, (_, i) => new Date().getFullYear() - 2 + i);

// ─── Timesheet Status Report Panel (exact image match) ───────────────────────
const TimesheetStatusPanel: React.FC<{ year: number; month: number }> = ({ year, month }) => {
  const { employees, timesheets } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'created' | 'pending'>('all');

  const activeEmployees = useMemo(
    () => [...employees].filter(e => e.status === 'Active').sort((a, b) => {
      const eIdA = a.eid || '';
      const eIdB = b.eid || '';
      const parseEidNumber = (eid: string): number => {
          const match = eid.match(/\d+/);
          return match ? parseInt(match[0], 10) : Infinity;
      };
      const aNum = parseEidNumber(eIdA);
      const bNum = parseEidNumber(eIdB);
      if (aNum !== bNum) return aNum - bNum;
      return eIdA.localeCompare(eIdB);
    }),
    [employees]
  );

  const allRows = useMemo(() => {
    return activeEmployees.map(emp => {
      const ts = timesheets.find(
        t => t.employeeId === emp.id && t.year === year && t.month === month
      );
      return {
        id: emp.id,
        name: emp.name,
        eid: emp.eid,
        hasTimesheet: !!ts,
      };
    });
  }, [activeEmployees, timesheets, year, month]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      const matchSearch =
        !search ||
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.eid.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === 'all' ||
        (filter === 'created' && row.hasTimesheet) ||
        (filter === 'pending' && !row.hasTimesheet);
      return matchSearch && matchFilter;
    });
  }, [allRows, search, filter]);

  const total = allRows.length;
  const createdCount = allRows.filter(r => r.hasTimesheet).length;
  const pendingCount = total - createdCount;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg shadow-lg bg-white border border-slate-200 print:hidden">

      {/* ── Navy Header ── */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)' }}
      >
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <ClipboardList className="h-4 w-4 shrink-0" />
          Timesheet Status Report
        </div>
        <p className="text-blue-200 text-xs mt-0.5">
          {MONTHS[month]} {year} — Track submission progress
        </p>
      </div>

      {/* ── 3-Column Stats ── */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 shrink-0 bg-white">
        {/* Total */}
        <div className="flex flex-col items-center justify-center py-3 gap-0.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-2xl font-bold text-slate-700 leading-tight">{total}</span>
          <span className="text-[10px] text-slate-400">Total</span>
        </div>
        {/* Created */}
        <div className="flex flex-col items-center justify-center py-3 gap-0.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-2xl font-bold text-green-600 leading-tight">{createdCount}</span>
          <span className="text-[10px] text-slate-400">Created</span>
        </div>
        {/* Pending */}
        <div className="flex flex-col items-center justify-center py-3 gap-0.5">
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          <span className="text-2xl font-bold text-red-500 leading-tight">{pendingCount}</span>
          <span className="text-[10px] text-slate-400">Pending</span>
        </div>
      </div>

      {/* ── Search + Filter Pills ── */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by name or EID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-7 text-xs bg-slate-50 border-slate-200 rounded-md"
          />
        </div>
        {/* Filter pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 text-[10px] font-semibold py-1 rounded-md border transition-all ${
              filter === 'all'
                ? 'bg-[#1a237e] text-white border-[#1a237e]'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('created')}
            className={`flex-1 text-[10px] font-semibold py-1 rounded-md border transition-all flex items-center justify-center gap-1 ${
              filter === 'created'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            }`}
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Created: {createdCount}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 text-[10px] font-semibold py-1 rounded-md border transition-all flex items-center justify-center gap-1 ${
              filter === 'pending'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertCircle className="h-2.5 w-2.5" />
            Pending: {pendingCount}
          </button>
        </div>
      </div>

      {/* ── Table Header ── */}
      <div className="flex items-center bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="w-8 px-2 py-2 text-[10px] font-bold text-slate-500 text-center">#</div>
        <div className="flex-1 px-2 py-2 text-[10px] font-bold text-slate-500">Employee Name</div>
        <div className="w-[60px] px-2 py-2 text-[10px] font-bold text-slate-500 text-center">EID</div>
        <div className="w-20 px-2 py-2 text-[10px] font-bold text-slate-500 text-center">Status</div>
      </div>

      {/* ── Employee Rows ── */}
      <div className="flex-1 overflow-y-auto">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-slate-400 text-xs gap-1">
            <Search className="h-4 w-4 opacity-40" />
            No employees match
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredRows.map((row, idx) => (
              <div
                key={row.id}
                className={`flex items-center transition-colors ${
                  row.hasTimesheet ? 'hover:bg-green-50/40' : 'bg-red-50/20 hover:bg-red-50/40'
                }`}
              >
                {/* # */}
                <div className="w-8 px-2 py-2.5 text-[10px] text-slate-400 text-center font-mono">
                  {idx + 1}
                </div>
                {/* Name */}
                <div className="flex-1 px-2 py-2.5 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {row.name}
                  </p>
                </div>
                {/* EID */}
                <div className="w-[60px] px-2 py-2.5 text-center">
                  <span className="text-[10px] text-slate-500 font-mono">{row.eid}</span>
                </div>
                {/* Status */}
                <div className="w-20 px-2 py-2.5 flex justify-center">
                  {row.hasTimesheet ? (
                    <span className="inline-flex items-center gap-0.5 text-green-700 text-[9px] font-bold">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      Created
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-red-600 text-[9px] font-bold">
                      <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                      Not Created
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-between items-center">
        <span className="text-[10px] text-slate-500">
          Total: <strong className="text-slate-700">{String(filteredRows.length).padStart(2, '0')}</strong> employees
        </span>
        <span className="text-xs font-bold">
          <span className="text-green-600">{String(createdCount).padStart(2, '0')}</span>
          <span className="text-slate-400 mx-0.5">/</span>
          <span className="text-red-500">{pendingCount}</span>
        </span>
      </div>
    </div>
  );
};

// ─── Main Create Timesheet Page ───────────────────────────────────────────────
export const Timesheet: React.FC = () => {
  const { employees, timesheets, getTemplate, folders, addTimesheet, signatures, currentUser } = useAppStore();
  const navigate = useNavigate();

  const isStaff = currentUser?.role === 'Staff';

  if (isStaff) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500">
        You do not have permission to view this page.
      </div>
    );
  }

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [defaultClockIn, setDefaultClockIn] = useState<string>('08:30');
  const [defaultClockOut, setDefaultClockOut] = useState<string>('17:30');

  const activeEmployees = useMemo(
    () => employees.filter(e => e.status === 'Active'),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    return [...activeEmployees].filter(emp =>
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.eid.toLowerCase().includes(employeeSearch.toLowerCase())
    ).sort((a, b) => {
      const eIdA = a.eid || '';
      const eIdB = b.eid || '';
      const parseEidNumber = (eid: string): number => {
          const match = eid.match(/\d+/);
          return match ? parseInt(match[0], 10) : Infinity;
      };
      const aNum = parseEidNumber(eIdA);
      const bNum = parseEidNumber(eIdB);
      if (aNum !== bNum) return aNum - bNum;
      return eIdA.localeCompare(eIdB);
    });
  }, [activeEmployees, employeeSearch]);

  const primaryEmployeeId = selectedEmployeeIds[0] || '';
  const selectedEmployee = employees.find(e => e.id === primaryEmployeeId);
  const template = getTemplate(selectedYear, selectedMonth);


  const handleGenerate = () => {
    if (selectedEmployeeIds.length === 0) { toast.error('Please select at least one employee'); return; }
    if (!selectedFolderId) { toast.error('Please select a target folder'); return; }

    // Check duplicates: Same Year, Same Month, Same Folder, and Same Employee
    const duplicates: string[] = [];
    selectedEmployeeIds.forEach(empId => {
      const exists = timesheets.some(
        t => t.employeeId === empId && t.year === selectedYear && t.month === selectedMonth && t.folderId === selectedFolderId
      );
      if (exists) {
        const emp = employees.find(e => e.id === empId);
        if (emp) duplicates.push(emp.name);
      }
    });

    if (duplicates.length > 0) {
      if (duplicates.length === 1) {
        toast.error(`Timesheet for "${duplicates[0]}" already exists in this folder for the selected month and year.`);
      } else {
        toast.error(`Timesheets already exist in this folder for the selected month and year: ${duplicates.join(', ')}.`);
      }
      return;
    }

    selectedEmployeeIds.forEach(empId => {
      const emp = employees.find(e => e.id === empId);
      addTimesheet({
        id: Math.random().toString(36).substr(2, 9),
        folderId: selectedFolderId,
        employeeId: empId,
        employeeName: emp?.name || 'Unknown',
        eid: emp?.eid || 'Unknown',
        year: selectedYear,
        month: selectedMonth,
        generatedAt: new Date().toISOString(),
        entries: [],
        summary: [],
        defaultClockIn,
        defaultClockOut,
      } as TimesheetRecord);
    });

    toast.success(`Timesheets generated for ${selectedEmployeeIds.length} employees and saved to dashboard`);
    navigate('/');
  };

  const previewTimesheet: TimesheetRecord = {
    id: 'preview',
    folderId: selectedFolderId,
    employeeId: primaryEmployeeId,
    employeeName: selectedEmployee?.name || '',
    eid: selectedEmployee?.eid || '',
    year: selectedYear,
    month: selectedMonth,
    generatedAt: new Date().toISOString(),
    entries: [],
    summary: [],
    defaultClockIn,
    defaultClockOut,
  };

  return (
    <div className="flex flex-col h-full">



      {/* ── Two-Column Body (Fixed 70/30 Split) ── */}
      <div className="flex gap-4 flex-1 min-h-0 pb-20">

        {/* ── LEFT: Form + Preview (64%) ── */}
        <div className="w-[64%] min-w-0 flex flex-col gap-4 overflow-y-auto">

          {/* Form Controls */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 print:hidden shrink-0">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3" style={{ columnGap: '24px', rowGap: '16px' }}>
              {/* Select Employee */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Select Employee</label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={popoverOpen}
                      className="w-full justify-between bg-white border-slate-200 hover:bg-slate-50/50 h-9 px-3 py-2 text-sm font-normal text-slate-800 shadow-sm rounded-md"
                    >
                      <span className="truncate">
                        {selectedEmployeeIds.length === 0
                          ? "Choose employees..."
                          : selectedEmployeeIds.length === 1
                          ? `${employees.find(e => e.id === selectedEmployeeIds[0])?.name} (${employees.find(e => e.id === selectedEmployeeIds[0])?.eid})`
                          : `${selectedEmployeeIds.length} Employees Selected`}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {selectedEmployeeIds.length > 0 && (
                          <span className="bg-[#1a237e] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none">
                            {selectedEmployeeIds.length}
                          </span>
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-2 bg-white shadow-xl rounded-lg border border-slate-200 flex flex-col gap-2 z-50">
                    {/* Search Input */}
                    <div className="relative flex items-center border-b border-slate-100 pb-2">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search employee by name or EID..."
                        value={employeeSearch}
                        onChange={e => setEmployeeSearch(e.target.value)}
                        className="pl-9 pr-7 h-9 text-xs bg-slate-50 border-slate-200 rounded-md focus-visible:ring-1 focus-visible:ring-blue-500 w-full"
                      />
                      {employeeSearch && (
                        <button
                          onClick={() => setEmployeeSearch('')}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Helper actions: Select All / Clear All */}
                    <div className="flex gap-2 justify-between px-1 text-[11px] font-semibold text-slate-500">
                      <button
                        type="button"
                        onClick={() => {
                          const allFilteredIds = filteredEmployees.map(e => e.id);
                          setSelectedEmployeeIds(prev => {
                            const newIds = new Set([...prev, ...allFilteredIds]);
                            return Array.from(newIds);
                          });
                        }}
                        className="text-[#1a237e] hover:underline flex items-center gap-1"
                      >
                        Select All Filtered
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeIds([]);
                        }}
                        className="text-red-500 hover:underline flex items-center gap-1"
                      >
                        Select None (Clear)
                      </button>
                    </div>

                    {/* List of employees */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {filteredEmployees.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No active employees found
                        </div>
                      ) : (
                        filteredEmployees.map(emp => {
                          const isChecked = selectedEmployeeIds.includes(emp.id);
                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                setSelectedEmployeeIds(prev =>
                                  isChecked
                                    ? prev.filter(id => id !== emp.id)
                                    : [...prev, emp.id]
                                );
                              }}
                              className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {}} // onClick on parent handles toggling
                                className="pointer-events-none"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {emp.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {emp.eid}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Select Year */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Select Year</label>
                <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Month */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Select Month</label>
                <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Save to Folder */}
              <div>
                <label className="block text-xs font-medium text-blue-600 mb-1">Save to Folder</label>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger className="bg-blue-50 border-blue-200 h-9 text-sm">
                    <SelectValue placeholder="Select output folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.length === 0
                      ? <SelectItem value="none" disabled>No folders created yet</SelectItem>
                      : folders.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {folders.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please create a folder in Dashboard first.</p>
                )}
              </div>
            </div>

            {/* Default Clock-in / Clock-out Times */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs font-semibold text-slate-600">Default Clock Times</span>
                <span className="text-[10px] text-slate-400 ml-1">(used as starting point when user clicks a time field)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Default Clock-in */}
                <div>
                  <label className="block text-xs font-medium text-indigo-600 mb-1">Default Clock-in Time</label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-2.5 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
                    <input
                      id="default-clock-in"
                      type="time"
                      value={defaultClockIn}
                      onChange={e => setDefaultClockIn(e.target.value)}
                      className="w-full pl-8 pr-3 h-9 text-sm border border-indigo-200 bg-indigo-50 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default: 08:30 AM</p>
                </div>
                {/* Default Clock-out */}
                <div>
                  <label className="block text-xs font-medium text-indigo-600 mb-1">Default Clock-out Time</label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-2.5 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
                    <input
                      id="default-clock-out"
                      type="time"
                      value={defaultClockOut}
                      onChange={e => setDefaultClockOut(e.target.value)}
                      className="w-full pl-8 pr-3 h-9 text-sm border border-indigo-200 bg-indigo-50 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default: 05:30 PM</p>
                </div>
              </div>
            </div>

            {!template && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No template for {MONTHS[selectedMonth]} {selectedYear}. Go to Templates to configure.
              </div>
            )}
          </div>



          {selectedEmployeeIds.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-xs flex flex-col gap-1 shadow-sm mb-2 print:hidden animate-in fade-in slide-in-from-top-1 duration-200 shrink-0">
              <div className="flex items-center gap-1.5 font-semibold">
                <Users className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Bulk Generation Mode Enabled ({selectedEmployeeIds.length} Employees Selected)</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Previewing timesheet for <strong className="text-blue-900">{selectedEmployee?.name}</strong>. Timesheets will be batch-generated for all {selectedEmployeeIds.length} selected employees.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-20 overflow-y-auto">
                {selectedEmployeeIds.map(id => {
                  const emp = employees.find(e => e.id === id);
                  return (
                    <span key={id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-medium border border-blue-200">
                      {emp?.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timesheet Preview */}
          <div className="bg-slate-100 rounded-lg border border-slate-200 p-4 md:p-6 print:p-0 print:bg-white flex justify-center print:block overflow-x-auto">
            <PrintableTimesheet
              timesheet={previewTimesheet}
              template={template}
              entries={[]}
              summary={[]}
              signatures={signatures}
              isEditing={false}
              defaultClockIn={defaultClockIn}
              defaultClockOut={defaultClockOut}
            />
          </div>
        </div>

        {/* ── RIGHT: Status Report Panel (36%) — upper right, sticky ── */}
        <div
          className="w-[36%] flex flex-col shrink-0 sticky top-0 self-start print:hidden"
          style={{ maxHeight: 'calc(100vh - 110px)' }}
        >
          <TimesheetStatusPanel year={selectedYear} month={selectedMonth} />
        </div>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 right-0 left-64 bg-white border-t border-slate-200 shadow-md px-6 py-3 flex items-center justify-between print:hidden z-20">
        <span className="text-sm text-slate-500">
          {selectedEmployeeIds.length > 0 && selectedFolderId
            ? (
              <span className="flex items-center gap-1.5 text-green-700 font-medium animate-in fade-in duration-300">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ready to generate for {selectedEmployeeIds.length === 1 ? selectedEmployee?.name : `${selectedEmployeeIds.length} selected employees`}
              </span>
            )
            : 'Select Employee and Folder to generate'
          }
        </span>
        <Button
          size="default"
          onClick={handleGenerate}
          disabled={selectedEmployeeIds.length === 0 || !selectedFolderId}
          className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6 transition-all"
        >
          <Save className="h-4 w-4" />
          Generate &amp; Save ({selectedEmployeeIds.length})
        </Button>
      </div>
    </div>
  );
};
