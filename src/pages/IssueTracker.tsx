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
  Open:     { pill: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500',  label: 'Pending' },
  Resolved: { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Resolved' },
} as const;

export const IssueTracker: React.FC = () => {
  const { currentUser, issues, addIssue, updateIssue, deleteIssue } = useAppStore();
  const isAdmin = currentUser?.role === 'Admin/HR' || currentUser?.role === 'Superadmin';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'Resolved'>(isAdmin ? 'Open' : 'All');
  const [filterPriority, setFilterPriority] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [newIssue, setNewIssue] = useState<{ title: string; description: string; priority: 'Low' | 'Medium' | 'High' }>({
    title: '', description: '', priority: 'Medium',
  });

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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Issue Tracker</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {isAdmin ? 'Manage and resolve all reported issues' : 'Report technical issues or request assistance'}
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1d4ed8', color: '#ffffff', fontSize: '14px', fontWeight: 600, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e40af')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1d4ed8')}
          >
            <Plus className="h-4 w-4 shrink-0" /> Report Issue
          </button>
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'Open' ? 'Pending' : s}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 hidden md:block" />

        <div className="flex items-center gap-2">
          {(['All', 'High', 'Medium', 'Low'] as const).map(p => {
            const colors: Record<string, string> = {
              All: 'bg-blue-600 text-white',
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
        <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-gray-300" style={{ minHeight: '340px' }}>
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">No issues found</h3>
          <p className="text-sm text-slate-400 mt-1.5">
            {isFiltered ? 'Try adjusting your filters.' : isAdmin ? 'No issues have been reported yet.' : 'You haven\'t reported any issues yet.'}
          </p>
          {!isAdmin && !isFiltered && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold px-8 py-3 rounded-full transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 shrink-0" /> Report Your First Issue
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
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-white"
                          style={{
                            background: issue.priority === 'High' ? '#ef4444' : issue.priority === 'Medium' ? '#f59e0b' : '#22c55e'
                          }}
                        >
                          <PIcon className="h-3 w-3" /> {issue.priority}
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

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Top row: status badge + Delete */}
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-white"
                          style={{ background: issue.status === 'Resolved' ? '#16a34a' : '#f59e0b' }}
                        >
                          {sCfg.label}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(issue.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', color: '#dc2626', fontSize: '12px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #fecaca', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </div>
                      {/* Mark Resolve button — blue, only for open issues */}
                      {isAdmin && issue.status === 'Open' && (
                        <button
                          onClick={() => handleResolve(issue.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Mark Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Report Issue Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-2xl" style={{ width: '500px', maxWidth: '95vw', padding: '32px 32px 28px' }}>
          {/* Title + subtitle */}
          <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">Report an Issue</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">Fill in the details below to report an issue to Admin.</p>
          <DialogDescription className="sr-only">Submit a support issue to Admin</DialogDescription>

          {/* Fields */}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Issue Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700" style={{ marginBottom: '6px' }}>
                Issue Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Cannot access timesheet for June"
                value={newIssue.title}
                onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
                className="h-10 text-sm"
                style={{ width: '100%' }}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700" style={{ marginBottom: '8px' }}>Priority</label>
              <div className="flex gap-2">
                {(['High', 'Medium', 'Low'] as const).map(p => {
                  const isSelected = newIssue.priority === p;
                  const cfg = {
                    High:   { PIcon: ShieldAlert,   bg: '#dc2626', border: '#dc2626', unsel: 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600' },
                    Medium: { PIcon: AlertTriangle, bg: '#d97706', border: '#d97706', unsel: 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600' },
                    Low:    { PIcon: Info,          bg: '#16a34a', border: '#16a34a', unsel: 'bg-white border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-600' },
                  }[p];
                  const PIcon = cfg.PIcon;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewIssue({ ...newIssue, priority: p })}
                      className={`inline-flex items-center gap-1.5 rounded-full text-xs font-semibold border-2 transition-all cursor-pointer ${isSelected ? '' : cfg.unsel}`}
                      style={isSelected
                        ? { padding: '6px 14px', background: cfg.bg, borderColor: cfg.border, color: '#fff' }
                        : { padding: '6px 14px' }
                      }
                    >
                      <PIcon className="h-3 w-3 shrink-0" />
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700" style={{ marginBottom: '6px' }}>
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Describe what happened, steps to reproduce, and what you expected…"
                className="text-sm resize-none"
                style={{ width: '100%', minHeight: '110px' }}
                value={newIssue.description}
                onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
              />
            </div>
          </div>

          {/* Actions — bottom right, no footer bar */}
          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              style={{ padding: '9px 22px', fontSize: '14px', fontWeight: 500, color: '#64748b', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 22px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0f172a')}
            >
              <Plus className="h-4 w-4" /> Submit Issue
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
