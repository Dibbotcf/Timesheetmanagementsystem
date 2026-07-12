import React, { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, Wifi, WifiOff, Fingerprint, User, Download, Clock,
  Users, CreditCard, Edit2, Trash2, Plus, X, Save, Check, AlertTriangle, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../App';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttRecord { deviceUserId: string; recordTime: string; }

interface ZKTUser {
  uid: number; userId: string; name: string;
  cardno: number; role: number; password: string;
}

interface DeviceStatus {
  connected: boolean; ip: string; port: number; machineNo?: number;
  error?: string; userCounts?: number; logCounts?: number;
}

interface DeviceConfig { ip: string; port: number; machineNo: number; }

interface DailyRow {
  date: string; displayDate: string; deviceUserId: string;
  name: string; entry: string; out: string; totalPunches: number;
  entryIso: string; outIso: string;
}

interface ModalState {
  mode: 'add' | 'edit';
  user?: ZKTUser;
  form: { userId: string; name: string; cardno: string; };
}

interface TimeEditState {
  row: DailyRow;
  entryHHMM: string;
  outHHMM: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

function toBD(iso: string): Date {
  return new Date(new Date(iso).getTime() + 6 * 60 * 60 * 1000);
}

function parseRecordDate(iso: string): string {
  const d = toBD(iso);
  if (isNaN(d.getTime())) return '?';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function formatTime12(iso: string): string {
  const d = toBD(iso);
  if (isNaN(d.getTime())) return '?';
  const h24 = d.getUTCHours(), min = d.getUTCMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad(h12)}:${pad(min)} ${ampm}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${pad(d)} ${months[m-1]} ${y}, ${days[new Date(y, m-1, d).getDay()]}`;
}

function isoToHHMM(iso: string): string {
  const d = toBD(iso);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function hhmm12(hhmm: string): string {
  if (!hhmm) return '—';
  const [hStr, mStr] = hhmm.split(':');
  const h24 = parseInt(hStr, 10), min = parseInt(mStr, 10);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad(h12)}:${pad(min)} ${ampm}`;
}

function buildDailyRows(
  records: AttRecord[],
  users: ZKTUser[],
  overrides: Record<string, { entry: string; out: string }>,
): DailyRow[] {
  // Only map users with proper (non-numeric) names
  const userMap = new Map<string, string>();
  users.forEach(u => {
    const n = (u.name || '').trim();
    if (n && isNaN(Number(n))) userMap.set(u.userId, n);
  });
  const groups = new Map<string, string[]>();
  records.forEach(r => {
    // Skip records from unnamed / numeric-only users
    if (!userMap.has(r.deviceUserId)) return;
    const key = `${parseRecordDate(r.recordTime)}|${r.deviceUserId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r.recordTime);
  });
  const rows: DailyRow[] = [];
  groups.forEach((isoTimes, key) => {
    const [date, userId] = key.split('|');
    isoTimes.sort();
    const ov = overrides[key];
    const rawEntry = isoTimes[0];
    const rawOut   = isoTimes.length > 1 ? isoTimes[isoTimes.length - 1] : '';
    rows.push({
      date, displayDate: formatDisplayDate(date), deviceUserId: userId,
      name: userMap.get(userId) || userId,
      entry: ov?.entry ? hhmm12(ov.entry) : formatTime12(rawEntry),
      out:   ov?.out   ? hhmm12(ov.out)   : (rawOut ? formatTime12(rawOut) : '—'),
      totalPunches: isoTimes.length,
      entryIso: rawEntry,
      outIso: rawOut,
    });
  });
  rows.sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : a.entryIso.localeCompare(b.entryIso));
  return rows;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ZKTAttendanceReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser } = useAppStore()!;
  const isSuperAdmin = currentUser?.role === 'Superadmin';

  const [status, setStatus]       = useState<DeviceStatus | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [users, setUsers]         = useState<ZKTUser[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { entry: string; out: string }>>({});
  const [totalRaw, setTotalRaw]   = useState(0);
  const [loading, setLoading]     = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [fetched, setFetched]     = useState(false);
  const [view, setView]           = useState<'attendance' | 'users'>('attendance');
  const [modal, setModal]         = useState<ModalState | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<ZKTUser | null>(null);
  const [timeEdit, setTimeEdit]   = useState<TimeEditState | null>(null);
  const [timeEditSaving, setTimeEditSaving] = useState(false);
  const [deviceCfg, setDeviceCfg] = useState<DeviceConfig | null>(null);
  const [cfgEdit, setCfgEdit]     = useState<DeviceConfig | null>(null);
  const [cfgSaving, setCfgSaving] = useState(false);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  // ── Load device config on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/zkt/device-config`).then(r => r.json()).then(setDeviceCfg).catch(() => {});
  }, []);

  const saveDeviceConfig = async () => {
    if (!cfgEdit) return;
    setCfgSaving(true);
    try {
      const res = await fetch(`${API}/zkt/device-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfgEdit),
      });
      const data = await res.json();
      if (data.success) {
        setDeviceCfg(data.config);
        setCfgEdit(null);
        toast.success('Device settings saved — reconnect to apply');
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setCfgSaving(false);
    }
  };

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    toast.info('Connecting to ZKTeco device…');
    try {
      const [statusRes, attRes, usersRes, ovRes] = await Promise.all([
        fetch(`${API}/zkt/status`),
        fetch(`${API}/zkt/attendance`),
        fetch(`${API}/zkt/users`),
        fetch(`${API}/zkt/time-overrides`),
      ]);
      const statusData: DeviceStatus = await statusRes.json();
      setStatus(statusData);
      if (!statusData.connected) {
        toast.warning('Device offline — loading from cached push data…');
      }
      const attData   = await attRes.json();
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      let ovData: Record<string, { entry: string; out: string }> = {};
      try { if (ovRes.ok) ovData = await ovRes.json(); } catch {}
      const rawUsers: ZKTUser[] = usersData.users || [];
      setOverrides(ovData);
      setDailyRows(buildDailyRows(attData.records || [], rawUsers, ovData));
      setUsers(rawUsers);
      setTotalRaw(attData.total || 0);
      setFetched(true);
      const src = attData.source === 'push' ? ' (push cache)' : '';
      toast.success(`Loaded ${rawUsers.length} users · ${(attData.total || 0).toLocaleString()} punches${src}`);
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Save (add/edit) user ────────────────────────────────────────────────────
  const saveUser = useCallback(async () => {
    if (!modal) return;
    const { mode, user, form } = modal;
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.userId.trim()) { toast.error('User ID is required'); return; }

    const originalUserId = mode === 'edit' ? user!.userId : form.userId;
    const key = originalUserId;
    setActionLoading(a => ({ ...a, [key]: true }));
    try {
      const uid  = mode === 'edit' ? user!.uid : (Math.max(0, ...users.map(u => u.uid)) + 1);
      const body = {
        uid, userId: form.userId.trim(),
        name:     form.name.trim(),
        cardno:   parseInt(form.cardno, 10) || 0,
        password: user?.password || '',
        role:     user?.role || 0,
      };
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const url    = mode === 'edit' ? `${API}/zkt/users/${originalUserId}` : `${API}/zkt/users`;
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.success) {
        toast.success(`${mode === 'add' ? 'Added' : 'Updated'} "${form.name.trim()}" on device`);
        setModal(null);
        // Optimistic update
        if (mode === 'edit') {
          setUsers(us => us.map(u => u.userId === originalUserId ? { ...u, userId: form.userId.trim(), name: form.name.trim(), cardno: parseInt(form.cardno,10)||0 } : u));
        } else {
          setUsers(us => [...us, { uid, userId: form.userId.trim(), name: form.name.trim(), cardno: parseInt(form.cardno,10)||0, role: 0, password: '' }]);
        }
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setActionLoading(a => ({ ...a, [key]: false }));
    }
  }, [modal, users]);

  // ── Save time override ──────────────────────────────────────────────────────
  const saveTimeOverride = useCallback(async () => {
    if (!timeEdit) return;
    setTimeEditSaving(true);
    try {
      const key = `${timeEdit.row.date}|${timeEdit.row.deviceUserId}`;
      const res = await fetch(`${API}/zkt/time-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, entry: timeEdit.entryHHMM, out: timeEdit.outHHMM }),
      });
      const data = await res.json();
      if (data.success) {
        const newOv = { ...overrides, [key]: { entry: timeEdit.entryHHMM, out: timeEdit.outHHMM } };
        setOverrides(newOv);
        setDailyRows(rows => rows.map(r =>
          r.date === timeEdit.row.date && r.deviceUserId === timeEdit.row.deviceUserId
            ? { ...r,
                entry: timeEdit.entryHHMM ? hhmm12(timeEdit.entryHHMM) : r.entry,
                out:   timeEdit.outHHMM   ? hhmm12(timeEdit.outHHMM)   : r.out,
              }
            : r
        ));
        toast.success('Time updated');
        setTimeEdit(null);
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setTimeEditSaving(false);
    }
  }, [timeEdit, overrides]);

  // ── Delete user ─────────────────────────────────────────────────────────────
  const deleteUser = useCallback(async (u: ZKTUser) => {
    setActionLoading(a => ({ ...a, [u.userId]: true }));
    setConfirmDelete(null);
    try {
      const res  = await fetch(`${API}/zkt/users/${u.userId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: u.uid }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted "${u.name}" from device`);
        setUsers(us => us.filter(x => x.userId !== u.userId));
      } else {
        toast.error(`Delete failed: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setActionLoading(a => ({ ...a, [u.userId]: false }));
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const employeeNames = Array.from(new Set(dailyRows.map(r => r.name))).sort((a, b) => a.localeCompare(b));

  const filtered = dailyRows.filter(r => {
    if (filterDateFrom && r.date < filterDateFrom) return false;
    if (filterDateTo   && r.date > filterDateTo)   return false;
    if (filterEmployee && r.name !== filterEmployee) return false;
    return true;
  });
  const groupedByDate = filtered.reduce<{ date: string; displayDate: string; rows: DailyRow[] }[]>((acc, r) => {
    const last = acc[acc.length - 1];
    if (last && last.date === r.date) last.rows.push(r);
    else acc.push({ date: r.date, displayDate: r.displayDate, rows: [r] });
    return acc;
  }, []);

  const exportCSV = () => {
    const header = 'Date,Day,Employee Name,Device ID,Entry Time,Out Time,Total Punches';
    const rows = filtered.map(r => {
      const [y, m, d] = r.date.split('-').map(Number);
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `"${pad(d)} ${months[m-1]} ${y}","${days[new Date(y,m-1,d).getDay()]}","${r.name}","${r.deviceUserId}","${r.entry}","${r.out}","${r.totalPunches}"`;
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const suffix = filterDateFrom && filterDateTo ? `_${filterDateFrom}_to_${filterDateTo}` : filterDateFrom ? `_from_${filterDateFrom}` : filterDateTo ? `_to_${filterDateTo}` : '';
    a.download = `ZKT_Attendance${suffix}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success('CSV exported');
  };

  const sortedUsers = [...users].sort((a, b) => parseInt(a.userId) - parseInt(b.userId));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Top Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px', background: '#fff', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>ZKTeco Attendance Report</h1>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Daily entry &amp; out times · Device user management</p>
        </div>

        {/* Tab switcher — Manage Users only for Superadmin */}
        {fetched && (
          <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            <button onClick={() => setView('attendance')} style={{
              display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px',
              borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: view === 'attendance' ? '#fff' : 'transparent',
              color: view === 'attendance' ? '#1d4ed8' : '#6b7280',
              boxShadow: view === 'attendance' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s',
            }}>
              <Clock size={13} /> Attendance
            </button>
            {isSuperAdmin && (
              <button onClick={() => setView('users')} style={{
                display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px',
                borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: view === 'users' ? '#fff' : 'transparent',
                color: view === 'users' ? '#7c3aed' : '#6b7280',
                boxShadow: view === 'users' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
                <Users size={13} /> Manage Users
              </button>
            )}
          </div>
        )}

        <button onClick={fetchAll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : fetched ? 'Refresh' : 'Load from Device'}
        </button>
        {fetched && view === 'attendance' && filtered.length > 0 && (
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* ── Device Status ── */}
      {status && (
        <div style={{ background: status.connected ? '#f0fdf4' : '#fef2f2', border: `1px solid ${status.connected ? '#bbf7d0' : '#fecaca'}`, borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', color: status.connected ? '#15803d' : '#dc2626' }}>
            {status.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
            {status.connected ? 'Device Connected' : 'Device Unreachable'}
          </span>
          <span style={{ background: '#e5e7eb', borderRadius: '999px', padding: '2px 10px', fontSize: '12px', color: '#374151' }}>IP: {status.ip}:{status.port}</span>
          {(deviceCfg?.machineNo ?? status.machineNo) ? (
            <span style={{ background: '#e5e7eb', borderRadius: '999px', padding: '2px 10px', fontSize: '12px', color: '#374151' }}>Machine No.: {deviceCfg?.machineNo ?? status.machineNo}</span>
          ) : null}
          {status.connected && status.userCounts !== undefined && (
            <span style={{ background: '#dbeafe', borderRadius: '999px', padding: '2px 10px', fontSize: '12px', color: '#1d4ed8' }}><User size={10} style={{ display:'inline', marginRight:'3px' }} />{status.userCounts} Users</span>
          )}
          {fetched && <span style={{ background: '#ede9fe', borderRadius: '999px', padding: '2px 10px', fontSize: '12px', color: '#7c3aed' }}><Clock size={10} style={{ display:'inline', marginRight:'3px' }} />{totalRaw.toLocaleString()} Punches</span>}
          {!status.connected && status.error && <span style={{ fontSize: '12px', color: '#dc2626' }}>{status.error}</span>}
          {isSuperAdmin && deviceCfg && (
            <button onClick={() => setCfgEdit({ ...deviceCfg })} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
              <Pencil size={11} /> Edit Settings
            </button>
          )}
        </div>
      )}

      {/* ── Attendance Filters ── */}
      {fetched && view === 'attendance' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>From Date</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>To Date</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Employee</label>
            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none', width: '200px', background: '#fff', color: '#111827' }}>
              <option value="">All Employees</option>
              {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: '1px', fontSize: '13px', color: '#6b7280' }}>
            <strong style={{ color: '#111827' }}>{filtered.length}</strong> entries
          </div>
          {(filterDateFrom || filterDateTo || filterEmployee) && (
            <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterEmployee(''); }} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Attendance Table ── */}
      {fetched && view === 'attendance' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Employee Name</th>
                  <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>Entry Time</th>
                  <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>Out Time</th>
                  <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#6b7280', whiteSpace: 'nowrap' }}>Punches</th>
                  {isSuperAdmin && <th style={{ padding: '11px 16px', width: '48px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {groupedByDate.length === 0 ? (
                  <tr><td colSpan={isSuperAdmin ? 6 : 5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No records found</td></tr>
                ) : groupedByDate.map((group, gi) => (
                  <React.Fragment key={group.date}>
                    <tr>
                      <td colSpan={isSuperAdmin ? 6 : 5} style={{ background: '#f1f5f9', padding: '7px 16px', fontWeight: 700, fontSize: '12px', color: '#475569', borderTop: gi > 0 ? '2px solid #e2e8f0' : undefined, letterSpacing: '0.02em' }}>
                        {group.displayDate}
                      </td>
                    </tr>
                    {group.rows.map((r, i) => {
                      const ovKey = `${r.date}|${r.deviceUserId}`;
                      const hasOverride = !!overrides[ovKey];
                      return (
                        <tr key={`${r.date}-${r.deviceUserId}`} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: '12px' }}>{r.date}</td>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>{r.name}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', borderRadius: '8px', padding: '3px 12px', fontWeight: 700, fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{r.entry}</span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            {r.out === '—' ? <span style={{ color: '#d1d5db', fontSize: '16px' }}>—</span> : (
                              <span style={{ display: 'inline-block', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', padding: '3px 12px', fontWeight: 700, fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{r.out}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>{r.totalPunches}</td>
                          {isSuperAdmin && (
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <button
                                onClick={() => setTimeEdit({ row: r, entryHHMM: overrides[ovKey]?.entry || isoToHHMM(r.entryIso), outHHMM: overrides[ovKey]?.out || (r.outIso ? isoToHHMM(r.outIso) : '') })}
                                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
                                title="Edit times"
                              >
                                <Pencil size={12} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Manage Users ── */}
      {fetched && view === 'users' && isSuperAdmin && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>

          {/* Simple header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={18} color="#374151" />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>Device Users</span>
              <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '8px' }}>{sortedUsers.length} registered</span>
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{sortedUsers.filter(u => u.cardno > 0).length}</span> with card ·{' '}
              <span style={{ fontWeight: 600 }}>{sortedUsers.filter(u => !u.cardno).length}</span> FP only
            </span>
            <button
              onClick={() => setModal({ mode: 'add', form: { userId: String(Math.max(0, ...users.map(u => parseInt(u.userId))) + 1), name: '', cardno: '' } })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={14} /> Add User
            </button>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px 72px 1fr 160px 120px 160px 130px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '0 20px' }}>
            {[['SL No.','left'],['RFID','left'],['Name','left'],['Card Number','left'],['Card Status','center'],['Auth Method','center'],['Actions','center']].map(([h, align]) => (
              <div key={h} style={{ padding: '9px 0', fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: align as any }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {sortedUsers.map((u, i) => {
            const hasCard   = u.cardno > 0;
            const isLoading = actionLoading[u.userId];
            const name      = isNaN(Number(u.name)) ? u.name : null;

            return (
              <div key={u.userId} style={{ display: 'grid', gridTemplateColumns: '52px 72px 1fr 160px 120px 160px 130px', alignItems: 'center', padding: '0 20px', borderBottom: i < sortedUsers.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>

                {/* SL No. */}
                <div style={{ padding: '12px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                </div>

                {/* Card No. */}
                <div style={{ padding: '12px 8px 12px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{u.userId}</span>
                </div>

                {/* Name */}
                <div style={{ padding: '12px 12px 12px 0' }}>
                  {name
                    ? <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{name}</span>
                    : <span style={{ color: '#d1d5db', fontSize: '13px', fontStyle: 'italic' }}>No name set</span>
                  }
                </div>

                {/* Card Number */}
                <div style={{ padding: '12px 12px 12px 0' }}>
                  {hasCard
                    ? <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13px', fontWeight: 500, color: '#374151' }}>{u.cardno}</span>
                    : <span style={{ color: '#d1d5db' }}>—</span>
                  }
                </div>

                {/* Card Status */}
                <div style={{ textAlign: 'center' }}>
                  {hasCard ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                      Active
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: '#9ca3af' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }} />
                      Inactive
                    </span>
                  )}
                </div>

                {/* Auth Method */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
                    <Fingerprint size={10} /> FP
                  </span>
                  {hasCard && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
                      <CreditCard size={10} /> Card
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setModal({ mode: 'edit', user: u, form: { userId: u.userId, name: u.name, cardno: String(u.cardno || '') } })}
                    disabled={isLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(u)}
                    disabled={isLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: 'pointer' }}
                  >
                    {isLoading ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty State ── */}
      {!fetched && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <Fingerprint size={52} style={{ color: '#d1d5db', margin: '0 auto 14px' }} />
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 4px' }}>Click <strong>Load from Device</strong> to pull attendance logs</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Device: 192.168.68.40:4370 · F18/ID</p>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px' }}>
                {modal.mode === 'add' ? <Plus size={18} color="#fff" /> : <Edit2 size={18} color="#fff" />}
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                {modal.mode === 'add' ? 'Add New User to Device' : `Edit User #${modal.user?.userId}`}
              </h3>
              <button onClick={() => setModal(null)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex' }}>
                <X size={16} color="#fff" />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>RFID <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text" value={modal.form.userId}
                  onChange={e => setModal(m => m ? { ...m, form: { ...m.form, userId: e.target.value } } : m)}
                  placeholder="e.g. 35"
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text" value={modal.form.name}
                  onChange={e => setModal(m => m ? { ...m, form: { ...m.form, name: e.target.value } } : m)}
                  placeholder="e.g. John Doe"
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Card Number <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="text" value={modal.form.cardno}
                  onChange={e => setModal(m => m ? { ...m, form: { ...m.form, cardno: e.target.value } } : m)}
                  placeholder="e.g. 6440432"
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums' }}
                />
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#9ca3af' }}>Leave empty if this user only uses fingerprint</p>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 22px 20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={saveUser}
                disabled={actionLoading[modal.form.userId]}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: actionLoading[modal.form.userId] ? 0.7 : 1 }}
              >
                {actionLoading[modal.form.userId] ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                {modal.mode === 'add' ? 'Add to Device' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
              <div style={{ background: '#fef2f2', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <AlertTriangle size={26} color="#dc2626" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>Delete User?</h3>
              <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#374151' }}>
                <strong>{isNaN(Number(confirmDelete.name)) ? confirmDelete.name : `ID ${confirmDelete.userId}`}</strong> will be permanently removed from the device.
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>This action cannot be undone.</p>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => deleteUser(confirmDelete)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={13} /> Delete from Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Time Edit Modal (Superadmin only) ── */}
      {isSuperAdmin && timeEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setTimeEdit(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#111827', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Pencil size={16} color="#fff" />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Edit Attendance Time</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>{timeEdit.row.name} · {timeEdit.row.displayDate}</div>
              </div>
              <button onClick={() => setTimeEdit(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex' }}>
                <X size={14} color="#fff" />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Entry Time</label>
                <input
                  type="time"
                  value={timeEdit.entryHHMM}
                  onChange={e => setTimeEdit(t => t ? { ...t, entryHHMM: e.target.value } : t)}
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Out Time <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <input
                  type="time"
                  value={timeEdit.outHHMM}
                  onChange={e => setTimeEdit(t => t ? { ...t, outHHMM: e.target.value } : t)}
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px' }}>
              <button onClick={() => setTimeEdit(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveTimeOverride} disabled={timeEditSaving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#111827', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: timeEditSaving ? 0.7 : 1 }}>
                {timeEditSaving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Device Config Modal (Superadmin only) ── */}
      {isSuperAdmin && cfgEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCfgEdit(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#111827', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Pencil size={16} color="#fff" />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Device Settings</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>ZKTeco biometric device connection</div>
              </div>
              <button onClick={() => setCfgEdit(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex' }}>
                <X size={14} color="#fff" />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>IP Address <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text" value={cfgEdit.ip}
                  onChange={e => setCfgEdit(c => c ? { ...c, ip: e.target.value } : c)}
                  placeholder="192.168.68.40"
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Port <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="number" value={cfgEdit.port}
                  onChange={e => setCfgEdit(c => c ? { ...c, port: parseInt(e.target.value) || 4370 } : c)}
                  placeholder="4370"
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Machine No.</label>
                <input
                  type="number" value={cfgEdit.machineNo}
                  onChange={e => setCfgEdit(c => c ? { ...c, machineNo: parseInt(e.target.value) || 0 } : c)}
                  placeholder="102"
                  style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px' }}>
              <button onClick={() => setCfgEdit(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveDeviceConfig} disabled={cfgSaving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#111827', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: cfgSaving ? 0.7 : 1 }}>
                {cfgSaving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
