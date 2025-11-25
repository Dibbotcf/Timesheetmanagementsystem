import React, { useState, useEffect } from 'react';
import { useAppStore } from '../App';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Save, RotateCcw, Eye, AlertTriangle, FileJson, HardDrive, Play, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1933abde`;

type BackupFile = {
  name: string;
  id: string | null;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: any;
};

export const Backups: React.FC = () => {
  const { enablePreview, previewData } = useAppStore();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupType, setBackupType] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      console.log('Fetching backups from:', `${API_BASE}/backups`);
      const res = await fetch(`${API_BASE}/backups`, {
        mode: 'cors',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (!res.ok) {
          throw new Error(`Failed to fetch backups: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      // Filter and sort
      const sorted = (data || [])
        .filter((f: any) => f.name.endsWith('.json'))
        .sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      setBackups(sorted);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load backups: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (type: 'daily' | 'monthly') => {
    const toastId = toast.loading(`Creating ${type} backup...`);
    try {
      const res = await fetch(`${API_BASE}/backups`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify({ type, label: `Manual ${type} backup` })
      });
      
      if (!res.ok) throw new Error('Backup failed');
      
      toast.dismiss(toastId);
      toast.success(`${type} backup created successfully`);
      fetchBackups();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to create backup");
    }
  };

  const handlePreview = async (filename: string) => {
    const toastId = toast.loading("Loading backup for preview...");
    try {
      const res = await fetch(`${API_BASE}/backups/data?path=${encodeURIComponent(filename)}`, {
         mode: 'cors',
         headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (!res.ok) throw new Error('Download failed');
      
      const data = await res.json();
      // The backup file structure wraps the actual data in a 'data' property
      // We need to pass the inner data object to enablePreview so App.tsx can access .employees, .leaves, etc.
      enablePreview(data.data || data);
      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to load backup data");
    }
  };

  const handleRestore = async (filename: string) => {
    setRestoring(true);
    const toastId = toast.loading("Restoring system data... This may take a moment.");
    try {
      // 1. Get Data
      const dataRes = await fetch(`${API_BASE}/backups/data?path=${encodeURIComponent(filename)}`, {
         mode: 'cors',
         headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (!dataRes.ok) throw new Error('Failed to download backup for restore');
      const backupContent = await dataRes.json();

      // 2. Send to Restore Endpoint
      const restoreRes = await fetch(`${API_BASE}/restore`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify({ data: backupContent.data })
      });

      if (!restoreRes.ok) throw new Error('Restore operation failed');

      toast.dismiss(toastId);
      toast.success("System restored successfully. Reloading...");
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Restore failed. System may be in inconsistent state.");
      setRestoring(false);
    }
  };

  const handleDelete = async (filename: string) => {
      if (!confirm(`Are you sure you want to delete backup "${filename}"? This cannot be undone.`)) return;
      
      const toastId = toast.loading("Deleting backup...");
      try {
          const res = await fetch(`${API_BASE}/backups?path=${encodeURIComponent(filename)}`, {
              method: 'DELETE',
              mode: 'cors',
              headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          });
          
          if (!res.ok) throw new Error('Delete failed');
          
          toast.dismiss(toastId);
          toast.success("Backup deleted successfully");
          fetchBackups();
      } catch (err) {
          console.error(err);
          toast.dismiss(toastId);
          toast.error("Failed to delete backup");
      }
  };

  if (previewData) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <div className="bg-amber-100 p-6 rounded-full">
                <Eye className="h-12 w-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-amber-900">Preview Mode Active</h2>
            <p className="max-w-md text-amber-800">
                You are currently viewing a snapshot of the system data. 
                You can navigate through the application to verify the data state. 
                <br/><br/>
                <strong>No changes can be made in this mode.</strong>
            </p>
            <div className="flex gap-4">
                <Button asChild variant="outline">
                     <Link to="/">Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                     <Link to="/leaves">Check Leaves</Link>
                </Button>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backups & Restore</h1>
        <p className="text-gray-500">Manage system snapshots and recovery points</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" /> Scheduled Backups
                </CardTitle>
                <CardDescription>System backup configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        <div>
                            <div className="font-medium">Daily Backup</div>
                            <div className="text-xs text-gray-500">Runs automatically at 10:00 PM</div>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-gray-400">Next: Today 22:00</div>
                </div>
                 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                         <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        <div>
                            <div className="font-medium">Monthly Backup</div>
                            <div className="text-xs text-gray-500">Runs on 1st of every month</div>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-gray-400">Next: 01/12/2025</div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-purple-600" /> Manual Backup
                </CardTitle>
                <CardDescription>Create an immediate snapshot of the current system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                    <AlertTitle className="text-xs font-bold uppercase">Note</AlertTitle>
                    <AlertDescription className="text-xs">
                        Manual backups are saved separately and do not override scheduled backups.
                    </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                    <Button onClick={() => handleCreateBackup('daily')} className="flex-1 gap-2">
                        <Save className="h-4 w-4" /> Run Backup
                    </Button>
                    <Button onClick={() => handleCreateBackup('monthly')} variant="outline" className="flex-1 gap-2">
                        <Save className="h-4 w-4" /> Run Monthly
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" /> Backup History
            </CardTitle>
            <CardDescription>Available restore points</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading backups...</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date Created</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {backups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No backups found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            backups.map((file) => {
                                const isDaily = file.name.includes('daily');
                                return (
                                    <TableRow key={file.name}>
                                        <TableCell className="font-medium">
                                            {new Date(file.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-gray-500">
                                            {file.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={isDaily ? 'default' : 'secondary'}>
                                                {isDaily ? 'Daily' : 'Monthly'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {file.metadata ? (file.metadata.size / 1024).toFixed(2) : '0.00'} KB
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handlePreview(file.name)}
                                                    className="h-8 gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> Preview
                                                </Button>
                                                
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            className="h-8 gap-1 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                                                <AlertTriangle className="h-5 w-5" /> Confirm System Restore
                                                            </DialogTitle>
                                                            <DialogDescription>
                                                                This action will <strong>permanently overwrite</strong> all current system data with the selected backup from {new Date(file.created_at).toLocaleString()}.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        
                                                        <Alert variant="destructive" className="my-4">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            <AlertTitle>Warning</AlertTitle>
                                                            <AlertDescription>
                                                                Any data created after this backup point will be lost forever.
                                                            </AlertDescription>
                                                        </Alert>

                                                        <DialogFooter>
                                                            <Button 
                                                                variant="destructive" 
                                                                onClick={() => handleRestore(file.name)}
                                                                disabled={restoring}
                                                            >
                                                                {restoring ? 'Restoring...' : 'Yes, Restore System'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(file.name)}
                                                    className="h-8 w-8 p-0 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
