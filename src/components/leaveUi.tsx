import React from 'react';
import { Baby, Briefcase, Plane, Thermometer, Umbrella } from 'lucide-react';
import type { LeaveRecord, LeaveType } from '../App';

// Shared design kit for the Leaves screens (Pending Leaves, Records). Follows the HR reference design:
// sans-serif, hairline borders, soft-tint pills, neutral avatars, one quiet action per row.
// NOTE: never put "Inter" first in the stack — a symbol font by that name exists on the office PCs.

export const FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const C = { ink: '#111827', body: '#374151', muted: '#6b7280', faint: '#9ca3af', line: '#e5e7eb', panel: '#ffffff', navy: '#1e3a8a' };

/** Soft tint per leave type (light background + darker text of the same hue). */
export const TYPE_STYLE: Record<LeaveType, { bg: string; fg: string; bar: string; Icon: React.FC<any>; label: string }> = {
  Sick:      { bg: '#fee2e2', fg: '#b91c1c', bar: '#ef4444', Icon: Thermometer, label: 'Sick Leave' },
  Casual:    { bg: '#dbeafe', fg: '#1d4ed8', bar: '#3b82f6', Icon: Umbrella,    label: 'Casual Leave' },
  Annual:    { bg: '#d1fae5', fg: '#047857', bar: '#10b981', Icon: Plane,       label: 'Annual Leave' },
  Maternity: { bg: '#fce7f3', fg: '#be185d', bar: '#ec4899', Icon: Baby,        label: 'Maternity Leave' },
  Other:     { bg: '#ede9fe', fg: '#6d28d9', bar: '#8b5cf6', Icon: Briefcase,   label: 'Other Leave' },
};

export const STATUS_STYLE = {
  pending:  { bg: '#fef9c3', fg: '#a16207', bd: '#fde68a', label: 'PENDING' },
  approved: { bg: '#dcfce7', fg: '#15803d', bd: '#bbf7d0', label: 'APPROVED' },
  rejected: { bg: '#f3f4f6', fg: '#6b7280', bd: '#e5e7eb', label: 'REJECTED' },
  overdue:  { bg: '#fee2e2', fg: '#b91c1c', bd: '#fecaca', label: 'OVERDUE' },
  info:     { bg: '#dbeafe', fg: '#1d4ed8', bd: '#bfdbfe', label: '' },
  warn:     { bg: '#fef3c7', fg: '#b45309', bd: '#fde68a', label: '' },
};
export const statusOf = (l: LeaveRecord) => l.status === 'Pending' ? STATUS_STYLE.pending : l.status === 'Rejected' ? STATUS_STYLE.rejected : STATUS_STYLE.approved;

export const Pill: React.FC<{ bg: string; fg: string; bd?: string; children: React.ReactNode; upper?: boolean; style?: React.CSSProperties }> = ({ bg, fg, bd, children, upper, style }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: fg, border: `1px solid ${bd || bg}`, borderRadius: 8, padding: '3px 10px', fontSize: upper ? 11 : 12, fontWeight: 600, letterSpacing: upper ? '0.04em' : 0, whiteSpace: 'nowrap', ...style }}>
    {children}
  </span>
);

export const TypePill: React.FC<{ type: LeaveType }> = ({ type }) => {
  const ts = TYPE_STYLE[type];
  return <Pill bg={ts.bg} fg={ts.fg}><ts.Icon style={{ width: 13, height: 13 }} /> {ts.label}</Pill>;
};

export const Avatar: React.FC<{ name?: string; size?: number }> = ({ name, size = 32 }) => {
  const initials = (name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return <span style={{ width: size, height: size, borderRadius: '50%', background: '#e5e7eb', color: '#4b5563', fontSize: size * 0.34, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</span>;
};

export const OutlineBtn: React.FC<{ onClick: () => void; disabled?: boolean; title?: string; color?: string; dashed?: boolean; tint?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ onClick, disabled, title, color = C.body, dashed, tint, children, style }) => (
  <button onClick={onClick} disabled={disabled} title={title}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 11px', borderRadius: 8, border: `1px ${dashed ? 'dashed' : 'solid'} ${dashed ? color : C.line}`, background: tint || '#fff', color: disabled ? C.faint : color, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: FONT, whiteSpace: 'nowrap', ...style }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.97)'; }}
    onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
    {children}
  </button>
);

export const PrimaryBtn: React.FC<{ onClick: () => void; children: React.ReactNode; title?: string }> = ({ onClick, children, title }) => (
  <button onClick={onClick} title={title}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', borderRadius: 9, border: 'none', background: C.navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#1e40af')} onMouseLeave={e => (e.currentTarget.style.background = C.navy)}>
    {children}
  </button>
);

export const IconBtn: React.FC<{ onClick: () => void; title: string; color?: string; children: React.ReactNode; disabled?: boolean }> = ({ onClick, title, color = C.muted, children, disabled }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: disabled ? C.faint : color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer', flexShrink: 0 }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#f3f4f6'; }} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
    {children}
  </button>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, color: C.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</div>
);

export const card: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12 };
export const th: React.CSSProperties = { textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 600, color: C.body, background: '#f9fafb', borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap', overflow: 'hidden' };
export const td: React.CSSProperties = { padding: '11px 10px', verticalAlign: 'middle', borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.body };

export const fmtQty = (l: LeaveRecord) => l.partialHours ? `${l.partialHours} Hour${l.partialHours !== 1 ? 's' : ''}` : `${l.days} Day${l.days !== 1 ? 's' : ''}`;

/** Thin progress bar used on stat/folder cards. */
export const Bar: React.FC<{ value: number; total: number; color: string }> = ({ value, total, color }) => (
  <div style={{ height: 3, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
    <div style={{ width: `${total ? Math.min(100, (value / total) * 100) : 0}%`, height: '100%', background: color }} />
  </div>
);
