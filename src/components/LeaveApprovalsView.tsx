import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, Eye, FileCheck, Hourglass, PenLine, Undo2, X, AlertCircle, CheckCircle2, ClipboardList, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedSearch } from './AnimatedSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAppStore } from '../App';
import type { LeaveRecord, LeaveType, Employee, MonthTemplate } from '../App';
import { signAsHr, signToApprove, HR_SIGN_UNDO } from './SignaturePin';
import { addWorkingDays, getWorkingDayPath, getHardCopyDeadlineDays, hardCopyBaseDate, localDate } from '../lib/leaveDays';
import { getCasualCriterion } from '../lib/leaveCriteria';
import { FONT, C, TYPE_STYLE, STATUS_STYLE, Pill, Avatar, OutlineBtn, IconBtn, Label, card, th, td, colLine, fmtQty, SignedCell } from './leaveUi';

// Leaves → Pending Leaves tab (Admin/HR).
// Layout follows the HR reference design: summary cards → one card with segmented tabs + a lean table →
// a right-hand "Open leaves" month calendar (same pattern as the Employees birthday calendar).
// Soft-tint pills, hairline borders, neutral avatars, sans-serif.

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
  const [tab, setTab] = useState<Tab>('all'); // opens on every open item
  const [expanded, setExpanded] = useState<string | null>(null);
  const todayMid = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const empOf = (id: string) => employees.find(e => e.id === id);
  const { signatures, currentUser } = useAppStore();
  const sigById = (id?: string) => (id ? signatures.find(s => s.id === id) : undefined);
  // HR sign (Confirm By HR): an HR/Admin signature + its PIN — the signed form has reached HR
  const confirmByHr = async (l: LeaveRecord) => {
    const patch = await signAsHr({ signatures, employees, user: currentUser, subject: `${empOf(l.employeeId)?.name ?? 'this leave'} · ${fmtRange(l.startDate, l.endDate)}` });
    if (!patch) return;
    updateLeave(l.id, patch);
    toast.success(`HR signed — ${signatures.find(s => s.id === patch.hrSignatureId)?.name ?? 'HR'}`);
  };
  // Final sign = approval: only Fumihiro Abe's or Showkat Akber's signature + its PIN; comes after the HR sign
  const approve = async (l: LeaveRecord) => {
    const name = empOf(l.employeeId)?.name ?? 'this employee';
    const patch = await signToApprove({ signatures, employees, user: currentUser, subject: `${name} · ${TYPE_STYLE[l.type].label} · ${fmtRange(l.startDate, l.endDate)}` });
    if (!patch) return;
    updateLeave(l.id, patch);
    toast.success(`Final signed by ${signatures.find(s => s.id === patch.approvedSignatureId)?.name ?? 'approver'} — leave approved for ${name}`);
  };
  const reject = (l: LeaveRecord) => { updateLeave(l.id, { status: 'Rejected' }); toast.error(`Leave rejected for ${empOf(l.employeeId)?.name ?? 'this employee'}`); };

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
          </div>

          {/* Filters: always shown (pinned); the search is highlighted with a typing-style hint */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.line}`, background: '#fafafa' }}>
            <AnimatedSearch value={filters.search} onChange={filters.setSearch} height={36} ariaLabel="Search open leaves by name or EID"
              hints={['Search by name or EID…', 'Try a name — e.g. Yousuf', 'Try an EID — e.g. TCF-33']} style={{ flex: '1 1 220px', width: 'auto', minWidth: 200 }} />
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

          {rows.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center' }}>
              <FileCheck style={{ width: 28, height: 28, color: '#d1d5db', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.body }}>Nothing here</div>
              <div style={{ fontSize: 13, color: C.faint, marginTop: 4 }}>{activeFilterCount ? 'No open items match these filters.' : tab === 'pending' ? 'Every request has been decided.' : 'Every signed form is in.'}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
                <colgroup>
                  <col style={{ width: 30 }} /><col /><col style={{ width: 124 }} /><col style={{ width: 116 }} /><col style={{ width: 100 }} /><col style={{ width: 156 }} /><col style={{ width: 156 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={th}></th>
                    <th style={th}>Employee</th>
                    <th style={{ ...th, ...colLine }}>Type</th>
                    <th style={{ ...th, ...colLine }}>Duration</th>
                    <th style={{ ...th, ...colLine }}>Status</th>
                    <th style={{ ...th, ...colLine }}>HR Signed</th>
                    <th style={{ ...th, ...colLine }}>Final Signed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ l, emp, deadline, overdue, overdueBy }) => {
                    const isPending = l.status === 'Pending';
                    const needsDoc = deadline !== null;
                    const canApprove = !needsDoc || !!l.hardCopyCollected; // Final sign appears once HR has signed
                    const hrSigned = !!l.hrSignatureId || !!l.hardCopyCollected;
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
                                <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp?.designation === 'DIC' ? 'DIC' : emp?.eid}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...td, ...colLine }}>
                            <Pill bg={ts.bg} fg={ts.fg}><ts.Icon style={{ width: 13, height: 13 }} /> {ts.label}</Pill>
                            {/* reason in one line (full text on hover and in the expanded row) */}
                            {l.reason && <div title={l.reason} style={{ fontSize: 11.5, color: C.muted, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.reason}</div>}
                          </td>
                          <td style={{ ...td, ...colLine }}>
                            <div style={{ color: C.ink, whiteSpace: 'nowrap' }}>{fmtRange(l.startDate, l.endDate)}</div>
                            <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>{fmtQty(l)}</div>
                            {/* signed-form deadline while HR hasn't signed (once signed, the HR Signed column shows it) */}
                            {needsDoc && !l.hardCopyCollected && (
                              overdue ? (
                                <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>Form overdue · {overdueBy} day{overdueBy !== 1 ? 's' : ''}</div>
                              ) : (
                                <div style={{ fontSize: 11, color: C.faint, marginTop: 2, whiteSpace: 'nowrap' }}>Form due {format(deadline!, 'MMM d')}</div>
                              )
                            )}
                          </td>
                          <td style={{ ...td, ...colLine }}><Pill bg={st.bg} fg={st.fg} bd={st.bd} upper>{st.label}</Pill></td>
                          {/* HR Signed: the HR signature once signed, otherwise the HR Sign button */}
                          <td style={{ ...td, ...colLine }}>
                            {hrSigned ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <SignedCell sig={sigById(l.hrSignatureId)} name={l.hrSignatureId ? undefined : l.hrSignedBy} at={l.hrSignedAt} unsigned="Received · unsigned" />
                                </div>
                                {isPending && <IconBtn title="Undo HR sign (removes the HR signature)" onClick={() => updateLeave(l.id, HR_SIGN_UNDO)}><Undo2 style={{ width: 13, height: 13 }} /></IconBtn>}
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                                <OutlineBtn onClick={() => confirmByHr(l)} title="HR sign (signature + PIN): confirms the signed form has reached HR"><PenLine style={{ width: 13, height: 13 }} /> HR Sign</OutlineBtn>
                                {isPending && !canApprove && <IconBtn color="#b91c1c" title="Reject" onClick={() => reject(l)}><X style={{ width: 15, height: 15 }} /></IconBtn>}
                              </div>
                            )}
                          </td>
                          {/* Final Signed: the approval signature; the Final Sign button appears after the HR sign */}
                          <td style={{ ...td, ...colLine }}>
                            {!isPending ? (
                              <SignedCell sig={sigById(l.approvedSignatureId)} name={l.approvedSignatureId ? undefined : l.approvedBy} at={l.approvedAt} unsigned="Approved · unsigned" />
                            ) : canApprove ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                                <OutlineBtn color="#15803d" title="Final sign (Fumihiro Abe or Showkat Akber · signature + PIN): approves the leave" onClick={() => approve(l)}><PenLine style={{ width: 13, height: 13 }} /> Final Sign</OutlineBtn>
                                <IconBtn color="#b91c1c" title="Reject" onClick={() => reject(l)}><X style={{ width: 15, height: 15 }} /></IconBtn>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11.5, color: C.faint }}>After HR sign</span>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td style={{ ...td, background: '#fafafa' }}></td>
                            <td colSpan={6} style={{ ...td, background: '#fafafa', paddingTop: 4 }}>
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

        <OpenLeavesCalendar rows={open} today={todayMid} />
      </div>
    </div>
  );
};

// ── Right panel: open leaves on a month calendar ─────────────────────────────────
// Open = not approved yet, or approved but the signed form isn't in. Every day a leave covers is marked,
// coloured by its most urgent state; clicking a day narrows the list below to that day.
type OpenRow = { l: LeaveRecord; emp?: Employee; deadline: Date | null; overdue: boolean; overdueBy: number };
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const LEVELS = {
  3: { bg: '#fee2e2', fg: '#b91c1c', dot: '#dc2626', label: 'Form overdue' },
  2: { bg: '#fef3c7', fg: '#b45309', dot: '#d97706', label: 'Pending' },
  1: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#2563eb', label: 'Form not in' },
} as const;
type Level = keyof typeof LEVELS;
const levelOf = (r: OpenRow): Level => (r.overdue ? 3 : r.l.status === 'Pending' ? 2 : 1);
const dayLabel = (s: Date, e: Date) =>
  s.getTime() === e.getTime() ? `${MONTH_ABBR[s.getMonth()]} ${s.getDate()}`
  : s.getMonth() === e.getMonth() ? `${MONTH_ABBR[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
  : `${MONTH_ABBR[s.getMonth()]} ${s.getDate()}–${MONTH_ABBR[e.getMonth()]} ${e.getDate()}`;

const OpenLeavesCalendar: React.FC<{ rows: OpenRow[]; today: Date }> = ({ rows, today }) => {
  const [view, setView] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const [picked, setPicked] = useState<number | null>(null);
  const shift = (d: number) => { setPicked(null); setView(v => { const n = new Date(v.y, v.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; }); };

  const monthStart = new Date(view.y, view.m, 1);
  const monthEnd = new Date(view.y, view.m + 1, 0);
  const monthName = monthStart.toLocaleString('default', { month: 'long' });
  const dated = useMemo(() => rows.map(r => ({ ...r, s: localDate(r.l.startDate), e: localDate(r.l.endDate) })), [rows]);

  // leaves touching the viewed month, and the most urgent state on each of its days
  const inMonth = useMemo(() => dated
    .filter(r => r.s <= monthEnd && r.e >= monthStart)
    .sort((a, b) => a.s.getTime() - b.s.getTime() || (a.emp?.name || '').localeCompare(b.emp?.name || '')),
  [dated, view.y, view.m]);
  const dayLevel = useMemo(() => {
    const m = new Map<number, Level>();
    for (const r of inMonth) {
      for (let d = new Date(Math.max(r.s.getTime(), monthStart.getTime())); d <= r.e && d <= monthEnd; d.setDate(d.getDate() + 1)) {
        m.set(d.getDate(), Math.max(m.get(d.getDate()) || 0, levelOf(r)) as Level);
      }
    }
    return m;
  }, [inMonth]);

  const pickedDate = picked ? new Date(view.y, view.m, picked) : null;
  const list = pickedDate ? inMonth.filter(r => r.s <= pickedDate && r.e >= pickedDate) : inMonth;
  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth();

  return (
    <div style={{ ...card, flex: '0 0 300px', overflow: 'hidden', alignSelf: 'flex-start' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays style={{ width: 16, height: 16, color: '#2563eb' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, flex: 1 }}>Open leaves</span>
          <span style={{ background: '#e5e7eb', color: C.body, fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999 }}>{rows.length}</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Not approved, or signed form not received</div>
      </div>

      {/* Month calendar */}
      <div style={{ padding: '4px 16px 12px', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0' }}>
          <IconBtn onClick={() => shift(-1)} title="Previous month"><ChevronLeft style={{ width: 16, height: 16 }} /></IconBtn>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{monthName} {view.y}</span>
          <IconBtn onClick={() => shift(1)} title="Next month"><ChevronRight style={{ width: 16, height: 16 }} /></IconBtn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={'w' + i} style={{ fontSize: 10, fontWeight: 600, color: C.faint, padding: '4px 0' }}>{d}</div>)}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={'b' + i} />)}
          {Array.from({ length: monthEnd.getDate() }).map((_, i) => {
            const day = i + 1;
            const lvl = dayLevel.get(day);
            const isToday = isThisMonth && day === today.getDate();
            const isPicked = picked === day;
            const L = lvl ? LEVELS[lvl] : null;
            const style: React.CSSProperties = {
              width: 28, height: 28, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: 'none', padding: 0, fontFamily: FONT,
              background: isToday ? '#1d4ed8' : L ? L.bg : 'transparent',
              color: isToday ? '#fff' : L ? L.fg : '#334155',
              fontWeight: isToday || L ? 700 : 400,
              cursor: L ? 'pointer' : 'default',
              outline: isPicked ? `2px solid ${L ? L.dot : '#1d4ed8'}` : 'none', outlineOffset: 1,
            };
            return (
              <div key={day} style={{ height: 30, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {L ? (
                  <button type="button" style={style} onClick={() => setPicked(isPicked ? null : day)}
                    title={`${format(new Date(view.y, view.m, day), 'EEE d MMM')} — ${inMonth.filter(r => r.s <= new Date(view.y, view.m, day) && r.e >= new Date(view.y, view.m, day)).length} open`}>
                    {day}
                  </button>
                ) : <span style={style}>{day}</span>}
                {L && isToday && <span style={{ position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: 999, background: L.dot }} />}
              </div>
            );
          })}
        </div>
        {/* Legend with how many of this month's open leaves are in each state */}
        <div style={{ display: 'flex', gap: '4px 10px', flexWrap: 'wrap', marginTop: 8, fontSize: 10.5, color: C.muted }}>
          {([3, 2, 1] as Level[]).map(k => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: LEVELS[k].dot }} /> {LEVELS[k].label}
              <b style={{ color: LEVELS[k].fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{inMonth.filter(r => levelOf(r) === k).length}</b>
            </span>
          ))}
        </div>
      </div>

      {/* List for the month (or the picked day) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px', background: '#f8fafc', borderBottom: `1px solid ${C.line}`, fontSize: 10.5, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        <span>{pickedDate ? format(pickedDate, 'EEE d MMM') : `${monthName} open leaves`}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {pickedDate && <button type="button" onClick={() => setPicked(null)} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', padding: 0, textTransform: 'uppercase', fontFamily: FONT }}>Show all</button>}
          {list.length}
        </span>
      </div>
      {list.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 12, color: C.faint }}>No open leaves in {monthName}.</div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {list.map((r, i) => {
            const { l, emp, overdue, overdueBy } = r;
            const ts = TYPE_STYLE[l.type];
            const L = LEVELS[levelOf(r)];
            const isPending = l.status === 'Pending';
            const needsDoc = getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null;
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ width: 18, flexShrink: 0, fontSize: 12, color: C.faint, fontVariantNumeric: 'tabular-nums', paddingTop: 1 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{emp?.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: L.fg, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{dayLabel(r.s, r.e)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontSize: 11.5, color: C.body }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 4, background: ts.bg, color: ts.fg }}><ts.Icon style={{ width: 10, height: 10 }} /></span>
                    {ts.label} · {fmtQty(l)}
                  </div>
                  <div style={{ fontSize: 11, color: overdue ? '#b91c1c' : C.faint, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, fontWeight: overdue ? 600 : 400 }}>
                    {overdue ? <><AlertCircle style={{ width: 11, height: 11 }} /> Signed form overdue · {overdueBy} day{overdueBy !== 1 ? 's' : ''}</>
                      : isPending && needsDoc && !l.hardCopyCollected ? <><Hourglass style={{ width: 11, height: 11, color: '#d97706' }} /> Waiting for approval · form not received</>
                      : isPending ? <><Hourglass style={{ width: 11, height: 11, color: '#d97706' }} /> Waiting for HR approval</>
                      : <><FileCheck style={{ width: 11, height: 11, color: '#2563eb' }} /> Approved · signed form not received</>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
