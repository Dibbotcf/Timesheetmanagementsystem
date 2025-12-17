
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Folder, Plus, FileText, Clock, Trash2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '../components/ui/dialog';
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

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { folders, addFolder, deleteFolder, timesheets, employees, deleteTimesheet, currentUser, templates, signatures } = useAppStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

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

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-gray-500">Manage your timesheet folders and view real-time statistics.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <UsersIcon className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-gray-500">{activeEmployees} active currently</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Timesheets</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTimesheets}</div>
            <p className="text-xs text-gray-500">Generated across all folders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {totalTimesheets > 0 ? 'Just now' : 'No activity'}
            </div>
            <p className="text-xs text-gray-500">Last update time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Folders List */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Folders</CardTitle>
              {isAdmin && (
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
              )}
            </div>
            <CardDescription>Select a folder to view contents</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
             {folders.length === 0 && (
               <div className="text-sm text-gray-500 text-center py-4">No folders created yet.</div>
             )}
             {folders.map(folder => (
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
          <CardHeader>
            <CardTitle>{selectedFolder ? selectedFolder.name : 'Select a Folder'}</CardTitle>
            <CardDescription>
              {selectedFolder 
                ? `${filteredTimesheets.length} timesheet(s) found` 
                : 'Choose a folder from the left to view generated timesheets'}
            </CardDescription>
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
            ) : (
              <div className="space-y-2">
                {filteredTimesheets.map(ts => {
                  const lastSubmission = ts.submissions && ts.submissions.length > 0 
                    ? ts.submissions[ts.submissions.length - 1] 
                    : null;
                  
                  const isToday = lastSubmission 
                    ? new Date(lastSubmission.timestamp).toDateString() === new Date().toDateString()
                    : false;

                  return (
                    <div key={ts.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {ts.eid}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{ts.employeeName}</h4>
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
                        <Badge variant="outline" className="mr-2">
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
