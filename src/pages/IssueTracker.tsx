import React, { useState } from 'react';
import { useAppStore, IssueTicket } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { AlertCircle, CheckCircle, Plus, Search, Filter, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';

export const IssueTracker: React.FC = () => {
  const { currentUser, issues, addIssue, updateIssue, deleteIssue } = useAppStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'Resolved'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [newIssue, setNewIssue] = useState<{
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High';
  }>({
    title: '',
    description: '',
    priority: 'Medium'
  });

  const isAdmin = currentUser?.role === 'Admin/HR';

  // Filter Logic
  const filteredIssues = issues
    .filter(issue => {
      // Staff sees only their issues, Admin sees all
      if (!isAdmin && issue.employeeId !== currentUser?.id) return false;

      // Status Filter
      if (filterStatus !== 'All' && issue.status !== filterStatus) return false;

      // Search Filter
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (
          issue.title.toLowerCase().includes(lower) ||
          issue.description.toLowerCase().includes(lower) ||
          issue.employeeName.toLowerCase().includes(lower)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = () => {
    if (!newIssue.title || !newIssue.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!currentUser) return;

    addIssue({
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      title: newIssue.title,
      description: newIssue.description,
      priority: newIssue.priority,
      status: 'Open',
      createdAt: new Date().toISOString()
    });

    setIsCreateOpen(false);
    setNewIssue({ title: '', description: '', priority: 'Medium' });
    toast.success("Issue reported successfully");
  };

  const handleResolve = (id: string) => {
    updateIssue(id, {
      status: 'Resolved',
      resolvedAt: new Date().toISOString()
    });
    toast.success("Issue marked as resolved");
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this issue? This action cannot be undone.")) {
      deleteIssue(id);
      toast.success("Issue deleted successfully");
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Issue Tracker</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage and resolve reported system issues.' : 'Report technical issues or request assistance.'}
          </p>
        </div>

        {!isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Report a New Issue</DialogTitle>
                <DialogDescription>
                  Describe the issue you are facing. Admin will be notified.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue Title</label>
                  <Input
                    placeholder="e.g. Cannot access timesheet"
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={newIssue.priority}
                    onValueChange={(v: 'Low' | 'Medium' | 'High') => setNewIssue({ ...newIssue, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low - Minor inconvenience</SelectItem>
                      <SelectItem value="Medium">Medium - Affects work</SelectItem>
                      <SelectItem value="High">High - Critical system failure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Please provide details..."
                    className="min-h-[100px]"
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>Submit Ticket</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterStatus}
              onValueChange={(v: 'All' | 'Open' | 'Resolved') => setFilterStatus(v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issue List */}
      <div className="grid gap-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No issues found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm || filterStatus !== 'All' ? 'Try adjusting your filters.' : 'No issues have been reported yet.'}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <Card key={issue.id} className={`transition-all hover:shadow-sm ${issue.status === 'Resolved' ? 'bg-gray-50/50' : 'border-l-4 border-l-blue-500'}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                        {issue.priority}
                      </Badge>
                      <Badge variant={issue.status === 'Open' ? 'default' : 'secondary'} className={issue.status === 'Open' ? 'bg-blue-600' : 'bg-gray-200 text-gray-700'}>
                        {issue.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(issue.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900 mt-2">
                      {issue.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      Reported by <span className="font-medium text-gray-900">{issue.employeeName}</span>
                    </CardDescription>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-col gap-2 shrink-0 items-end">
                      {issue.status === 'Open' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full md:w-auto"
                          onClick={() => handleResolve(issue.id)}
                        >
                          <CheckCircle className="h-4 w-4" /> Mark Resolved
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2 w-full md:w-auto"
                        onClick={() => handleDelete(issue.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  )}

                  {!isAdmin && issue.status === 'Resolved' && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center text-green-600 text-sm font-medium gap-1 bg-green-50 px-2 py-1 rounded border border-green-100">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </div>
                      {issue.resolvedAt && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {format(new Date(issue.resolvedAt), 'MMM dd, HH:mm')}
                        </span>
                      )}
                    </div>
                  )}

                  {isAdmin && issue.status === 'Resolved' && (
                    <div className="flex flex-col items-end mb-2">
                      <div className="flex items-center text-green-600 text-sm font-medium gap-1 bg-green-50 px-2 py-1 rounded border border-green-100">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </div>
                      {issue.resolvedAt && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {format(new Date(issue.resolvedAt), 'MMM dd, HH:mm')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
