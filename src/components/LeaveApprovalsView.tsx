import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, ChevronDown, ChevronRight, Eye, FileCheck, Hourglass, Search, SlidersHorizontal, Undo2, X, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { LeaveRecord, LeaveType, Employee, MonthTemplate } from '../App';
import { addWorkingDays, getWorkingDayPath, getHardCopyDeadlineDays, hardCopyBaseDate, localDate } from '../lib/leaveDays';
import { getCasualCriterion } from '../lib/leaveCriteria';
import { FONT, C, TYPE_STYLE, STATUS_STYLE, Pill, Avatar, OutlineBtn, IconBtn, Label, card, th, td, fmtQty } from './leaveUi';

// Leaves → Pending Leaves tab (Admin/HR).
// Layout follows the HR reference design: summary cards → one card with segmented tabs + a lean table →
// a right-hand "Upcoming absences" panel. Soft-tint pills, hairline borders, neutral avatars, sans-serif.

interface Filters {
  search: string; setSearch: (v: string) => void;
  employee: string; setEmployee: (v: string) => void;
  month: string; setMonth: (v: string) => void;
  type: string; setType: (v: string) => void;
}

interface Props {
  leaves: LeaveRecord[];
  employees: Employee[];
  templates: MonthTemplate[];
  filters: Filters;
  updateLeave: (id: string, data: Partial<LeaveRecord>) => void;
  onViewLeaveForm: (l: LeaveRecord) => void;
}

const fmtRange = (s: string, e: string) => s === e ? format(parseISO(s), 'MMM d') : `${format(parseISO(s), 'MMM d')} — ${format(parseISO(e), 'MMM d')}`;

type Tab = 'pending' | 'awaiting' | 'all';

export const LeaveApprovalsView: React.FC<Props> = ({ leaves, employees, templates, filters, updateLeave, onViewLeaveForm }) => {
  const [tab, setTab] = useState<Tab>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const todayMid = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const empOf = (id: string) => employees.find(e => e.id === id);

  // Open items: pending decisions + approved leaves still waiting for their signed hard copy
  const open = useMemo(() => leaves
    .filter(l => l.status === 'Pending' || (l.status === 'Approved' && !l.hardCopyCollected && getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null))
    .map(l => {
      const dd = getHardCopyDeadlineDays(l.type, !!l.partialHours);
      const deadline = dd !== null ? addWorkingDays(hardCopyBaseDate(l), dd, templates) : null;
      const overdue = !!deadline && !l.hardCopyCollected && todayMid > deadline;
      const overdueBy = deadline && overdue ? getWorkingDayPath(deadline, 60, templates).filter(d => d <= todayMid).length : 0;
      return { l, emp: empOf(l.employeeId), deadline, overdue, overdueBy };
    }), [leaves, employees, templates, todayMid]);

  const counts = useMemo(() => ({
    pending: open.filter(r => r.l.status === 'Pending').length,
    awaiting: open.filter(r => r.l.status === 'Approved').length,
    overdue: open.filter(r => r.overdue).length,
  }), [open]);

  const thisMonth = format(new Date(), 'yyyy-MM');
  const monthStats = useMemo(() => {
    const m = leaves.filter(l => l.startDate.startsWith(thisMonth));
    return { total: m.length, approved: m.filter(l => l.status === 'Approved').length };
  }, [leaves, thisMonth]);

  const activeFilterCount = [filters.search, filters.month].filter(Boolean).length + (filters.employee !== 'All' ? 1 : 0) + (filters.type !== 'All' ? 1 : 0);

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return open.filter(({ l, emp }) => {
      if (tab === 'pending' && l.status !== 'Pending') return false;
      if (tab === 'awaiting' && l.status !== 'Approved') return false;
      const okSearch = !q || (emp?.name || '').toLowerCase().includes(q) || (emp?.eid || '').toLowerCase().includes(q);
      const okType = filters.type === 'All' || l.type === filters.type;
      const okEmp = filters.employee === 'All' || l.employeeId === filters.employee;
      const okMonth = !filters.month || l.startDate.slice(0, 7) === filters.month || l.endDate.slice(0, 7) === filters.month;
      return okSearch && okType && okEmp && okMonth;
    }).sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.l.status !== b.l.status) return a.l.status === 'Pending' ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
      return a.l.startDate.localeCompare(b.l.startDate);
    });
  }, [open, tab, filters]);

  // Right panel: every open item (not approved, or signed form not received), grouped by leave date
  const upcoming = useMemo(() =>
    [...open]
      .sort((a, b) => a.l.startDate.localeCompare(b.l.startDate) || (a.emp?.name || '').localeCompare(b.emp?.name || ''))
      .map(r => ({ ...r, day: localDate(r.l.startDate) })),
  [open]);

  const StatCard: React.FC<{ Icon: React.FC<any>; label: string; value: number; total?: number; bar: string; sub: React.ReactNode }> = ({ Icon, label, value, total, bar, sub }) => (
    <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.body, fontWeight: 500 }}><Icon style={{ width: 18, height: 18, color: C.body }} /> {label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{value}{total !== undefined && <span style={{ fontSize: 13, fontWeight: 500, color: C.faint }}> / {total}</span>}</div>
      <div style={{ height: 3, background: C.line, borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${total ? Math.min(100, (value / total) * 100) : value ? 100 : 0}%`, height: '100%', background: bar }} /></div>
      <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
    </div>
  );

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'pending', label: 'Needs approval', n: counts.pending },
    { key: 'awaiting', label: 'Awaiting document', n: counts.awaiting },
    { key: 'all', label: 'All open', n: open.length },
  ];

  return (
    <div style={{ fontFamily: FONT, color: C.body, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <StatCard Icon={ClipboardList} label="Needs approval" value={counts.pending} total={open.length} bar="#f59e0b" sub={<><b style={{ color: C.body }}>{counts.pending}</b> waiting · <span style={{ color: '#a16207' }}>{counts.pending ? 'decision required' : 'all decided'}</span></>} />
        <StatCard Icon={Hourglass} label="Awaiting document" value={counts.awaiting} total={open.length} bar="#3b82f6" sub={<><b style={{ color: C.body }}>{counts.awaiting}</b> approved · signed form not yet received</>} />
        <StatCard Icon={AlertCircle} label="Overdue forms" value={counts.overdue} bar="#ef4444" sub={counts.overdue ? <span style={{ color: '#b91c1c' }}>past the working-day deadline</span> : 'nothing past deadline'} />
        <StatCard Icon={CheckCircle2} label={`Approved · ${format(new Date(), 'MMMM')}`} value={monthStats.approved} total={monthStats.total} bar="#10b981" sub={<><b style={{ color: C.body }}>{monthStats.total - monthStats.approved}</b> not yet approved this month</>} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Main card — keeps ≥ 800px; the side panel drops below it on narrower screens */}
        <div style={{ ...card, overflow: 'hidden', flex: '1 1 780px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: 'inline-flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
              {tabs.map(t => {
                const on = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: on ? '#fff' : 'transparent', color: on ? C.ink : C.muted, fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', fontFamily: FONT }}>
                    {t.label}
                    <span style={{ background: '#e5e7eb', color: C.body, fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999 }}>{t.n}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowFilters(v => !v)} title="Filters" style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, border: `1px solid ${showFilters ? '#c7d2fe' : 'transparent'}`, background: showFilters ? '#eef2ff' : 'transparent', color: showFilters ? '#4338ca' : C.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <SlidersHorizontal style={{ width: 16, height: 16 }} />
              {activeFilterCount > 0 && <span style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: '50%', background: '#4f46e5' }} />}
            </button>
          </div>

          {showFilters && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 14px', borderBottom: `1px solid ${C.line}`, background: '#fafafa' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by name or EID" value={filters.search} onChange={e => filters.setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-white" style={{ fontFamily: FONT }} />
              </div>
              <Select value={filters.employee} onValueChange={filters.setEmployee}>
                <SelectTrigger className="w-[180px] h-9 text-sm bg-white" style={{ fontFamily: FONT }}><SelectValue placeholder="All employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All employees</SelectItem>
                  {employees.filter(e => e.status === 'Active').map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.eid})</SelectItem>)}
                </SelectContent>
              </Select>
              <input type="month" value={filters.month} onChange={e => filters.setMonth(e.target.value)} title="Filter by month"
                className="h-9 px-3 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700" style={{ minWidth: 150, fontFamily: FONT }} />
              <Select value={filters.type} onValueChange={filters.setType}>
                <SelectTrigger className="w-[130px] h-9 text-sm bg-white" style={{ fontFamily: FONT }}><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All types</SelectItem>
                  {(Object.keys(TYPE_STYLE) as LeaveType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <OutlineBtn onClick={() => { filters.setSearch(''); filters.setEmployee('All'); filters.setMonth(''); filters.setType('All'); }}>Clear</OutlineBtn>
              )}
            </div>
          )}

          {rows.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center' }}>
              <FileCheck style={{ width: 28, height: 28, color: '#d1d5db', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.body }}>Nothing here</div>
              <div style={{ fontSize: 13, color: C.faint, marginTop: 4 }}>{activeFilterCount ? 'No open items match these filters.' : tab === 'pending' ? 'Every request has been decided.' : 'Every signed form is in.'}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 720 }}>
                <colgroup>
                  <col style={{ width: 30 }} /><col style={{ width: 144 }} /><col style={{ width: 114 }} /><col style={{ width: 112 }} /><col /><col style={{ width: 252 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={th}></th>
                    <th style={th}>Employee</th>
                    <th style={th}>Type</th>
                    <th style={th}>Duration</th>
                    <th style={th}>Reason</th>
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ l, emp, deadline, overdue, overdueBy }) => {
                    const isPending = l.status === 'Pending';
                    const needsDoc = deadline !== null;
                    const canApprove = !needsDoc || !!l.hardCopyCollected;
                    const ts = TYPE_STYLE[l.type];
                    const st = overdue ? STATUS_STYLE.overdue : isPending ? STATUS_STYLE.pending : STATUS_STYLE.approved;
                    const isOpen = expanded === l.id;
                    return (
                      <React.Fragment key={l.id}>
                        <tr style={{ background: isOpen ? '#fafafa' : undefined }}>
                          <td style={{ ...td, padding: '11px 0 11px 8px' }}>
                            <IconBtn onClick={() => setExpanded(isOpen ? null : l.id)} title={isOpen ? 'Collapse' : 'Details'}>
                              {isOpen ? <ChevronDown style={{ width: 16, height: 16 }} /> : <ChevronRight style={{ width: 16, height: 16 }} />}
                            </IconBtn>
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <Avatar name={emp?.name} />
                              <div style={{ minWidth: 0 }}>
                                <div title={emp?.name} style={{ fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp?.name ?? 'Unknown'}</div>
                                <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp?.designation || emp?.eid}</div>
                              </div>
                            </div>
                          </td>
                          <td style={td}><Pill bg={ts.bg} fg={ts.fg}><ts.Icon style={{ width: 13, height: 13 }} /> {ts.label}</Pill></td>
                          <td style={td}>
                            <div style={{ color: C.ink, whiteSpace: 'nowrap' }}>{fmtRange(l.startDate, l.endDate)}</div>
                            <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{fmtQty(l)}</div>
                            {/* signed-form state lives here so the row stays short */}
                            {needsDoc && (
                              l.hardCopyCollected ? (
                                <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                  <Check style={{ width: 12, height: 12 }} /> Form received
                                  {isPending && <button onClick={() => updateLeave(l.id, { hardCopyCollected: false })} title="Undo" style={{ border: 'none', background: 'transparent', color: C.faint, cursor: 'pointer', display: 'inline-flex', padding: 0 }}><Undo2 style={{ width: 11, height: 11 }} /></button>}
                                </div>
                              ) : overdue ? (
                                <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>Form overdue · {overdueBy} day{overdueBy !== 1 ? 's' : ''}</div>
                              ) : (
                                <div style={{ fontSize: 11, color: C.faint, marginTop: 2, whiteSpace: 'nowrap' }}>Form due {format(deadline!, 'MMM d')}</div>
                              )
                            )}
                          </td>
                          <td style={td}>
                            <div title={l.reason} style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.45 }}>{l.reason}</div>
                          </td>
                          <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'visible' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <Pill bg={st.bg} fg={st.fg} bd={st.bd} upper>{st.label}</Pill>
                              {/* One next step per row: collect the form first, then approve */}
                              {needsDoc && !l.hardCopyCollected ? (
                                <OutlineBtn onClick={() => updateLeave(l.id, { hardCopyCollected: true })} title="Signed form received">Mark received</OutlineBtn>
                              ) : isPending && canApprove ? (
                                <OutlineBtn color="#15803d" title="Approve" onClick={() => { updateLeave(l.id, { status: 'Approved' }); toast.success(`Leave approved for ${emp?.name}`); }}>
                                  <Check style={{ width: 14, height: 14 }} /> Approve
                                </OutlineBtn>
                              ) : null}
                              {isPending && <IconBtn color="#b91c1c" title="Reject" onClick={() => { updateLeave(l.id, { status: 'Rejected' }); toast.error(`Leave rejected for ${emp?.name}`); }}><X style={{ width: 15, height: 15 }} /></IconBtn>}
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td style={{ ...td, background: '#fafafa' }}></td>
                            <td colSpan={5} style={{ ...td, background: '#fafafa', paddingTop: 4 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 24px', fontSize: 13 }}>
                                <div><Label>Reason</Label><div style={{ color: C.body, marginTop: 2, whiteSpace: 'pre-wrap' }}>{l.reason}</div></div>
                                {l.casualCriteria && <div><Label>Casual criteria</Label><div style={{ color: C.body, marginTop: 2 }}>{l.casualCriteria}. {getCasualCriterion(l.casualCriteria)?.text}</div></div>}
                                <div><Label>Dates</Label><div style={{ color: C.body, marginTop: 2 }}>{format(parseISO(l.startDate), 'EEE d MMM yyyy')}{l.endDate !== l.startDate ? ` → ${format(parseISO(l.endDate), 'EEE d MMM yyyy')}` : ''} · {fmtQty(l)}</div></div>
                                {needsDoc && <div><Label>Signed form deadline</Label><div style={{ color: overdue ? '#b91c1c' : C.body, marginTop: 2 }}>{format(deadline!, 'EEE d MMM yyyy')}{overdue ? ` · overdue by ${overdueBy} working day${overdueBy !== 1 ? 's' : ''}` : ''}</div></div>}
                                {l.createdAt && <div><Label>Submitted</Label><div style={{ color: C.body, marginTop: 2 }}>{format(new Date(l.createdAt), 'd MMM yyyy, h:mm a')}</div></div>}
                              </div>
                              <div style={{ marginTop: 10 }}>
                                <OutlineBtn onClick={() => onViewLeaveForm(l)} title="Opens the printable form in a new tab"><Eye style={{ width: 14, height: 14 }} /> View leave request form</OutlineBtn>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '10px 14px', fontSize: 12, color: C.faint, borderTop: `1px solid ${C.line}` }}>Showing {rows.length} record{rows.length !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>

        {/* Upcoming absences */}
        <div style={{ ...card, padding: 16, flex: '0 0 300px' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>Open by date</div>
            <div style={{ fontSize: 12, color: C.muted }}>Not approved, or signed form not received · {upcoming.length}</div>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: C.faint, padding: '20px 0', textAlign: 'center' }}>Nothing open.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map(({ l, emp, day, overdue, overdueBy }, i) => {
                const ts = TYPE_STYLE[l.type];
                const isPending = l.status === 'Pending';
                const showDay = i === 0 || upcoming[i - 1].day.getTime() !== day.getTime();
                const needsDoc = getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null;
                const isToday = day.getTime() === todayMid.getTime();
                return (
                  <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8 }}>
                    <div style={{ textAlign: 'center', paddingTop: 4, visibility: showDay ? 'visible' : 'hidden' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? '#2563eb' : C.faint, letterSpacing: '0.04em' }}>{format(day, 'EEE').toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? '#2563eb' : C.ink, lineHeight: 1.1 }}>{format(day, 'd')}</div>
                      <div style={{ fontSize: 10, color: C.faint }}>{format(day, 'MMM')}</div>
                    </div>
                    <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${ts.bar}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={emp?.name} size={26} />
                        <span style={{ fontWeight: 600, color: C.ink, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp?.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isPending ? '#a16207' : '#15803d' }}>{isPending ? 'Pending' : 'Approved'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: C.body }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: ts.bg, color: ts.fg }}><ts.Icon style={{ width: 11, height: 11 }} /></span>
                        {ts.label} · {fmtQty(l)}
                      </div>
                      <div style={{ fontSize: 11, color: overdue ? '#b91c1c' : C.faint, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, fontWeight: overdue ? 600 : 400 }}>
                        {overdue ? <><AlertCircle style={{ width: 11, height: 11 }} /> Signed form overdue · {overdueBy} day{overdueBy !== 1 ? 's' : ''}</>
                          : isPending && needsDoc && !l.hardCopyCollected ? <><Hourglass style={{ width: 11, height: 11, color: '#d97706' }} /> Waiting for approval · form not received</>
                          : isPending ? <><Hourglass style={{ width: 11, height: 11, color: '#d97706' }} /> Waiting for HR approval</>
                          : <><FileCheck style={{ width: 11, height: 11, color: '#2563eb' }} /> Signed form not received</>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
