
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { LayoutDashboard, FileText, Users, File, Calendar, Database, LogOut, Menu, X, Clock } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';

// Pages
import { Dashboard } from './pages/Dashboard';
import { TimesheetView } from './pages/TimesheetView';
import { Backups } from './pages/Backups';
import { LoginScreen } from './components/LoginScreen';
import { Timesheet } from './pages/Timesheet';
import { Employees } from './pages/Employees';
import { Templates } from './pages/Templates';
import { LeaveManagement } from './pages/LeaveManagement';
import { OTManagement } from './pages/OTManagement';

import { projectId, publicAnonKey } from './utils/supabase/info';

// --- Types ---
export type LeaveType = 'Casual' | 'Sick' | 'Annual' | 'Maternity' | 'Other';

export interface OTRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // ISO Date YYYY-MM-DD
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ReportFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface LeaveFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface SavedReport {
  id: string;
  folderId: string;
  name: string;
  month: string; // YYYY-MM
  customPrevDate?: string;
  data: any; // The computed report data
  createdAt: string;
}

export interface SavedLeaveReport {
  id: string;
  folderId: string;
  name: string;
  createdAt: string;
  data: any; // Snapshot of leave stats for selected employees
}

export interface Employee {
  id: string;
  name: string;
  eid: string;
  designation: string;
  role: 'Admin/HR' | 'Staff';
  status: 'Active' | 'Inactive';
  dob: string;
  joiningDate: string;
  gender?: 'Male' | 'Female' | 'Other';
  customLeaveLimits?: Partial<Record<LeaveType, number>>;
  customLeaveUsed?: Partial<Record<LeaveType, number>>;
  limitHistory?: {
      date: string;
      editorId: string;
      editorName: string;
      changes: string[];
  }[];
}

export interface Folder {
  id: string;
  name: string;
}

export interface TimesheetRecord {
  id: string;
  folderId: string;
  employeeId: string; // Links to Employee.id
  employeeName: string; // Denormalized for easier display
  eid: string;
  year: number;
  month: number; // 0-11
  generatedAt: string;
  entries: DailyEntry[];
  summary: SummaryEntry[];
  checkedBySignatureId?: string;
  approvedBySignatureId?: string;
  submissions?: SubmissionHistory[];
}

export interface DailyEntry {
  date: number;
  inTime: string;
  outTime: string;
  ot: string;
  remarks: string;
  signatureId?: string;
}

export interface SummaryEntry {
  sl: string;
  days: string;
  remarks: string;
}

export interface SubmissionHistory {
  timestamp: string;
}

export interface Holiday {
    date: number;
    reason: string;
}

export interface MonthTemplate {
  id: string; // "YYYY-MM"
  year: number;
  month: number;
  holidays: Holiday[];
}

export type Template = MonthTemplate; // Alias for compatibility

export interface Signature {
  id: string;
  name: string;
  role: string;
  imageUrl: string; // base64 or url
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  reason: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export type LeaveRequest = Omit<LeaveRecord, 'id'>;

interface AppContextType {
  currentUser: Employee | null;
  employees: Employee[];
  folders: Folder[];
  timesheets: TimesheetRecord[];
  templates: MonthTemplate[];
  signatures: Signature[];
  leaves: LeaveRecord[];
  otRecords: OTRecord[];
  reportFolders: ReportFolder[];
  savedReports: SavedReport[];
  leaveFolders: LeaveFolder[];
  savedLeaveReports: SavedLeaveReport[];
  previewData: any | null;
  
  login: (emp: Employee) => void;
  logout: () => void;
  
  addFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  
  addReportFolder: (name: string) => Promise<string | null>; // Returns ID if successful
  deleteReportFolder: (id: string) => void;

  addLeaveFolder: (name: string) => Promise<string | null>;
  deleteLeaveFolder: (id: string) => void;

  addSavedReport: (report: Omit<SavedReport, 'id'>) => void;
  deleteSavedReport: (id: string) => void;

  addSavedLeaveReport: (report: Omit<SavedLeaveReport, 'id'>) => void;
  deleteSavedLeaveReport: (id: string) => void;
  
  getItem: (type: string, id: string) => Promise<any>; // Fetch full item data

  addTimesheet: (ts: TimesheetRecord) => void;
  updateTimesheet: (id: string, data: Partial<TimesheetRecord>) => void;
  deleteTimesheet: (id: string) => void;
  
  getTemplate: (year: number, month: number) => MonthTemplate | undefined;
  saveTemplate: (template: MonthTemplate) => void; // Kept as saveTemplate to match expectation if any, but renamed to updateTemplate in Templates.tsx. Actually, to be safe I will expose both or rename in component.
  // Wait, I already renamed usage in Templates.tsx to updateTemplate. So I should name it updateTemplate here.
  updateTemplate: (template: MonthTemplate) => void;
  
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  addSignature: (sig: Omit<Signature, 'id'>) => void;
  deleteSignature: (id: string) => void;

  addLeave: (leave: LeaveRequest) => void;
  deleteLeave: (id: string) => void;

  addOTRecord: (ot: Omit<OTRecord, 'id'>) => void;
  updateOTRecord: (id: string, data: Partial<OTRecord>) => void;
  deleteOTRecord: (id: string) => void;

  enablePreview: (data: any) => void;
  disablePreview: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1933abde`;

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('tcf_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
  const [templates, setTemplates] = useState<MonthTemplate[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [otRecords, setOtRecords] = useState<OTRecord[]>([]);
  const [reportFolders, setReportFolders] = useState<ReportFolder[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [leaveFolders, setLeaveFolders] = useState<LeaveFolder[]>([]);
  const [savedLeaveReports, setSavedLeaveReports] = useState<SavedLeaveReport[]>([]);
  
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Initial Data
  useEffect(() => {
    const fetchData = async () => {
      if (previewData) return; // Don't fetch if previewing
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${publicAnonKey}` };
        
        const [empsRes, foldersRes, tsRes, tmplRes, sigRes, leavesRes, otRes, reportFoldersRes, savedReportsRes, leaveFoldersRes, savedLeaveRes] = await Promise.all([
          fetch(`${API_BASE}/items/employees`, { headers }),
          fetch(`${API_BASE}/items/folders`, { headers }),
          fetch(`${API_BASE}/items/timesheets`, { headers }),
          fetch(`${API_BASE}/items/templates`, { headers }),
          fetch(`${API_BASE}/items/signatures`, { headers }),
          fetch(`${API_BASE}/items/leaves`, { headers }),
          fetch(`${API_BASE}/items/ot_records`, { headers }),
          fetch(`${API_BASE}/items/report_folders`, { headers }),
          fetch(`${API_BASE}/items/saved_reports`, { headers }),
          fetch(`${API_BASE}/items/leave_folders`, { headers }),
          fetch(`${API_BASE}/items/saved_leave_reports`, { headers })
        ]);

        if (empsRes.ok) setEmployees(await empsRes.json());
        if (foldersRes.ok) setFolders(await foldersRes.json());
        if (tsRes.ok) setTimesheets(await tsRes.json());
        if (tmplRes.ok) setTemplates(await tmplRes.json());
        if (sigRes.ok) setSignatures(await sigRes.json());
        if (leavesRes.ok) setLeaves(await leavesRes.json());
        if (otRes.ok) setOtRecords(await otRes.json());
        if (reportFoldersRes.ok) setReportFolders(await reportFoldersRes.json());
        if (savedReportsRes.ok) setSavedReports(await savedReportsRes.json());
        if (leaveFoldersRes.ok) setLeaveFolders(await leaveFoldersRes.json());
        if (savedLeaveRes.ok) setSavedLeaveReports(await savedLeaveRes.json());

      } catch (err) {
        console.error("Failed to fetch initial data", err);
        toast.error("Failed to load system data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [previewData]);

  // Override state if previewData is set
  const activeEmployees = previewData?.employees || employees;
  const activeFolders = previewData?.folders || folders;
  const activeTimesheets = previewData?.timesheets || timesheets;
  const activeTemplates = previewData?.templates || templates;
  const activeSignatures = previewData?.signatures || signatures;
  const activeLeaves = previewData?.leaves || leaves;
  const activeOtRecords = previewData?.otRecords || otRecords;
  const activeReportFolders = previewData?.reportFolders || reportFolders;
  const activeSavedReports = previewData?.savedReports || savedReports;
  const activeLeaveFolders = previewData?.leaveFolders || leaveFolders;
  const activeSavedLeaveReports = previewData?.savedLeaveReports || savedLeaveReports;

  // API Helpers
  const saveItem = async (type: string, item: any) => {
    if (previewData) {
      toast.error("Cannot modify data in preview mode");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/items/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error('Save failed');
      return true;
    } catch (e) {
      console.error(e);
      toast.error(`Failed to save ${type}`);
      return false;
    }
  };

  const deleteItem = async (type: string, id: string) => {
    if (previewData) {
      toast.error("Cannot modify data in preview mode");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/items/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      return true;
    } catch (e) {
      console.error(e);
      toast.error(`Failed to delete ${type}`);
      return false;
    }
  };

  // Actions
  const login = (emp: Employee) => {
    setCurrentUser(emp);
    localStorage.setItem('tcf_user', JSON.stringify(emp));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tcf_user');
    setPreviewData(null);
  };

  const addFolder = async (name: string) => {
    const newFolder: Folder = { id: Math.random().toString(36).substr(2, 9), name };
    if (await saveItem('folders', newFolder)) {
      setFolders([...folders, newFolder]);
    }
  };

  const deleteFolder = async (id: string) => {
    if (await deleteItem('folders', id)) {
      setFolders(folders.filter(f => f.id !== id));
    }
  };

  const addReportFolder = async (name: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFolder: ReportFolder = { 
        id, 
        name,
        createdAt: new Date().toISOString()
    };
    if (await saveItem('report_folders', newFolder)) {
      setReportFolders([...reportFolders, newFolder]);
      return id;
    }
    return null;
  };

  const deleteReportFolder = async (id: string) => {
    if (await deleteItem('report_folders', id)) {
      setReportFolders(reportFolders.filter(f => f.id !== id));
    }
  };

  const addLeaveFolder = async (name: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFolder: LeaveFolder = { 
        id, 
        name,
        createdAt: new Date().toISOString()
    };
    if (await saveItem('leave_folders', newFolder)) {
      setLeaveFolders([...leaveFolders, newFolder]);
      return id;
    }
    return null;
  };

  const deleteLeaveFolder = async (id: string) => {
    if (await deleteItem('leave_folders', id)) {
      setLeaveFolders(leaveFolders.filter(f => f.id !== id));
    }
  };

  const addSavedReport = async (reportData: Omit<SavedReport, 'id'>) => {
    const newReport: SavedReport = { 
        ...reportData, 
        id: Math.random().toString(36).substr(2, 9) 
    };
    if (await saveItem('saved_reports', newReport)) {
        setSavedReports([...savedReports, newReport]);
    }
  };

  const deleteSavedReport = async (id: string) => {
    if (await deleteItem('saved_reports', id)) {
        setSavedReports(savedReports.filter(r => r.id !== id));
    }
  };

  const addSavedLeaveReport = async (reportData: Omit<SavedLeaveReport, 'id'>) => {
    const newReport: SavedLeaveReport = { 
        ...reportData, 
        id: Math.random().toString(36).substr(2, 9) 
    };
    if (await saveItem('saved_leave_reports', newReport)) {
        setSavedLeaveReports([...savedLeaveReports, newReport]);
    }
  };

  const deleteSavedLeaveReport = async (id: string) => {
    if (await deleteItem('saved_leave_reports', id)) {
        setSavedLeaveReports(savedLeaveReports.filter(r => r.id !== id));
    }
  };

  const getItem = async (type: string, id: string) => {
      if (previewData) return null;
      try {
          const res = await fetch(`${API_BASE}/items/${type}/${id}`, {
              headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          });
          if (!res.ok) throw new Error('Fetch failed');
          return await res.json();
      } catch (e) {
          console.error(e);
          toast.error("Failed to load item details");
          return null;
      }
  };

  const addTimesheet = async (ts: TimesheetRecord) => {
    if (await saveItem('timesheets', ts)) {
      setTimesheets([...timesheets, ts]);
    }
  };

  const updateTimesheet = async (id: string, data: Partial<TimesheetRecord>) => {
    const ts = timesheets.find(t => t.id === id);
    if (!ts) return;
    const updated = { ...ts, ...data };
    if (await saveItem('timesheets', updated)) {
      setTimesheets(timesheets.map(t => t.id === id ? updated : t));
    }
  };

  const deleteTimesheet = async (id: string) => {
    if (await deleteItem('timesheets', id)) {
      setTimesheets(timesheets.filter(t => t.id !== id));
    }
  };

  const getTemplate = (year: number, month: number) => {
    const id = `temp_${year}_${month}`; // Standardized ID format
    return activeTemplates.find((t: MonthTemplate) => t.id === id);
  };

  const updateTemplate = async (template: MonthTemplate) => {
    if (await saveItem('templates', template)) {
       const exists = templates.find(t => t.id === template.id);
       if (exists) {
         setTemplates(templates.map(t => t.id === template.id ? template : t));
       } else {
         setTemplates([...templates, template]);
       }
    }
  };
  
  // Alias for backward compatibility in context if needed, but we renamed usage
  const saveTemplate = updateTemplate;

  const addEmployee = async (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = { ...empData, id: Math.random().toString(36).substr(2, 9) };
    if (await saveItem('employees', newEmp)) {
      setEmployees([...employees, newEmp]);
    }
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
     const emp = employees.find(e => e.id === id);
     if (!emp) return;
     const updated = { ...emp, ...data };
     if (await saveItem('employees', updated)) {
      setEmployees(employees.map(e => e.id === id ? updated : e));
    }
  };

  const deleteEmployee = async (id: string) => {
    if (await deleteItem('employees', id)) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const addSignature = async (sigData: Omit<Signature, 'id'>) => {
    const newSig: Signature = { ...sigData, id: Math.random().toString(36).substr(2, 9) };
    if (await saveItem('signatures', newSig)) {
        setSignatures([...signatures, newSig]);
    }
  };

  const deleteSignature = async (id: string) => {
      if (await deleteItem('signatures', id)) {
          setSignatures(signatures.filter(s => s.id !== id));
      }
  };

  const addLeave = async (leaveData: LeaveRequest) => {
      const newLeave: LeaveRecord = { ...leaveData, id: Math.random().toString(36).substr(2, 9) };
      if (await saveItem('leaves', newLeave)) {
          setLeaves([...leaves, newLeave]);
      }
  };

  const deleteLeave = async (id: string) => {
      if (await deleteItem('leaves', id)) {
          setLeaves(leaves.filter(l => l.id !== id));
      }
  };

  const addOTRecord = async (otData: Omit<OTRecord, 'id'>) => {
      const newOt: OTRecord = { ...otData, id: Math.random().toString(36).substr(2, 9) };
      if (await saveItem('ot_records', newOt)) {
          setOtRecords([...otRecords, newOt]);
      }
  };

  const updateOTRecord = async (id: string, data: Partial<OTRecord>) => {
      const ot = otRecords.find(o => o.id === id);
      if (!ot) return;
      const updated = { ...ot, ...data };
      if (await saveItem('ot_records', updated)) {
          setOtRecords(otRecords.map(o => o.id === id ? updated : o));
      }
  };

  const deleteOTRecord = async (id: string) => {
      if (await deleteItem('ot_records', id)) {
          setOtRecords(otRecords.filter(o => o.id !== id));
      }
  };


  return (
    <AppContext.Provider value={{
      currentUser,
      employees: activeEmployees,
      folders: activeFolders,
      timesheets: activeTimesheets,
      templates: activeTemplates,
      signatures: activeSignatures,
      leaves: activeLeaves,
      otRecords: activeOtRecords,
      reportFolders: activeReportFolders,
      savedReports: activeSavedReports,
      leaveFolders: activeLeaveFolders,
      savedLeaveReports: activeSavedLeaveReports,
      previewData,
      login,
      logout,
      addFolder,
      deleteFolder,
      addReportFolder,
      deleteReportFolder,
      addLeaveFolder,
      deleteLeaveFolder,
      addSavedReport,
      deleteSavedReport,
      addSavedLeaveReport,
      deleteSavedLeaveReport,
      getItem,
      addTimesheet,
      updateTimesheet,
      deleteTimesheet,
      getTemplate,
      updateTemplate,
      saveTemplate, // Expose just in case
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addSignature,
      deleteSignature,
      addLeave,
      deleteLeave,
      addOTRecord,
      updateOTRecord,
      deleteOTRecord,
      enablePreview: setPreviewData,
      disablePreview: () => setPreviewData(null)
    }}>
      <Router>
        {currentUser ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<Timesheet />} />
              <Route path="/timesheet/:id/view" element={<TimesheetView />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/leaves" element={<LeaveManagement />} />
              <Route path="/overtime" element={<OTManagement />} />
              <Route path="/backups" element={<Backups />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        ) : (
          <LoginScreen employees={activeEmployees} onLogin={login} />
        )}
        <Toaster />
      </Router>
    </AppContext.Provider>
  );
}

// --- Layout Component ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, previewData, disablePreview } = useAppStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ...(currentUser?.role === 'Admin/HR' ? [
      { name: 'Create Timesheet', href: '/create', icon: FileText },
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Templates', href: '/templates', icon: File },
      { name: 'Leaves', href: '/leaves', icon: Calendar },
      { name: 'Overtime', href: '/overtime', icon: Clock },
      { name: 'Backups', href: '/backups', icon: Database },
    ] : [
      { name: 'Template Settings', href: '/templates', icon: File },
      { name: 'My Leaves', href: '/leaves', icon: Calendar },
      { name: 'My Overtime', href: '/overtime', icon: Clock },
    ])
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-[#1a237e] text-white shadow-xl z-20">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold tracking-wider">TCF Timesheet</h1>
          <p className="text-xs text-blue-200 mt-1">System v2.0</p>
        </div>
        
        {previewData && (
          <div className="bg-amber-500 text-black px-4 py-2 text-xs font-bold text-center">
            PREVIEW MODE ACTIVE
          </div>
        )}

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md translate-x-1' 
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800 bg-[#151b60]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{currentUser?.name}</p>
              <p className="text-xs text-blue-300 truncate">{currentUser?.role}</p>
            </div>
          </div>
          {previewData ? (
             <Button onClick={disablePreview} variant="destructive" className="w-full justify-start gap-2">
                <X className="h-4 w-4" /> Exit Preview
             </Button>
          ) : (
            <Button onClick={logout} variant="ghost" className="w-full justify-start gap-2 text-red-300 hover:text-red-200 hover:bg-red-900/20">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1a237e] text-white z-30 flex items-center justify-between px-4 shadow-md">
         <span className="font-bold text-lg">TCF Timesheet</span>
         <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-[#1a237e] text-white border-r-blue-800">
               {/* Mobile Menu Content - Same as Sidebar */}
               <div className="p-6 border-b border-blue-800">
                  <h1 className="text-xl font-bold">Menu</h1>
               </div>
               <nav className="flex-1 px-4 py-6 space-y-2">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg ${
                          isActive ? 'bg-blue-600 text-white' : 'text-blue-100'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                  <div className="pt-8">
                    <Button onClick={() => { logout(); setIsMobileMenuOpen(false); }} variant="destructive" className="w-full">
                       Logout
                    </Button>
                  </div>
               </nav>
            </SheetContent>
         </Sheet>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
