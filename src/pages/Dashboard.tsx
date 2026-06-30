import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../App';

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

export const StatusSymbol: React.FC<{ status: AttendanceStatus; className?: string }> = ({ status, className = "h-3.5 w-3.5" }) => {
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Folder, Plus, FileText, Clock, Trash2, ChevronRight, EyeOff, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Attendance } from './Attendance';
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
import { toast } from 'sonner@2.0.3';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { folders, addFolder, updateFolder, deleteFolder, timesheets, employees, deleteTimesheet, currentUser, templates, signatures, attendanceRecords } = useAppStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isHideFolderDialogOpen, setIsHideFolderDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'eid' | 'name' | 'submission'>('eid');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    setSearchQuery('');
  }, [selectedFolderId]);

  // Confirmation States
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [timesheetToDelete, setTimesheetToDelete] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'Admin/HR';

  const handleCreateFolder = () => {
    if (!isAdmin) return;
    if (!newFolderName.trim()) return;
    addFolder(newFolderName);
    setNewFolderName('');
    setIsFolderDialogOpen(false);
    toast.success('Folder created successfully');
  };

  const promptDeleteFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setFolderToDelete(id);
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolder(folderToDelete);
      if (selectedFolderId === folderToDelete) setSelectedFolderId(null);
      toast.success('Folder deleted');
      setFolderToDelete(null);
    }
  };
  
  const promptDeleteTimesheet = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setTimesheetToDelete(id);
  };

  const confirmDeleteTimesheet = () => {
    if (timesheetToDelete) {
        deleteTimesheet(timesheetToDelete);
        toast.success('Timesheet deleted');
        setTimesheetToDelete(null);
    }
  };


  // Stats
  const totalEmployees = isAdmin ? employees.length : 1;
  const totalTimesheets = isAdmin 
    ? timesheets.length 
    : timesheets.filter(t => t.employeeId === currentUser?.id).length;
  const activeEmployees = isAdmin 
    ? employees.filter(e => e.status === 'Active').length 
    : (currentUser?.status === 'Active' ? 1 : 0);

  const filteredTimesheets = selectedFolderId 
    ? timesheets.filter(t => {
        if (t.folderId !== selectedFolderId) return false;
        // Staff restriction: only see their own
        if (!isAdmin && currentUser) {
          return t.employeeId === currentUser.id;
        }
        return true;
      })
    : [];

  const parseEidNumber = (eid: string): number => {
    const match = eid.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
  };

  const searchedTimesheets = React.useMemo(() => {
    return filteredTimesheets.filter(t => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const currentName = employees.find(e => e.id === t.employeeId)?.name || t.employeeName || '';
      return (
        currentName.toLowerCase().includes(query) ||
        (t.eid || '').toLowerCase().includes(query)
      );
    });
  }, [filteredTimesheets, searchQuery, employees]);

  const sortedTimesheets = React.useMemo(() => {
    return [...searchedTimesheets].sort((a, b) => {
      if (sortBy === 'eid') {
        const aNum = parseEidNumber(a.eid || '');
        const bNum = parseEidNumber(b.eid || '');
        if (aNum !== bNum) return aNum - bNum;
        return (a.eid || '').localeCompare(b.eid || '');
      } else if (sortBy === 'name') {
        const aName = employees.find(e => e.id === a.employeeId)?.name || a.employeeName || '';
        const bName = employees.find(e => e.id === b.employeeId)?.name || b.employeeName || '';
        return aName.localeCompare(bName);
      } else if (sortBy === 'submission') {
        const aSub = a.submissions && a.submissions.length > 0 ? a.submissions[a.submissions.length - 1].timestamp : '';
        const bSub = b.submissions && b.submissions.length > 0 ? b.submissions[b.submissions.length - 1].timestamp : '';
        if (!aSub && !bSub) return 0;
        if (!aSub) return 1;
        if (!bSub) return -1;
        return new Date(bSub).getTime() - new Date(aSub).getTime();
      }
      return 0;
    });
  }, [searchedTimesheets, sortBy]);

  const visibleFolders = React.useMemo(() => {
    return folders.filter(f => {
      if (isAdmin) {
        // If legacy isHidden is true, treat it as hidden for both
        if ((f as any).isHidden) return false;
        return !f.hideForAdmin;
      } else {
        if ((f as any).isHidden) return false;
        return !f.hideForStaff;
      }
    });
  }, [folders, isAdmin]);

  React.useEffect(() => {
    if (selectedFolderId === null && visibleFolders.length > 0) {
      setSelectedFolderId(visibleFolders[0].id);
    }
  }, [selectedFolderId, visibleFolders]);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-gray-500">Manage your timesheet folders and view real-time statistics.</p>
        </div>

        {/* Custom Compact Widgets */}
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col justify-center min-w-[130px] shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <UsersIcon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Employees</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-800 leading-none">{totalEmployees}</span>
              <span className="text-[10px] font-medium text-slate-400">{activeEmployees} active</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col justify-center min-w-[130px] shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Timesheets</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-800 leading-none">{totalTimesheets}</span>
              <span className="text-[10px] font-medium text-slate-400">Total</span>
            </div>
          </div>

          <div 
            onClick={() => navigate('/attendance')}
            className="bg-blue-600 border border-blue-700 rounded-lg px-4 py-3 flex flex-col justify-center min-w-[140px] shadow-sm cursor-pointer hover:bg-blue-700 transition-colors group"
          >
            <div className="flex items-center gap-2 text-blue-100 mb-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Attendance</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-white leading-none">Sheet</span>
              <span className="text-[10px] font-medium text-blue-200 group-hover:text-white transition-colors">Manage</span>
            </div>
          </div>

        </div>
      </div>

      {/* Staff Attendance Snippet */}
      {!isAdmin && (
        <div className="mb-4">
          <Attendance dashboardMode={true} />
        </div>
      )}

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Folders List */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Folders</CardTitle>
              {isAdmin && (
               <div className="flex items-center gap-2">
                <Dialog open={isHideFolderDialogOpen} onOpenChange={setIsHideFolderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><EyeOff className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Folder Visibility</DialogTitle>
                      <DialogDescription>
                        Uncheck a folder to hide it from the dashboard.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                      {folders.map(folder => {
                        // Legacy support: if isHidden is true, treat as both hidden by default for display
                        const adminChecked = (folder as any).isHidden ? false : !folder.hideForAdmin;
                        const staffChecked = (folder as any).isHidden ? false : !folder.hideForStaff;
                        
                        return (
                          <div key={folder.id} className="flex flex-col space-y-2 pb-2 border-b last:border-0 border-slate-100">
                            <div className="text-sm font-semibold">{folder.name}</div>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`hide-admin-${folder.id}`} 
                                  checked={adminChecked} 
                                  onCheckedChange={(checked) => {
                                    updateFolder(folder.id, { 
                                      hideForAdmin: !checked,
                                      isHidden: false // Clear legacy flag
                                    });
                                    if (isAdmin && !checked && selectedFolderId === folder.id) {
                                      setSelectedFolderId(null);
                                    }
                                  }} 
                                />
                                <label htmlFor={`hide-admin-${folder.id}`} className="ml-2 text-xs font-medium leading-none cursor-pointer">
                                  Visible to Admin
                                </label>
                              </div>
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`hide-staff-${folder.id}`} 
                                  checked={staffChecked} 
                                  onCheckedChange={(checked) => {
                                    updateFolder(folder.id, { 
                                      hideForStaff: !checked,
                                      isHidden: false // Clear legacy flag
                                    });
                                  }} 
                                />
                                <label htmlFor={`hide-staff-${folder.id}`} className="ml-2 text-xs font-medium leading-none cursor-pointer">
                                  Visible to Staff
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setIsHideFolderDialogOpen(false)}>Done</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Enter a name for your new timesheet folder.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input 
                      placeholder="Folder Name (e.g., Oct 2025 Reports)" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateFolder}>Create Folder</Button>
                  </DialogFooter>
                  </DialogContent>
                </Dialog>
               </div>
              )}
            </div>
            <CardDescription>Select a folder to view contents</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
             {visibleFolders.length === 0 && (
               <div className="text-sm text-gray-500 text-center py-4">No visible folders.</div>
             )}
             {visibleFolders.map(folder => (
               <div 
                 key={folder.id}
                 onClick={() => setSelectedFolderId(folder.id)}
                 className={`
                   flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border
                   ${selectedFolderId === folder.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'}
                 `}
               >
                 <div className="flex items-center gap-3 overflow-hidden">
                   <Folder className={`h-5 w-5 ${selectedFolderId === folder.id ? 'text-blue-600' : 'text-gray-400'}`} />
                   <span className={`font-medium truncate ${selectedFolderId === folder.id ? 'text-blue-700' : 'text-gray-700'}`}>
                     {folder.name}
                   </span>
                 </div>
                 {isAdmin && (
                   <div className="flex gap-1">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                        onClick={(e) => promptDeleteFolder(e, folder.id)}
                     >
                       <Trash2 className="h-3 w-3" />
                     </Button>
                   </div>
                 )}
               </div>
             ))}
          </CardContent>
        </Card>

        {/* Folder Contents */}
        <Card className="md:col-span-2 min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1.5 flex-1">
              <CardTitle>{selectedFolder ? selectedFolder.name : 'Select a Folder'}</CardTitle>
              <CardDescription>
                {selectedFolder 
                  ? `${filteredTimesheets.length} timesheet(s) found` 
                  : 'Choose a folder from the left to view generated timesheets'}
              </CardDescription>
            </div>
            {selectedFolder && filteredTimesheets.length > 0 && (
               <div className="flex items-center gap-3">
                 <Input 
                   type="text"
                   placeholder="Search employee or ID..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="h-8 text-xs w-[180px] bg-slate-50 border-slate-200 rounded-lg"
                 />
                 <div className="flex items-center gap-2">
                   <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort by:</span>
                   <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                     <SelectTrigger className="h-8 text-xs w-[145px] bg-slate-50 border-slate-200 rounded-lg">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="eid">Employee ID (EID)</SelectItem>
                       <SelectItem value="name">Employee Name</SelectItem>
                       <SelectItem value="submission">Latest Submission</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedFolder ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Folder className="h-16 w-16 mb-4 opacity-20" />
                <p>No folder selected</p>
              </div>
            ) : filteredTimesheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>No timesheets in this folder yet.</p>
                <Button variant="link" className="mt-2" asChild>
                   <a href="/create">Create a Timesheet</a>
                </Button>
              </div>
            ) : sortedTimesheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>No timesheets match your search.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTimesheets.map(ts => {
                  const lastSubmission = ts.submissions && ts.submissions.length > 0 
                    ? ts.submissions[ts.submissions.length - 1] 
                    : null;
                  
                  const isToday = lastSubmission 
                    ? new Date(lastSubmission.timestamp).toDateString() === new Date().toDateString()
                    : false;

                  // Glow green if ANY row was signed by Admin today
                  const todayStr = new Date().toDateString();
                  const signedToday = isAdmin && ts.entries?.some(
                    e => e.signatureId && e.signedAt && new Date(e.signedAt).toDateString() === todayStr
                  );

                  return (
                    <div
                      key={ts.id}
                      className={`flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-all duration-300 ${
                        signedToday
                          ? 'border-green-400 shadow-[0_0_0_2px_rgba(34,197,94,0.25),0_0_16px_4px_rgba(34,197,94,0.18)] animate-pulse-green'
                          : ''
                      }`}
                      style={signedToday ? {
                        boxShadow: '0 0 0 2px rgba(34,197,94,0.35), 0 0 18px 4px rgba(34,197,94,0.22)',
                        animation: 'greenGlow 2.4s ease-in-out infinite',
                      } : {}}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ${signedToday ? 'bg-green-100 text-green-700 ring-2 ring-green-400' : 'bg-blue-100 text-blue-700'}`}>
                          {ts.eid}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">{employees.find(e => e.id === ts.employeeId)?.name || ts.employeeName}</h4>
                            {signedToday && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                Signed Today
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Generated: {new Date(ts.generatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {lastSubmission && (
                        <div className="flex flex-col items-center justify-center px-4">
                          <span className={`font-bold text-xs ${isToday ? 'text-green-600' : 'text-red-600'}`}>
                            Submitted
                          </span>
                          <span className={`text-xs ${isToday ? 'text-green-600' : 'text-red-600'}`}>
                            {new Date(lastSubmission.timestamp).toLocaleDateString()} {new Date(lastSubmission.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`mr-2 ${signedToday ? 'border-green-300 text-green-700 bg-green-50' : ''}`}>
                           {new Date(ts.year, ts.month).toLocaleString('default', { month: 'long' })} {ts.year}
                        </Badge>
                        {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={(e) => promptDeleteTimesheet(e, ts.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/timesheet/${ts.id}/view`)}>
                          View <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the folder and its organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFolder} className="bg-red-600 hover:bg-red-700">
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!timesheetToDelete} onOpenChange={() => setTimesheetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timesheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the generated timesheet and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTimesheet} className="bg-red-600 hover:bg-red-700">
              Delete Timesheet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
