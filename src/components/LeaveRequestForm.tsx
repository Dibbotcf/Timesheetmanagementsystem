import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { toPng } from 'html-to-image';
import { ArrowLeft, Download, Loader2, Paperclip, Pencil, Printer, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import TCF_LOGO_PATH from '../assets/tcf-logo-landscape.png';
import { useAppStore } from '../App';
import type { LeaveRecord, LeaveType, Employee } from '../App';
import { CASUAL_CRITERIA, CASUAL_CRITERIA_NOTE } from '../lib/leaveCriteria';
import { countLeaveDays } from '../lib/leaveDays';
import { fetchLeaveFile, type LeaveFile } from '../utils/leaveFiles';
import { buildMergedPdf, downloadPdfBytes, filePart, type PdfPart } from '../utils/leavePdf';
import { renderPdfPages } from '../utils/pdfPreview';

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
  // The applicant's own signature, linked to them by EID under Employees → Signatures
  const { signatures } = useAppStore();
  const maker = signatures.find(s => s.employeeId && s.employeeId === leave.employeeId);
  // The HR signature chosen (with its PIN) when HR confirmed the signed form
  const hrSig = leave.hrSignatureId ? signatures.find(s => s.id === leave.hrSignatureId) : undefined;
  // The approver's signature (signature + PIN when the leave was approved)
  const approvalSig = leave.approvedSignatureId ? signatures.find(s => s.id === leave.approvedSignatureId) : undefined;

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

      {/* Signatures — pinned to the foot of the page; 64px of signing space above the labels.
          The Maker space holds the applicant's linked signature, when they have one. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'end', marginTop: 'auto', paddingTop: 8, fontSize: 11, flexShrink: 0 }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ height: 52, marginBottom: 4, display: 'flex', alignItems: 'flex-end' }}>
            {maker?.imageUrl && <img src={maker.imageUrl} alt={`${maker.name} signature`} style={{ maxHeight: 52, maxWidth: 190, objectFit: 'contain' }} />}
          </div>
          Maker Signature
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: 52, marginBottom: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {hrSig?.imageUrl && <img src={hrSig.imageUrl} alt={`${hrSig.name} signature`} style={{ maxHeight: 52, maxWidth: 190, objectFit: 'contain' }} />}
          </div>
          HR signature
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ height: 52, marginBottom: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            {approvalSig?.imageUrl && <img src={approvalSig.imageUrl} alt={`${approvalSig.name} signature`} style={{ maxHeight: 52, maxWidth: 190, objectFit: 'contain' }} />}
          </div>
          Approval signature
        </div>
      </div>
    </div>
  );
});
LeaveRequestFormSheet.displayName = 'LeaveRequestFormSheet';

// ── Supporting document (sick leave) — shown, printed and downloaded as A4 pages after the form ──
const PHOTO_MARGIN = 30; // ≈ 8 mm, the same margin the PDF download gives a photo

/** One page of the supporting document laid out as an A4 sheet: a photo gets a margin, a PDF page fills the sheet. */
const A4Sheet: React.FC<{ src: string; alt: string; margin: boolean }> = ({ src, alt, margin }) => (
  <div style={{ width: FORM_W, height: FORM_H, background: '#fff', padding: margin ? PHOTO_MARGIN : 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
  </div>
);

type SupportingDoc =
  | { status: 'loading' }
  | { status: 'ready'; file: LeaveFile; pages: string[]; isPdf: boolean }
  | { status: 'error'; message: string };

const NoteCard: React.FC<{ children: React.ReactNode; tone?: 'muted' | 'error' }> = ({ children, tone = 'muted' }) => (
  <div style={{ width: FORM_W, maxWidth: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 8, fontSize: 13,
    background: tone === 'error' ? '#fef2f2' : '#fff', border: `1px solid ${tone === 'error' ? '#fecaca' : '#e5e7eb'}`, color: tone === 'error' ? '#b91c1c' : '#6b7280' }}>
    {children}
  </div>
);

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

  // A sick leave's supporting document follows the form as A4 page(s) — on screen, in print and in the PDF
  const supportingAtt = leave?.type === 'Sick' ? (leave.attachments || []).find(a => a.kind === 'supporting_doc') : undefined;
  const [doc, setDoc] = useState<SupportingDoc | null>(null);
  useEffect(() => {
    if (!supportingAtt) { setDoc(null); return; }
    let alive = true;
    setDoc({ status: 'loading' });
    (async () => {
      const file = await fetchLeaveFile(supportingAtt.id);
      if (!file) throw new Error('The uploaded file could not be found');
      const isPdf = file.mime === 'application/pdf';
      const pages = isPdf ? await renderPdfPages(file.dataUrl, FORM_W) : [file.dataUrl];
      if (alive) setDoc({ status: 'ready', file, pages, isPdf });
    })().catch(err => { if (alive) setDoc({ status: 'error', message: err?.message || 'Could not open the document' }); });
    return () => { alive = false; };
  }, [supportingAtt?.id]);
  const docLoading = doc?.status === 'loading';

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
      // The sheet is laid out at A4 proportions with its own inner margins, so it fills the page exactly.
      const dataUrl = await toPng(sheetRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const parts: PdfPart[] = [{ kind: 'image', dataUrl, fit: 'bleed' }];
      // A sick leave's supporting document follows as the next A4 page(s)
      if (doc?.status === 'ready') parts.push(filePart(doc.file.dataUrl, doc.file.mime));
      const bytes = await buildMergedPdf(parts, `Leave Request – ${employee?.name || ''}`);
      const who = (employee?.name || 'Employee').replace(/\s+/g, '_');
      downloadPdfBytes(bytes, `Leave_Request_${who}_${leave.startDate}.pdf`);
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
      {/* Print: override the app-wide A3-landscape @page (attendance sheet) and print only the print copy below —
          the form, then a sick leave's supporting document, each on its own A4 page */}
      <style>{`
        #leave-print-root { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body > *:not(#leave-print-root) { display: none !important; }
          #leave-print-root { display: block !important; }
          .leave-print-page { width: 210mm; height: 297mm; overflow: hidden; break-after: page; page-break-after: always; }
          .leave-print-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
      {createPortal(
        <div id="leave-print-root">
          <div className="leave-print-page"><LeaveRequestFormSheet leave={leave} employee={employee} domId="leave-form-print" /></div>
          {doc?.status === 'ready' && doc.pages.map((src, i) => (
            <div key={i} className="leave-print-page"><A4Sheet src={src} alt={`Supporting document page ${i + 1}`} margin={!doc.isPdf} /></div>
          ))}
        </div>,
        document.body,
      )}
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
              <Button variant="outline" onClick={() => window.print()} disabled={docLoading} className="gap-2" title={docLoading ? 'Loading the supporting document…' : undefined}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button onClick={handleDownload} disabled={downloading || docLoading} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
                <Download className="h-4 w-4" /> {downloading ? 'Generating…' : 'Download PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="py-8 print:py-0 flex flex-col items-center gap-6">
        <div className="print:w-full" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)', outline: editing ? '3px solid #2563eb' : 'none' }}>
          <LeaveRequestFormSheet ref={sheetRef} leave={leave} employee={employee} editing={editing} draft={draft ?? undefined} onChange={onDraftChange} />
        </div>

        {/* Sick leave: the supporting document, page by page as A4 sheets */}
        {leave.type === 'Sick' && (
          !supportingAtt ? (
            <NoteCard><Paperclip className="h-4 w-4" /> No supporting document uploaded for this sick leave yet — add it under Leaves → Records.</NoteCard>
          ) : doc?.status === 'error' ? (
            <NoteCard tone="error"><Paperclip className="h-4 w-4" /> {supportingAtt.name}: {doc.message}</NoteCard>
          ) : doc?.status !== 'ready' ? (
            <NoteCard><Loader2 className="h-4 w-4 animate-spin" /> Loading supporting document…</NoteCard>
          ) : (
            doc.pages.map((src, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div style={{ width: FORM_W, maxWidth: '100%', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Paperclip className="h-3.5 w-3.5" /> Supporting document · {doc.file.name}{doc.pages.length > 1 ? ` · page ${i + 1} of ${doc.pages.length}` : ''}
                </div>
                <div style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                  <A4Sheet src={src} alt={`${doc.file.name}, page ${i + 1}`} margin={!doc.isPdf} />
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
