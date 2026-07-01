import React, { useState, useMemo } from 'react';
import { useAppStore } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  AlertCircle, CheckCircle, Plus, Search, Clock, Trash2,
  ShieldAlert, AlertTriangle, Info, MessageSquareDot,
  ListFilter, TrendingUp, BarChart2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';

const PRIORITY_CONFIG = {
  High:   { color: 'bg-red-500',    light: 'bg-red-50 text-red-700 border-red-200',   icon: ShieldAlert,     bar: 'border-l-red-500' },
  Medium: { color: 'bg-amber-400',  light: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle, bar: 'border-l-amber-400' },
  Low:    { color: 'bg-green-500',  light: 'bg-green-50 text-green-700 border-green-200', icon: Info,          bar: 'border-l-green-400' },
} as const;

const STATUS_CONFIG = {
  Open:     { pill: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  Resolved: { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
} as const;

export const IssueTracker: React.FC = () => {
  const { currentUser, issues, addIssue, updateIssue, deleteIssue } = useAppStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'Resolved'>('All');
  const [filterPriority, setFilterPriority] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [newIssue, setNewIssue] = useState<{ title: string; description: string; priority: 'Low' | 'Medium' | 'High' }>({
    title: '', description: '', priority: 'Medium',
  });

  const isAdmin = currentUser?.role === 'Admin/HR';

  const filteredIssues = useMemo(() =>
    issues
      .filter(issue => {
        if (!isAdmin && issue.employeeId !== currentUser?.id) return false;
        if (filterStatus !== 'All' && issue.status !== filterStatus) return false;
        if (filterPriority !== 'All' && issue.priority !== filterPriority) return false;
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          return issue.title.toLowerCase().includes(lower) ||
            issue.description.toLowerCase().includes(lower) ||
            issue.employeeName.toLowerCase().includes(lower);
        }
        return true;
      })
      .sort((a, b) => {
        const pOrder = { High: 0, Medium: 1, Low: 2 };
        if (a.status !== b.status) return a.status === 'Open' ? -1 : 1;
        if (a.priority !== b.priority) return pOrder[a.priority] - pOrder[b.priority];
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [issues, isAdmin, currentUser, filterStatus, filterPriority, searchTerm]
  );

  const stats = useMemo(() => {
    const visible = isAdmin ? issues : issues.filter(i => i.employeeId === currentUser?.id);
    return {
      total: visible.length,
      open: visible.filter(i => i.status === 'Open').length,
      resolved: visible.filter(i => i.status === 'Resolved').length,
      high: visible.filter(i => i.priority === 'High' && i.status === 'Open').length,
    };
  }, [issues, isAdmin, currentUser]);

  const handleSubmit = () => {
    if (!newIssue.title.trim() || !newIssue.description.trim()) {
      toast.error('Please fill in all required fields');
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
      createdAt: new Date().toISOString(),
    });
    setIsCreateOpen(false);
    setNewIssue({ title: '', description: '', priority: 'Medium' });
    toast.success('Issue reported successfully');
  };

  const handleResolve = (id: string) => {
    updateIssue(id, { status: 'Resolved', resolvedAt: new Date().toISOString() });
    toast.success('Issue marked as resolved');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      deleteIssue(id);
      toast.success('Issue deleted');
    }
  };

  const isFiltered = filterStatus !== 'All' || filterPriority !== 'All' || searchTerm !== '';

  return (
    <div className="space-y-4 pb-10">
      {/* ── Header ── */}
      <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-700 rounded-xl">
              <MessageSquareDot className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Issue Tracker</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {isAdmin ? 'Manage and resolve all reported issues' : 'Report technical issues or request assistance'}
              </p>
            </div>
          </div>

          {!isAdmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-md"
            >
              <Plus className="h-4 w-4" /> Report Issue
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Issues', value: stats.total, sub: 'All time', color: 'text-slate-800', icon: BarChart2, iconColor: 'text-slate-500 bg-slate-100' },
          { label: 'Open', value: stats.open, sub: 'Awaiting resolution', color: 'text-blue-700', icon: Clock, iconColor: 'text-blue-600 bg-blue-100' },
          { label: 'Resolved', value: stats.resolved, sub: 'Completed', color: 'text-emerald-700', icon: CheckCircle, iconColor: 'text-emerald-600 bg-emerald-100' },
          { label: 'High Priority', value: stats.high, sub: 'Open & urgent', color: 'text-red-600', icon: ShieldAlert, iconColor: 'text-red-600 bg-red-100' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start gap-3">
              <div className={`p-2 rounded-lg ${card.iconColor} shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color} leading-tight`}>{card.value}</p>
                <p className="text-xs text-gray-400">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search issues…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {(['All', 'Open', 'Resolved'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 hidden md:block" />

        <div className="flex items-center gap-2">
          {(['All', 'High', 'Medium', 'Low'] as const).map(p => {
            const colors: Record<string, string> = {
              All: 'bg-slate-800 text-white',
              High: 'bg-red-600 text-white',
              Medium: 'bg-amber-500 text-white',
              Low: 'bg-green-600 text-white',
            };
            return (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterPriority === p
                    ? colors[p]
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {isFiltered && (
          <button
            onClick={() => { setSearchTerm(''); setFilterStatus('All'); setFilterPriority('All'); }}
            className="ml-auto text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Issue List ── */}
      {filteredIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">No issues found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {isFiltered ? 'Try adjusting your filters.' : isAdmin ? 'No issues have been reported yet.' : 'You haven\'t reported any issues yet.'}
          </p>
          {!isAdmin && !isFiltered && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" /> Report Your First Issue
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            const pCfg = PRIORITY_CONFIG[issue.priority];
            const sCfg = STATUS_CONFIG[issue.status];
            const PIcon = pCfg.icon;

            return (
              <div
                key={issue.id}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 ${pCfg.bar} hover:shadow-md transition-shadow ${issue.status === 'Resolved' ? 'opacity-75' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pCfg.light}`}>
                          <PIcon className="h-3 w-3" /> {issue.priority}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sCfg.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dot}`} />
                          {issue.status}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {format(new Date(issue.createdAt), 'MMM dd, yyyy · HH:mm')}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className={`font-bold text-base leading-snug ${issue.status === 'Resolved' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
                        {issue.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-slate-500 mt-1.5 leading-relaxed line-clamp-2 whitespace-pre-wrap">
                        {issue.description}
                      </p>

                      {/* Reporter + resolved info */}
                      <div className="flex flex-wrap items-center gap-3 mt-2.5">
                        <span className="text-xs text-slate-400">
                          Reported by <span className="font-semibold text-slate-600">{issue.employeeName}</span>
                        </span>
                        {issue.status === 'Resolved' && issue.resolvedAt && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Resolved {format(new Date(issue.resolvedAt), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    {isAdmin && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {issue.status === 'Open' && (
                          <button
                            onClick={() => handleResolve(issue.id)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Resolve
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(issue.id)}
                          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Report Issue Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquareDot className="h-5 w-5 text-blue-600" /> Report a New Issue
            </DialogTitle>
            <DialogDescription>
              Describe the issue clearly. Admin will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Issue Title <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Cannot access timesheet for June"
                value={newIssue.title}
                onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
                className="focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Priority</label>
              <Select value={newIssue.priority} onValueChange={(v: 'Low' | 'Medium' | 'High') => setNewIssue({ ...newIssue, priority: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> High — Critical, needs urgent attention</span>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> Medium — Affects work, not blocking</span>
                  </SelectItem>
                  <SelectItem value="Low">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" /> Low — Minor inconvenience</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Description <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="Describe the issue in detail — steps to reproduce, what you expected, what happened…"
                className="min-h-[110px] focus:ring-blue-500"
                value={newIssue.description}
                onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" /> Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
