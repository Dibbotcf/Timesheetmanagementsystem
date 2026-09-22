import React, { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Pencil, Printer, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import TCF_LOGO_PATH from '../assets/tcf-logo-landscape.png';
import { useAppStore } from '../App';
import type { LeaveRecord, LeaveType, Employee } from '../App';
import { CASUAL_CRITERIA, CASUAL_CRITERIA_NOTE } from '../lib/leaveCriteria';
import { countLeaveDays } from '../lib/leaveDays';

// Digital replica of the paper "TCF - Leave Application" form, laid out as one A4 page.
// The same sheet renders read-only for viewing/PDF and switches its cells to inputs when `editing`.

// A4 at 96 CSS px/inch: 210mm × 297mm. The sheet is laid out at this exact size so screen, PDF and print all match.
const FORM_W = 794;
const FORM_H = 1123;
const FORM_PAD = '34px 40px 36px';
const INK = '#111827';
const LINE = '1.5px solid #111827';
const FONT = 'Arial, Helvetica, sans-serif';
const EDIT_BG = '#eff6ff'; // light blue marks the cells that can be typed into while editing

type FormRowKey = 'Annual' | 'Casual' | 'Sick' | 'Other';
// Rows on the paper form. Maternity has no row of its own, so it goes under "Other".
const FORM_ROWS: { key: FormRowKey; label: string }[] = [
  { key: 'Annual', label: 'Annual Leave' },
  { key: 'Casual', label: 'Casual Leave' },
  { key: 'Sick',   label: 'Sick Leave' },
  { key: 'Other',  label: 'Other Leave' },
];

/** The subset of a LeaveRecord that can be changed on the form. */
export type LeaveDraft = Pick<LeaveRecord, 'type' | 'startDate' | 'endDate' | 'days' | 'reason'> & {
  partialHours?: number;
  casualCriteria?: number;
};

const CheckBox: React.FC<{ checked: boolean; size?: number; onClick?: () => void }> = ({ checked, size = 22, onClick }) => (
  <span
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, border: LINE, borderRadius: 3, background: onClick ? EDIT_BG : '#fff', flexShrink: 0, cursor: onClick ? 'pointer' : 'default' }}
  >
    {checked && (
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
  </span>
);

const Arrow: React.FC = () => (
  <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true" style={{ flexShrink: 0 }}>
    <polygon points="0,4 16,4 16,0 26,7 16,14 16,10 0,10" fill={INK} />
  </svg>
);

const fmtDate = (iso: string) => { try { return format(parseISO(iso), 'dd/MM/yyyy'); } catch { return iso; } };

const cellInput: React.CSSProperties = { width: '100%', border: 'none', outline: 'none', background: EDIT_BG, fontFamily: FONT, color: INK, padding: '4px 6px', boxSizing: 'border-box' };

interface SheetProps {
  leave: LeaveRecord;
  employee?: Employee;
  editing?: boolean;
  draft?: LeaveDraft;
  onChange?: (patch: Partial<LeaveDraft>) => void;
  domId?: string; // the page viewer's print CSS targets the default id; bulk rendering mounts several sheets so it passes its own
}

export const LeaveRequestFormSheet = React.forwardRef<HTMLDivElement, SheetProps>(({ leave, employee, editing = false, draft, onChange, domId = 'leave-form-sheet' }, ref) => {
  // While editing, render from the draft; otherwise from the saved record.
  const v: LeaveDraft = editing && draft ? draft : leave;
  const rowKey: FormRowKey = v.type === 'Maternity' ? 'Other' : v.type;
  const isHourly = !!v.partialHours && v.partialHours > 0;
  const set = (patch: Partial<LeaveDraft>) => onChange?.(patch);

  return (
    <div ref={ref} id={domId} style={{ width: FORM_W, height: FORM_H, background: '#fff', color: INK, fontFamily: FONT, padding: FORM_PAD, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <img src={TCF_LOGO_PATH} alt="TCF" style={{ width: 128, height: 'auto', objectFit: 'contain' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 400, letterSpacing: 0.2, paddingRight: 128 }}>Leave Request Form</div>
      </div>

      {/* Applicant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 14 }}>
        <span>Applicant Name:</span>
        <span style={{ flex: 1, background: '#e5e7eb', padding: '5px 10px', fontSize: 13, minHeight: 24, boxSizing: 'border-box' }}>{employee?.name ?? ''}</span>
        <span style={{ marginLeft: 6 }}>EID</span>
        <span style={{ minWidth: 70, borderBottom: LINE, padding: '2px 8px', fontSize: 13, textAlign: 'center' }}>{employee?.eid ?? ''}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
        <span>Please mark ✓ for the application of leave.</span>
        <span style={{ fontWeight: 400 }}>*It can be applied from <b>0.5</b> day</span>
      </div>

      {/* Leave type table */}
      <div style={{ border: LINE }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36% 64%', borderBottom: LINE, fontSize: 13, fontWeight: 700 }}>
          <div style={{ padding: '6px 0', textAlign: 'center', borderRight: LINE }}>Leave Type</div>
          <div style={{ padding: '6px 0', textAlign: 'center' }}>Leave Details</div>
        </div>
        {FORM_ROWS.map((row, i) => {
          const checked = rowKey === row.key;
          const pickRow = editing ? () => {
            // Maternity keeps its own type when its "Other" row is re-ticked; any other row maps 1:1.
            const nextType: LeaveType = row.key === 'Other' && leave.type === 'Maternity' ? 'Maternity' : row.key;
            set({ type: nextType, casualCriteria: nextType === 'Casual' ? v.casualCriteria : undefined });
          } : undefined;
          return (
            <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '44px calc(36% - 44px) 64%', borderBottom: i < FORM_ROWS.length - 1 ? LINE : 'none', minHeight: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: LINE }}>
                <CheckBox checked={checked} onClick={pickRow} />
              </div>
              <div style={{ padding: '12px 10px 8px', borderRight: LINE, cursor: editing ? 'pointer' : 'default' }} onClick={pickRow}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {row.label}
                  {checked && v.type === 'Maternity' && <span style={{ fontWeight: 400, fontSize: 11 }}> (Maternity)</span>}
                </div>
                <div style={{ fontSize: 9, marginTop: 4, lineHeight: 1.35 }}>*If 1 day leave, starting date and ending date should be the same date.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 11, padding: '5px 0', borderBottom: LINE }}>
                  <span style={{ fontWeight: 700 }}>How many days?</span>
                  <Arrow />
                  {editing && checked ? (
                    <input
                      type="number" step="0.5" min="0"
                      value={isHourly ? v.partialHours ?? '' : v.days}
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        set(isHourly ? { partialHours: isNaN(n) ? 0 : n } : { days: isNaN(n) ? 0 : n });
                      }}
                      style={{ ...cellInput, width: 60, textAlign: 'center', fontSize: 13, fontWeight: 700 }}
                    />
                  ) : (
                    <span style={{ minWidth: 42, textAlign: 'center', background: checked ? '#fff' : '#eef0f6', padding: '1px 6px', fontSize: 13, fontWeight: 700 }}>
                      {checked ? (isHourly ? v.partialHours : v.days) : ''}
                    </span>
                  )}
                  <span style={{ fontWeight: 700 }}>{checked && isHourly ? 'Hour(s)*' : 'Day(s)*'}</span>
                </div>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 11, fontWeight: 700, borderBottom: LINE }}>
                  {/* Arrow from the type cell into this row, as on the paper form */}
                  <div style={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><Arrow /></div>
                  <div style={{ padding: '5px 0', textAlign: 'center', borderRight: LINE }}>Starting From <span style={{ fontWeight: 400, fontFamily: 'Georgia, serif', fontSize: 10 }}>(DD/MM/YYYY)</span></div>
                  <div style={{ padding: '5px 0', textAlign: 'center' }}>Ending on <span style={{ fontWeight: 400, fontFamily: 'Georgia, serif', fontSize: 10 }}>(DD/MM/YYYY)</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 14, flex: 1 }}>
                  {editing && checked ? (
                    <>
                      <div style={{ borderRight: LINE, background: EDIT_BG }}>
                        <input type="date" value={v.startDate} onChange={e => set({ startDate: e.target.value })} style={{ ...cellInput, fontSize: 14, minHeight: 28 }} />
                      </div>
                      <div style={{ background: EDIT_BG }}>
                        <input type="date" value={v.endDate} min={v.startDate} onChange={e => set({ endDate: e.target.value })} style={{ ...cellInput, fontSize: 14, minHeight: 28 }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '6px 10px', borderRight: LINE, background: checked ? '#fff' : '#eef0f6', minHeight: 28 }}>{checked ? fmtDate(v.startDate) : ''}</div>
                      <div style={{ padding: '6px 10px', background: checked ? '#fff' : '#eef0f6', minHeight: 28 }}>{checked ? fmtDate(v.endDate) : ''}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Casual criteria — only meaningful when the leave is Casual */}
      {v.type === 'Casual' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>If Casual Leave please select the criteria</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ border: LINE, padding: '4px 6px', width: 36, fontWeight: 400 }}>Tick</th>
                <th style={{ border: LINE, padding: '4px 6px', fontWeight: 400 }}>Criteria</th>
                <th style={{ border: LINE, padding: '4px 6px', width: 120, fontWeight: 400 }}>Total Allocation</th>
              </tr>
            </thead>
            <tbody>
              {CASUAL_CRITERIA.map(c => {
                const on = v.casualCriteria === c.no;
                // Clicking the ticked row again clears it (keeps old records without criteria editable without forcing one)
                const pick = editing ? () => set({ casualCriteria: on ? undefined : c.no }) : undefined;
                return (
                  <tr key={c.no} onClick={pick} style={{ cursor: editing ? 'pointer' : 'default', background: editing && on ? EDIT_BG : undefined }}>
                    <td style={{ border: LINE, padding: '1px 6px', textAlign: 'center', lineHeight: 0 }}><CheckBox checked={on} size={12} /></td>
                    <td style={{ border: LINE, padding: '1px 6px' }}>{c.text}</td>
                    <td style={{ border: LINE, padding: '1px 6px', textAlign: 'center', fontSize: c.allocation.length > 12 ? 8 : 11, lineHeight: 1.2 }}>{c.allocation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12 }}>
            <svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true" style={{ flexShrink: 0 }}>
              <polygon points="13,2 25,22 1,22" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <rect x="12" y="9" width="2" height="7" fill={INK} /><rect x="12" y="17.5" width="2" height="2" fill={INK} />
            </svg>
            <span>{CASUAL_CRITERIA_NOTE}</span>
          </div>
        </div>
      )}

      {/* Remarks — grows into leftover space but is capped, so a form without the criteria table doesn't become one giant box */}
      <div style={{ marginTop: 14, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 214 }}>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Remarks:</div>
        {editing ? (
          <textarea
            value={v.reason}
            onChange={e => set({ reason: e.target.value })}
            style={{ ...cellInput, border: LINE, flex: 1, minHeight: 72, padding: '12px', fontSize: 14, lineHeight: 1.5, resize: 'none', display: 'block' }}
          />
        ) : (
          <div style={{ border: LINE, flex: 1, minHeight: 72, padding: '12px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>{v.reason}</div>
        )}
      </div>

      {/* Signatures — pinned to the foot of the page; at least 64px of signing space above the labels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 'auto', paddingTop: 64, fontSize: 11, flexShrink: 0 }}>
        <div style={{ textAlign: 'left' }}>Checker signature</div>
        <div style={{ textAlign: 'center' }}>HR signature</div>
        <div style={{ textAlign: 'right' }}>Approval signature</div>
      </div>
    </div>
  );
});
LeaveRequestFormSheet.displayName = 'LeaveRequestFormSheet';

// Full-page viewer/editor, opened in its own tab from the leave lists: /leave/:id/view
export const LeaveRequestFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leaves, employees, currentUser, templates, updateLeave } = useAppStore();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LeaveDraft | null>(null);

  const leave = leaves.find(l => l.id === id) || null;
  const employee = leave ? employees.find(e => e.id === leave.employeeId) : undefined;

  const isAdmin = currentUser?.role === 'Admin/HR' || currentUser?.role === 'Superadmin';
  // Staff may only open their own leave (DIC staff also review others' pending leaves)
  const isDIC = currentUser?.role === 'Staff' && currentUser?.designation === 'DIC';
  const allowed = !leave || isAdmin || isDIC || leave.employeeId === currentUser?.id;
  // Admin/HR can edit anything; staff can only fix their own request while it is still Pending
  const canEdit = !!leave && (isAdmin || (leave.employeeId === currentUser?.id && leave.status === 'Pending'));

  const handleBack = () => {
    // Opened in a fresh tab → nothing to go back to, so close it
    if (window.history.length <= 1) window.close();
    else navigate(-1);
  };

  const startEdit = () => {
    if (!leave) return;
    setDraft({
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      partialHours: leave.partialHours,
      reason: leave.reason,
      casualCriteria: leave.casualCriteria,
    });
    setEditing(true);
  };

  const onDraftChange = (patch: Partial<LeaveDraft>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const isHourly = !!next.partialHours && next.partialHours > 0;
      // Full-day leave: keep days in step with the date range (same working-day rule as the Record Leave dialog).
      // Half-day (0.5) and hourly leaves are single-day, so their end date follows the start date.
      if (patch.startDate !== undefined || patch.endDate !== undefined) {
        if (isHourly || prev.days === 0.5) {
          next.endDate = next.startDate;
        } else if (next.startDate && next.endDate && next.endDate >= next.startDate) {
          next.days = countLeaveDays(next.startDate, next.endDate, templates).working;
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!leave || !draft) return;
    if (!draft.startDate || !draft.endDate) { toast.error('Start and end dates are required'); return; }
    if (draft.endDate < draft.startDate) { toast.error('End date must be after start date'); return; }
    if (!draft.reason.trim()) { toast.error('Remarks (reason) is required'); return; }
    const isHourly = !!draft.partialHours && draft.partialHours > 0;
    if (isHourly ? draft.partialHours! <= 0 : draft.days <= 0) { toast.error('Enter a valid number of days'); return; }
    // Criteria is required on Casual leaves recorded with the new form, or when a leave is changed TO Casual.
    // Older Casual records (no criteria on file) can be edited without adding one.
    const needsCriteria = draft.type === 'Casual' && (leave.casualCriteria !== undefined || leave.type !== 'Casual');
    if (needsCriteria && !draft.casualCriteria) { toast.error('Tick the casual leave criteria'); return; }

    await updateLeave(leave.id, {
      type: draft.type,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days: draft.days,
      partialHours: isHourly ? draft.partialHours : undefined,
      reason: draft.reason.trim(),
      casualCriteria: draft.type === 'Casual' ? draft.casualCriteria : undefined,
    });
    toast.success('Leave updated');
    setEditing(false);
    setDraft(null);
  };

  const handleDownload = async () => {
    if (!sheetRef.current || !leave) return;
    setDownloading(true);
    try {
      // Same approach as TimesheetView: rasterise with the browser renderer (handles oklch), then place on A4.
      const dataUrl = await toPng(sheetRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
      // The sheet is laid out at A4 proportions with its own inner margins, so it fills the page exactly.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();   // 210
      const pageH = pdf.internal.pageSize.getHeight();  // 297
      const ratio = Math.min(pageW / img.width, pageH / img.height);
      const finalW = img.width * ratio;
      const finalH = img.height * ratio;
      pdf.addImage(dataUrl, 'PNG', (pageW - finalW) / 2, (pageH - finalH) / 2, finalW, finalH);
      const who = (employee?.name || 'Employee').replace(/\s+/g, '_');
      pdf.save(`Leave_Request_${who}_${leave.startDate}.pdf`);
    } catch (err: any) {
      console.error('Leave form PDF error:', err);
      toast.error(`PDF error: ${err?.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const statusStyle: Record<LeaveRecord['status'], string> = { Approved: '#16a34a', Pending: '#f59e0b', Rejected: '#ef4444' };

  if (!leave) {
    return (
      <div className="p-8 text-gray-500">
        {leaves.length === 0 ? 'Loading…' : 'Leave record not found.'}
      </div>
    );
  }
  if (!allowed) {
    return <div className="p-8 text-gray-500">You can only view your own leave requests.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10 print:bg-white print:pb-0">
      {/* Print: override the app-wide A3-landscape @page (attendance sheet) and print only the A4 sheet */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          #leave-form-sheet, #leave-form-sheet * { visibility: visible !important; }
          #leave-form-sheet { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: 297mm !important; box-shadow: none !important; outline: none !important; }
        }
      `}</style>
      {/* Toolbar - hidden on print */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-30 print:hidden shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} title="Back" disabled={editing}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-3">
              Leave Request Form
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: statusStyle[leave.status] }}>
                {leave.status}
              </span>
              {editing && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: '#2563eb' }}>
                  Editing
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              {employee?.name} · {leave.type} · {fmtDate(leave.startDate)}{leave.endDate !== leave.startDate ? ` – ${fmtDate(leave.endDate)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setDraft(null); }} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button variant="outline" onClick={startEdit} className="gap-2">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button onClick={handleDownload} disabled={downloading} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
                <Download className="h-4 w-4" /> {downloading ? 'Generating…' : 'Download PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="py-8 print:py-0 flex justify-center">
        <div className="print:w-full" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)', outline: editing ? '3px solid #2563eb' : 'none' }}>
          <LeaveRequestFormSheet ref={sheetRef} leave={leave} employee={employee} editing={editing} draft={draft ?? undefined} onChange={onDraftChange} />
        </div>
      </div>
    </div>
  );
};
