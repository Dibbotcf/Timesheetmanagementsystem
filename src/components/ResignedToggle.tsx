import React from 'react';
import { UserX } from 'lucide-react';

// Reports list active employees by default; this switch adds the resigned ones back in.

type WithStatus = { status?: string };
export const isResigned = (e: WithStatus) => e.status !== 'Active';

/** Active employees only, or everyone when `withResigned` is on. */
export const reportEmployees = <T extends WithStatus>(all: T[], withResigned: boolean): T[] =>
  withResigned ? all : all.filter(e => !isResigned(e));

export const ResignedToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; count: number }> = ({ checked, onChange, count }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} disabled={count === 0}
    title={count === 0 ? 'No resigned employees' : checked ? 'Hide resigned employees' : 'Also list resigned employees'}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', borderRadius: 10, whiteSpace: 'nowrap',
      border: `1px solid ${checked ? '#fdba74' : '#d1d5db'}`, background: checked ? '#fff7ed' : '#fff',
      color: count === 0 ? '#9ca3af' : checked ? '#9a3412' : '#374151', fontSize: 12.5, fontWeight: 600,
      cursor: count === 0 ? 'not-allowed' : 'pointer',
    }}>
    <UserX style={{ width: 15, height: 15 }} />
    Show resigned
    <span style={{ padding: '0 7px', borderRadius: 9999, background: checked ? '#ea580c' : '#6b7280', color: '#fff', fontSize: 11 }}>{count}</span>
    <span aria-hidden="true" style={{ position: 'relative', width: 28, height: 16, borderRadius: 9999, background: checked ? '#ea580c' : '#d1d5db', transition: 'background .15s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: checked ? 14 : 2, width: 12, height: 12, borderRadius: 9999, background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.25)' }} />
    </span>
  </button>
);

/** Small grey tag shown after a resigned employee's name. */
export const ResignedTag: React.FC = () => (
  <span style={{ marginLeft: 6, padding: '1px 8px', borderRadius: 9999, background: '#6b7280', color: '#fff', fontSize: 10, fontWeight: 600, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Resigned</span>
);
