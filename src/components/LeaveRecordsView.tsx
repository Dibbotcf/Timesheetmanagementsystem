import React, { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Check, AlertCircle, Download, Eye, File, FileText, Folder, Loader2, Plus, Trash2, Upload, X, Paperclip, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { LeaveRecord, LeaveFolder, SavedLeaveReport, Employee, LeaveAttachment, LeaveAttachmentKind } from '../App';
import { getHardCopyDeadlineDays } from '../lib/leaveDays';
import { getCasualCriterion } from '../lib/leaveCriteria';
import { uploadLeaveFile, fetchLeaveFile, deleteLeaveFile, openLeaveFile, formatBytes } from '../utils/leaveFiles';
import { FONT, C, STATUS_STYLE, statusOf, Pill, TypePill, Avatar, OutlineBtn, PrimaryBtn, IconBtn, card, th, td, fmtQty, Bar } from './leaveUi';
import { LeaveRequestFormSheet } from './LeaveRequestForm';
import { buildMergedPdf, downloadPdfBytes, filePart, type PdfPart } from '../utils/leavePdf';

// Leaves → Records tab.
// A folder exists for every calendar month that has leave records (plus the current month), newest first,
// with no manual step. Inside a month folder each leave shows the evidence HR must keep on file:
//   • signed leave request form  — every leave that needs a hard copy
//   • supporting document        — Sick leave only (medical certificate etc.)
// Ad-hoc archive folders (saved balance snapshots) keep working as before. Uses the shared leaveUi kit.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ymLabel = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${MONTH_NAMES[m - 1]} ${y}`; };
const currentYm = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

/** "May 2026" / explicit `month` → "2026-05"; anything else → null (plain archive folder). */
export function folderMonth(f: LeaveFolder): string | null {
  if (f.month) return f.month;
  const m = /^([A-Za-z]+)[\s,]+(\d{4})$/.exec(f.name.trim());
  if (!m) return null;
  const idx = MONTH_NAMES.findIndex(n => n.toLowerCase() === m[1].toLowerCase());
  return idx < 0 ? null : `${m[2]}-${String(idx + 1).padStart(2, '0')}`;
}

export const needsSignedForm = (l: LeaveRecord) => l.status !== 'Rejected' && getHardCopyDeadlineDays(l.type, !!l.partialHours) !== null;
export const needsSupportingDoc = (l: LeaveRecord) => l.status !== 'Rejected' && l.type === 'Sick';
const getAttachment = (l: LeaveRecord, kind: LeaveAttachmentKind) => (l.attachments || []).find(a => a.kind === kind);
export const isEvidenceComplete = (l: LeaveRecord) =>
  (!needsSignedForm(l) || !!getAttachment(l, 'signed_form')) && (!needsSupportingDoc(l) || !!getAttachment(l, 'supporting_doc'));

const fmtRange = (s: string, e: string) => s === e ? format(parseISO(s), 'MMM d') : `${format(parseISO(s), 'MMM d')} — ${format(parseISO(e), 'MMM d')}`;

interface FolderEntry { id: string; name: string; month: string | null; createdAt: string; persisted: boolean; }

interface Props {
  leaves: LeaveRecord[];
  employees: Employee[];
  leaveFolders: LeaveFolder[];
  savedLeaveReports: SavedLeaveReport[];
  currentUser: Employee | null;
  onNewFolder: () => void;
  onViewReport: (r: SavedLeaveReport) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteReport: (id: string) => void;
  getItem: (type: string, id: string) => Promise<any>;
  updateLeave: (id: string, data: Partial<LeaveRecord>) => Promise<void> | void;
  onViewLeaveForm: (l: LeaveRecord) => void;
}

export const LeaveRecordsView: React.FC<Props> = ({
  leaves, employees, leaveFolders, savedLeaveReports, currentUser,
  onNewFolder, onViewReport, onDeleteFolder, onDeleteReport, getItem, updateLeave, onViewLeaveForm,
}) => {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // `${leaveId}:${kind}` while uploading/opening
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ leave: LeaveRecord; kind: LeaveAttachmentKind } | null>(null);

  // Bulk download: selected rows → one merged PDF (forms are rendered off-screen, evidence files are merged in)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renderTargets, setRenderTargets] = useState<LeaveRecord[]>([]);
  const sheetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const leavesByMonth = useMemo(() => {
    const map = new Map<string, LeaveRecord[]>();
    for (const l of leaves) {
      const ym = l.startDate.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(l);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.employeeId.localeCompare(b.employeeId));
    return map;
  }, [leaves]);

  // Persisted folders + a virtual folder for every month that has leaves (and the current month)
  const folders = useMemo((): FolderEntry[] => {
    const entries: FolderEntry[] = leaveFolders.map(f => ({ id: f.id, name: f.name, month: folderMonth(f), createdAt: f.createdAt, persisted: true }));
    const covered = new Set(entries.map(e => e.month).filter(Boolean) as string[]);
    const months = new Set<string>([currentYm(), ...leavesByMonth.keys()]);
    for (const ym of months) {
      if (!covered.has(ym)) entries.push({ id: `month:${ym}`, name: ymLabel(ym), month: ym, createdAt: `${ym}-01`, persisted: false });
    }
    // Month folders newest first, then ad-hoc folders newest first
    return entries.sort((a, b) => {
      if (a.month && b.month) return b.month.localeCompare(a.month);
      if (a.month) return -1;
      if (b.month) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [leaveFolders, leavesByMonth]);

  const pickFile = (leave: LeaveRecord, kind: LeaveAttachmentKind) => {
    pendingUpload.current = { leave, kind };
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = pendingUpload.current;
    pendingUpload.current = null;
    if (!file || !target) return;
    const { leave, kind } = target;
    setBusy(`${leave.id}:${kind}`);
    try {
      const rec = await uploadLeaveFile({ leaveId: leave.id, kind, file, uploadedBy: currentUser?.name });
      const previous = getAttachment(leave, kind);
      const meta: LeaveAttachment = { id: rec.id, kind, name: rec.name, mime: rec.mime, size: rec.size, uploadedAt: rec.uploadedAt, uploadedBy: rec.uploadedBy };
      const attachments = [...(leave.attachments || []).filter(a => a.kind !== kind), meta];
      // A scanned signed form IS the received hard copy
      await updateLeave(leave.id, { attachments, ...(kind === 'signed_form' ? { hardCopyCollected: true } : {}) });
      if (previous) await deleteLeaveFile(previous.id);
      toast.success(previous ? 'Document replaced' : 'Document uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const handleOpen = async (leave: LeaveRecord, att: LeaveAttachment) => {
    setBusy(`${leave.id}:${att.kind}`);
    try {
      const file = await fetchLeaveFile(att.id);
      if (!file) { toast.error('File not found on server'); return; }
      openLeaveFile(file);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (leave: LeaveRecord, att: LeaveAttachment) => {
    if (!confirm(`Delete "${att.name}"?`)) return;
    await deleteLeaveFile(att.id);
    await updateLeave(leave.id, { attachments: (leave.attachments || []).filter(a => a.id !== att.id) });
    toast.success('Document deleted');
  };

  // ── Bulk download ─────────────────────────────────────────────────────────────
  const monthName = openMonth ? ymLabel(openMonth) : '';
  const fileSafe = (t: string) => t.replace(/[^\w\-]+/g, '_');
  const nextPaint = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  const waitImages = async (el: HTMLElement) => {
    await Promise.all([...el.querySelectorAll('img')].map(img => img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })));
  };

  const selectedRows = (rows: LeaveRecord[]) => rows.filter(l => selected.has(l.id));

  /** Leave Request Form for each selected leave; Sick leaves get their supporting document appended right after. */
  const downloadForms = async (rows: LeaveRecord[]) => {
    const targets = selectedRows(rows);
    if (targets.length === 0) return;
    setBulkProgress('Preparing forms…');
    setRenderTargets(targets);
    try {
      await nextPaint();
      const parts: PdfPart[] = [];
      let missingDocs = 0;
      for (let i = 0; i < targets.length; i++) {
        const l = targets[i];
        setBulkProgress(`Rendering form ${i + 1} of ${targets.length}…`);
        const el = sheetRefs.current[l.id];
        if (!el) throw new Error('Form did not render');
        await waitImages(el);
        // Same rasteriser as the single-form download; 1.5× keeps a 30-page batch reasonably small
        const png = await toPng(el, { pixelRatio: 1.5, backgroundColor: '#ffffff', cacheBust: true });
        parts.push({ kind: 'image', dataUrl: png, fit: 'bleed' });
        if (l.type === 'Sick') {
          const att = getAttachment(l, 'supporting_doc');
          if (att) {
            const f = await fetchLeaveFile(att.id);
            if (f) parts.push(filePart(f.dataUrl, f.mime)); else missingDocs++;
          } else missingDocs++;
        }
      }
      setBulkProgress('Building PDF…');
      const bytes = await buildMergedPdf(parts, `Leave Request Forms – ${monthName}`);
      const single = targets.length === 1 ? targets[0] : null;
      const emp = single ? employees.find(e => e.id === single.employeeId) : null;
      downloadPdfBytes(bytes, single ? `Leave_Request_${fileSafe(emp?.name || 'Employee')}_${single.startDate}.pdf` : `Leave_Request_Forms_${fileSafe(monthName)}.pdf`);
      toast.success(`${targets.length} form${targets.length !== 1 ? 's' : ''} downloaded${missingDocs ? ` · ${missingDocs} sick leave${missingDocs !== 1 ? 's' : ''} had no supporting document` : ''}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not build the PDF');
    } finally {
      setRenderTargets([]);
      setBulkProgress(null);
    }
  };

  /** Uploaded evidence of one kind for each selected leave, merged in row order. */
  const downloadEvidence = async (rows: LeaveRecord[], kind: LeaveAttachmentKind) => {
    const targets = selectedRows(rows);
    if (targets.length === 0) return;
    const label = kind === 'signed_form' ? 'Signed forms' : 'Supporting documents';
    setBulkProgress(`Collecting ${label.toLowerCase()}…`);
    try {
      const parts: PdfPart[] = [];
      let found = 0;
      for (let i = 0; i < targets.length; i++) {
        const att = getAttachment(targets[i], kind);
        if (!att) continue;
        setBulkProgress(`Fetching ${i + 1} of ${targets.length}…`);
        const f = await fetchLeaveFile(att.id);
        if (!f) continue;
        parts.push(filePart(f.dataUrl, f.mime));
        found++;
      }
      if (found === 0) { toast.error(`None of the selected leaves has a ${kind === 'signed_form' ? 'signed form' : 'supporting document'} uploaded`); return; }
      setBulkProgress('Building PDF…');
      const bytes = await buildMergedPdf(parts, `${label} – ${monthName}`);
      const single = found === 1 && targets.length === 1 ? targets[0] : null;
      const emp = single ? employees.find(e => e.id === single.employeeId) : null;
      downloadPdfBytes(bytes, single
        ? `${kind === 'signed_form' ? 'Signed_Form' : 'Supporting_Doc'}_${fileSafe(emp?.name || 'Employee')}_${single.startDate}.pdf`
        : `${fileSafe(label)}_${fileSafe(monthName)}.pdf`);
      const skipped = targets.length - found;
      toast.success(`${found} file${found !== 1 ? 's' : ''} merged${skipped ? ` · ${skipped} selected leave${skipped !== 1 ? 's' : ''} had nothing uploaded` : ''}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not build the PDF');
    } finally {
      setBulkProgress(null);
    }
  };

  // ── Evidence cell ────────────────────────────────────────────────────────────
  const EvidenceCell: React.FC<{ leave: LeaveRecord; kind: LeaveAttachmentKind; required: boolean }> = ({ leave, kind, required }) => {
    const att = getAttachment(leave, kind);
    const isBusy = busy === `${leave.id}:${kind}`;
    if (att) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
          <button
            onClick={() => handleOpen(leave, att)}
            disabled={isBusy}
            title={`${att.name} · ${formatBytes(att.size)} · ${format(parseISO(att.uploadedAt), 'd MMM yyyy')}${att.uploadedBy ? ` · ${att.uploadedBy}` : ''} — click to open`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: STATUS_STYLE.approved.bg, color: STATUS_STYLE.approved.fg, border: `1px solid ${STATUS_STYLE.approved.bd}`, borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', maxWidth: 170, fontFamily: FONT }}
          >
            {isBusy ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : att.mime === 'application/pdf' ? <FileText style={{ width: 13, height: 13 }} /> : <Paperclip style={{ width: 13, height: 13 }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
          </button>
          <IconBtn onClick={() => pickFile(leave, kind)} title="Replace"><RefreshCw style={{ width: 13, height: 13 }} /></IconBtn>
          <IconBtn onClick={() => handleDelete(leave, att)} title="Delete" color="#b91c1c"><X style={{ width: 14, height: 14 }} /></IconBtn>
        </div>
      );
    }
    return (
      <OutlineBtn onClick={() => pickFile(leave, kind)} disabled={isBusy} dashed
        color={required ? STATUS_STYLE.warn.fg : C.muted} tint={required ? STATUS_STYLE.warn.bg : '#fff'}
        title={required ? 'Required — upload PDF or image (max 5 MB)' : 'Optional — upload PDF or image (max 5 MB)'}>
        {isBusy ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Upload style={{ width: 13, height: 13 }} />}
        {required ? 'Upload' : 'Optional'}
      </OutlineBtn>
    );
  };

  // ── Month folder detail ──────────────────────────────────────────────────────
  if (openMonth) {
    const rows = leavesByMonth.get(openMonth) || [];
    const complete = rows.filter(isEvidenceComplete).length;
    const missing = rows.length - complete;
    return (
      <div style={{ fontFamily: FONT, color: C.body, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChosen} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconBtn onClick={() => { setOpenMonth(null); setSelected(new Set()); }} title="Back to folders"><ArrowLeft style={{ width: 18, height: 18 }} /></IconBtn>
            <span style={{ width: 36, height: 36, borderRadius: 9, background: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Folder style={{ width: 18, height: 18 }} /></span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{ymLabel(openMonth)}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{rows.length} leave record{rows.length !== 1 ? 's' : ''} · signed forms and supporting documents</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill bg={STATUS_STYLE.approved.bg} fg={STATUS_STYLE.approved.fg} bd={STATUS_STYLE.approved.bd}><Check style={{ width: 13, height: 13 }} /> {complete} complete</Pill>
            <Pill bg={missing ? STATUS_STYLE.warn.bg : '#f3f4f6'} fg={missing ? STATUS_STYLE.warn.fg : C.muted} bd={missing ? STATUS_STYLE.warn.bd : C.line}><AlertCircle style={{ width: 13, height: 13 }} /> {missing} missing</Pill>
          </div>
        </div>

        {/* Off-screen sheets being rasterised for a bulk download */}
        {renderTargets.length > 0 && (
          <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}>
            {renderTargets.map(l => (
              <LeaveRequestFormSheet key={l.id} domId={`bulk-sheet-${l.id}`} ref={el => { sheetRefs.current[l.id] = el; }} leave={l} employee={employees.find(e => e.id === l.employeeId)} />
            ))}
          </div>
        )}

        <div style={{ ...card, overflow: 'hidden' }}>
          {/* Selection toolbar */}
          {rows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 14px', borderBottom: `1px solid ${C.line}`, background: selected.size ? '#eff6ff' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.body }}>
                {bulkProgress ? (
                  <><Loader2 style={{ width: 15, height: 15, color: '#2563eb' }} className="animate-spin" /> <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{bulkProgress}</span></>
                ) : selected.size ? (
                  <><b style={{ color: C.ink }}>{selected.size}</b> selected
                    <button onClick={() => setSelected(new Set())} style={{ border: 'none', background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT }}>Clear</button></>
                ) : (
                  <span style={{ color: C.muted }}>Select rows to download their forms and documents as one PDF</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: C.muted, marginRight: 2 }}>Download:</span>
                <OutlineBtn onClick={() => downloadForms(rows)} disabled={!selected.size || !!bulkProgress} title="Leave Request Form for each selected leave; sick leaves include their supporting document as the next page">
                  <Download style={{ width: 13, height: 13 }} /> Leave Request Form
                </OutlineBtn>
                <OutlineBtn onClick={() => downloadEvidence(rows, 'signed_form')} disabled={!selected.size || !!bulkProgress} title="Uploaded signed forms of the selected leaves, merged">
                  <Download style={{ width: 13, height: 13 }} /> Signed form
                </OutlineBtn>
                <OutlineBtn onClick={() => downloadEvidence(rows, 'supporting_doc')} disabled={!selected.size || !!bulkProgress} title="Uploaded supporting documents of the selected leaves, merged">
                  <Download style={{ width: 13, height: 13 }} /> Supporting doc
                </OutlineBtn>
              </div>
            </div>
          )}
          {rows.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center' }}>
              <Folder style={{ width: 28, height: 28, color: '#d1d5db', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.body }}>No leave records yet</div>
              <div style={{ fontSize: 13, color: C.faint, marginTop: 4 }}>Leaves dated in this month will appear here.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 900 }}>
                <colgroup>
                  <col style={{ width: 40 }} /><col style={{ width: 186 }} /><col style={{ width: 138 }} /><col style={{ width: 118 }} /><col style={{ width: 110 }} /><col /><col /><col style={{ width: 46 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={rows.length > 0 && selected.size === rows.length}
                        ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < rows.length; }}
                        onChange={e => setSelected(e.target.checked ? new Set(rows.map(l => l.id)) : new Set())}
                        style={{ width: 15, height: 15, accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={th}>Employee</th>
                    <th style={th}>Type</th>
                    <th style={th}>Duration</th>
                    <th style={th}>Status</th>
                    <th style={th}>Signed form</th>
                    <th style={th}>Supporting doc</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(l => {
                    const emp = employees.find(e => e.id === l.employeeId);
                    const rejected = l.status === 'Rejected';
                    const st = statusOf(l);
                    return (
                      <tr key={l.id} style={{ opacity: rejected ? 0.6 : 1, background: selected.has(l.id) ? '#eff6ff' : undefined }}>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${emp?.name ?? 'leave'}`}
                            checked={selected.has(l.id)}
                            onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(l.id) : n.delete(l.id); return n; })}
                            style={{ width: 15, height: 15, accentColor: '#2563eb', cursor: 'pointer' }}
                          />
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
                        <td style={td}>
                          <TypePill type={l.type} />
                          {l.casualCriteria && <div style={{ fontSize: 11, color: C.faint, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getCasualCriterion(l.casualCriteria)?.text}>{l.casualCriteria}. {getCasualCriterion(l.casualCriteria)?.text}</div>}
                        </td>
                        <td style={td}>
                          <div style={{ color: C.ink, whiteSpace: 'nowrap' }}>{fmtRange(l.startDate, l.endDate)}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{fmtQty(l)}</div>
                        </td>
                        <td style={td}><Pill bg={st.bg} fg={st.fg} bd={st.bd} upper>{st.label}</Pill></td>
                        <td style={td}>{rejected ? <span style={{ color: C.faint }}>—</span> : <EvidenceCell leave={l} kind="signed_form" required={needsSignedForm(l)} />}</td>
                        <td style={td}>{rejected || l.type !== 'Sick' ? <span style={{ color: C.faint }}>—</span> : <EvidenceCell leave={l} kind="supporting_doc" required />}</td>
                        <td style={{ ...td, textAlign: 'right' }}><IconBtn onClick={() => onViewLeaveForm(l)} title="View leave request form"><Eye style={{ width: 15, height: 15 }} /></IconBtn></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '10px 14px', fontSize: 12, color: C.faint, borderTop: `1px solid ${C.line}` }}>
                Signed form = the printed Leave Request Form with signatures. Sick leave also needs a supporting document (medical certificate / prescription). PDF or image, max 5 MB.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Folder grid ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT, color: C.body, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Leave records</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>A folder is created automatically for every month. Keep each leave's signed form and supporting documents inside.</div>
        </div>
        <PrimaryBtn onClick={onNewFolder}><Plus style={{ width: 16, height: 16 }} /> New archive folder</PrimaryBtn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {folders.map(folder => {
          const monthLeaves = folder.month ? (leavesByMonth.get(folder.month) || []) : [];
          const complete = monthLeaves.filter(isEvidenceComplete).length;
          const missing = monthLeaves.length - complete;
          const reports = savedLeaveReports.filter(r => r.folderId === folder.id);
          const isCurrent = folder.month === currentYm();
          const openable = !!folder.month;
          return (
            <div
              key={folder.id}
              onClick={openable ? () => setOpenMonth(folder.month!) : undefined}
              style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: openable ? 'pointer' : 'default', borderColor: isCurrent ? '#93c5fd' : C.line, boxShadow: isCurrent ? '0 0 0 2px #dbeafe' : 'none', transition: 'box-shadow .15s' }}
              onMouseEnter={e => { if (openable) e.currentTarget.style.boxShadow = isCurrent ? '0 0 0 2px #bfdbfe' : '0 2px 8px rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = isCurrent ? '0 0 0 2px #dbeafe' : 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 9, background: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Folder style={{ width: 18, height: 18 }} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {folder.month ? `${monthLeaves.length} leave record${monthLeaves.length !== 1 ? 's' : ''}` : `Created ${format(new Date(folder.createdAt), 'd MMM yyyy')}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {isCurrent && <Pill bg={STATUS_STYLE.info.bg} fg={STATUS_STYLE.info.fg} bd={STATUS_STYLE.info.bd}>This month</Pill>}
                  {folder.persisted && (
                    <IconBtn title="Delete folder" color="#b91c1c" onClick={() => { if (confirm('Delete this folder and its saved reports? Leave records and their documents are not affected.')) onDeleteFolder(folder.id); }}>
                      <Trash2 style={{ width: 15, height: 15 }} />
                    </IconBtn>
                  )}
                </div>
              </div>

              {folder.month && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: C.body }}>Documents</span>
                    <span style={{ color: C.muted }}>
                      {monthLeaves.length === 0 ? 'none yet' : <><b style={{ color: STATUS_STYLE.approved.fg, fontWeight: 600 }}>{complete}</b> of {monthLeaves.length} complete{missing > 0 && <> · <span style={{ color: STATUS_STYLE.warn.fg }}>{missing} missing</span></>}</>}
                    </span>
                  </div>
                  <Bar value={complete} total={monthLeaves.length} color="#10b981" />
                </div>
              )}

              {reports.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }} onClick={e => e.stopPropagation()}>
                  {reports.map(report => (
                    <div key={report.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={async () => { if (report.data) onViewReport(report); else { const full = await getItem('saved_leave_reports', report.id); if (full) onViewReport(full); } }}>
                      <File style={{ width: 14, height: 14, color: '#2563eb', flexShrink: 0 }} />
                      <span title={report.name} style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.name}</span>
                      <button title="Delete report" onClick={e => { e.stopPropagation(); if (confirm('Delete this report?')) onDeleteReport(report.id); }}
                        style={{ border: 'none', background: 'transparent', color: C.faint, cursor: 'pointer', display: 'inline-flex', padding: 2 }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!folder.month && reports.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>No saved reports</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
