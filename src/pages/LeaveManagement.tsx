import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarIcon, Plus, Trash2, User, AlertCircle, Settings, RefreshCw, LayoutList, UserSquare2, History, ArrowRightLeft, Folder, Save, File, Download, Eye, X, Check, ChevronsUpDown, Paperclip, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import { useAppStore, LeaveType, LeaveRequest, LeaveRecord, Employee, SavedLeaveReport } from '../App';
import { signAsHr, signToApprove, HR_SIGN_UNDO } from '../components/SignaturePin';
import { AnimatedSearch } from '../components/AnimatedSearch';
import { toast } from 'sonner@2.0.3';
import { format, differenceInDays, parseISO, addYears, differenceInYears } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { CASUAL_CRITERIA, CASUAL_CRITERIA_NOTE, getCasualCriterion } from '../lib/leaveCriteria';
import { countLeaveDays, addWorkingDays, getWorkingDayPath, getHardCopyDeadlineDays, hardCopyBaseDate } from '../lib/leaveDays';
import { LeaveRecordsView } from '../components/LeaveRecordsView';
import { LeaveApprovalsView } from '../components/LeaveApprovalsView';
import { uploadLeaveFile, deleteLeaveFile, formatBytes, MAX_FILE_BYTES } from '../utils/leaveFiles';

// --- Leave Config Constants ---
const LEAVE_LIMITS = {
  Casual: 10,
  Sick: 14,
  Annual: 16,
  Maternity: 120,
  Other: 9999 // Unlimited
};

const SELECTED_TYPE_COLOR = '#2563eb'; // single blue for the chosen tile, badge and confirm button
// Words that usually mean the leave should be Sick, not Casual — used only for a soft warning
const ILLNESS_WORDS = /\b(sick|ill|illness|fever|flu|cold|doctor|hospital|clinic|medical|medicine|headache|pain|unwell|surgery|injur)/i;

// Employee-board search hints (AnimatedSearch types them out while the box is empty)
const SEARCH_HINTS = ['Search by name, EID or designation…', 'Try a name — e.g. Rabeya', 'Try an EID — e.g. TCF-52'];

export const LeaveManagement: React.FC = () => {
  const { employees, leaves, addLeave, updateLeave, deleteLeave, updateEmployee, deleteEmployee, currentUser, leaveFolders, addLeaveFolder, deleteLeaveFolder, savedLeaveReports, addSavedLeaveReport, deleteSavedLeaveReport, getItem, templates, signatures } = useAppStore();
  
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
  const [boardQuery, setBoardQuery] = useState(''); // search on the employee board (Individual tab, nobody selected)
  const [boardTab, setBoardTab] = useState<'active' | 'resigned'>('active');

  // Transfer / Archive State
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(new Set());
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferFolderName, setTransferFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Report Viewing State
  const [viewReport, setViewReport] = useState<SavedLeaveReport | null>(null);
  // Paper-style request form opens in its own tab (/leave/:id/view) so it can be printed/saved
  const openLeaveForm = (leave: LeaveRecord) => window.open(`/leave/${leave.id}/view`, '_blank');
  
  // Initialize for Staff
  React.useEffect(() => {
      if (isStaff && currentUser) {
          setSelectedEmployeeId(currentUser.id);
          setViewMode('individual');
      }
  }, [isStaff, currentUser]);
  
  // Form State — no default type: the user must pick one explicitly (Casual used to be pre-selected and got submitted by mistake)
  const [leaveType, setLeaveType] = useState<LeaveType | null>(null);
  // Required for Casual leaves recorded from now on; older records have no criteria and are left as-is
  const [casualCriteria, setCasualCriteria] = useState<number | null>(null);
  // Sick leave must come with evidence (medical certificate / prescription) — PDF or image, max 5 MB
  const [sickEvidence, setSickEvidence] = useState<File | null>(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const sickEvidenceInputRef = React.useRef<HTMLInputElement>(null);
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

  const handleSubmitLeave = async () => {
    // 1. Validate basic fields
    if (!leaveType) {
      toast.error("Select a leave type first");
      return;
    }
    if (leaveType === 'Casual' && !casualCriteria) {
      toast.error("Select the casual leave criteria");
      return;
    }
    if (leaveType === 'Sick' && !sickEvidence) {
      toast.error("Attach the supporting document (PDF or image) for sick leave");
      return;
    }
    if (!selectedEmployeeId || !reason) {
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

    // No signing here: every leave — staff, Admin/HR and Superadmin alike — is saved as Pending. The Maker
    // signature is the applicant's own linked signature (added automatically on the form); the leave is approved
    // only after the HR sign and then the Final sign in Pending Leaves.

    // The evidence file is linked to the leave id, so the id is fixed up front and the file goes up first.
    const leaveId = Math.random().toString(36).substr(2, 9);
    setIsSubmittingLeave(true);
    let evidenceMeta: import('../App').LeaveAttachment | undefined;
    try {
      if (leaveType === 'Sick' && sickEvidence) {
        const rec = await uploadLeaveFile({ leaveId, kind: 'supporting_doc', file: sickEvidence, uploadedBy: currentUser?.name });
        evidenceMeta = { id: rec.id, kind: 'supporting_doc', name: rec.name, mime: rec.mime, size: rec.size, uploadedAt: rec.uploadedAt, uploadedBy: rec.uploadedBy };
      }
      const created = await addLeave({
        id: leaveId,
        employeeId: selectedEmployeeId,
        type: leaveType,
        startDate: finalStartDate,
        endDate: finalEndDate,
        days,
        partialHours: durationMode === 'partial' ? Number(partialHours) : undefined,
        reason,
        casualCriteria: leaveType === 'Casual' && casualCriteria ? casualCriteria : undefined,
        attachments: evidenceMeta ? [evidenceMeta] : undefined,
        status: 'Pending', // approved only by HR sign → Final sign
      });
      if (!created) {
        if (evidenceMeta) await deleteLeaveFile(evidenceMeta.id); // don't leave an orphaned file behind
        setIsAddDialogOpen(true);
        return;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not upload the supporting document');
      setIsAddDialogOpen(true);
      return;
    } finally {
      setIsSubmittingLeave(false);
    }

    toast.success(isStaff ? 'Leave recorded successfully' : 'Leave recorded — waiting for HR sign, then Final sign (Pending Leaves)');
    setIsAddDialogOpen(false);
    // Reset form
    setLeaveType(null);
    setCasualCriteria(null);
    setSickEvidence(null);
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
        const selectedEmps = employees.filter(e => selectedForTransfer.has(e.id)).sort(byEid);
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

  // Employee lists run in EID serial order (TCF-15, TCF-23, … — same as the Employees page)
  const byEid = (a: Employee, b: Employee) => a.eid.localeCompare(b.eid, undefined, { numeric: true, sensitivity: 'base' });

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
            {/* Employee Selection — shown once someone is chosen (the board below handles "nobody yet") */}
            {(isStaff || selectedEmployeeId) && (
            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-1/3">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium block text-blue-900">
                                    {isStaff ? 'Viewing Your Profile' : 'Select Employee to Manage'}
                                </label>
                                {!isStaff && (
                                    <button type="button" onClick={() => { setSelectedEmployeeId(''); setBoardQuery(''); }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: '#1d4ed8', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                        <ArrowLeft className="h-3.5 w-3.5" /> Change employee
                                    </button>
                                )}
                            </div>
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
            )}

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

                        {/* Balances as one compact table: Used · Limit · Left per type, a thin usage bar under each row.
                            A number HR set by hand in the Set dialog sits in a soft indigo chip. */}
                        {(() => {
                            const GRID = '1fr 42px 42px 64px';
                            // Annual and Maternity have an eligibility rule, labelled (Eligible) / (Not eligible); a custom limit from HR counts as eligible.
                            // Maternity isn't listed at all for male employees (unless HR set a value for them).
                            const rows = (Object.keys(LEAVE_LIMITS) as LeaveType[]).filter(lType =>
                                lType !== 'Maternity' || currentStats.isEligibleForMaternity
                                || selectedEmployee?.customLeaveLimits?.Maternity !== undefined || selectedEmployee?.customLeaveUsed?.Maternity !== undefined);
                            const anyCustom = rows.some(t => selectedEmployee?.customLeaveLimits?.[t] !== undefined || selectedEmployee?.customLeaveUsed?.[t] !== undefined);
                            const HR_CHIP: React.CSSProperties = { background: '#eef2ff', color: '#4338ca', fontWeight: 600, borderRadius: 6, padding: '1px 6px' };
                            const HrNum = ({ what, children }: { what: string; children: React.ReactNode }) => (
                                <span title={`${what} set by HR`} style={HR_CHIP}>{children}</span>
                            );
                            return (
                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '9px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 10.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        <span>Type</span>
                                        <span style={{ textAlign: 'right' }}>Used</span>
                                        <span style={{ textAlign: 'right' }}>Limit</span>
                                        <span style={{ textAlign: 'right' }}>Left</span>
                                    </div>
                                    {rows.map((lType, idx) => {
                                        const limit = currentStats.getLimit(lType);
                                        const balance = currentStats.getBalance(lType);
                                        const used = currentStats.getUsed(lType);
                                        const isCustomLimit = selectedEmployee?.customLeaveLimits?.[lType] !== undefined;
                                        const isCustomUsed = selectedEmployee?.customLeaveUsed?.[lType] !== undefined;
                                        const isUnlimited = limit > 9000;
                                        const hasRule = lType === 'Annual' || lType === 'Maternity';
                                        const eligible = isCustomLimit || (lType === 'Annual' ? currentStats.isEligibleForAnnual : lType === 'Maternity' ? currentStats.isEligibleForMaternity : true);
                                        const locked = hasRule && !eligible;
                                        const low = !isUnlimited && !locked && balance < 2;
                                        // Maternity / Other: "Left" and the bar stay blank until at least one such leave is taken
                                        // (an approved record counts even when it is hourly and adds 0 days)
                                        const notTaken = (lType === 'Maternity' || lType === 'Other') && used === 0
                                            && !leaves.some(l => l.employeeId === selectedEmployee?.id && l.type === lType && l.status === 'Approved');
                                        return (
                                            <div key={lType} style={{ padding: '10px 14px', borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: locked ? 0.6 : 1 }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, alignItems: 'center', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                                    <span style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, minWidth: 0 }}>
                                                        {lType}
                                                        {hasRule && <span style={{ fontSize: 11, fontWeight: 500, color: eligible ? '#15803d' : '#6b7280', whiteSpace: 'nowrap' }}>{eligible ? '(Eligible)' : '(Not eligible)'}</span>}
                                                    </span>
                                                    <span style={{ textAlign: 'right', color: '#374151' }}>{isCustomUsed ? <HrNum what="Used days">{currentStats.fmt(used)}</HrNum> : currentStats.fmt(used)}</span>
                                                    <span style={{ textAlign: 'right', color: '#6b7280' }}>{isUnlimited ? '∞' : locked ? '—' : isCustomLimit ? <HrNum what="Limit">{currentStats.fmt(limit)}</HrNum> : currentStats.fmt(limit)}</span>
                                                    <span style={{ textAlign: 'right' }}>
                                                        {notTaken || isUnlimited ? '' : locked ? <span style={{ color: '#6b7280' }}>—</span> : (
                                                            // days left in a filled round badge — blue, red when under 2 days
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 26, padding: '0 8px', boxSizing: 'border-box', borderRadius: 999, background: low ? '#dc2626' : '#1d4ed8', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>
                                                                {currentStats.fmt(balance)}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                {!isUnlimited && !locked && !notTaken && (
                                                    <div style={{ height: 5, background: '#e5e7eb', borderRadius: 999, marginTop: 7, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', borderRadius: 999, background: low ? '#ef4444' : '#16a34a', width: `${limit > 0 ? Math.min((used / limit) * 100, 100) : 0}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {anyCustom && (
                                        <div style={{ padding: '7px 14px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ ...HR_CHIP, fontSize: 10 }}>12</span> Set by HR
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
                                <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) { setLeaveType(null); setCasualCriteria(null); setSickEvidence(null); } }}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-blue-600 hover:bg-blue-700">
                                            <Plus className="h-4 w-4 mr-2" /> Record Leave
                                        </Button>
                                    </DialogTrigger>
                                <DialogContent className="max-w-lg" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
                                <DialogHeader>
                                    <DialogTitle>Record New Leave</DialogTitle>
                                    <DialogDescription>
                                        Fill in the details below to record a new leave.
                                    </DialogDescription>
                                </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Leave Type <span style={{ color: '#ef4444' }}>*</span>
                                                {!leaveType && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>— tap one to select</span>}
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                                                {(Object.keys(LEAVE_LIMITS) as LeaveType[]).map(type => {
                                                    const hasCustomLimit = selectedEmployee?.customLeaveLimits?.[type] !== undefined;
                                                    // Maternity is hidden entirely for non-female employees (same rule as the balance cards)
                                                    if (type === 'Maternity' && !hasCustomLimit && !currentStats.isEligibleForMaternity) return null;
                                                    const notEligible = !hasCustomLimit && type === 'Annual' && !currentStats.isEligibleForAnnual;
                                                    const isSelected = leaveType === type;
                                                    const color = SELECTED_TYPE_COLOR;
                                                    const limit = currentStats.getLimit(type);
                                                    const balance = currentStats.getBalance(type);
                                                    const balanceLabel = notEligible
                                                        ? 'Not eligible'
                                                        : limit > 9000 ? '' : `${currentStats.fmt(balance)} of ${currentStats.fmt(limit)} left`;
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            disabled={notEligible}
                                                            onClick={() => { setLeaveType(type); if (type !== 'Casual') setCasualCriteria(null); if (type !== 'Sick') setSickEvidence(null); }}
                                                            style={{
                                                                textAlign: 'left',
                                                                padding: '10px 12px',
                                                                borderRadius: '10px',
                                                                border: `2px solid ${isSelected ? color : notEligible ? '#e5e7eb' : '#d1d5db'}`,
                                                                background: isSelected ? color : notEligible ? '#f3f4f6' : '#ffffff',
                                                                color: isSelected ? '#ffffff' : notEligible ? '#9ca3af' : '#111827',
                                                                cursor: notEligible ? 'not-allowed' : 'pointer',
                                                                transition: 'all 0.15s ease',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                                                                <span>{type}</span>
                                                                {isSelected && <Check style={{ width: '16px', height: '16px' }} />}
                                                            </div>
                                                            {balanceLabel && (
                                                                <div style={{ fontSize: '11px', marginTop: '2px', color: isSelected ? 'rgba(255,255,255,0.9)' : notEligible ? '#9ca3af' : '#6b7280' }}>
                                                                    {balanceLabel}
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Casual criteria — required for new Casual leaves (mirrors the paper form) */}
                                        {leaveType === 'Casual' && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">
                                                    Casual leave criteria <span style={{ color: '#ef4444' }}>*</span>
                                                    {!casualCriteria && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>— select one</span>}
                                                </label>
                                                <div style={{ border: `1px solid ${casualCriteria ? '#bfdbfe' : '#d1d5db'}`, borderRadius: '10px', overflow: 'hidden' }}>
                                                    {CASUAL_CRITERIA.map((c, i) => {
                                                        const on = casualCriteria === c.no;
                                                        return (
                                                            <button
                                                                key={c.no}
                                                                type="button"
                                                                onClick={() => setCasualCriteria(c.no)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
                                                                    padding: '7px 10px', fontSize: '12px', cursor: 'pointer',
                                                                    background: on ? SELECTED_TYPE_COLOR : '#ffffff',
                                                                    color: on ? '#ffffff' : '#111827',
                                                                    borderTop: i === 0 ? 'none' : '1px solid #e5e7eb',
                                                                }}
                                                            >
                                                                <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${on ? '#ffffff' : '#9ca3af'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    {on && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />}
                                                                </span>
                                                                <span style={{ width: '18px', flexShrink: 0, color: on ? 'rgba(255,255,255,0.8)' : '#9ca3af', fontSize: '11px' }}>{c.no}.</span>
                                                                <span style={{ flex: 1 }}>{c.text}</span>
                                                                <span style={{ fontSize: '11px', whiteSpace: 'nowrap', color: on ? 'rgba(255,255,255,0.9)' : '#6b7280' }}>{c.allocation}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{CASUAL_CRITERIA_NOTE}</p>
                                            </div>
                                        )}

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

                                        {leaveType === 'Sick' && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">
                                                    Supporting document <span style={{ color: '#ef4444' }}>*</span>
                                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>medical certificate / prescription · PDF or image · max 5 MB</span>
                                                </label>
                                                <input
                                                    ref={sickEvidenceInputRef}
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    style={{ display: 'none' }}
                                                    onChange={e => {
                                                        const f = e.target.files?.[0];
                                                        if (!f) return;
                                                        const ok = f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                                                        if (!ok) { toast.error('Only PDF or image files are allowed'); e.target.value = ''; return; }
                                                        if (f.size > MAX_FILE_BYTES) { toast.error('File must be 5 MB or smaller'); e.target.value = ''; return; }
                                                        setSickEvidence(f);
                                                    }}
                                                />
                                                {sickEvidence ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '10px' }}>
                                                        {sickEvidence.type === 'application/pdf' ? <FileText style={{ width: '18px', height: '18px', color: SELECTED_TYPE_COLOR, flexShrink: 0 }} /> : <Paperclip style={{ width: '18px', height: '18px', color: SELECTED_TYPE_COLOR, flexShrink: 0 }} />}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sickEvidence.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{formatBytes(sickEvidence.size)} · attached as evidence</div>
                                                        </div>
                                                        <button type="button" onClick={() => sickEvidenceInputRef.current?.click()} style={{ fontSize: '12px', fontWeight: 600, color: SELECTED_TYPE_COLOR, background: 'transparent', border: 'none', cursor: 'pointer' }}>Change</button>
                                                        <button type="button" title="Remove" onClick={() => { setSickEvidence(null); if (sickEvidenceInputRef.current) sickEvidenceInputRef.current.value = ''; }} style={{ display: 'inline-flex', color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }}><X className="h-4 w-4" /></button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => sickEvidenceInputRef.current?.click()}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', border: '2px dashed #d1d5db', borderRadius: '10px', background: '#fafafa', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        <Paperclip className="h-4 w-4" /> Attach PDF or image
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Reason</label>
                                            <Textarea
                                                placeholder="Enter reason for leave..."
                                                value={reason}
                                                onChange={e => setReason(e.target.value)}
                                            />
                                            {leaveType && leaveType !== 'Sick' && ILLNESS_WORDS.test(reason) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
                                                    <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                                                    <span>Reason mentions illness but <b>{leaveType}</b> is selected — did you mean <b>Sick</b> leave?</span>
                                                    <button type="button" onClick={() => { setLeaveType('Sick'); setCasualCriteria(null); }} style={{ marginLeft: 'auto', fontWeight: 700, color: '#b45309', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                                                        Switch to Sick
                                                    </button>
                                                </div>
                                            )}
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
                                <DialogFooter style={{ alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    {(() => {
                                        // Read-back line: state exactly what is about to be recorded so a wrong type is caught before saving
                                        if (!leaveType) {
                                            return <span style={{ fontSize: '12px', color: '#6b7280' }}>Select a leave type to continue</span>;
                                        }
                                        const fmtD = (s: string) => { try { return format(parseISO(s), 'd MMM'); } catch { return s; } };
                                        let when = '';
                                        if (durationMode === 'half' && startDate) when = `0.5 day · ${fmtD(startDate)}`;
                                        else if (durationMode === 'partial' && startDate) when = `${partialHours || '?'} hr · ${fmtD(startDate)}`;
                                        else if (durationMode === 'full' && startDate && endDate) {
                                            const w = countLeaveDays(startDate, endDate, templates).working;
                                            when = `${w} working day${w !== 1 ? 's' : ''} · ${startDate === endDate ? fmtD(startDate) : `${fmtD(startDate)} – ${fmtD(endDate)}`}`;
                                        }
                                        return (
                                            <span style={{ fontSize: '12px', color: '#374151' }}>
                                                Recording{' '}
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: SELECTED_TYPE_COLOR }}>
                                                    {leaveType} Leave
                                                </span>
                                                {leaveType === 'Casual' && casualCriteria && <span style={{ color: '#6b7280' }}> · #{casualCriteria} {getCasualCriterion(casualCriteria)?.text}</span>}
                                                {leaveType === 'Sick' && <span style={{ color: sickEvidence ? '#15803d' : '#b45309' }}> · {sickEvidence ? 'evidence attached' : 'evidence required'}</span>}
                                                {when && <span style={{ color: '#6b7280' }}> · {when}</span>}
                                            </span>
                                        );
                                    })()}
                                    <Button
                                        onClick={handleSubmitLeave}
                                        disabled={!leaveType || isSubmittingLeave}
                                        style={leaveType ? { background: SELECTED_TYPE_COLOR, color: '#ffffff' } : undefined}
                                    >
                                        {isSubmittingLeave ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : leaveType ? `Confirm ${leaveType} Leave` : 'Confirm & Save'}
                                    </Button>
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
                                                {leave.casualCriteria && (
                                                    <p className="text-xs text-gray-500 mt-0.5">Criteria #{leave.casualCriteria}: {getCasualCriterion(leave.casualCriteria)?.text}</p>
                                                )}
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
                                                                            onClick={() => updateLeave(leave.id, HR_SIGN_UNDO)}
                                                                            title="Undo (removes the HR signature)"
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
                                                                            onClick={async () => {
                                                                                // Confirm By HR = sign as HR: pick a signature and enter its PIN
                                                                                const patch = await signAsHr({ signatures, employees, user: currentUser, subject: `${selectedEmployee?.name ?? 'this leave'} · ${leave.startDate}` });
                                                                                if (!patch) return;
                                                                                updateLeave(leave.id, patch);
                                                                                toast.success(`Form received — signed by ${signatures.find(s => s.id === patch.hrSignatureId)?.name ?? 'HR'}`);
                                                                            }}
                                                                            title="Sign as HR (signature + PIN)"
                                                                            style={{ fontSize: '10px', color: '#374151', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '5px', padding: '1px 6px', cursor: 'pointer' }}
                                                                        >
                                                                            Confirm By HR
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    title="Open the Leave Request Form"
                                                    onClick={() => openLeaveForm(leave)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#fff', color: '#1d4ed8', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> View Form
                                                </button>
                                                {/* Admin approve/reject buttons for Pending */}
                                                {!isStaff && isPending && (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            disabled={getHardCopyDeadlineDays(leave.type, !!leave.partialHours) !== null && !leave.hardCopyCollected}
                                                            title={getHardCopyDeadlineDays(leave.type, !!leave.partialHours) !== null && !leave.hardCopyCollected ? 'Final sign — available after the HR sign' : 'Final sign (Fumihiro Abe or Showkat Akber · signature + PIN)'}
                                                            onClick={async () => {
                                                                // Final sign: a leave is only approved once a final signer signs with signature + PIN
                                                                const patch = await signToApprove({ signatures, employees, user: currentUser, subject: `${selectedEmployee?.name ?? 'this employee'} · ${leave.type} · ${leave.startDate}${leave.endDate !== leave.startDate ? ` to ${leave.endDate}` : ''}` });
                                                                if (!patch) return;
                                                                updateLeave(leave.id, patch);
                                                                toast.success(`Final signed by ${signatures.find(s => s.id === patch.approvedSignatureId)?.name ?? 'approver'} — leave approved`);
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
            ) : !isStaff ? (() => {
                // Employee board: every employee at a glance (EID order, resigned last) — click a card to open them
                const byEidNum = (a: Employee, b: Employee) => a.eid.localeCompare(b.eid, undefined, { numeric: true, sensitivity: 'base' });
                const q = boardQuery.trim().toLowerCase();
                const activeCount = employees.filter(e => e.status === 'Active').length;
                const resignedCount = employees.length - activeCount;
                const shown = [...employees]
                    .filter(e => (boardTab === 'active') === (e.status === 'Active'))
                    .filter(e => !q || [e.name, e.eid, e.jobTitle, e.designation].some(v => String(v || '').toLowerCase().includes(q)))
                    .sort(byEidNum);
                const tabs = [{ key: 'active' as const, label: 'Active', n: activeCount }, { key: 'resigned' as const, label: 'Resigned', n: resignedCount }];
                const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                return (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Choose an employee</div>
                                {/* Active / Resigned tabs */}
                                <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
                                    {tabs.map(t => {
                                        const on = boardTab === t.key;
                                        return (
                                            <button key={t.key} type="button" onClick={() => setBoardTab(t.key)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 14px', borderRadius: 8, border: 'none', background: on ? '#fff' : 'transparent', color: on ? '#111827' : '#6b7280', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                                                {t.label}
                                                <span style={{ background: on ? (t.key === 'active' ? '#16a34a' : '#6b7280') : '#e5e7eb', color: on ? '#fff' : '#374151', fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999 }}>{t.n}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Search (AnimatedSearch): always in its active look, typing-style hint; cards fade in */}
                            <style>{`
                                @keyframes boardCardIn { from { opacity: 0; transform: translateY(6px) scale(.98) } to { opacity: 1; transform: none } }
                                .board-card { animation: boardCardIn .22s ease-out both }
                                @media (prefers-reduced-motion: reduce) { .board-card { animation: none } }
                            `}</style>
                            <AnimatedSearch value={boardQuery} onChange={setBoardQuery} hints={SEARCH_HINTS} ariaLabel="Search employees by name, EID or designation" width={520} autoFocus />
                        </div>
                        {shown.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>{q ? `No ${boardTab} employee matches “${boardQuery}”.` : `No ${boardTab} employees.`}</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                                {shown.map(emp => {
                                    const st = calculateEmployeeLeaveStats(emp);
                                    const pending = leaves.filter(l => l.employeeId === emp.id && l.status === 'Pending').length;
                                    const resigned = emp.status !== 'Active';
                                    const chips: { label: string; type: LeaveType }[] = [{ label: 'Casual', type: 'Casual' }, { label: 'Sick', type: 'Sick' }, { label: 'Annual', type: 'Annual' }];
                                    return (
                                        <button key={emp.id} type="button" className="board-card" onClick={() => setSelectedEmployeeId(emp.id)}
                                            style={{ textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(29,78,216,0.08)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ width: 36, height: 36, borderRadius: 999, background: '#e0e7ff', color: '#3730a3', fontSize: 12.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(emp.name)}</span>
                                                <span style={{ flex: 1, minWidth: 0 }}>
                                                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
                                                    <span style={{ display: 'block', fontSize: 11.5, color: '#6b7280' }}>{emp.eid}{emp.jobTitle ? ` · ${emp.jobTitle}` : emp.role ? ` · ${emp.role}` : ''}</span>
                                                </span>
                                                {resigned ? (
                                                    <span className="px-3 py-1 rounded-full" style={{ background: '#6b7280', color: '#fff', fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap' }}>Resigned</span>
                                                ) : pending > 0 ? (
                                                    <span className="px-3 py-1 rounded-full" style={{ background: '#f59e0b', color: '#fff', fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{pending} pending</span>
                                                ) : null}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                                {chips.map(c => {
                                                    const notEligible = c.type === 'Annual' && !st.isEligibleForAnnual && emp.customLeaveLimits?.Annual === undefined;
                                                    const left = st.getBalance(c.type);
                                                    const low = !notEligible && left < 2;
                                                    return (
                                                        <span key={c.type} style={{ flex: 1, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '5px 6px', textAlign: 'center' }}>
                                                            <span style={{ display: 'block', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>{c.label}</span>
                                                            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: notEligible ? '#9ca3af' : low ? '#dc2626' : '#1d4ed8', fontVariantNumeric: 'tabular-nums' }}>{notEligible ? '—' : st.fmt(left)}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })() : null}
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
                        {employees.filter(e => e.status === 'Active' && (!isStaff || e.id === currentUser?.id)).sort(byEid).map(emp => {
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
        <LeaveRecordsView
          leaves={leaves}
          employees={employees}
          leaveFolders={leaveFolders}
          savedLeaveReports={savedLeaveReports}
          currentUser={currentUser}
          onNewFolder={() => { setIsTransferDialogOpen(true); setIsCreatingFolder(true); }}
          onViewReport={setViewReport}
          onDeleteFolder={deleteLeaveFolder}
          onDeleteReport={deleteSavedLeaveReport}
          getItem={getItem}
          updateLeave={updateLeave}
          onViewLeaveForm={openLeaveForm}
        />
      ) : viewMode === 'pending' && !isStaff ? (
        <LeaveApprovalsView
          leaves={leaves}
          employees={employees}
          templates={templates}
          filters={{
            search: pendingSearchQuery, setSearch: setPendingSearchQuery,
            employee: pendingEmployeeFilter, setEmployee: setPendingEmployeeFilter,
            month: pendingMonthFilter, setMonth: setPendingMonthFilter,
            type: pendingTypeFilter, setType: setPendingTypeFilter,
          }}
          updateLeave={updateLeave}
          onViewLeaveForm={openLeaveForm}
        />
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
            const applied = hardCopyBaseDate(leave);
            const dl = dd !== null ? addWorkingDays(applied, dd, templates) : null;
            if (dl) dl.setHours(0,0,0,0);
            const isOverdue = dl ? todayMid > dl && !leave.hardCopyCollected : false;
            const workingDays = dd !== null ? getWorkingDayPath(applied, dd, templates) : [];
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