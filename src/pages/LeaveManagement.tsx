import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarIcon, Plus, Trash2, User, AlertCircle, Settings, RefreshCw, LayoutList, UserSquare2, History, ArrowRightLeft, Folder, Save, File, Download, Eye, X, Check, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import { useAppStore, LeaveType, LeaveRequest, Employee, SavedLeaveReport } from '../App';
import { toast } from 'sonner@2.0.3';
import { format, differenceInDays, parseISO, addYears, differenceInYears } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';

// --- Hard Copy Deadline Helpers ---
function addWorkingDays(from: Date, days: number): Date {
  let count = 0;
  const d = new Date(from);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d;
}

function getHardCopyDeadlineDays(type: LeaveType, isPartial: boolean): number | null {
  if (type === 'Sick') return 5;
  if (type === 'Casual' || type === 'Annual') return 2;
  if (type === 'Other' && !isPartial) return 2;
  return null; // Maternity or partial Other — not applicable
}

function countLeaveDays(startStr: string, endStr: string, templates: import('../App').MonthTemplate[]): { working: number; skipped: number; skippedReasons: string[] } {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  let working = 0;
  let skipped = 0;
  const skippedReasons: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth(); // 0-indexed
    const d = cur.getDate();
    const tpl = templates.find(t => t.year === y && t.month === m);
    const holiday = tpl?.holidays.find(h => h.date === d);
    if (holiday) {
      skipped++;
      if (!skippedReasons.includes(holiday.reason)) skippedReasons.push(holiday.reason);
    } else {
      working++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { working, skipped, skippedReasons };
}

function getWorkingDayPath(from: Date, count: number): Date[] {
  const days: Date[] = [];
  const d = new Date(from);
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
  }
  return days;
}

// --- Leave Config Constants ---
const LEAVE_LIMITS = {
  Casual: 10,
  Sick: 14,
  Annual: 16,
  Maternity: 120,
  Other: 9999 // Unlimited
};

export const LeaveManagement: React.FC = () => {
  const { employees, leaves, addLeave, updateLeave, deleteLeave, updateEmployee, deleteEmployee, currentUser, leaveFolders, addLeaveFolder, deleteLeaveFolder, savedLeaveReports, addSavedLeaveReport, deleteSavedLeaveReport, getItem, templates } = useAppStore();
  
  const isStaff = currentUser?.role === 'Staff';
  const isDIC = isStaff && currentUser?.designation === 'DIC';

  const [viewMode, setViewMode] = useState<'individual' | 'list' | 'records' | 'pending' | 'dashboard'>('individual');
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [pendingTypeFilter, setPendingTypeFilter] = useState('All');
  const [pendingMonthFilter, setPendingMonthFilter] = useState('');
  const [pendingEmployeeFilter, setPendingEmployeeFilter] = useState('All');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSetLimitOpen, setIsSetLimitOpen] = useState(false);
  const [openEmployeeSelect, setOpenEmployeeSelect] = useState(false);

  // Transfer / Archive State
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(new Set());
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferFolderName, setTransferFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Report Viewing State
  const [viewReport, setViewReport] = useState<SavedLeaveReport | null>(null);
  
  // Initialize for Staff
  React.useEffect(() => {
      if (isStaff && currentUser) {
          setSelectedEmployeeId(currentUser.id);
          setViewMode('individual');
      }
  }, [isStaff, currentUser]);
  
  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  
  // Duration State
  const [durationMode, setDurationMode] = useState<'full' | 'half' | 'partial'>('full');
  const [partialHours, setPartialHours] = useState('');

  // Limit Editing State
  const [tempLimits, setTempLimits] = useState<Partial<Record<LeaveType, number | undefined>>>({});
  const [tempUsed, setTempUsed] = useState<Partial<Record<LeaveType, number | undefined>>>({});

  // History Month Filter
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Filter leaves for selected employee for display
  const employeeLeaves = leaves
    .filter(l => l.employeeId === selectedEmployeeId)
    .filter(l => {
        if (!historyMonthFilter) return true;
        const leaveStartMonth = l.startDate.substring(0, 7);
        const leaveEndMonth = l.endDate.substring(0, 7);
        return leaveStartMonth === historyMonthFilter || leaveEndMonth === historyMonthFilter;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // --- Helper Functions (reused for both views) ---

  const calculateEmployeeLeaveStats = (emp: Employee) => {
    const empLeaves = leaves.filter(l => l.employeeId === emp.id);
    
    // Only APPROVED leaves count against balances
    const actualUsedLeaves = empLeaves
      .filter(l => l.status === 'Approved')
      .reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + curr.days;
        return acc;
      }, {} as Record<LeaveType, number>);

    const yearsOfService = differenceInYears(new Date(), parseISO(emp.joiningDate));
    const isEligibleForAnnual = yearsOfService >= 1;
    const isEligibleForMaternity = emp.gender === 'Female';

    const getLimit = (type: LeaveType) => {
        if (emp.customLeaveLimits?.[type] !== undefined) {
            return emp.customLeaveLimits[type]!;
        }
        if (type === 'Annual') {
            return isEligibleForAnnual ? yearsOfService * 16 : 0;
        }
        return LEAVE_LIMITS[type];
    };

    const getUsed = (type: LeaveType) => {
        const fromRecords = actualUsedLeaves[type] || 0;
        const fromCustom = emp.customLeaveUsed?.[type] || 0;
        // Sum up custom start balance + actual records
        return fromRecords + fromCustom;
    };

    const getBalance = (type: LeaveType) => {
        // Logic: if custom limit exists, ignore eligibility.
        if (emp.customLeaveLimits?.[type] === undefined) {
            if (type === 'Annual' && !isEligibleForAnnual) return 0;
            if (type === 'Maternity' && !isEligibleForMaternity) return 0;
        }
        
        const limit = getLimit(type);
        const used = getUsed(type);
        return limit - used;
    };


    // Helper to format leave numbers (e.g. 10.5, 10, 0.38)
    const fmt = (n: number) => parseFloat(n.toFixed(2));

    return {
        yearsOfService,
        isEligibleForAnnual,
        isEligibleForMaternity,
        usedLeaves: actualUsedLeaves,
        getUsed,
        getLimit,
        getBalance,
        fmt // Export helper
    };
  };

  // Use the helper for the currently selected employee
  const currentStats = selectedEmployee ? calculateEmployeeLeaveStats(selectedEmployee) : null;

  const handleOpenSetLimits = () => {
    if (!selectedEmployee) return;
    // Load existing custom limits into temp state
    setTempLimits(selectedEmployee.customLeaveLimits || {});
    setTempUsed(selectedEmployee.customLeaveUsed || {});
    setIsSetLimitOpen(true);
  };

  const handleSaveLimits = () => {
    if (!selectedEmployeeId || !selectedEmployee) return;
    
    const changes: string[] = [];
    const cleanedLimits: Partial<Record<LeaveType, number>> = {};
    const cleanedUsed: Partial<Record<LeaveType, number>> = {};

    Object.keys(LEAVE_LIMITS).forEach(k => {
        const type = k as LeaveType;
        
        // Limits
        const newValLimit = tempLimits[type];
        const oldValLimit = selectedEmployee.customLeaveLimits?.[type];
        
        if (newValLimit !== undefined && newValLimit !== null && String(newValLimit) !== '') {
            cleanedLimits[type] = Number(newValLimit);
            if (oldValLimit !== Number(newValLimit)) {
                 changes.push(`${type} Limit: ${oldValLimit ?? 'Default'} -> ${Number(newValLimit)}`);
            }
        } else {
            // Resetting to default
            if (oldValLimit !== undefined) {
                 changes.push(`${type} Limit: ${oldValLimit} -> Default`);
            }
        }

        // Used
        const newValUsed = tempUsed[type];
        const oldValUsed = selectedEmployee.customLeaveUsed?.[type];

        if (newValUsed !== undefined && newValUsed !== null && String(newValUsed) !== '') {
            cleanedUsed[type] = Number(newValUsed);
            if (oldValUsed !== Number(newValUsed)) {
                 changes.push(`${type} Used: ${oldValUsed ?? 'Actual'} -> ${Number(newValUsed)}`);
            }
        } else {
             if (oldValUsed !== undefined) {
                 changes.push(`${type} Used: ${oldValUsed} -> Actual`);
            }
        }
    });

    let newHistory = selectedEmployee.limitHistory || [];
    if (changes.length > 0) {
        newHistory = [
            {
                date: new Date().toISOString(),
                editorId: currentUser?.id || 'unknown',
                editorName: currentUser?.name || 'Unknown',
                changes
            },
            ...newHistory
        ];
    }

    updateEmployee(selectedEmployeeId, {
        customLeaveLimits: cleanedLimits,
        customLeaveUsed: cleanedUsed,
        limitHistory: newHistory
    });
    setIsSetLimitOpen(false);
    toast.success("Leave limits updated successfully");
  };

  const handleSubmitLeave = () => {
    // 1. Validate basic fields
    if (!selectedEmployeeId || !leaveType || !reason) {
      toast.error("Please fill in all required fields (Type, Reason)");
      return;
    }

    // 2. Calculate Duration & Validate Dates
    let days = 0;
    let finalStartDate = startDate;
    let finalEndDate = endDate;

    if (durationMode === 'half') {
        if (!startDate) {
            toast.error("Please select a date");
            return;
        }
        days = 0.5;
        finalEndDate = startDate; // Single day
    } else if (durationMode === 'partial') {
        if (!startDate) {
            toast.error("Please select a date");
            return;
        }
        if (!partialHours || Number(partialHours) <= 0) {
            toast.error("Please enter valid hours");
            return;
        }
        days = 0; // Partial day does not count towards leave balance
        finalEndDate = startDate; // Single day
    } else {
        if (!startDate || !endDate) {
            toast.error("Please select start and end dates");
            return;
        }
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        if (differenceInDays(end, start) < 0) {
            toast.error("End date must be after start date");
            return;
        }
        const { working, skipped, skippedReasons } = countLeaveDays(startDate, endDate, templates);
        days = working;
        if (days <= 0) {
            toast.error("No working days in selected range — all selected dates are off-days");
            return;
        }
        if (skipped > 0) {
            toast.info(`${skipped} off-day${skipped > 1 ? 's' : ''} excluded (${skippedReasons.join(', ')}). Counting ${days} working day${days > 1 ? 's' : ''}.`);
        }
    }

    if (!currentStats) return;

    // 3. Check Eligibility
    if (selectedEmployee?.customLeaveLimits?.[leaveType] === undefined) {
        if (leaveType === 'Annual' && !currentStats.isEligibleForAnnual) {
          toast.error("Employee is not eligible for Annual Leave yet (needs 1 year service)");
          return;
        }
        
        if (leaveType === 'Maternity' && !currentStats.isEligibleForMaternity) {
          toast.error("Only female employees are eligible for Maternity Leave");
          return;
        }
    }

    // 4. Check Balance
    const currentBalance = currentStats.getBalance(leaveType);
    // Use a small epsilon for float comparison if needed, but strictly > is usually fine for "insufficient"
    if (days > currentBalance) {
      toast.error(`Insufficient balance. Available: ${currentBalance.toFixed(2)} days`);
      return;
    }

    addLeave({
      employeeId: selectedEmployeeId,
      type: leaveType,
      startDate: finalStartDate,
      endDate: finalEndDate,
      days,
      partialHours: durationMode === 'partial' ? Number(partialHours) : undefined,
      reason,
      // Staff submits as Pending; Admin/HR records are auto-Approved
      status: isStaff ? 'Pending' : 'Approved'
    });

    toast.success("Leave recorded successfully");
    setIsAddDialogOpen(false);
    // Reset form
    setLeaveType('Casual');
    setStartDate('');
    setEndDate('');
    setReason('');
    setDurationMode('full');
    setPartialHours('');
  };

  const openArchiveDialog = () => {
    setIsTransferDialogOpen(true);
    if (leaveFolders.length === 0) {
        setIsCreatingFolder(true);
    } else {
        setIsCreatingFolder(false);
        // Select the most recently created folder (last in list)
        setSelectedFolderId(leaveFolders[leaveFolders.length - 1].id);
    }
    setTransferFolderName('');
  };

  const handleTransfer = async () => {
    let folderId = selectedFolderId;
    
    if (isCreatingFolder) {
        if (!transferFolderName.trim()) {
            toast.error("Please enter a folder name");
            return;
        }
        // Create folder immediately
        const newId = await addLeaveFolder(transferFolderName.trim());
        if (newId) {
            folderId = newId;
        } else {
             toast.error("Failed to create folder");
             return;
        }
    } else {
        if (!folderId) {
            toast.error("Please select a destination folder");
            return;
        }
    }

    if (selectedForTransfer.size > 0) {
        // Generate Snapshot Data
        const selectedEmps = employees.filter(e => selectedForTransfer.has(e.id));
        const snapshotData = selectedEmps.map(emp => {
            const stats = calculateEmployeeLeaveStats(emp);
            return {
                id: emp.id,
                name: emp.name,
                eid: emp.eid,
                joiningDate: emp.joiningDate,
                stats: {
                    Casual: { limit: stats.getLimit('Casual'), used: stats.getUsed('Casual'), balance: stats.getBalance('Casual') },
                    Sick: { limit: stats.getLimit('Sick'), used: stats.getUsed('Sick'), balance: stats.getBalance('Sick') },
                    Annual: { limit: stats.getLimit('Annual'), used: stats.getUsed('Annual'), balance: stats.getBalance('Annual') },
                    Maternity: { limit: stats.getLimit('Maternity'), used: stats.getUsed('Maternity'), balance: stats.getBalance('Maternity') },
                }
            };
        });

        const generatedName = `Archive - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`;

        addSavedLeaveReport({
            folderId,
            name: generatedName,
            createdAt: new Date().toISOString(),
            data: snapshotData
        });

        toast.success("Leave records archived successfully!");
    } else {
        toast.success("Folder created successfully!");
    }

    setIsTransferDialogOpen(false);
    setSelectedForTransfer(new Set());
    setTransferFolderName('');
    setIsCreatingFolder(false);
  };

  const toggleSelectAll = () => {
    const activeEmps = employees.filter(e => e.status === 'Active');
    if (selectedForTransfer.size === activeEmps.length) {
        setSelectedForTransfer(new Set());
    } else {
        setSelectedForTransfer(new Set(activeEmps.map(e => e.id)));
    }
  };

  // --- Report View Render ---
  if (viewReport) {
     return (
         <div className="space-y-6 max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button variant="outline" onClick={() => setViewReport(null)}>
                        &larr; Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{viewReport.name}</h1>
                        <p className="text-gray-500 text-sm">Archived on {new Date(viewReport.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => window.print()}>
                    Print Record
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Casual (L/U/B)</TableHead>
                                <TableHead>Sick (L/U/B)</TableHead>
                                <TableHead>Annual (L/U/B)</TableHead>
                                <TableHead>Maternity (L/U/B)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {viewReport.data.map((row: any) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <div className="font-medium">{row.name}</div>
                                        <div className="text-xs text-gray-500">{row.eid}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {row.stats.Casual.limit} / {row.stats.Casual.used} / <span className="font-bold text-green-600">{row.stats.Casual.balance}</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {row.stats.Sick.limit} / {row.stats.Sick.used} / <span className="font-bold text-green-600">{row.stats.Sick.balance}</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {row.stats.Annual.limit} / {row.stats.Annual.used} / <span className="font-bold text-blue-600">{row.stats.Annual.balance}</span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                         {row.stats.Maternity.limit > 0 ? (
                                             `${row.stats.Maternity.limit} / ${row.stats.Maternity.used} / ${row.stats.Maternity.balance}`
                                         ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
         </div>
     );
  }

  const globalPendingLeavesCount = leaves.filter(l =>
    l.status === 'Pending' ||
    (l.status === 'Approved' && !l.hardCopyCollected && getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null)
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
            <p className="text-gray-500">Track and manage employee leave balances</p>
        </div>
        <div className="bg-white p-1 rounded-lg border shadow-sm inline-flex">
            <Button 
                variant={viewMode === 'individual' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('individual')}
                className="gap-2"
            >
                <UserSquare2 className="h-4 w-4" /> Individual
            </Button>
            <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="gap-2"
            >
                <LayoutList className="h-4 w-4" /> {isStaff ? 'My Summary' : 'All Employees'}
            </Button>
            {isDIC && (
                <Button
                    variant={viewMode === 'dashboard' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('dashboard')}
                    className="gap-2"
                >
                    <LayoutList className="h-4 w-4" /> Dashboard
                </Button>
            )}
             {!isStaff && (
                <>
                  <Button
                      variant={viewMode === 'records' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('records')}
                      className="gap-2"
                  >
                      <Folder className="h-4 w-4" /> Records
                  </Button>
                  <Button
                      variant={viewMode === 'pending' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('pending')}
                      className="gap-2"
                  >
                      <AlertCircle className="h-4 w-4 text-amber-500" /> Pending Leaves
                      {globalPendingLeavesCount > 0 && (
                          <Badge className="ml-1 bg-amber-500 hover:bg-amber-600 text-white">
                              {globalPendingLeavesCount}
                          </Badge>
                      )}
                  </Button>
                </>
            )}
        </div>
      </div>



      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Archive Leave Records</DialogTitle>
                <DialogDescription>
                    Save a snapshot of the current leave balances for {selectedForTransfer.size} employees.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
                    <p>You are about to archive leave records for <strong>{selectedForTransfer.size} employee(s)</strong>.</p>
                    <p className="mt-1 text-xs text-blue-600">These records will be saved as a snapshot in the selected folder.</p>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium block">Destination Folder</label>
                    
                    {!isCreatingFolder && leaveFolders.length > 0 ? (
                        <div className="space-y-3">
                            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Select a folder..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveFolders.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setIsCreatingFolder(true)} className="text-blue-600 h-8 px-2 text-xs">
                                    + Create New Folder
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Input 
                                placeholder="Enter new folder name (e.g. 2025 Archives)" 
                                value={transferFolderName} 
                                onChange={(e) => setTransferFolderName(e.target.value)}
                                autoFocus
                            />
                            {leaveFolders.length > 0 && (
                                <div className="flex justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => setIsCreatingFolder(false)} className="text-gray-500 h-8 px-2 text-xs">
                                        Cancel & Select Existing
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button 
                    onClick={handleTransfer} 
                    disabled={!isCreatingFolder && selectedForTransfer.size === 0}
                >
                    {isCreatingFolder 
                        ? (selectedForTransfer.size > 0 ? 'Create Folder & Archive' : 'Create Folder') 
                        : 'Archive Records'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === 'individual' ? (
        <>
            {/* Employee Selection */}
            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-1/3">
                            <label className="text-sm font-medium mb-1 block text-blue-900">
                                {isStaff ? 'Viewing Your Profile' : 'Select Employee to Manage'}
                            </label>
                            {isStaff ? (
                                <div className="p-2 bg-gray-100 rounded border border-gray-200 font-medium text-gray-700">
                                    {currentUser?.name} ({currentUser?.eid})
                                </div>
                            ) : (
                                <Popover open={openEmployeeSelect} onOpenChange={setOpenEmployeeSelect}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openEmployeeSelect}
                                            className="w-full justify-between bg-white border border-gray-200 shadow-sm font-normal hover:bg-gray-50 text-left px-3 h-10"
                                        >
                                            <span className="truncate flex-1">
                                                {selectedEmployeeId 
                                                    ? `${employees.find(e => e.id === selectedEmployeeId)?.name} (${employees.find(e => e.id === selectedEmployeeId)?.eid})`
                                                    : "Search employee..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 animate-none" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search employee..." />
                                            <CommandList>
                                                <CommandEmpty>No employee found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        key="nope"
                                                        value="Select None"
                                                        onSelect={() => {
                                                            setSelectedEmployeeId('');
                                                            setOpenEmployeeSelect(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${selectedEmployeeId === '' ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        Select None
                                                    </CommandItem>
                                                    {([...employees].sort((a, b) => {
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
                                                    })).map((emp) => (
                                                        <CommandItem
                                                            key={emp.id}
                                                            value={`${emp.name} ${emp.eid}`}
                                                            onSelect={() => {
                                                                setSelectedEmployeeId(emp.id);
                                                                setOpenEmployeeSelect(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"}`}
                                                            />
                                                            {emp.name} ({emp.eid})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                        {selectedEmployee && currentStats && (
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4 md:mt-0">
                                <div>
                                    <p className="text-gray-500">Joined</p>
                                    <p className="font-medium">{new Date(selectedEmployee.joiningDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status</p>
                                    <Badge variant={selectedEmployee.status === 'Active' ? 'default' : 'destructive'}>
                                        {selectedEmployee.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-gray-500">Gender</p>
                                    <p className="font-medium">{selectedEmployee.gender || 'Not Set'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Annual Leave Eligibility</p>
                                    <Badge variant={currentStats.isEligibleForAnnual ? 'default' : 'secondary'}>
                                        {currentStats.isEligibleForAnnual ? 'Eligible' : 'Not Eligible'}
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedEmployeeId && currentStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Leave Balances */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" /> Leave Balances
                            </h3>
                            {!isStaff && (
                                <Dialog open={isSetLimitOpen} onOpenChange={setIsSetLimitOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={handleOpenSetLimits} className="h-8">
                                            <Settings className="h-3.5 w-3.5 mr-1" /> Set
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                    <DialogHeader>
                                        <div className="flex justify-between items-center pr-4">
                                            <DialogTitle>Set Leave Limits & Usage</DialogTitle>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="View Change History">
                                                        <History className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 max-h-64 overflow-y-auto p-0" align="end">
                                                    <div className="p-3 border-b font-medium bg-gray-50 text-sm sticky top-0">Change History</div>
                                                    <div className="divide-y">
                                                        {selectedEmployee?.limitHistory && selectedEmployee.limitHistory.length > 0 ? (
                                                            selectedEmployee.limitHistory.map((entry, i) => (
                                                                <div key={i} className="p-3 text-sm">
                                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                                                                        <span>{entry.editorName}</span>
                                                                    </div>
                                                                    <ul className="list-disc list-inside text-xs space-y-0.5 text-gray-700">
                                                                        {entry.changes.map((change, j) => (
                                                                            <li key={j}>{change}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 text-center text-xs text-gray-500">No history recorded</div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <DialogDescription>
                                            Override default limits or manually set used days for {selectedEmployee?.name}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <div className="grid grid-cols-12 gap-2 mb-2 font-medium text-xs text-gray-500">
                                            <div className="col-span-3">Type</div>
                                            <div className="col-span-4">Limit Override</div>
                                            <div className="col-span-4">Starting Bal. / Adj.</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        <div className="space-y-3">
                                            {Object.keys(LEAVE_LIMITS).map(type => {
                                                const lType = type as LeaveType;
                                                
                                                // We need base defaults just for placeholder display
                                                let baseDefault = LEAVE_LIMITS[lType];
                                                if (lType === 'Annual') {
                                                    baseDefault = currentStats.isEligibleForAnnual ? currentStats.yearsOfService * 16 : 0;
                                                }

                                                const currentLimitVal = tempLimits[lType];
                                                const isLimitOverridden = currentLimitVal !== undefined;

                                                const currentUsedVal = tempUsed[lType];
                                                const isUsedOverridden = currentUsedVal !== undefined;
                                                const actualUsed = currentStats.usedLeaves[lType] || 0;

                                                return (
                                                    <div key={type} className="grid grid-cols-12 items-center gap-2">
                                                        <label className="text-sm font-medium col-span-3">{type}</label>
                                                        
                                                        {/* Limit Input */}
                                                        <div className="col-span-4 flex items-center gap-1">
                                                            <Input 
                                                                type="number" 
                                                                className="h-8 text-xs"
                                                                placeholder={`Def: ${baseDefault}`}
                                                                value={currentLimitVal !== undefined ? currentLimitVal : ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setTempLimits(prev => ({
                                                                        ...prev,
                                                                        [lType]: val === '' ? undefined : Number(val)
                                                                    }));
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Used Input */}
                                                        <div className="col-span-4 flex items-center gap-1">
                                                            <Input 
                                                                type="number" 
                                                                className="h-8 text-xs"
                                                                placeholder={`Act: ${actualUsed}`}
                                                                value={currentUsedVal !== undefined ? currentUsedVal : ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setTempUsed(prev => ({
                                                                        ...prev,
                                                                        [lType]: val === '' ? undefined : Number(val)
                                                                    }));
                                                                }}
                                                            />
                                                        </div>

                                                        <div className="col-span-1">
                                                            {(isLimitOverridden || isUsedOverridden) && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => {
                                                                        setTempLimits(prev => ({ ...prev, [lType]: undefined }));
                                                                        setTempUsed(prev => ({ ...prev, [lType]: undefined }));
                                                                    }}
                                                                    title="Reset All"
                                                                >
                                                                    <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleSaveLimits}>Save Changes</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            )}
                        </div>

                        {Object.entries(LEAVE_LIMITS).map(([type, defaultLimit]) => {
                            const lType = type as LeaveType;
                            
                            const limit = currentStats.getLimit(lType);
                            const balance = currentStats.getBalance(lType);
                            // const used = currentStats.usedLeaves[lType] || 0; // OLD
                            const used = currentStats.getUsed(lType);
                            
                            const isCustomLimit = selectedEmployee?.customLeaveLimits?.[lType] !== undefined;
                            const isCustomUsed = selectedEmployee?.customLeaveUsed?.[lType] !== undefined;
                            const isUnlimited = limit > 9000;
                            
                            // Visibility Logic
                            if (!isCustomLimit && !isCustomUsed) {
                                if (lType === 'Maternity' && !currentStats.isEligibleForMaternity) return null;
                            }

                            return (
                                <Card key={type} className={lType === 'Annual' && !currentStats.isEligibleForAnnual && !isCustomLimit ? 'opacity-60 bg-gray-50' : ''}>
                                    <CardContent className="pt-6 pb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-gray-700 flex items-center gap-2">
                                                {type} Leave
                                                {isCustomLimit && <Badge variant="secondary" className="text-[10px] h-5 px-1">Limit: Custom</Badge>}
                                            </span>
                                            {lType === 'Annual' && !currentStats.isEligibleForAnnual && !isCustomLimit && <Badge variant="outline">Locked</Badge>}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-1">
                                                    Used: {currentStats.fmt(used)}
                                                    {isCustomUsed && <Badge variant="secondary" className="text-[10px] h-4 px-1">Custom</Badge>}
                                                </span>
                                                <span className="text-gray-500">Limit: {isUnlimited ? '∞' : currentStats.fmt(limit)}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div 
                                                    className={`h-2.5 rounded-full ${balance < 2 ? 'bg-red-500' : 'bg-green-600'}`} 
                                                    style={{ width: isUnlimited ? '0%' : `${Math.min((used / limit) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-right text-sm font-bold text-blue-700">
                                                {isUnlimited ? 'Unlimited' : `${currentStats.fmt(balance)} days remaining`}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Leave History & Actions */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                            <h3 className="font-semibold text-lg">Leave History</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-500 font-medium">Filter:</label>
                                    <input 
                                        type="month" 
                                        value={historyMonthFilter} 
                                        onChange={e => setHistoryMonthFilter(e.target.value)} 
                                        className="h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                                        title="Clear to see all records"
                                    />
                                </div>
                                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-blue-600 hover:bg-blue-700">
                                            <Plus className="h-4 w-4 mr-2" /> Record Leave
                                        </Button>
                                    </DialogTrigger>
                                <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Record New Leave</DialogTitle>
                                    <DialogDescription>
                                        Fill in the details below to record a new leave.
                                    </DialogDescription>
                                </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Leave Type</label>
                                            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(LEAVE_LIMITS).map(type => (
                                                        <SelectItem 
                                                            key={type} 
                                                            value={type}
                                                            disabled={
                                                                (selectedEmployee?.customLeaveLimits?.[type as LeaveType] === undefined) && (
                                                                    (type === 'Maternity' && !currentStats.isEligibleForMaternity) ||
                                                                    (type === 'Annual' && !currentStats.isEligibleForAnnual)
                                                                )
                                                            }
                                                        >
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Duration Selection */}
                                        <div className="bg-gray-50 p-3 rounded-md border space-y-3">
                                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                                <span className="text-sm font-medium">Duration:</span>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            className="accent-black"
                                                            checked={durationMode === 'full'} 
                                                            onChange={() => setDurationMode('full')} 
                                                        /> 
                                                        Full Day(s)
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            className="accent-black"
                                                            checked={durationMode === 'half'} 
                                                            onChange={() => setDurationMode('half')} 
                                                        /> 
                                                        Half Day
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            className="accent-black"
                                                            checked={durationMode === 'partial'} 
                                                            onChange={() => setDurationMode('partial')} 
                                                        /> 
                                                        Partial Day / Hourly
                                                    </label>
                                                </div>
                                            </div>

                                            {durationMode === 'full' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Start Date</label>
                                                        <Input 
                                                            type="date" 
                                                            value={startDate} 
                                                            onChange={e => setStartDate(e.target.value)} 
                                                            className="bg-white [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">End Date</label>
                                                        <Input 
                                                            type="date" 
                                                            value={endDate} 
                                                            onChange={e => setEndDate(e.target.value)} 
                                                            className="bg-white [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {durationMode === 'half' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Date</label>
                                                        <Input 
                                                            type="date" 
                                                            value={startDate} 
                                                            onChange={e => {
                                                                setStartDate(e.target.value);
                                                                setEndDate(e.target.value);
                                                            }} 
                                                            className="bg-white [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                                                        />
                                                    </div>
                                                    <div className="space-y-2 flex flex-col justify-center pt-6">
                                                        <p className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md inline-block">
                                                            Counts as 0.5 Days
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {durationMode === 'partial' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Date</label>
                                                        <Input 
                                                            type="date" 
                                                            value={startDate} 
                                                            onChange={e => {
                                                                setStartDate(e.target.value);
                                                                setEndDate(e.target.value);
                                                            }} 
                                                            className="bg-white [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Hours</label>
                                                        <Input 
                                                            type="number" 
                                                            min="0.5"
                                                            max="24"
                                                            step="0.5"
                                                            placeholder="e.g. 4"
                                                            value={partialHours} 
                                                            onChange={e => setPartialHours(e.target.value)}
                                                            className="bg-white" 
                                                        />
                                                        <p className="text-[10px] text-gray-500 text-right">
                                                            Does not affect leave balance
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Reason</label>
                                            <Textarea 
                                                placeholder="Enter reason for leave..." 
                                                value={reason}
                                                onChange={e => setReason(e.target.value)}
                                            />
                                        </div>
                                        {durationMode === 'full' && startDate && endDate && (() => {
                                            const preview = countLeaveDays(startDate, endDate, templates);
                                            const calDays = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
                                            if (calDays <= 0) return null;
                                            return (
                                                <div style={{ padding: '10px 14px', background: preview.working === 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', border: `1px solid ${preview.working === 0 ? '#fecaca' : '#bbf7d0'}` }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '13px', color: '#374151' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '16px', color: preview.working === 0 ? '#dc2626' : '#15803d' }}>{preview.working}</span> working day{preview.working !== 1 ? 's' : ''} will be deducted
                                                        </span>
                                                        {preview.skipped > 0 && (
                                                            <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #e5e7eb' }}>
                                                                {preview.skipped} off-day{preview.skipped > 1 ? 's' : ''} skipped: {preview.skippedReasons.join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                <DialogFooter>
                                    <Button onClick={handleSubmitLeave}>Confirm & Save</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                            </div>
                        </div>

                        {employeeLeaves.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <User className="h-12 w-12 mb-2 opacity-20" />
                                    <p>No leave records found for this employee.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {employeeLeaves.map(leave => {
                                    const isPending = leave.status === 'Pending';
                                    const isRejected = leave.status === 'Rejected';
                                    return (
                                    <Card key={leave.id} className={isPending ? 'border-amber-300 bg-amber-50' : isRejected ? 'border-red-200 bg-red-50' : ''}>
                                        <CardContent className="p-4 flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <Badge variant="outline">{leave.type}</Badge>
                                                    <span className="text-sm font-medium text-gray-500">
                                                        {leave.partialHours ? `${leave.partialHours} Hour${leave.partialHours > 1 ? 's' : ''}` : `${leave.days} Day${leave.days > 1 ? 's' : ''}`}
                                                    </span>
                                                    {/* Status Badge */}
                                                    {isPending && <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">⏳ Pending</Badge>}
                                                    {isRejected && <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">✗ Rejected</Badge>}
                                                    {leave.status === 'Approved' && <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">✓ Approved</Badge>}
                                                </div>
                                                <h4 className="font-bold text-sm">
                                                    {format(parseISO(leave.startDate), 'MMM dd, yyyy')} - {format(parseISO(leave.endDate), 'MMM dd, yyyy')}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                                                {/* Hard copy status */}
                                                {(() => {
                                                    const hcDays = getHardCopyDeadlineDays(leave.type, !!leave.partialHours);
                                                    if (hcDays === null) return null;
                                                    return (
                                                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {leave.hardCopyCollected ? (
                                                                <>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#16a34a', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                                                                        <Check className="h-2.5 w-2.5" /> Hard copy received
                                                                    </span>
                                                                    {!isStaff && isPending && (
                                                                        <button
                                                                            onClick={() => updateLeave(leave.id, { hardCopyCollected: false })}
                                                                            style={{ fontSize: '10px', color: '#94a3b8', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '1px 6px', cursor: 'pointer' }}
                                                                        >
                                                                            Undo
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f59e0b', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                                                                        <AlertCircle className="h-2.5 w-2.5" /> Hard copy not submitted
                                                                    </span>
                                                                    {!isStaff && (
                                                                        <button
                                                                            onClick={() => updateLeave(leave.id, { hardCopyCollected: true })}
                                                                            style={{ fontSize: '10px', color: '#374151', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '5px', padding: '1px 6px', cursor: 'pointer' }}
                                                                        >
                                                                            Mark received
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* Admin approve/reject buttons for Pending */}
                                                {!isStaff && isPending && (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            title="Approve"
                                                            onClick={() => {
                                                                updateLeave(leave.id, { status: 'Approved' });
                                                                toast.success('Leave approved');
                                                            }}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                            title="Reject"
                                                            onClick={() => {
                                                                updateLeave(leave.id, { status: 'Rejected' });
                                                                toast.error('Leave rejected');
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {!isStaff && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                        onClick={() => {
                                                            if(confirm('Delete this leave record?')) deleteLeave(leave.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-lg border border-dashed">
                    <User className="h-16 w-16 mb-4 opacity-20" />
                    <p>Please select an employee to view and manage leaves</p>
                </div>
            )}
        </>
      ) : viewMode === 'list' ? (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{isStaff ? 'My Leave Summary' : 'All Employees Leave Summary'}</CardTitle>
                    <CardDescription>{isStaff ? 'Overview of your leave balances' : 'Overview of leave balances across all active employees'}</CardDescription>
                </div>
                {!isStaff && (
                    <Button 
                        variant="outline" 
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={openArchiveDialog}
                        disabled={selectedForTransfer.size === 0}
                    >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Archive Selected ({selectedForTransfer.size})
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {!isStaff && (
                                <TableHead className="w-10">
                                    <Checkbox 
                                        checked={selectedForTransfer.size > 0 && selectedForTransfer.size === employees.filter(e => e.status === 'Active').length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                            )}
                            <TableHead>Employee</TableHead>
                            <TableHead>Joining Date</TableHead>
                            <TableHead>Casual</TableHead>
                            <TableHead>Sick</TableHead>
                            <TableHead>Annual</TableHead>
                            <TableHead>Maternity</TableHead>
                            <TableHead>Total C</TableHead>
                            <TableHead>Total S</TableHead>
                            <TableHead>Total A</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.filter(e => e.status === 'Active' && (!isStaff || e.id === currentUser?.id)).map(emp => {
                            const stats = calculateEmployeeLeaveStats(emp);
                            const isSelected = selectedForTransfer.has(emp.id);

                            return (
                                <TableRow key={emp.id} className={isSelected ? "bg-blue-50" : ""}>
                                    {!isStaff && (
                                        <TableCell>
                                            <Checkbox 
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    const newSet = new Set(selectedForTransfer);
                                                    if (checked) newSet.add(emp.id);
                                                    else newSet.delete(emp.id);
                                                    setSelectedForTransfer(newSet);
                                                }}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="font-medium">{emp.name}</div>
                                        <div className="text-xs text-gray-500">{emp.eid}</div>
                                    </TableCell>
                                    <TableCell>
                                        {format(parseISO(emp.joiningDate), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="text-gray-600">Limit: {stats.fmt(stats.getLimit('Casual'))}</span>
                                            <span className="text-gray-400">Used: {stats.fmt(stats.getUsed('Casual'))}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="text-gray-600">Limit: {stats.fmt(stats.getLimit('Sick'))}</span>
                                            <span className="text-gray-400">Used: {stats.fmt(stats.getUsed('Sick'))}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {stats.isEligibleForAnnual || emp.customLeaveLimits?.Annual !== undefined ? (
                                             <div className="flex flex-col text-xs">
                                                <span className="text-gray-600">Limit: {stats.fmt(stats.getLimit('Annual'))}</span>
                                                <span className="text-gray-400">Used: {stats.fmt(stats.getUsed('Annual'))}</span>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">N/A</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {stats.isEligibleForMaternity || emp.customLeaveLimits?.Maternity !== undefined ? (
                                             <div className="flex flex-col text-xs">
                                                <span className="text-gray-600">Limit: {stats.fmt(stats.getLimit('Maternity'))}</span>
                                                <span className="text-gray-400">Used: {stats.fmt(stats.getUsed('Maternity'))}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-bold text-green-700">
                                            {stats.fmt(stats.getBalance('Casual'))} Remain
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-bold text-green-700">
                                            {stats.fmt(stats.getBalance('Sick'))} Remain
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-bold text-blue-700">
                                            {(stats.isEligibleForAnnual || emp.customLeaveLimits?.Annual !== undefined) ? (
                                                `${stats.fmt(stats.getBalance('Annual'))} Remain`
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                                setSelectedEmployeeId(emp.id);
                                                setViewMode('individual');
                                            }}
                                            className="mr-2"
                                        >
                                            Manage
                                        </Button>
                                        {!isStaff && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete employee ${emp.name}? This action cannot be undone.`)) {
                                                        deleteEmployee(emp.id);
                                                        toast.success("Employee deleted successfully");
                                                    }
                                                }}
                                                title="Delete Employee"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      ) : viewMode === 'records' ? (
        // Records View
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-bold tracking-tight">Archived Leave Records</h2>
                 <Button onClick={() => {
                     setIsTransferDialogOpen(true);
                     setIsCreatingFolder(true);
                 }}>
                     <Plus className="mr-2 h-4 w-4" /> New Archive Folder
                 </Button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {leaveFolders.map(folder => (
                     <Card key={folder.id} className="hover:shadow-md transition-shadow">
                         <CardHeader className="pb-2">
                             <div className="flex justify-between items-start">
                                 <Folder className="h-8 w-8 text-yellow-500" />
                                 <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => {
                                     if(confirm('Delete folder and all its reports?')) deleteLeaveFolder(folder.id);
                                 }}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                             </div>
                             <CardTitle className="mt-2">{folder.name}</CardTitle>
                             <CardDescription>Created: {new Date(folder.createdAt).toLocaleDateString()}</CardDescription>
                         </CardHeader>
                         <CardContent>
                             <div className="space-y-2">
                                 {savedLeaveReports.filter(r => r.folderId === folder.id).length === 0 ? (
                                     <p className="text-xs text-gray-400 italic">No reports</p>
                                 ) : (
                                     savedLeaveReports.filter(r => r.folderId === folder.id).map(report => (
                                         <div key={report.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer group" 
                                            onClick={async () => {
                                                if (report.data) {
                                                    setViewReport(report);
                                                } else {
                                                    const fullReport = await getItem('saved_leave_reports', report.id);
                                                    if (fullReport) setViewReport(fullReport);
                                                }
                                            }}
                                         >
                                             <div className="flex items-center gap-2">
                                                 <File className="h-4 w-4 text-blue-500" />
                                                 <span className="text-sm font-medium truncate max-w-[150px]">{report.name}</span>
                                             </div>
                                             <Button 
                                                 variant="ghost" 
                                                 size="icon" 
                                                 className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     if(confirm('Delete this report?')) deleteSavedLeaveReport(report.id);
                                                 }}
                                             >
                                                 <X className="h-3 w-3" /> {/* Actually need to import X or trash */}
                                                 <Trash2 className="h-3 w-3 text-red-500" />
                                             </Button>
                                         </div>
                                     ))
                                 )}
                             </div>
                         </CardContent>
                     </Card>
                 ))}
             </div>
         </div>
      ) : viewMode === 'pending' && !isStaff ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ── Header Card ── */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {/* Title + Stats */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Leave Approvals</h2>
                                <span style={{ background: '#f59e0b', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>{globalPendingLeavesCount}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', margin: '3px 0 0' }}>Review pending requests · Track document submissions</p>
                        </div>
                        {/* Live stat chips */}
                        {(() => {
                            const allItems = leaves.filter(l =>
                                l.status === 'Pending' ||
                                (l.status === 'Approved' && !l.hardCopyCollected && getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null)
                            );
                            const todayMid = new Date(); todayMid.setHours(0,0,0,0);
                            const overdueN = allItems.filter(l => {
                                const dd = getHardCopyDeadlineDays(l.type, !!l.partialHours);
                                if (!dd || l.hardCopyCollected) return false;
                                const dl = addWorkingDays(l.createdAt ? new Date(l.createdAt) : parseISO(l.startDate), dd);
                                dl.setHours(0,0,0,0);
                                return todayMid > dl;
                            }).length;
                            const pendingApprovalN = allItems.filter(l => l.status === 'Pending').length;
                            const awaitingDocN = allItems.filter(l => l.status === 'Approved').length;
                            return (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {overdueN > 0 && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px' }}>
                                            <AlertCircle className="h-3 w-3" /> {overdueN} Overdue
                                        </span>
                                    )}
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px' }}>
                                        <RefreshCw className="h-3 w-3" /> {pendingApprovalN} Needs Approval
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px' }}>
                                        <History className="h-3 w-3" /> {awaitingDocN} Awaiting Document
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                {/* Filters */}
                <div style={{ padding: '14px 24px', display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#fafafa' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                        <Input placeholder="Search employee by name or ID..." value={pendingSearchQuery} onChange={(e) => setPendingSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <Select value={pendingEmployeeFilter} onValueChange={setPendingEmployeeFilter}>
                        <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="All Employees" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Employees</SelectItem>
                            {employees.filter(e => e.status === 'Active').map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.eid})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <input type="month" value={pendingMonthFilter} onChange={e => setPendingMonthFilter(e.target.value)}
                        className="h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                        style={{ minWidth: '150px' }} title="Filter by month" />
                    <Select value={pendingTypeFilter} onValueChange={setPendingTypeFilter}>
                        <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Types</SelectItem>
                            <SelectItem value="Casual">Casual</SelectItem>
                            <SelectItem value="Sick">Sick</SelectItem>
                            <SelectItem value="Annual">Annual</SelectItem>
                            <SelectItem value="Maternity">Maternity</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── Leave Cards ── */}
            {(() => {
                const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#14b8a6','#3b82f6','#f59e0b','#10b981'];
                const TYPE_COLORS: Record<string, string> = { Casual: '#f59e0b', Sick: '#ef4444', Annual: '#3b82f6', Maternity: '#ec4899', Other: '#8b5cf6' };

                const allLeaves = leaves.filter(l =>
                    l.status === 'Pending' ||
                    (l.status === 'Approved' && !l.hardCopyCollected && getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null)
                );
                const filtered = allLeaves.filter(leave => {
                    const emp = employees.find(e => e.id === leave.employeeId);
                    const matchesSearch = !pendingSearchQuery ||
                        (emp?.name || '').toLowerCase().includes(pendingSearchQuery.toLowerCase()) ||
                        (emp?.eid || '').toLowerCase().includes(pendingSearchQuery.toLowerCase());
                    const matchesType = pendingTypeFilter === 'All' || leave.type === pendingTypeFilter;
                    const matchesEmployee = pendingEmployeeFilter === 'All' || leave.employeeId === pendingEmployeeFilter;
                    let matchesMonth = true;
                    if (pendingMonthFilter) {
                        matchesMonth = leave.startDate.substring(0,7) === pendingMonthFilter || leave.endDate.substring(0,7) === pendingMonthFilter;
                    }
                    return matchesSearch && matchesType && matchesEmployee && matchesMonth;
                });

                if (filtered.length === 0) return (
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px dashed #e2e8f0', padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }}>All caught up!</p>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>No pending leave requests match your filters.</p>
                    </div>
                );

                // Sort: overdue first → pending approval → awaiting doc, then by deadline
                const todayMid = new Date(); todayMid.setHours(0,0,0,0);
                const withMeta = filtered.map(l => {
                    const dd = getHardCopyDeadlineDays(l.type, !!l.partialHours);
                    const applied = l.createdAt ? new Date(l.createdAt) : parseISO(l.startDate);
                    const dl = dd !== null ? addWorkingDays(applied, dd) : null;
                    if (dl) dl.setHours(0,0,0,0);
                    const overdue = dl ? todayMid > dl && !l.hardCopyCollected : false;
                    return { l, dl, overdue, dd, applied };
                });
                withMeta.sort((a, b) => {
                    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
                    if (a.l.status !== b.l.status) return a.l.status === 'Pending' ? -1 : 1;
                    if (a.dl && b.dl) return a.dl.getTime() - b.dl.getTime();
                    return 0;
                });

                return withMeta.map(({ l: leave, dl: deadline, overdue: isOverdue, dd: deadlineDays, applied: appliedDate }) => {
                    const emp = employees.find(e => e.id === leave.employeeId);
                    const needsHardCopy = deadline !== null;
                    const canApprove = !needsHardCopy || !!leave.hardCopyCollected;
                    const isAlreadyApproved = leave.status === 'Approved';
                    const initials = (emp?.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
                    const avatarColor = AVATAR_COLORS[(emp?.name || 'U').charCodeAt(0) % AVATAR_COLORS.length];
                    const typeColor = TYPE_COLORS[leave.type] || '#64748b';
                    const accentColor = isOverdue ? '#ef4444' : isAlreadyApproved ? '#3b82f6' : '#f59e0b';
                    const workingDays = deadlineDays !== null ? getWorkingDayPath(appliedDate, deadlineDays) : [];

                    return (
                        <div key={leave.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${accentColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '10px 16px' }}>
                            {/* Single compact row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                {/* Avatar */}
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '12px' }}>{initials}</span>
                                </div>

                                {/* Employee info */}
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{emp?.name ?? 'Unknown'}</span>
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{emp?.eid}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', background: `${typeColor}18`, color: typeColor, fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${typeColor}25` }}>{leave.type}</span>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>{leave.partialHours ? `${leave.partialHours} hr` : `${leave.days} day${leave.days > 1 ? 's' : ''}`}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                        <span style={{ color: '#475569' }}>{format(parseISO(leave.startDate), 'MMM dd')} – {format(parseISO(leave.endDate), 'MMM dd, yyyy')}</span>
                                        <span style={{ margin: '0 4px' }}>·</span>
                                        <span style={{ fontStyle: 'italic' }}>"{leave.reason}"</span>
                                    </div>
                                </div>

                                {/* Timeline circles (only when hard copy pending) */}
                                {needsHardCopy && !leave.hardCopyCollected && (
                                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                        {workingDays.map((d, i, arr) => {
                                            const isDeadlineDay = i === arr.length - 1;
                                            const dNorm = new Date(d); dNorm.setHours(0,0,0,0);
                                            const isPastDay = dNorm < todayMid;
                                            const isTodayDay = dNorm.getTime() === todayMid.getTime();
                                            let bg = '#fff', border = '#e2e8f0', col = '#94a3b8', fw: number = 500;
                                            if (isDeadlineDay) { bg = isOverdue ? '#ef4444' : '#f59e0b'; border = bg; col = '#fff'; fw = 700; }
                                            else if (isPastDay) { bg = '#f1f5f9'; border = '#e2e8f0'; col = '#cbd5e1'; }
                                            else if (isTodayDay) { border = '#3b82f6'; col = '#1d4ed8'; fw = 700; }
                                            return (
                                                <React.Fragment key={i}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: bg, border: `2px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                                            <span style={{ fontSize: '6px', color: col, fontWeight: 600, textTransform: 'uppercase' }}>{format(d, 'MMM')}</span>
                                                            <span style={{ fontSize: '12px', color: col, fontWeight: fw }}>{format(d, 'd')}</span>
                                                        </div>
                                                        <span style={{ fontSize: '7px', color: isDeadlineDay ? (isOverdue ? '#ef4444' : '#f59e0b') : 'transparent', fontWeight: 700, lineHeight: 1 }}>Deadline</span>
                                                    </div>
                                                    {i < arr.length - 1 && <div style={{ width: '10px', height: '2px', background: '#e2e8f0', marginBottom: '9px', flexShrink: 0 }} />}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Doc received badge */}
                                {leave.hardCopyCollected && needsHardCopy && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>
                                        <Check className="h-2.5 w-2.5" /> Doc received
                                    </span>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    {/* Mark received button */}
                                    {needsHardCopy && !leave.hardCopyCollected && (
                                        <button
                                            onClick={() => updateLeave(leave.id, { hardCopyCollected: true })}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '7px', border: '1.5px solid #bfdbfe', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                                        >
                                            <File className="h-3 w-3" /> Mark Received
                                        </button>
                                    )}
                                    {/* Approve/Reject */}
                                    {!isAlreadyApproved && (
                                        <>
                                            {leave.hardCopyCollected ? (
                                                <>
                                                    <button
                                                        onClick={() => updateLeave(leave.id, { hardCopyCollected: false })}
                                                        style={{ fontSize: '10px', color: '#94a3b8', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >Undo</button>
                                                    <button
                                                        onClick={() => { updateLeave(leave.id, { status: 'Approved' }); toast.success(`Leave approved for ${emp?.name}`); }}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#15803d')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}
                                                    ><Check className="h-3 w-3" /> Approve</button>
                                                </>
                                            ) : !needsHardCopy ? (
                                                <button
                                                    onClick={() => { updateLeave(leave.id, { status: 'Approved' }); toast.success(`Leave approved for ${emp?.name}`); }}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#15803d')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}
                                                ><Check className="h-3 w-3" /> Approve</button>
                                            ) : (
                                                <button
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#94a3b8', fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '9999px', border: 'none', cursor: 'not-allowed', opacity: 0.45 }}
                                                    title="Mark document received first"
                                                ><Check className="h-3 w-3" /> Approve</button>
                                            )}
                                            <button
                                                onClick={() => { updateLeave(leave.id, { status: 'Rejected' }); toast.error(`Leave rejected for ${emp?.name}`); }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: isOverdue ? '#ef4444' : 'transparent', color: isOverdue ? '#fff' : '#ef4444', fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '9999px', border: '1.5px solid #ef4444', cursor: 'pointer' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = isOverdue ? '#ef4444' : 'transparent'; e.currentTarget.style.color = isOverdue ? '#fff' : '#ef4444'; }}
                                            ><X className="h-3 w-3" /> Reject</button>
                                        </>
                                    )}
                                    {/* Status pill */}
                                    {isOverdue && !leave.hardCopyCollected ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '3px 7px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                                            <AlertCircle className="h-2.5 w-2.5" /> Overdue
                                        </span>
                                    ) : isAlreadyApproved ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#2563eb', color: '#fff', fontSize: '9px', fontWeight: 600, padding: '3px 7px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                                            <Check className="h-2.5 w-2.5" /> Awaiting Doc
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontSize: '9px', fontWeight: 600, padding: '3px 7px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                                            Needs Approval
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                });
            })()}
        </div>
      ) : viewMode === 'dashboard' && isDIC ? (() => {
        const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#14b8a6','#3b82f6','#f59e0b','#10b981'];
        const TYPE_COLORS: Record<string, string> = { Casual: '#f59e0b', Sick: '#ef4444', Annual: '#3b82f6', Maternity: '#ec4899', Other: '#8b5cf6' };
        const todayMid = new Date(); todayMid.setHours(0,0,0,0);

        const myPending = leaves.filter(l => l.employeeId === currentUser!.id && l.status === 'Pending');
        const othersPending = leaves.filter(l => l.employeeId !== currentUser!.id && (
            l.status === 'Pending' ||
            (l.status === 'Approved' && !l.hardCopyCollected && getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null)
        ));

        const renderCard = (leave: typeof leaves[0], showName: boolean) => {
            const emp = employees.find(e => e.id === leave.employeeId);
            const dd = getHardCopyDeadlineDays(leave.type, !!leave.partialHours);
            const applied = leave.createdAt ? new Date(leave.createdAt) : parseISO(leave.startDate);
            const dl = dd !== null ? addWorkingDays(applied, dd) : null;
            if (dl) dl.setHours(0,0,0,0);
            const isOverdue = dl ? todayMid > dl && !leave.hardCopyCollected : false;
            const workingDays = dd !== null ? getWorkingDayPath(applied, dd) : [];
            const typeColor = TYPE_COLORS[leave.type] || '#64748b';
            const avatarColor = AVATAR_COLORS[(emp?.name || 'U').charCodeAt(0) % AVATAR_COLORS.length];
            const initials = (emp?.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
            const accentColor = isOverdue ? '#ef4444' : leave.status === 'Approved' ? '#3b82f6' : '#f59e0b';
            return (
                <div key={leave.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${accentColor}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {showName && (
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '11px' }}>{initials}</span>
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: '140px' }}>
                        {showName && <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{emp?.name ?? 'Unknown'} <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>{emp?.eid}</span></div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: showName ? '2px' : 0 }}>
                            <span style={{ display: 'inline-flex', background: `${typeColor}18`, color: typeColor, fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${typeColor}25` }}>{leave.type}</span>
                            <span style={{ fontSize: '11px', color: '#475569' }}>{format(parseISO(leave.startDate), 'MMM dd')} – {format(parseISO(leave.endDate), 'MMM dd, yyyy')}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>"{leave.reason}"</span>
                        </div>
                    </div>
                    {workingDays.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            {workingDays.map((d, i, arr) => {
                                const isDeadlineDay = i === arr.length - 1;
                                const dNorm = new Date(d); dNorm.setHours(0,0,0,0);
                                const isPastDay = dNorm < todayMid;
                                const isTodayDay = dNorm.getTime() === todayMid.getTime();
                                let bg = '#fff', border = '#e2e8f0', col = '#94a3b8', fw: number = 500;
                                if (isDeadlineDay) { bg = isOverdue ? '#ef4444' : '#f59e0b'; border = bg; col = '#fff'; fw = 700; }
                                else if (isPastDay) { bg = '#f1f5f9'; border = '#e2e8f0'; col = '#cbd5e1'; }
                                else if (isTodayDay) { border = '#3b82f6'; col = '#1d4ed8'; fw = 700; }
                                return (
                                    <React.Fragment key={i}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: bg, border: `2px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                                <span style={{ fontSize: '6px', color: col, fontWeight: 600, textTransform: 'uppercase' }}>{format(d, 'MMM')}</span>
                                                <span style={{ fontSize: '11px', color: col, fontWeight: fw }}>{format(d, 'd')}</span>
                                            </div>
                                            <span style={{ fontSize: '6px', color: isDeadlineDay ? (isOverdue ? '#ef4444' : '#f59e0b') : 'transparent', fontWeight: 700, lineHeight: 1 }}>Deadline</span>
                                        </div>
                                        {i < arr.length - 1 && <div style={{ width: '8px', height: '2px', background: '#e2e8f0', marginBottom: '8px', flexShrink: 0 }} />}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                    {isOverdue && !leave.hardCopyCollected ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', flexShrink: 0 }}><AlertCircle className="h-2.5 w-2.5" /> Overdue</span>
                    ) : leave.status === 'Approved' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#2563eb', color: '#fff', fontSize: '9px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', flexShrink: 0 }}><Check className="h-2.5 w-2.5" /> Awaiting Doc</span>
                    ) : (
                        <span style={{ display: 'inline-flex', background: '#f59e0b', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px', flexShrink: 0 }}>Pending</span>
                    )}
                </div>
            );
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* My Pending Leaves */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>My Pending Leaves</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 7px', borderRadius: '9999px' }}>{myPending.length}</span>
                    </div>
                    {myPending.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>No pending leaves</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {myPending.map(l => renderCard(l, false))}
                        </div>
                    )}
                </div>

                {/* Others Pending Leaves */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Others Pending Leaves</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 7px', borderRadius: '9999px' }}>{othersPending.length}</span>
                    </div>
                    {othersPending.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>No pending leaves from others</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {othersPending.map(l => renderCard(l, true))}
                        </div>
                    )}
                </div>
            </div>
        );
      })() : null}
    </div>
  );
};