import React, { useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, Eye, FileSpreadsheet, FileText, Info, Pencil, Plus, TrendingUp, Users, Banknote, Trash2, LogOut, KeyRound, Archive } from 'lucide-react';
import TCF_LOGO from '../assets/tcf-logo-landscape.png';
import type { Employee } from '../App';
import { SalarySheet, computeSalary, fmtMoney, MONTH_NAMES, attendanceMonthFor, sheetId } from '../lib/salary';

// Landing page of Salary & Payslips: summary cards + one card per salary sheet.

const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const C = { ink: '#111827', body: '#374151', muted: '#6b7280', faint: '#9ca3af', line: '#e5e7eb', strip: '#f1f3f6', navy: '#1e3a8a', green: '#16a34a', amber: '#f59e0b' };
const TAKA = 'BDT'; // the ৳ glyph renders badly in the office PCs' fonts
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

interface Props {
  sheets: SalarySheet[];
  employees: Employee[];            // active employees
  onBack: () => void;
  onOpen: (year: number, month: number) => void;
  onCreate: (year: number, month: number) => void;   // opens the employee picker
  onExportExcel: (s: SalarySheet) => void;
  onPayslips: (s: SalarySheet) => void;
  onDelete: (s: SalarySheet) => void;
  onDismiss: () => void;   // lock the salary area and leave it
  onPassword: () => void;  // set / change salary passwords
  onBackup?: () => void;   // Superadmin only: deleted sheets
  backupCount?: number;
}

const Avatars: React.FC<{ names: string[]; count: number }> = ({ names, count }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
    {names.slice(0, 3).map((n, i) => (
      <span key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#e5e7eb', color: '#4b5563', border: '2px solid #fff', marginLeft: i ? -8 : 0, fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {n.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)}
      </span>
    ))}
    <span style={{ marginLeft: -6, height: 24, minWidth: 34, padding: '0 8px', borderRadius: 999, border: `1px solid ${C.body}`, background: '#fff', fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
  </span>
);

const Btn: React.FC<{ onClick: () => void; icon: React.FC<any>; children?: React.ReactNode; label?: string; primary?: boolean; disabled?: boolean; title?: string }> = ({ onClick, icon: Icon, children, label, primary, disabled, title }) => (
  <button onClick={onClick} aria-label={label} title={title || label} disabled={disabled}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: children ? '0 14px' : 0, width: children ? undefined : 34, justifyContent: 'center',
      borderRadius: 8, border: `1px solid ${primary ? C.navy : C.line}`, background: primary ? C.navy : '#fff', color: primary ? '#fff' : C.ink,
      fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: FONT }}
    onMouseEnter={e => { if (!primary) e.currentTarget.style.background = '#f9fafb'; }} onMouseLeave={e => { if (!primary) e.currentTarget.style.background = '#fff'; }}>
    <Icon style={{ width: 16, height: 16 }} />{children}
  </button>
);

const StatCard: React.FC<{ title: string; icon: React.FC<any>; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', flex: '1 1 200px', minWidth: 200 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</span>
      <Icon style={{ width: 18, height: 18, color: C.muted }} />
    </div>
    {children}
  </div>
);

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const SalaryDashboard: React.FC<Props> = ({ sheets, employees, onBack, onOpen, onCreate, onExportExcel, onPayslips, onDelete, onDismiss, onPassword, onBackup, backupCount }) => {
  const today = new Date();
  // Filter for the sheet cards; a specific month is also the month "Create sheet" uses
  const [fMonth, setFMonth] = useState<number | 'all'>(today.getMonth()); // opens on the current month
  const [fYear, setFYear] = useState<number | 'all'>(today.getFullYear());

  const sorted = useMemo(() => [...sheets].sort((a, b) => b.id.localeCompare(a.id)), [sheets]);
  const shown = sorted.filter(s => (fYear === 'all' || s.year === fYear) && (fMonth === 'all' || s.month === fMonth));
  const canCreate = fMonth !== 'all' && fYear !== 'all';
  const target = canCreate ? { year: fYear as number, month: fMonth as number } : null;
  const targetExists = !!target && sheets.some(s => s.id === sheetId(target.year, target.month));
  const filterLabel = `${fMonth === 'all' ? 'any month' : MONTH_NAMES[fMonth]}${fYear === 'all' ? '' : ` ${fYear}`}`;
  // Stat cards follow the month/year filter, so they always match the cards below
  const finals = shown.filter(s => s.status === 'final').length;
  const drafts = shown.filter(s => s.status === 'draft');
  const scope = fMonth === 'all' && fYear === 'all' ? 'All time' : fMonth === 'all' ? `In ${fYear}` : `In ${filterLabel}`;
  const names = employees.map(e => e.name);

  const totals = (s: SalarySheet) => s.rows.reduce((acc, r) => {
    const c = computeSalary(r);
    return { gross: acc.gross + c.gross, net: acc.net + c.netPayable, paid: acc.paid + (r.gross || c.totalPayable ? 1 : 0) };
  }, { gross: 0, net: 0, paid: 0 });

  return (
    <div style={{ fontFamily: FONT, color: C.ink, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Company header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} aria-label="Back to reports" className="cursor-pointer"
          style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft style={{ width: 16, height: 16, color: C.body }} />
        </button>
        <img src={TCF_LOGO} alt="TCF" style={{ height: 30 }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Tokyo Consulting Firm Limited</h1>
        {onBackup && (
          <button onClick={onBackup} title="Deleted salary sheets — restore or delete permanently (Superadmin only)"
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 8,
              border: `1px solid ${C.line}`, background: '#fff', color: C.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
            <Archive style={{ width: 16, height: 16 }} /> Backup
            {!!backupCount && <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{backupCount}</span>}
          </button>
        )}
        <button onClick={onPassword} title="Set or change the password for Salary & Payslips"
          style={{ marginLeft: onBackup ? undefined : 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 8,
            border: `1px solid ${C.line}`, background: '#fff', color: C.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
          <KeyRound style={{ width: 16, height: 16 }} /> Password
        </button>
        <button onClick={onDismiss} title="Lock Salary & Payslips and go back to Reports — the password is asked again next time"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 8,
            border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
          <LogOut style={{ width: 16, height: 16 }} /> Dismiss
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" style={{ background: C.strip, borderRadius: 10, padding: 4, display: 'flex', gap: 4 }}>
        {[
          { key: 'dash', label: 'Dashboard', icon: Banknote, active: true, onClick: () => {} },
          { key: 'sheet', label: 'Salary Sheet', icon: FileSpreadsheet, active: false, onClick: () => onOpen(today.getFullYear(), today.getMonth()) },
        ].map(t => (
          <button key={t.key} role="tab" aria-selected={t.active} onClick={t.onClick}
            style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: t.active ? '#fff' : 'transparent', boxShadow: t.active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', color: t.active ? C.ink : C.muted, fontSize: 13.5, fontWeight: t.active ? 600 : 500, fontFamily: FONT }}>
            <t.icon style={{ width: 15, height: 15 }} /> {t.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard title="Total Salary Sheets" icon={FileText}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{shown.length}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{scope}{shown.length !== sorted.length ? ` · ${sorted.length} overall` : ''}</div>
        </StatCard>
        <StatCard title="Active Employees" icon={Users}>
          <Avatars names={names} count={employees.length} />
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Currently on the payroll</div>
        </StatCard>
        <StatCard title="Finalized Sheets" icon={FileText}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{finals}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Out of {shown.length} · {scope.toLowerCase()}</div>
        </StatCard>
        <StatCard title="Pending Review" icon={Info}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{drafts.length}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Draft{drafts.length === 1 ? '' : 's'} awaiting finalize · {scope.toLowerCase()}</div>
            </div>
            {drafts[0] && <Btn icon={Pencil} onClick={() => onOpen(drafts[0].year, drafts[0].month)}>Resolve</Btn>}
          </div>
        </StatCard>
      </div>

      {/* Sheets */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Salary Sheets</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff' }}>
            <CalendarDays style={{ width: 15, height: 15, color: C.muted }} />
            <select aria-label="Filter by month" value={fMonth} onChange={e => setFMonth(e.target.value === 'all' ? 'all' : +e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, background: 'transparent', fontFamily: FONT, cursor: 'pointer' }}>
              <option value="all">All months</option>
              {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <select aria-label="Filter by year" value={fYear} onChange={e => setFYear(e.target.value === 'all' ? 'all' : +e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, background: 'transparent', fontFamily: FONT, cursor: 'pointer' }}>
              <option value="all">All years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </span>
          <Btn icon={Plus} primary disabled={!target}
            title={!target ? 'Choose a month and year to create a sheet' : targetExists ? 'Open this month\'s sheet' : `Create the ${MONTH_NAMES[target.month]} ${target.year} sheet`}
            onClick={() => { if (!target) return; targetExists ? onOpen(target.year, target.month) : onCreate(target.year, target.month); }}>
            {targetExists ? 'Open sheet' : 'Create sheet'}
          </Btn>
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ background: '#fff', border: `1px dashed ${C.line}`, borderRadius: 12, padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>
          {sorted.length === 0
            ? <>No salary sheets yet. Choose a month, click <b>Create sheet</b> and pick the employees — OT and late minutes fill in from the system.</>
            : <>No salary sheet for {filterLabel}. {canCreate ? <>Click <b>Create sheet</b> to start one.</> : 'Try another month or year.'}</>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {shown.map(s => {
            const t = totals(s);
            const att = attendanceMonthFor(s.year, s.month);
            const final = s.status === 'final';
            const title = `${MONTH_NAMES[s.month]} ${s.year} Salary Sheet`;
            return (
              <div key={s.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                      <Building2 style={{ width: 13, height: 13 }} /> Tokyo Consulting Firm Limited
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button aria-label={`Delete ${title}`} title={`Delete ${title}`} onClick={() => onDelete(s)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Trash2 style={{ width: 16, height: 16 }} />
                    </button>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={final ? { background: C.green, color: '#fff' } : { background: '#fde047', color: '#713f12' }}>
                      {final ? 'Finalized' : 'Draft'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 12.5, color: C.muted }}>
                  <Avatars names={s.rows.map(r => r.name)} count={s.rows.length} />
                  <span>Attendance: {MONTH_NAMES[att.month]} {att.year}</span>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 12.5, color: C.muted }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CalendarDays style={{ width: 14, height: 14 }} /> Created: {fmtDate(s.createdAt)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TrendingUp style={{ width: 14, height: 14 }} /> {final ? `Finalized: ${fmtDate(s.finalizedAt)}` : `Updated: ${fmtDate(s.updatedAt)}`}</span>
                </div>

                <div style={{ background: '#f8f9fb', borderRadius: 8, padding: '10px 12px', marginTop: 12, fontSize: 12.5, color: C.body, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <span>Net payable <b style={{ fontVariantNumeric: 'tabular-nums' }}>{TAKA} {fmtMoney(t.net)}</b></span>
                  <span>Gross <b style={{ fontVariantNumeric: 'tabular-nums' }}>{TAKA} {fmtMoney(t.gross)}</b></span>
                  <span style={{ color: C.muted }}>{t.paid}/{s.rows.length} salaries entered</span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <Btn icon={Eye} onClick={() => onOpen(s.year, s.month)}>View Details</Btn>
                  <Btn icon={FileSpreadsheet} onClick={() => onExportExcel(s)}>Excel</Btn>
                  <Btn icon={FileText} onClick={() => onPayslips(s)}>Payslips</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
