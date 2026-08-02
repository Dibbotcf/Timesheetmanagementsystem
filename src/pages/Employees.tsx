import React, { useState, useRef, useMemo } from 'react';
import { useAppStore, Employee, Signature } from '../App';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Upload, Image as ImageIcon, Cake, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AspectRatio } from "../components/ui/aspect-ratio";

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Soft role pill colors (inline styles — Tailwind v4 purges dynamic color classes)
const roleBadge = (role: string) =>
  role === 'Superadmin' ? { bg: '#f3e8ff', fg: '#7c3aed' }
  : role === 'Admin/HR' ? { bg: '#eff6ff', fg: '#1d4ed8' }
  : { bg: '#f1f5f9', fg: '#475569' };

export const Employees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, signatures, addSignature, deleteSignature } = useAppStore();
  const [search, setSearch] = useState('');
  
  // --- Employee State ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    status: 'Active',
    role: 'Staff'
  });

  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // --- Signature State ---
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [sigFormData, setSigFormData] = useState<Partial<Signature>>({});
  const [sigDeleteId, setSigDeleteId] = useState<string | null>(null);
  const [isSigDeleteOpen, setIsSigDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Employee Logic ---
  const filteredEmployees = [...employees].filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.eid.toLowerCase().includes(search.toLowerCase())
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

  // Birthdays (active employees), ordered by calendar date Jan → Dec
  const upcomingBirthdays = useMemo(() => {
    const list: { emp: Employee; month: number; day: number }[] = [];
    for (const e of employees) {
      if (e.status !== 'Active' || !e.dob) continue;
      const d = new Date(e.dob);
      if (isNaN(d.getTime())) continue;
      list.push({ emp: e, month: d.getMonth(), day: d.getDate() });
    }
    return list.sort((a, b) => a.month - b.month || a.day - b.day);
  }, [employees]);

  // Current-month calendar data (for the birthday calendar view)
  const _today = new Date();
  const realTodayY = _today.getFullYear();
  const realTodayM = _today.getMonth();
  const realTodayD = _today.getDate();
  const [viewYear, setViewYear] = useState(realTodayY);
  const [viewMonth, setViewMonth] = useState(realTodayM);
  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const calMonthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });
  const calFirstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const calDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isViewingCurrentMonth = viewMonth === realTodayM && viewYear === realTodayY;
  const monthBirthdays = upcomingBirthdays.filter(b => b.month === viewMonth);
  const birthdayDaySet = new Set(monthBirthdays.map(b => b.day));

  // Next upcoming birthday (soonest from today) — shown in the header
  const nextBirthday = (() => {
    const todayMs = new Date(realTodayY, realTodayM, realTodayD).getTime();
    let best: { emp: Employee; month: number; day: number; daysUntil: number } | null = null;
    for (const b of upcomingBirthdays) {
      let nextMs = new Date(realTodayY, b.month, b.day).getTime();
      if (nextMs <= todayMs) nextMs = new Date(realTodayY + 1, b.month, b.day).getTime();
      const daysUntil = Math.round((nextMs - todayMs) / 86400000);
      if (!best || daysUntil < best.daysUntil) best = { emp: b.emp, month: b.month, day: b.day, daysUntil };
    }
    return best;
  })();

  const resetForm = () => {
    setFormData({ status: 'Active', role: 'Staff' });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    setFormData(emp);
    setCurrentId(emp.id);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.eid || !formData.dob || !formData.status || !formData.role) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    if (isEditing && currentId) {
      updateEmployee(currentId, formData);
      toast.success('Employee updated successfully');
    } else {
      addEmployee(formData as Omit<Employee, 'id'>);
      toast.success('Employee added successfully');
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteEmployee(deleteId);
      toast.success('Employee deleted successfully');
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleView = (emp: Employee) => {
    setViewingEmployee(emp);
    setIsViewOpen(true);
  };

  // --- Signature Logic ---
  const handleOpenAddSig = () => {
    setSigFormData({});
    setIsSigDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        toast.error("Image file too large. Please use an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSigFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigFormData.name || !sigFormData.role || !sigFormData.imageUrl) {
      toast.error('Please fill in all fields and upload a signature image.');
      return;
    }
    addSignature(sigFormData as Omit<Signature, 'id'>);
    toast.success('Signature added successfully');
    setIsSigDialogOpen(false);
    setSigFormData({});
  };

  const handleSigDeleteClick = (id: string) => {
    setSigDeleteId(id);
    setIsSigDeleteOpen(true);
  };

  const confirmSigDelete = () => {
    if (sigDeleteId) {
      deleteSignature(sigDeleteId);
      toast.success('Signature deleted successfully');
      setIsSigDeleteOpen(false);
      setSigDeleteId(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your team, roles, and upcoming birthdays</p>
        </div>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>
        
        {/* Employees Tab */}
        <TabsContent value="employees" className="mt-4">
          <div className="flex gap-4 items-start">
          {/* Left: employee table (70%) */}
          <div className="w-[70%] min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="inline-flex items-center rounded-lg text-xs font-semibold px-3 py-1.5 shrink-0 self-start sm:self-auto" style={{ background: '#f1f5f9', color: '#475569' }}>
                  {filteredEmployees.length} Employees
                </span>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 bg-slate-50 border-slate-200"
                    placeholder="Search by name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={handleOpenAdd} className="shrink-0 bg-blue-900 hover:bg-blue-800">
                  <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold pl-6 pr-2 py-3">#</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">EID</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">Role</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">Position</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">Date of Birth</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">Joining Date</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-3 py-3">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold text-right pl-4 pr-6 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24 text-slate-400">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp, index) => {
                      const rb = roleBadge(emp.role);
                      return (
                      <TableRow key={emp.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="pl-6 pr-2 py-3.5 text-sm font-medium text-slate-500 tabular-nums">{index + 1}</TableCell>
                        <TableCell className="px-3 py-3.5">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold font-mono" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{emp.eid}</span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full flex items-center justify-center text-sm font-semibold" style={{ width: '36px', height: '36px', minWidth: '36px', flexShrink: 0, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800 whitespace-nowrap">{emp.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: rb.bg, color: rb.fg }}>
                            {emp.role}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          {emp.designation
                            ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{emp.designation}</span>
                            : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 tabular-nums whitespace-nowrap px-3 py-3.5">{new Date(emp.dob).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-slate-600 tabular-nums whitespace-nowrap px-3 py-3.5">{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={emp.status === 'Active' ? { background: '#f0fdf4', color: '#16a34a' } : { background: '#fef2f2', color: '#dc2626' }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: emp.status === 'Active' ? '#16a34a' : '#dc2626' }} />
                            {emp.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pl-4 pr-6 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(emp)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(emp)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClick(emp.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </div>

          {/* Right: Upcoming Birthdays (30%) */}
          <div className="w-[30%] shrink-0 self-start sticky top-4">
            <Card>
              <CardHeader style={{ padding: '10px 16px' }}>
                <div className="flex items-center gap-1.5">
                  <Cake className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-800">Birthdays</h3>
                </div>
                {nextBirthday && (
                  <div className="flex items-center gap-1.5" style={{ marginTop: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '5px 10px' }} title={`Next: ${nextBirthday.emp.name} (${MONTH_ABBR[nextBirthday.month]} ${nextBirthday.day})`}>
                    <Cake className="h-3.5 w-3.5" style={{ color: '#d97706', flexShrink: 0 }} />
                    <span className="text-[10px] font-bold uppercase" style={{ color: '#b45309', flexShrink: 0 }}>Next</span>
                    <span className="text-xs font-bold text-slate-800 truncate" style={{ minWidth: 0, flex: '1 1 0%' }}>{nextBirthday.emp.name}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: '#d97706', flexShrink: 0 }}>{MONTH_ABBR[nextBirthday.month]} {nextBirthday.day}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {/* Month calendar with navigation */}
                <div className="px-4 pt-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-800">{calMonthName} {viewYear}</span>
                    <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={'w' + i} className="text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                    ))}
                    {Array.from({ length: calFirstWeekday }).map((_, i) => <div key={'blank' + i} />)}
                    {Array.from({ length: calDaysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isToday = isViewingCurrentMonth && dayNum === realTodayD;
                      const hasBday = birthdayDaySet.has(dayNum);
                      const base: React.CSSProperties = { width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', fontSize: '12px' };
                      const cellStyle: React.CSSProperties = isToday
                        ? { ...base, background: '#1d4ed8', color: '#fff', fontWeight: 700 }
                        : hasBday
                        ? { ...base, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }
                        : { ...base, color: '#334155' };
                      return (
                        <div key={dayNum} className="flex items-center justify-center" style={{ height: '30px', position: 'relative' }}>
                          <span style={cellStyle}>{dayNum}</span>
                          {hasBday && !isToday && <span style={{ position: 'absolute', bottom: '1px', width: '4px', height: '4px', borderRadius: '9999px', background: '#1d4ed8' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Selected-month birthday list */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                  <span>{calMonthName} Birthdays</span>
                  <span>{monthBirthdays.length}</span>
                </div>
                {monthBirthdays.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-slate-400">No birthdays in {calMonthName}.</p>
                ) : (
                  <div className="max-h-[280px] overflow-y-auto">
                    {monthBirthdays.map(({ emp, month, day }, i) => (
                      <div key={emp.id} className="flex items-center gap-2 px-4 py-2 border-b border-slate-50 transition-colors hover:bg-slate-50">
                        <span className="text-xs font-medium text-slate-400 tabular-nums" style={{ width: '22px', flexShrink: 0 }}>{i + 1}</span>
                        <div className="min-w-0 flex-1 flex items-center gap-1.5">
                          {isViewingCurrentMonth && <Cake className="h-3.5 w-3.5" style={{ color: '#1d4ed8', flexShrink: 0 }} />}
                          <span className="font-semibold text-[13px] text-slate-800 truncate">{emp.name}</span>
                        </div>
                        <span className="text-xs font-bold tabular-nums whitespace-nowrap" style={{ color: '#1d4ed8', flexShrink: 0 }}>{MONTH_ABBR[month]} {day}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-4 mt-4">
           <div className="flex justify-end">
            <Button onClick={handleOpenAddSig} className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" /> Add Signature
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signatures.map((sig) => (
              <Card key={sig.id}>
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="aspect-[3/1] bg-gray-50 border rounded-md overflow-hidden flex items-center justify-center relative">
                    {sig.imageUrl ? (
                      <img src={sig.imageUrl} alt={`${sig.name} signature`} className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="text-gray-300 h-10 w-10" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{sig.name}</h3>
                    <p className="text-sm text-gray-500">{sig.role}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="destructive" size="sm" onClick={() => handleSigDeleteClick(sig.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {signatures.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                <p>No signatures added yet.</p>
                <p className="text-sm mt-1">Add signatures to use them in timesheets.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Employee Dialogs (Add/Edit, View, Delete) - Same as before */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the employee details below.' : 'Fill in the details to add a new employee to the system.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eid">Employee ID (EID) <span className="text-red-500">*</span></Label>
              <Input 
                id="eid" 
                value={formData.eid || ''} 
                onChange={e => setFormData({...formData, eid: e.target.value})}
                placeholder="TCF001"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="dob">Date of Birth <span className="text-red-500">*</span></Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob || ''}
                  onChange={e => setFormData({...formData, dob: e.target.value})}
                  required
                  className="accent-blue-900 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)]"
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input
                  id="joiningDate"
                  type="date"
                  value={formData.joiningDate || ''}
                  onChange={e => setFormData({...formData, joiningDate: e.target.value})}
                  className="accent-blue-900 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.gender} 
                onValueChange={(val: any) => setFormData({...formData, gender: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
              <Select
                value={formData.role}
                onValueChange={(val: any) => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Admin/HR">Admin/HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.designation || ''}
                onValueChange={(val) => setFormData({...formData, designation: val})}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIC">DIC</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.status} 
                onValueChange={(val: any) => setFormData({...formData, status: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                {isEditing ? 'Update Employee' : 'Save Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="rounded-2xl" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
          <DialogTitle className="sr-only">Employee Details</DialogTitle>
          <DialogDescription className="sr-only">Information about {viewingEmployee?.name}</DialogDescription>
          {viewingEmployee && (
            <>
              {/* Profile header */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', padding: '24px 24px 20px', borderBottom: '1px solid #eef2f7' }}>
                <div className="flex items-center gap-4">
                  <div className="rounded-full flex items-center justify-center text-xl font-bold" style={{ width: '60px', height: '60px', minWidth: '60px', flexShrink: 0, background: '#ffffff', border: '1px solid #e2e8f0', color: '#1d4ed8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    {viewingEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="text-lg font-bold text-slate-900 truncate">{viewingEmployee.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono" style={{ background: '#ffffff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>{viewingEmployee.eid}</span>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: roleBadge(viewingEmployee.role).bg, color: roleBadge(viewingEmployee.role).fg }}>{viewingEmployee.role}</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={viewingEmployee.status === 'Active' ? { background: '#f0fdf4', color: '#16a34a' } : { background: '#fef2f2', color: '#dc2626' }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: viewingEmployee.status === 'Active' ? '#16a34a' : '#dc2626' }} />
                        {viewingEmployee.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: 'Position', value: viewingEmployee.designation || '—' },
                  { label: 'Gender', value: viewingEmployee.gender || 'Not set' },
                  { label: 'Date of Birth', value: new Date(viewingEmployee.dob).toLocaleDateString() },
                  { label: 'Joining Date', value: viewingEmployee.joiningDate ? new Date(viewingEmployee.joiningDate).toLocaleDateString() : '—' },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-5 flex justify-end">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature Dialogs */}
      <Dialog open={isSigDialogOpen} onOpenChange={setIsSigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Signature</DialogTitle>
            <DialogDescription>
              Upload a signature image to use in timesheets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSigSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sigName">Signatory Name <span className="text-red-500">*</span></Label>
              <Input 
                id="sigName" 
                value={sigFormData.name || ''} 
                onChange={e => setSigFormData({...sigFormData, name: e.target.value})}
                placeholder="e.g., John Manager"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigRole">Role/Designation <span className="text-red-500">*</span></Label>
              <Input 
                id="sigRole" 
                value={sigFormData.role || ''} 
                onChange={e => setSigFormData({...sigFormData, role: e.target.value})}
                placeholder="e.g., HR Manager"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigImage">Signature Image <span className="text-red-500">*</span></Label>
              <div className="flex flex-col gap-2">
                <Input 
                  id="sigImage" 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  required
                />
                <p className="text-xs text-gray-500">Max size: 500KB. Transparent PNG recommended.</p>
              </div>
              {sigFormData.imageUrl && (
                <div className="mt-2 border rounded p-2 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="h-20 flex items-center justify-center">
                    <img src={sigFormData.imageUrl} alt="Preview" className="max-h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                Save Signature
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isSigDeleteOpen} onOpenChange={setIsSigDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signature?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSigDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
