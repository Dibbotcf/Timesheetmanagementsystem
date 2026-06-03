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

// --- Leave Config Constants ---
const LEAVE_LIMITS = {
  Casual: 10,
  Sick: 14,
  Annual: 16,
  Maternity: 120,
  Other: 9999 // Unlimited
};

export const LeaveManagement: React.FC = () => {
  const { employees, leaves, addLeave, updateLeave, deleteLeave, updateEmployee, deleteEmployee, currentUser, leaveFolders, addLeaveFolder, deleteLeaveFolder, savedLeaveReports, addSavedLeaveReport, deleteSavedLeaveReport, getItem } = useAppStore();
  
  const isStaff = currentUser?.role === 'Staff';

  const [viewMode, setViewMode] = useState<'individual' | 'list' | 'records' | 'pending'>('individual');
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
        days = differenceInDays(end, start) + 1;

        if (days <= 0) {
            toast.error("End date must be after start date");
            return;
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

  const globalPendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;

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
                                        {durationMode === 'full' && startDate && endDate && (
                                            <div className="p-3 bg-gray-50 rounded text-sm text-center">
                                                Calculated Duration: <span className="font-bold">{Math.max(0, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1)} Days</span>
                                            </div>
                                        )}
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
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-amber-800">
                        ⏳ Pending Leave Approvals
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{globalPendingLeavesCount}</Badge>
                    </div>
                </CardTitle>
                <CardDescription>Review and manage all pending leave requests.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Input 
                            placeholder="Search employee by name or ID..."
                            value={pendingSearchQuery}
                            onChange={(e) => setPendingSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    <Select value={pendingEmployeeFilter} onValueChange={setPendingEmployeeFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Employees" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Employees</SelectItem>
                            {employees.filter(e => e.status === 'Active').map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.eid})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <input 
                        type="month" 
                        value={pendingMonthFilter} 
                        onChange={e => setPendingMonthFilter(e.target.value)} 
                        className="h-10 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 w-[180px]"
                        title="Filter by month"
                    />
                    <Select value={pendingTypeFilter} onValueChange={setPendingTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
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
                
                <div className="space-y-3">
                    {(() => {
                        const pendingLeaves = leaves.filter(l => l.status === 'Pending');
                        const filtered = pendingLeaves.filter(leave => {
                            const emp = employees.find(e => e.id === leave.employeeId);
                            const matchesSearch = !pendingSearchQuery || 
                                (emp?.name || '').toLowerCase().includes(pendingSearchQuery.toLowerCase()) || 
                                (emp?.eid || '').toLowerCase().includes(pendingSearchQuery.toLowerCase());
                            const matchesType = pendingTypeFilter === 'All' || leave.type === pendingTypeFilter;
                            const matchesEmployee = pendingEmployeeFilter === 'All' || leave.employeeId === pendingEmployeeFilter;
                            
                            let matchesMonth = true;
                            if (pendingMonthFilter) {
                                const leaveStartMonth = leave.startDate.substring(0, 7);
                                const leaveEndMonth = leave.endDate.substring(0, 7);
                                matchesMonth = leaveStartMonth === pendingMonthFilter || leaveEndMonth === pendingMonthFilter;
                            }
                            
                            return matchesSearch && matchesType && matchesEmployee && matchesMonth;
                        });

                        if (filtered.length === 0) {
                            return (
                                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                    No pending leaves found matching your criteria.
                                </div>
                            );
                        }

                        return filtered.map(leave => {
                            const emp = employees.find(e => e.id === leave.employeeId);
                            return (
                                <div key={leave.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-amber-200 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{emp?.name ?? 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">({emp?.eid})</span>
                                            <Badge variant="outline" className="text-xs">{leave.type}</Badge>
                                            <span className="text-xs text-gray-600">{leave.partialHours ? `${leave.partialHours} hour${leave.partialHours > 1 ? 's' : ''}` : `${leave.days} day${leave.days > 1 ? 's' : ''}`}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {format(parseISO(leave.startDate), 'MMM dd')} – {format(parseISO(leave.endDate), 'MMM dd, yyyy')} · <span className="italic">"{leave.reason}"</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                                            onClick={() => { updateLeave(leave.id, { status: 'Approved' }); toast.success(`Leave approved for ${emp?.name}`); }}
                                        >
                                            <Check className="h-3 w-3" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-3 text-red-600 border-red-300 hover:bg-red-50 text-xs gap-1"
                                            onClick={() => { updateLeave(leave.id, { status: 'Rejected' }); toast.error(`Leave rejected for ${emp?.name}`); }}
                                        >
                                            <X className="h-3 w-3" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            );
                        });

                    })()}
                </div>
            </CardContent>
        </Card>
      ) : null}
    </div>
  );
};