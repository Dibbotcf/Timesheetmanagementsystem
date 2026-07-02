
import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useAppStore, OTRecord, Employee, ReportFolder, SavedReport } from '../App';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner@2.0.3';
import { Plus, Clock, CheckCircle, XCircle, Trash2, Search, Calendar as CalendarIcon, Download, Printer, Save, Folder as FolderIcon, FileText, FolderOpen, Check, ChevronsUpDown, PenLine, ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isSameMonth, isSameDay, lastDayOfMonth } from 'date-fns';

// --- Sub-Components ---

const SignatureBlock = ({ 
    role, 
    signature, 
    onSelect, 
    availableSignatures,
    readOnly = false
}: { 
    role: string;
    signature?: { name: string; imageUrl: string };
    onSelect?: (id: string) => void;
    availableSignatures?: any[];
    readOnly?: boolean;
}) => {
    return (
        <div className="text-center flex flex-col items-center justify-end h-40">
             <div className="h-24 w-full flex items-end justify-center mb-1">
                {signature ? (
                    <img src={signature.imageUrl} alt={signature.name} className="max-h-24 max-w-[150px] object-contain" />
                ) : (
                    !readOnly && (
                        <div className="text-xs text-gray-400 mb-2 print:hidden">Select Signature</div>
                    )
                )}
             </div>
             <div className="border-t border-black w-full mx-4 relative group">
                {!readOnly && onSelect && availableSignatures && (
                    <div className="absolute bottom-2 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden bg-white border shadow-sm rounded p-1 z-10">
                        <select 
                            className="w-full text-xs border-none focus:ring-0"
                            onChange={(e) => onSelect(e.target.value)}
                            value={signature ? 'selected' : ''}
                        >
                            <option value="">None</option>
                            {availableSignatures.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                        </select>
                    </div>
                )}
             </div>
             <p className="mt-2 font-bold text-sm">{role}</p>
        </div>
    );
};

const RecordsView = () => {
    const { reportFolders, savedReports, addReportFolder, deleteReportFolder, deleteSavedReport, getItem, employees } = useAppStore();
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [viewReport, setViewReport] = useState<SavedReport | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleDownloadPDF = async () => {
        if (!viewReport) return;
        setIsGeneratingPDF(true);
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const W = pdf.internal.pageSize.getWidth();
            const H = pdf.internal.pageSize.getHeight();
            const lm = 15, tableW = W - 30;
            const monthName = format(parseISO(`${viewReport.month}-01`), 'MMMM-yyyy');

            // Title block — slate-100 background
            pdf.setFillColor(241, 245, 249);
            pdf.rect(lm, 14, tableW, 28, 'F');
            pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.5);
            pdf.rect(lm, 14, tableW, 28, 'S');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(0, 0, 0);
            pdf.text('TOKYO CONSULTING FIRM LIMITED', W / 2, 23, { align: 'center' });
            pdf.setFontSize(11); pdf.text('OT Summary', W / 2, 30, { align: 'center' });
            pdf.setFontSize(9.5); pdf.text(`For the month of ${monthName}`, W / 2, 37, { align: 'center' });

            // Column definitions
            const cols = [
                { label: 'SL.',                w: 13,  align: 'center' as const },
                { label: 'Employees Name',     w: 79,  align: 'left'   as const },
                { label: 'OT Hour(s)',         w: 28,  align: 'right'  as const },
                { label: 'Prev. Month End OT', w: 35,  align: 'right'  as const },
                { label: 'Total OT',           w: 25,  align: 'right'  as const },
            ];
            const hH = 8, rowH = 7;
            let tY = 47;

            // Table header — dark slate with white text
            pdf.setFillColor(30, 41, 59);
            pdf.rect(lm, tY, tableW, hH, 'F');
            pdf.setDrawColor(51, 65, 85); pdf.setLineWidth(0.3);
            pdf.rect(lm, tY, tableW, hH, 'S');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255);
            let cx = lm;
            cols.forEach((col, i) => {
                const tx = col.align === 'center' ? cx + col.w / 2 : col.align === 'right' ? cx + col.w - 2 : cx + 2;
                pdf.text(col.label, tx, tY + hH / 2 + 2.5, { align: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left' });
                if (i < cols.length - 1) { pdf.setDrawColor(71, 85, 105); pdf.line(cx + col.w, tY, cx + col.w, tY + hH); }
                cx += col.w;
            });

            // Sort rows
            const sortedRows = [...viewReport.data.reportData].sort((a: any, b: any) => {
                const parseN = (eid: string) => { const m = eid.match(/\d+/); return m ? parseInt(m[0], 10) : Infinity; };
                const eA = employees.find((e: any) => e.id === a.id)?.eid || '';
                const eB = employees.find((e: any) => e.id === b.id)?.eid || '';
                return parseN(eA) !== parseN(eB) ? parseN(eA) - parseN(eB) : eA.localeCompare(eB);
            });

            // Data rows with blue/orange colored values
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
            let ry = tY + hH;
            sortedRows.forEach((row: any, i: number) => {
                if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(lm, ry, tableW, rowH, 'F'); }
                pdf.setDrawColor(220, 220, 220); pdf.rect(lm, ry, tableW, rowH, 'S');
                const vals = [
                    String(i + 1),
                    row.name,
                    row.currentMonthOT > 0 ? row.currentMonthOT.toFixed(2) : '',
                    row.prevMonthEndOT > 0 ? row.prevMonthEndOT.toFixed(2) : '',
                    row.totalOT > 0 ? row.totalOT.toFixed(2) : '-',
                ];
                cx = lm;
                vals.forEach((v, vi) => {
                    const col = cols[vi];
                    if (vi === 2 && row.currentMonthOT > 0) pdf.setTextColor(29, 78, 216);
                    else if (vi === 3 && row.prevMonthEndOT > 0) pdf.setTextColor(194, 120, 10);
                    else pdf.setTextColor(30, 41, 59);
                    const tx = col.align === 'center' ? cx + col.w / 2 : col.align === 'right' ? cx + col.w - 2 : cx + 2;
                    if (v) pdf.text(v, tx, ry + rowH / 2 + 2.5, { align: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left' });
                    if (vi < cols.length - 1) { pdf.setDrawColor(220, 220, 220); pdf.line(cx + col.w, ry, cx + col.w, ry + rowH); }
                    cx += col.w;
                });
                ry += rowH;
            });

            // Totals row — dark slate
            pdf.setFillColor(15, 23, 42); pdf.rect(lm, ry, tableW, 9, 'F');
            pdf.setDrawColor(30, 41, 59); pdf.setLineWidth(0.4); pdf.rect(lm, ry, tableW, 9, 'S');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
            const totVals = ['', 'TOTAL', viewReport.data.totals.current > 0 ? viewReport.data.totals.current.toFixed(2) : '', viewReport.data.totals.prevEnd > 0 ? viewReport.data.totals.prevEnd.toFixed(2) : '', viewReport.data.totals.total.toFixed(2)];
            cx = lm;
            cols.forEach((col, vi) => {
                const v = totVals[vi];
                if (vi === 1) { pdf.setTextColor(255, 255, 255); pdf.text('TOTAL', lm + cols[0].w + 2, ry + 9 / 2 + 2.5); }
                else if (v) {
                    if (vi === 2) pdf.setTextColor(147, 197, 253);
                    else if (vi === 3) pdf.setTextColor(253, 186, 116);
                    else pdf.setTextColor(255, 255, 255);
                    const tx = col.align === 'right' ? cx + col.w - 2 : cx + col.w / 2;
                    pdf.text(v, tx, ry + 9 / 2 + 2.5, { align: col.align === 'right' ? 'right' : 'center' });
                }
                if (vi < cols.length - 1) { pdf.setDrawColor(51, 65, 85); pdf.line(cx + col.w, ry, cx + col.w, ry + 9); }
                cx += col.w;
            });
            ry += 9;

            // Signatures
            const savedSigs = viewReport.data.signatures || {};
            const sigY = ry + 18;
            const sigW = tableW / 3;
            const imgH = 14;
            const getImgFmt = (url: string) => url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg') ? 'JPEG' : url.startsWith('data:image/webp') ? 'WEBP' : 'PNG';
            const sigSlots = [
                { role: 'Prepared By',   sig: savedSigs.preparedBy   },
                { role: 'Checked By',    sig: savedSigs.checkedBy    },
                { role: 'Authorized By', sig: savedSigs.authorizedBy },
            ];
            for (let i = 0; i < sigSlots.length; i++) {
                const sx = lm + i * sigW;
                const slot = sigSlots[i];
                if (slot.sig?.imageUrl) {
                    try { pdf.addImage(slot.sig.imageUrl, getImgFmt(slot.sig.imageUrl), sx + 2, sigY, sigW - 4, imgH); } catch {
                        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(80, 80, 80);
                        pdf.text(slot.sig.name, sx + sigW / 2, sigY + imgH / 2, { align: 'center' });
                    }
                }
                pdf.setDrawColor(0); pdf.setLineWidth(0.4); pdf.line(sx + 5, sigY + imgH + 2, sx + sigW - 5, sigY + imgH + 2);
                pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
                pdf.text(slot.role, sx + sigW / 2, sigY + imgH + 7, { align: 'center' });
            }

            // Footer
            pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6); pdf.setTextColor(148, 163, 184);
            pdf.text(`Generated by TCF HRM System · ${monthName}`, W / 2, H - 8, { align: 'center' });

            pdf.save(`OT-Summary-${viewReport.month}.pdf`);
            toast.success('PDF downloaded');
        } catch (e) {
            console.error('PDF error:', e);
            toast.error('PDF generation failed: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        await addReportFolder(newFolderName);
        setNewFolderName('');
        setIsCreateFolderOpen(false);
        toast.success("Folder created");
    };

    const filteredReports = useMemo(() => {
        if (!selectedFolderId) return [];
        return savedReports.filter(r => r.folderId === selectedFolderId);
    }, [savedReports, selectedFolderId]);

    const selectedFolder = reportFolders.find(f => f.id === selectedFolderId);

    if (viewReport) {
        const savedSigs = viewReport.data.signatures || {};
        const savedMonthName = format(parseISO(`${viewReport.month}-01`), 'MMMM-yyyy');
        const sortedRows = [...viewReport.data.reportData].sort((a: any, b: any) => {
            const empA = employees.find(e => e.id === a.id);
            const empB = employees.find(e => e.id === b.id);
            const parseN = (eid: string) => { const m = eid.match(/\d+/); return m ? parseInt(m[0], 10) : Infinity; };
            const aNum = parseN(empA?.eid || ''); const bNum = parseN(empB?.eid || '');
            if (aNum !== bNum) return aNum - bNum;
            return (empA?.eid || '').localeCompare(empB?.eid || '');
        });

        return (
            <div className="space-y-4">
                {/* Header bar */}
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewReport(null)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                                <ArrowLeft className="h-5 w-5 text-gray-700" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                    <h1 className="text-xl font-bold tracking-tight text-gray-900">{viewReport.name}</h1>
                                </div>
                                <p className="text-gray-500 text-xs mt-0.5">Tokyo Consulting Firm Limited · Saved Record</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                            <Download className="h-3.5 w-3.5" /> {isGeneratingPDF ? 'Generating…' : 'Download PDF'}
                        </button>
                    </div>
                </div>

                {/* Report Preview */}
                <div className="bg-gray-100 rounded-xl border border-gray-200 p-6">
                    <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
                        {/* Paper header */}
                        <div className="bg-slate-100 border-b-2 border-slate-300 px-8 py-5 text-center">
                            <h1 className="text-lg font-bold text-black uppercase tracking-wide">TOKYO CONSULTING FIRM LIMITED</h1>
                            <h2 className="text-base font-bold text-black mt-0.5">OT Summary</h2>
                            <p className="text-sm font-semibold text-black mt-0.5">For the month of {savedMonthName}</p>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ backgroundColor: '#1e293b' }}>
                                        <th className="px-4 py-3 text-center text-xs font-semibold w-12 border-r border-slate-600" style={{ color: '#ffffff' }}>SL.</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold border-r border-slate-600" style={{ color: '#ffffff' }}>Employees Name</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold border-r border-slate-600 w-28" style={{ color: '#ffffff' }}>OT Hour(s)</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold border-r border-slate-600 w-40" style={{ color: '#ffffff' }}>Prev. Month End OT</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold w-24" style={{ color: '#ffffff' }}>Total OT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRows.map((row: any, idx: number) => (
                                        <tr key={row.id} className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                                            <td className="px-4 py-2.5 text-center text-gray-400 text-xs border-r border-gray-100">{idx + 1}</td>
                                            <td className="px-4 py-2.5 text-left font-medium text-gray-800 border-r border-gray-100">{row.name}</td>
                                            <td className={`px-4 py-2.5 text-right border-r border-gray-100 font-mono text-xs tabular-nums ${row.currentMonthOT > 0 ? 'text-blue-700 font-semibold' : 'text-gray-300'}`}>
                                                {row.currentMonthOT > 0 ? row.currentMonthOT.toFixed(2) : '—'}
                                            </td>
                                            <td className={`px-4 py-2.5 text-right border-r border-gray-100 font-mono text-xs tabular-nums ${row.prevMonthEndOT > 0 ? 'text-orange-500 font-semibold' : 'text-gray-300'}`}>
                                                {row.prevMonthEndOT > 0 ? row.prevMonthEndOT.toFixed(2) : '—'}
                                            </td>
                                            <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${row.totalOT > 0 ? 'text-slate-900 font-bold text-sm' : 'text-gray-300 text-xs'}`}>
                                                {row.totalOT > 0 ? row.totalOT.toFixed(2) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-900 text-white">
                                        <td colSpan={2} className="px-4 py-3 font-bold text-xs uppercase tracking-widest border-r border-slate-700 pl-6">TOTAL</td>
                                        <td className="px-4 py-3 text-right font-bold font-mono text-sm border-r border-slate-700 text-blue-300 tabular-nums">
                                            {viewReport.data.totals.current > 0 ? viewReport.data.totals.current.toFixed(2) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold font-mono text-sm border-r border-slate-700 text-orange-300 tabular-nums">
                                            {viewReport.data.totals.prevEnd > 0 ? viewReport.data.totals.prevEnd.toFixed(2) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold font-mono text-xl text-white tabular-nums">
                                            {viewReport.data.totals.total.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-3 gap-8 px-8 pt-10 pb-8">
                            <SignatureBlock role="Prepared By" signature={savedSigs.preparedBy} readOnly />
                            <SignatureBlock role="Checked By" signature={savedSigs.checkedBy} readOnly />
                            <SignatureBlock role="Authorized By" signature={savedSigs.authorizedBy} readOnly />
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 text-center">
                            <p className="text-[11px] text-gray-400">Generated by TCF HRM System · {savedMonthName}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
            {/* Folders Sidebar */}
            <div className="md:col-span-1 border-r pr-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FolderIcon className="h-5 w-5" /> Folders
                    </h3>
                    <Button size="sm" variant="ghost" onClick={() => setIsCreateFolderOpen(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                
                {isCreateFolderOpen && (
                    <div className="flex items-center gap-2 mb-2">
                        <Input 
                            value={newFolderName} 
                            onChange={(e) => setNewFolderName(e.target.value)} 
                            placeholder="Folder Name" 
                            className="h-8 text-sm"
                        />
                        <Button size="sm" onClick={handleCreateFolder} className="h-8 w-8 p-0 bg-black text-white">
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsCreateFolderOpen(false)} className="h-8 w-8 p-0">
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <div className="space-y-1">
                    {reportFolders.map(folder => (
                        <div 
                            key={folder.id}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedFolderId === folder.id ? 'bg-blue-50 text-blue-700' : ''}`}
                            onClick={() => setSelectedFolderId(folder.id)}
                        >
                            <div className="flex items-center gap-2 truncate">
                                {selectedFolderId === folder.id ? <FolderOpen className="h-4 w-4" /> : <FolderIcon className="h-4 w-4" />}
                                <span className="truncate text-sm font-medium">{folder.name}</span>
                            </div>
                            <Button 
                                size="sm" variant="ghost" 
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-red-500"
                                onClick={(e) => { e.stopPropagation(); deleteReportFolder(folder.id); }}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                    {reportFolders.length === 0 && (
                        <div className="text-sm text-gray-400 italic text-center py-4">No folders created</div>
                    )}
                </div>
            </div>

            {/* Reports List */}
            <div className="md:col-span-3 bg-white rounded-lg border p-4">
                {!selectedFolderId ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <FolderIcon className="h-16 w-16 mb-4 opacity-20" />
                        <p>Select a folder to view records</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FolderOpen className="h-5 w-5 text-blue-600" /> 
                                {selectedFolder?.name}
                            </h3>
                            <Badge variant="outline">{filteredReports.length} Records</Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredReports.map(report => (
                                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow border-gray-200" onClick={async () => {
                                    if (report.data) {
                                        setViewReport(report);
                                    } else {
                                        const fullReport = await getItem('saved_reports', report.id);
                                        if (fullReport) setViewReport(fullReport);
                                    }
                                }}>
                                    <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                                        <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="w-full">
                                            <h4 className="font-bold truncate" title={report.name}>{report.name}</h4>
                                            <p className="text-xs text-gray-500">{format(parseISO(report.createdAt), 'dd MMM yyyy')}</p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-700 w-full mt-2 h-6"
                                            onClick={(e) => { e.stopPropagation(); deleteSavedReport(report.id); }}
                                        >
                                            Delete
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredReports.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-400">
                                    No records saved in this folder yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// 1. Daily View
const DailyView = ({ 
    employees, 
    otRecords, 
    date, 
    setDate, 
    onAddOT,
    onEditOT,
    currentUser
}: { 
    employees: Employee[], 
    otRecords: OTRecord[], 
    date: string, 
    setDate: (d: string) => void,
    onAddOT: (empId: string) => void,
    onEditOT: (record: OTRecord) => void,
    currentUser: any
}) => {
    const isStaff = currentUser?.role === 'Staff';
    const isDIC = currentUser?.role === 'Staff' && currentUser?.designation === 'DIC';
    const [searchQuery, setSearchQuery] = useState('');

    const recordsForDate = useMemo(() => {
        let filtered = otRecords.filter(r => r.date === date);
        // DIC can see all OT records; regular Staff only their own
        if (isStaff && !isDIC) {
            filtered = filtered.filter(r => r.employeeId === currentUser.id);
        }
        return filtered;
    }, [otRecords, date, isStaff, isDIC, currentUser]);

    const employeeRows = useMemo(() => {
        let targetEmployees = [...employees];

        targetEmployees.sort((a, b) => {
            const eIdA = a.eid || '';
            const eIdB = b.eid || '';
            const parseEidNumber = (eid: string): number => {
                const match = eid.match(/\d+/);
                return match ? parseInt(match[0], 10) : Infinity;
            };
            const aNum = parseEidNumber(eIdA);
            const bNum = parseEidNumber(eIdB);
            if (aNum !== bNum) return aNum - bNum;
            return eIdA.localeCompare(eIdB);
        });

        // DIC can see all employees; regular Staff only their own
        if (isStaff && !isDIC) {
            targetEmployees = targetEmployees.filter(e => e.id === currentUser.id);
        }
        
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            targetEmployees = targetEmployees.filter(e => 
                (e.name || '').toLowerCase().includes(q) || 
                (e.eid || '').toLowerCase().includes(q)
            );
        }
        
        return targetEmployees.map(emp => {
            const record = recordsForDate.find(r => r.employeeId === emp.id);
            return {
                ...emp,
                otRecord: record
            };
        });
    }, [employees, recordsForDate, isStaff, currentUser, searchQuery]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-4">
                    <span className="font-medium">Select Date:</span>
                    <Input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="w-48 bg-gray-50 border-0 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                    />
                    {date !== new Date().toISOString().split('T')[0] && (
                        <Button variant="outline" size="sm" onClick={() => setDate(new Date().toISOString().split('T')[0])}>
                            Back to Today
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-8 ml-auto">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            type="text"
                            placeholder="Search employee..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-gray-50 border-0"
                        />
                    </div>

                    <div className="text-sm text-gray-500 whitespace-nowrap">
                        Total OT: <span className="font-bold text-black">{recordsForDate.reduce((acc, r) => acc + r.hours, 0).toFixed(2)} hrs</span>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Employee Name</TableHead>
                                <TableHead>OT Status</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Submit Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employeeRows.map((row, idx) => (
                                <TableRow key={row.id}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell className="font-medium">{row.name}</TableCell>
                                    <TableCell>
                                        {row.otRecord ? (
                                            <Badge variant={row.otRecord.status === 'Approved' ? 'default' : 'secondary'} className={row.otRecord.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}>
                                                {row.otRecord.status}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400 text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {row.otRecord ? (
                                            <span className="font-bold">{row.otRecord.hours.toFixed(2)}</span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-sm text-gray-500">
                                        {row.otRecord?.reason || ''}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                                        {row.otRecord?.submittedAt ? format(parseISO(row.otRecord.submittedAt), 'dd MMM yyyy, hh:mm a') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* DIC can only add/edit their own OT */}
                                        {(isDIC && row.id !== currentUser?.id) ? null : (
                                            !row.otRecord ? (
                                                <Button size="sm" variant="outline" onClick={() => onAddOT(row.id)}>
                                                    <Plus className="h-3 w-3 mr-1" /> Add OT
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEditOT(row.otRecord!)}>
                                                    <Clock className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            )
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

// 2. Monthly Person View
const MonthlyPersonView = ({
    employees,
    otRecords,
    currentUser,
    onEditOT,
    onDeleteOT,
    onApproveOT,
    onRejectOT,
    onRevertOT,
    onApproveAll
}: {
    employees: Employee[],
    otRecords: OTRecord[],
    currentUser: any,
    onEditOT: (record: OTRecord) => void,
    onDeleteOT: (id: string) => void,
    onApproveOT: (id: string) => void,
    onRejectOT: (id: string) => void,
    onRevertOT: (id: string) => void,
    onApproveAll: (records: OTRecord[]) => void
}) => {
    const isDIC = currentUser?.role === 'Staff' && currentUser?.designation === 'DIC';
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedDate, setSelectedDate] = useState('');
    // DIC can see all employees (like Admin); regular Staff only their own
    const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>((currentUser.role === 'Staff' && !isDIC) ? [currentUser.id] : ['all']);
    const [openEmployeeSelect, setOpenEmployeeSelect] = useState(false);

    const filteredRecords = useMemo(() => {
        return otRecords.filter(r => {
            const empMatch = selectedEmpIds.includes('all') ? true : selectedEmpIds.includes(r.employeeId);
            const dateMatch = selectedDate ? r.date === selectedDate : r.date.startsWith(selectedMonth);
            return empMatch && dateMatch;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [otRecords, selectedEmpIds, selectedMonth, selectedDate]);

    const pendingRecords = useMemo(() => {
        return filteredRecords.filter(r => r.status === 'Pending');
    }, [filteredRecords]);

    const totalHours = filteredRecords.reduce((acc, r) => acc + r.hours, 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 bg-white p-4 rounded-lg border shadow-sm overflow-hidden">
                {/* Row 1: Date filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Select Month:</span>
                        <Input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setSelectedDate(''); // Reset specific date when month changes
                            }}
                            className="bg-gray-50 border-0 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Or Date:</span>
                        <Input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                if (e.target.value) {
                                    setSelectedMonth(e.target.value.slice(0, 7));
                                }
                            }}
                            className="bg-blue-50 border-2 border-blue-500 text-blue-900 font-medium shadow-sm [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                </div>
                {/* Row 2: Employee select + actions */}
                {(currentUser.role !== 'Staff' || isDIC) && (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm font-medium whitespace-nowrap">Employee:</span>
                            <div className="flex-1 min-w-0">
                                <Popover open={openEmployeeSelect} onOpenChange={setOpenEmployeeSelect}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openEmployeeSelect}
                                            className="w-full justify-between bg-white border border-gray-200 shadow-sm font-normal hover:bg-gray-50 text-left px-3 h-10"
                                        >
                                            <span className="truncate flex-1">
                                            {selectedEmpIds.includes('all') 
                                                ? "All Employees" 
                                                : selectedEmpIds.length === 1
                                                    ? employees.find(e => e.id === selectedEmpIds[0])?.name
                                                    : `${selectedEmpIds.length} selected`}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search employee..." />
                                            <CommandList>
                                                <CommandEmpty>No employee found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        key="all"
                                                        value="All Employees"
                                                        onSelect={() => {
                                                            setSelectedEmpIds(['all']);
                                                            setOpenEmployeeSelect(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${selectedEmpIds.includes('all') ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        All Employees
                                                    </CommandItem>
                                                    {([...employees].sort((a, b) => {
                                                        const eIdA = a.eid || '';
                                                        const eIdB = b.eid || '';
                                                        const parseEidNumber = (eid: string): number => {
                                                            const match = eid.match(/\d+/);
                                                            return match ? parseInt(match[0], 10) : Infinity;
                                                        };
                                                        const aNum = parseEidNumber(eIdA);
                                                        const bNum = parseEidNumber(eIdB);
                                                        if (aNum !== bNum) return aNum - bNum;
                                                        return eIdA.localeCompare(eIdB);
                                                    })).map((emp) => (
                                                        <CommandItem
                                                            key={emp.id}
                                                            value={emp.name}
                                                            onSelect={() => {
                                                                setSelectedEmpIds(prev => {
                                                                    const newIds = prev.includes('all') ? [] : [...prev];
                                                                    if (newIds.includes(emp.id)) {
                                                                        const filtered = newIds.filter(id => id !== emp.id);
                                                                        return filtered.length === 0 ? ['all'] : filtered;
                                                                    } else {
                                                                        return [...newIds, emp.id];
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${!selectedEmpIds.includes('all') && selectedEmpIds.includes(emp.id) ? "opacity-100" : "opacity-0"}`}
                                                            />
                                                            {emp.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {pendingRecords.length > 0 && !isDIC && (
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
                                    onClick={() => onApproveAll(pendingRecords)}
                                >
                                    <CheckCircle className="h-4 w-4" /> Approve All
                                </Button>
                            )}
                            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md font-medium whitespace-nowrap">
                                Total: {totalHours.toFixed(2)} hrs
                            </div>
                        </div>
                    </div>
                )}
                {/* For regular Staff (not DIC): just show total */}
                {currentUser.role === 'Staff' && !isDIC && (
                    <div className="flex justify-end">
                        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md font-medium">
                            Total: {totalHours.toFixed(2)} hrs
                        </div>
                    </div>
                )}
            </div>


            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                {(selectedEmpIds.includes('all') || currentUser.role !== 'Staff') && <TableHead>Employee</TableHead>}
                                <TableHead>Day</TableHead>
                                <TableHead>Submission Time</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Task/Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-32 text-gray-500">
                                        No overtime records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecords.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{format(parseISO(r.date), 'dd MMM yyyy')}</TableCell>
                                        {(selectedEmpIds.includes('all') || currentUser.role !== 'Staff') && <TableCell className="font-medium">{r.employeeName || 'Unknown'}</TableCell>}
                                        <TableCell className="text-gray-500">{format(parseISO(r.date), 'EEEE')}</TableCell>
                                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                                            {r.submittedAt ? format(parseISO(r.submittedAt), 'dd MMM yyyy, hh:mm a') : '-'}
                                        </TableCell>
                                        <TableCell className="font-bold">{r.hours.toFixed(2)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.status === 'Approved' ? 'default' : r.status === 'Rejected' ? 'destructive' : 'secondary'} className={r.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}>
                                                {r.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Actions for Admin/HR */}
                                            {currentUser.role !== 'Staff' && (
                                                <div className="flex justify-end items-center gap-1">
                                                    {r.status === 'Pending' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => onApproveOT(r.id)} title="Approve">
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onRejectOT(r.id)} title="Reject">
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {r.status !== 'Pending' && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => onRevertOT(r.id)} title="Revert to Pending">
                                                            <Clock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDeleteOT(r.id)} title="Delete">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

// 3. Summary Report View
export const SummaryReportView = ({
    employees,
    otRecords,
    onBack
}: {
    employees: Employee[],
    otRecords: OTRecord[],
    onBack?: () => void
}) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [customPrevDate, setCustomPrevDate] = useState('');

    // Update customPrevDate when selectedMonth changes
    React.useEffect(() => {
        const currentDate = parseISO(`${selectedMonth}-01`);
        const prevMonthDate = subMonths(currentDate, 1);
        const lastDay = lastDayOfMonth(prevMonthDate);
        setCustomPrevDate(format(lastDay, 'yyyy-MM-dd'));
    }, [selectedMonth]);

    const reportData = useMemo(() => {
        const data = employees.map(emp => {
            // 1. Current Month OT (Sum of hours in selected month)
            const currentMonthOT = otRecords
                .filter(r => r.employeeId === emp.id && r.date.startsWith(selectedMonth) && r.status === 'Approved')
                .reduce((sum, r) => sum + r.hours, 0);

            // 2. Previous Month End Date's OT
            // Logic: Sum of approved OT hours on the selected custom date
            const prevMonthEndOT = otRecords
                .filter(r => r.employeeId === emp.id && r.date === customPrevDate && r.status === 'Approved')
                .reduce((sum, r) => sum + r.hours, 0);

            const totalOT = currentMonthOT + prevMonthEndOT;

            return {
                id: emp.id,
                name: emp.name,
                eid: emp.eid || '',
                currentMonthOT,
                prevMonthEndOT,
                totalOT
            };
        }).filter(d => d.totalOT > 0 || true); 

        // Sort by Employee ID (eid) numeric representation
        const parseEidNumber = (eid: string): number => {
            const match = eid.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        return data.sort((a, b) => {
            const aNum = parseEidNumber(a.eid);
            const bNum = parseEidNumber(b.eid);
            if (aNum !== bNum) return aNum - bNum;
            return a.eid.localeCompare(b.eid);
        });
    }, [employees, otRecords, selectedMonth, customPrevDate]);

    const prevDateMonthName = customPrevDate ? format(parseISO(customPrevDate), 'MMMM') : '';
    const currentMonthName = format(parseISO(`${selectedMonth}-01`), 'MMMM-yyyy');

    const totals = reportData.reduce((acc, curr) => ({
        current: acc.current + curr.currentMonthOT,
        prevEnd: acc.prevEnd + curr.prevMonthEndOT,
        total: acc.total + curr.totalOT
    }), { current: 0, prevEnd: 0, total: 0 });

    // --- Save Logic ---
    const { reportFolders, addReportFolder, addSavedReport, signatures } = useAppStore();
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveFolderName, setSaveFolderName] = useState(''); // For creating new folder inline
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [reportName, setReportName] = useState(`OT Summary - ${currentMonthName}`);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // Signatures State
    const [preparedById, setPreparedById] = useState('');
    const [checkedById, setCheckedById] = useState('');
    const [authorizedById, setAuthorizedById] = useState('');

    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

    const handleDownloadPDF = () => {
        setIsDownloadingPDF(true);
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const W = pdf.internal.pageSize.getWidth();
            const H = pdf.internal.pageSize.getHeight();
            const lm = 15, tableW = W - 30;

            // Title block — slate-100 background
            pdf.setFillColor(241, 245, 249);
            pdf.rect(lm, 14, tableW, 28, 'F');
            pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.5);
            pdf.rect(lm, 14, tableW, 28, 'S');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(0, 0, 0);
            pdf.text('TOKYO CONSULTING FIRM LIMITED', W / 2, 23, { align: 'center' });
            pdf.setFontSize(11); pdf.text('OT Summary', W / 2, 30, { align: 'center' });
            pdf.setFontSize(9.5); pdf.text(`For the month of ${currentMonthName}`, W / 2, 37, { align: 'center' });

            // Column definitions
            const cols = [
                { label: 'SL.', w: 13, align: 'center' as const },
                { label: 'Employees Name', w: 79, align: 'left' as const },
                { label: 'OT Hour(s)', w: 28, align: 'right' as const },
                { label: `${prevDateMonthName || 'Prev'} end OT`, w: 35, align: 'right' as const },
                { label: 'Total OT', w: 25, align: 'right' as const },
            ];

            const hH = 8, rowH = 7;
            let tY = 47;

            // Table header — dark slate with white text
            pdf.setFillColor(30, 41, 59);
            pdf.rect(lm, tY, tableW, hH, 'F');
            pdf.setDrawColor(51, 65, 85); pdf.setLineWidth(0.3);
            pdf.rect(lm, tY, tableW, hH, 'S');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255);
            let cx = lm;
            cols.forEach((col, i) => {
                const tx = col.align === 'center' ? cx + col.w / 2 : col.align === 'right' ? cx + col.w - 2 : cx + 2;
                pdf.text(col.label, tx, tY + hH / 2 + 2.5, { align: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left' });
                if (i < cols.length - 1) { pdf.setDrawColor(71, 85, 105); pdf.line(cx + col.w, tY, cx + col.w, tY + hH); }
                cx += col.w;
            });

            // Data rows
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
            let ry = tY + hH;
            reportData.forEach((row, i) => {
                if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(lm, ry, tableW, rowH, 'F'); }
                pdf.setDrawColor(220, 220, 220); pdf.rect(lm, ry, tableW, rowH, 'S');
                const vals = [String(i + 1), row.name, row.currentMonthOT > 0 ? row.currentMonthOT.toFixed(2) : '', row.prevMonthEndOT > 0 ? row.prevMonthEndOT.toFixed(2) : '', row.totalOT > 0 ? row.totalOT.toFixed(2) : '-'];
                cx = lm;
                vals.forEach((v, vi) => {
                    const col = cols[vi];
                    if (vi === 2 && row.currentMonthOT > 0) pdf.setTextColor(29, 78, 216);
                    else if (vi === 3 && row.prevMonthEndOT > 0) pdf.setTextColor(194, 120, 10);
                    else pdf.setTextColor(30, 41, 59);
                    const tx = col.align === 'center' ? cx + col.w / 2 : col.align === 'right' ? cx + col.w - 2 : cx + 2;
                    pdf.text(v, tx, ry + rowH / 2 + 2.5, { align: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left' });
                    if (vi < cols.length - 1) { pdf.setDrawColor(220, 220, 220); pdf.line(cx + col.w, ry, cx + col.w, ry + rowH); }
                    cx += col.w;
                });
                ry += rowH;
            });

            // Totals row (dark)
            pdf.setFillColor(15, 23, 42); pdf.rect(lm, ry, tableW, 9, 'F');
            pdf.setDrawColor(30, 41, 59); pdf.setLineWidth(0.4); pdf.rect(lm, ry, tableW, 9, 'S');
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
            const totVals = ['', 'TOTAL', totals.current > 0 ? totals.current.toFixed(2) : '', totals.prevEnd > 0 ? totals.prevEnd.toFixed(2) : '', totals.total.toFixed(2)];
            cx = lm;
            cols.forEach((col, vi) => {
                const v = totVals[vi];
                if (vi === 1) { pdf.setTextColor(255, 255, 255); pdf.text('TOTAL', lm + cols[0].w + 2, ry + 9 / 2 + 2.5); }
                else if (v) {
                    if (vi === 2) pdf.setTextColor(147, 197, 253);
                    else if (vi === 3) pdf.setTextColor(253, 186, 116);
                    else pdf.setTextColor(255, 255, 255);
                    const tx = col.align === 'right' ? cx + col.w - 2 : cx + col.w / 2;
                    pdf.text(v, tx, ry + 9 / 2 + 2.5, { align: col.align === 'right' ? 'right' : 'center' });
                }
                if (vi < cols.length - 1) { pdf.setDrawColor(51, 65, 85); pdf.line(cx + col.w, ry, cx + col.w, ry + 9); }
                cx += col.w;
            });
            ry += 9;

            // Signatures
            const sigY = ry + 18;
            const sigW = tableW / 3;
            const imgH = 14;
            const sigLabels = ['Prepared By', 'Checked By', 'Authorized By'];
            const sigPeople = [signatures.find(s => s.id === preparedById), signatures.find(s => s.id === checkedById), signatures.find(s => s.id === authorizedById)];
            const getImgFmt = (url: string) => url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg') ? 'JPEG' : url.startsWith('data:image/webp') ? 'WEBP' : 'PNG';
            for (let i = 0; i < sigLabels.length; i++) {
                const sx = lm + i * sigW;
                const sig = sigPeople[i];
                if (sig?.imageUrl) {
                    try { pdf.addImage(sig.imageUrl, getImgFmt(sig.imageUrl), sx + 2, sigY, sigW - 4, imgH); } catch {
                        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(80, 80, 80);
                        pdf.text(sig.name, sx + sigW / 2, sigY + imgH / 2, { align: 'center' });
                    }
                }
                pdf.setDrawColor(0); pdf.setLineWidth(0.4); pdf.line(sx + 5, sigY + imgH + 2, sx + sigW - 5, sigY + imgH + 2);
                pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
                pdf.text(sigLabels[i], sx + sigW / 2, sigY + imgH + 7, { align: 'center' });
            }

            // Footer
            pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6); pdf.setTextColor(148, 163, 184);
            pdf.text(`Generated by TCF HRM System · ${currentMonthName}`, W / 2, H - 8, { align: 'center' });

            pdf.save(`OT_Summary_${currentMonthName}.pdf`);
            toast.success('PDF downloaded successfully!');
        } catch (err: any) {
            console.error('PDF error:', err);
            toast.error(`Failed to generate PDF: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    const openSaveDialog = () => {
        setIsSaveDialogOpen(true);
        // Initialize folder selection
        if (reportFolders.length === 0) {
            setIsCreatingFolder(true);
        } else {
            setIsCreatingFolder(false);
            // Select the most recently created folder (last in list)
            setSelectedFolderId(reportFolders[reportFolders.length - 1].id);
        }
        setSaveFolderName('');
    };

    const handleSaveRecord = async () => {
        let folderId = selectedFolderId;

        if (isCreatingFolder) {
            if (!saveFolderName.trim()) {
                toast.error("Please enter a folder name");
                return;
            }
            const newId = await addReportFolder(saveFolderName.trim());
            if (newId) {
                folderId = newId;
            } else {
                 toast.error("Failed to create folder");
                 return;
            }
        } else {
             if (!folderId) {
                toast.error("Please select a destination folder");
                return;
            }
        }

        const reportSnapshot: Omit<SavedReport, 'id'> = {
            folderId,
            name: reportName,
            month: selectedMonth,
            customPrevDate,
            createdAt: new Date().toISOString(),
            data: {
                reportData,
                totals,
                signatures: {
                    preparedBy: signatures.find(s => s.id === preparedById),
                    checkedBy: signatures.find(s => s.id === checkedById),
                    authorizedBy: signatures.find(s => s.id === authorizedById)
                }
            }
        };

        addSavedReport(reportSnapshot);
        toast.success("Report saved successfully!");
        setIsSaveDialogOpen(false);
        setSaveFolderName('');
        setIsCreatingFolder(false);
    };

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                                <ArrowLeft className="h-5 w-5 text-gray-700" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <h1 className="text-xl font-bold tracking-tight text-gray-900">Overtime Report</h1>
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">Tokyo Consulting Firm Limited · OT Summary</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2">
                            <CalendarIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                            <span className="text-gray-600 text-xs font-medium">Month:</span>
                            <select
                                value={selectedMonth.split('-')[1] ?? '07'}
                                onChange={e => {
                                    const nm = `${selectedMonth.split('-')[0]}-${e.target.value}`;
                                    setSelectedMonth(nm);
                                    setReportName(`OT Summary - ${format(parseISO(`${nm}-01`), 'MMMM-yyyy')}`);
                                }}
                                className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer"
                            >
                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, i) => (
                                    <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedMonth.split('-')[0] ?? '2026'}
                                onChange={e => {
                                    const nm = `${e.target.value}-${selectedMonth.split('-')[1]}`;
                                    setSelectedMonth(nm);
                                    setReportName(`OT Summary - ${format(parseISO(`${nm}-01`), 'MMMM-yyyy')}`);
                                }}
                                className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer"
                            >
                                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2">
                            <CalendarIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                            <span className="text-gray-600 text-xs font-medium whitespace-nowrap">Prev. Date:</span>
                            <input
                                type="date"
                                value={customPrevDate}
                                onChange={e => setCustomPrevDate(e.target.value)}
                                className="bg-transparent text-gray-900 text-xs font-semibold outline-none cursor-pointer"
                            />
                        </div>
                        <button
                            onClick={openSaveDialog}
                            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-gray-300"
                        >
                            <Save className="h-3.5 w-3.5" /> Save Record
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        >
                            <Download className="h-3.5 w-3.5" /> {isDownloadingPDF ? 'Generating…' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Employees</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{reportData.length}</p>
                    <p className="text-xs text-gray-400 mt-1">In report</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">With OT</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{reportData.filter(r => r.currentMonthOT > 0).length}</p>
                    <p className="text-xs text-gray-400 mt-1">This month</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total OT Hours</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">{totals.current > 0 ? totals.current.toFixed(2) : '0.00'}</p>
                    <p className="text-xs text-gray-400 mt-1">Current month</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Prev. End OT</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{totals.prevEnd > 0 ? totals.prevEnd.toFixed(2) : '0.00'}</p>
                    <p className="text-xs text-gray-400 mt-1">{prevDateMonthName || 'Prev'} last day</p>
                </div>
            </div>

            {/* ── Signature Config ── */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <h4 className="font-semibold text-sm text-blue-800 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Configure Report Signatures
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Prepared By</label>
                        <Select value={preparedById} onValueChange={setPreparedById}>
                            <SelectTrigger className="bg-white h-8 text-sm"><SelectValue placeholder="Select Signature" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {signatures.map(s => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Checked By</label>
                        <Select value={checkedById} onValueChange={setCheckedById}>
                            <SelectTrigger className="bg-white h-8 text-sm"><SelectValue placeholder="Select Signature" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {signatures.map(s => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Authorized By</label>
                        <Select value={authorizedById} onValueChange={setAuthorizedById}>
                            <SelectTrigger className="bg-white h-8 text-sm"><SelectValue placeholder="Select Signature" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {signatures.map(s => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* ── Report Preview ── */}
            <div className="bg-gray-100 rounded-xl border border-gray-200 p-6">
                <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
                    {/* Paper header */}
                    <div className="bg-slate-100 border-b-2 border-slate-300 px-8 py-5 text-center">
                        <h1 className="text-lg font-bold text-black uppercase tracking-wide">TOKYO CONSULTING FIRM LIMITED</h1>
                        <h2 className="text-base font-bold text-black mt-0.5">OT Summary</h2>
                        <p className="text-sm font-semibold text-black mt-0.5">For the month of {currentMonthName}</p>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: '#1e293b' }}>
                                    <th className="px-4 py-3 text-center text-xs font-semibold w-12 border-r border-slate-600" style={{ color: '#ffffff' }}>SL.</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold border-r border-slate-600" style={{ color: '#ffffff' }}>Employees Name</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold border-r border-slate-600 w-28" style={{ color: '#ffffff' }}>OT Hour(s)</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold border-r border-slate-600 w-40" style={{ color: '#ffffff' }}>{prevDateMonthName || 'Prev'} end date's OT</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold w-24" style={{ color: '#ffffff' }}>Total OT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, idx) => (
                                    <tr key={row.id} className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                                        <td className="px-4 py-2.5 text-center text-gray-400 text-xs border-r border-gray-100">{idx + 1}</td>
                                        <td className="px-4 py-2.5 text-left font-medium text-gray-800 border-r border-gray-100">{row.name}</td>
                                        <td className={`px-4 py-2.5 text-right border-r border-gray-100 font-mono text-xs tabular-nums ${row.currentMonthOT > 0 ? 'text-blue-700 font-semibold' : 'text-gray-300'}`}>
                                            {row.currentMonthOT > 0 ? row.currentMonthOT.toFixed(2) : '—'}
                                        </td>
                                        <td className={`px-4 py-2.5 text-right border-r border-gray-100 font-mono text-xs tabular-nums ${row.prevMonthEndOT > 0 ? 'text-orange-500 font-semibold' : 'text-gray-300'}`}>
                                            {row.prevMonthEndOT > 0 ? row.prevMonthEndOT.toFixed(2) : '—'}
                                        </td>
                                        <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${row.totalOT > 0 ? 'text-slate-900 font-bold text-sm' : 'text-gray-300 text-xs'}`}>
                                            {row.totalOT > 0 ? row.totalOT.toFixed(2) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-900 text-white">
                                    <td colSpan={2} className="px-4 py-3 font-bold text-xs uppercase tracking-widest border-r border-slate-700 pl-6">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold font-mono text-sm border-r border-slate-700 text-blue-300 tabular-nums">
                                        {totals.current > 0 ? totals.current.toFixed(2) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold font-mono text-sm border-r border-slate-700 text-orange-300 tabular-nums">
                                        {totals.prevEnd > 0 ? totals.prevEnd.toFixed(2) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold font-mono text-xl text-white tabular-nums">
                                        {totals.total.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-3 gap-8 px-8 pt-10 pb-8">
                        <SignatureBlock role="Prepared By" signature={signatures.find(s => s.id === preparedById)} />
                        <SignatureBlock role="Checked By" signature={signatures.find(s => s.id === checkedById)} />
                        <SignatureBlock role="Authorized By" signature={signatures.find(s => s.id === authorizedById)} />
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-2 text-center">
                        <p className="text-[11px] text-gray-400">Generated by TCF HRM System · {currentMonthName}</p>
                    </div>
                </div>
            </div>

            {/* Save Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save OT Summary Report</DialogTitle>
                        <DialogDescription>
                            Save this monthly report to a folder for future reference.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
                            <p><strong>Report:</strong> {reportName}</p>
                            <p className="mt-1 text-xs text-blue-600">Contains records for {reportData.length} employees.</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium block">Destination Folder</label>
                            
                            {!isCreatingFolder && reportFolders.length > 0 ? (
                                <div className="space-y-3">
                                    <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                        <SelectTrigger className="w-full bg-white">
                                            <SelectValue placeholder="Select a folder..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {reportFolders.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex justify-end">
                                        <Button variant="ghost" size="sm" onClick={() => setIsCreatingFolder(true)} className="text-blue-600 h-8 px-2 text-xs">
                                            + Create New Folder
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Input 
                                        placeholder="Enter new folder name (e.g. 2025 Reports)" 
                                        value={saveFolderName} 
                                        onChange={(e) => setSaveFolderName(e.target.value)}
                                        autoFocus
                                    />
                                    {reportFolders.length > 0 && (
                                        <div className="flex justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => setIsCreatingFolder(false)} className="text-gray-500 h-8 px-2 text-xs">
                                                Cancel & Select Existing
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveRecord}>
                            {isCreatingFolder ? 'Create Folder & Save' : 'Save Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// --- Main Component ---

export const OTManagement: React.FC = () => {
  const { employees, otRecords, addOTRecord, updateOTRecord, deleteOTRecord, currentUser } = useAppStore();
  const isStaff = currentUser?.role === 'Staff';

  // State
  const [activeTab, setActiveTab] = useState('daily');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showCustomHour, setShowCustomHour] = useState(false);
  const [customHourText, setCustomHourText] = useState('');
  const [dailyViewDate, setDailyViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<OTRecord>>({
    date: new Date().toISOString().split('T')[0],
    employeeId: '',
    startTime: '',
    endTime: '',
    hours: 0,
    reason: ''
  });

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (newData.startTime && newData.endTime) {
        const start = new Date(`2000-01-01T${newData.startTime}`);
        const end = new Date(`2000-01-01T${newData.endTime}`);
        if (end < start) end.setDate(end.getDate() + 1);
        const diffMs = end.getTime() - start.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);
        setFormData(prev => ({ ...prev, [field]: value, hours: parseFloat(diffHrs.toFixed(2)) }));
    }
  };

  const handleSubmit = () => {
    if (!isStaff && !formData.employeeId) {
        toast.error("Please select an employee");
        return;
    }
    if (!formData.date || formData.hours === undefined || (formData.hours > 0 && !formData.reason)) {
        toast.error("Please fill in all required fields");
        return;
    }
    
    const targetEmployeeId = formData.employeeId || currentUser?.id;
    
    if (!editingRecordId) {
        // Prevent double entry for same date and same employee
        const existingRecord = otRecords.find(r => r.employeeId === targetEmployeeId && r.date === formData.date);
        if (existingRecord) {
            toast.error("An OT claim already exists for this employee on this date.");
            return;
        }
    }
    
    if (editingRecordId) {
        updateOTRecord(editingRecordId, {
            hours: formData.hours || 0,
            reason: formData.hours === 0 ? '' : formData.reason,
            status: 'Pending',
            submittedAt: new Date().toISOString()
        });
        toast.success("OT Claim updated successfully");
    } else {
        const targetEmployeeName = employees.find(e => e.id === targetEmployeeId)?.name || currentUser?.name;

        addOTRecord({
            employeeId: targetEmployeeId,
            employeeName: targetEmployeeName,
            date: formData.date,
            startTime: '-',
            endTime: '-',
            hours: formData.hours || 0,
            reason: formData.hours === 0 ? '' : formData.reason,
            status: 'Pending',
            submittedAt: new Date().toISOString()
        });
        toast.success("OT Claim submitted successfully");
    }

    setIsAddOpen(false);
    setEditingRecordId(null);
    setShowCustomHour(false);
    setCustomHourText('');
  };

  const handleOpenAdd = (preSelectedEmpId?: string) => {
      setEditingRecordId(null);
      setFormData({
        date: dailyViewDate,
        employeeId: preSelectedEmpId || currentUser?.id || '',
        startTime: '-',
        endTime: '-',
        hours: 0,
        reason: ''
      });
      setIsAddOpen(true);
  };

  const handleEditOT = (record: OTRecord) => {
      setEditingRecordId(record.id);
      setFormData({
        date: record.date,
        employeeId: record.employeeId,
        startTime: record.startTime,
        endTime: record.endTime,
        hours: record.hours,
        reason: record.reason
      });
      setIsAddOpen(true);
  };

  const handleApproveAll = (records: OTRecord[]) => {
    if (window.confirm(`Are you sure you want to approve ${records.length} pending OT records?`)) {
        records.forEach(r => {
            updateOTRecord(r.id, { status: 'Approved' });
        });
        toast.success(`Approved ${records.length} records successfully`);
    }
  };

  const handleApprove = (id: string) => {
    updateOTRecord(id, { status: 'Approved' });
    toast.success("Record approved");
  };

  const handleReject = (id: string) => {
    updateOTRecord(id, { status: 'Rejected' });
    toast.success("Record rejected");
  };

  const handleRevert = (id: string) => {
    updateOTRecord(id, { status: 'Pending' });
    toast.success("Record reverted to pending");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overtime Management</h1>
                <p className="text-gray-500">Track and approve overtime claims</p>
            </div>
             <Button onClick={() => handleOpenAdd()} className="bg-black hover:bg-gray-800 text-white">
                <Plus className="mr-2 h-4 w-4" /> New OT Claim
            </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 print:hidden">
                <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Daily View
                </TabsTrigger>
                <TabsTrigger value="monthly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Monthly View (By Person)
                </TabsTrigger>
                {!isStaff && (
                    <>
                        <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            OT Summary Report
                        </TabsTrigger>
                        <TabsTrigger value="records" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Records Management
                        </TabsTrigger>
                    </>
                )}
            </TabsList>
            
            <div className="mt-6">
                <TabsContent value="daily">
                    <DailyView 
                        employees={employees} 
                        otRecords={otRecords} 
                        date={dailyViewDate}
                        setDate={setDailyViewDate}
                        onAddOT={(empId) => handleOpenAdd(empId)}
                        onEditOT={handleEditOT}
                        currentUser={currentUser}
                    />
                </TabsContent>
                <TabsContent value="monthly">
                    <MonthlyPersonView 
                        employees={employees}
                        otRecords={otRecords}
                        currentUser={currentUser}
                        onEditOT={(r) => { /* To be implemented if needed */ }}
                        onDeleteOT={(id) => deleteOTRecord(id)}
                        onApproveOT={handleApprove}
                        onRejectOT={handleReject}
                        onRevertOT={handleRevert}
                        onApproveAll={handleApproveAll}
                    />
                </TabsContent>
                {!isStaff && (
                    <>
                        <TabsContent value="summary">
                            <SummaryReportView 
                                employees={employees}
                                otRecords={otRecords}
                            />
                        </TabsContent>
                        <TabsContent value="records">
                            <RecordsView />
                        </TabsContent>
                    </>
                )}
            </div>
        </Tabs>

        {/* Shared Add Modal */}
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setShowCustomHour(false); setCustomHourText(''); } }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Overtime Claim</DialogTitle>
                    <DialogDescription>Submit a new OT claim.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     {!isStaff && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Employee <span className="text-red-500">*</span></label>
                            <Select 
                                value={formData.employeeId} 
                                onValueChange={(val) => setFormData({...formData, employeeId: val})}
                            >
                                <SelectTrigger className="w-full bg-gray-50 border-0">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                        <Input 
                            type="date" 
                            value={formData.date} 
                            onChange={e => setFormData({...formData, date: e.target.value})} 
                            className="bg-gray-50 border-0 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Select OT Hour</label>
                        <div className="flex flex-wrap items-center gap-3">
                            {[0, 1, 1.5, 2].map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, hours: h, reason: h === 0 ? '' : formData.reason });
                                        setShowCustomHour(false);
                                        setCustomHourText('');
                                    }}
                                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                                        formData.hours === h && !showCustomHour && customHourText === ''
                                            ? 'text-white'
                                            : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                                    }`}
                                    style={formData.hours === h && !showCustomHour && customHourText === '' ? { backgroundColor: '#0036A3', borderColor: '#0036A3' } : {}}
                                >
                                    {h} {h === 1 || h === 0 ? 'Hour' : 'Hours'}
                                </button>
                            ))}

                            {/* Custom hour toggle icon */}
                            <button
                                type="button"
                                title="Enter custom hours"
                                onClick={() => {
                                    setShowCustomHour(prev => !prev);
                                    setCustomHourText('');
                                    if (!showCustomHour) setFormData({ ...formData, hours: 0 });
                                }}
                                className={`p-2 rounded-md border text-sm font-medium transition-colors ${
                                    showCustomHour
                                        ? 'text-white'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                                style={showCustomHour ? { backgroundColor: '#0036A3', borderColor: '#0036A3' } : {}}
                            >
                                <PenLine className="h-4 w-4" />
                            </button>

                            {/* Custom numeric input */}
                            {showCustomHour && (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        autoFocus
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="--"
                                        value={customHourText}
                                        onChange={e => {
                                            // Allow only digits and a single dot
                                            let val = e.target.value.replace(/[^0-9.]/g, '');
                                            const dotIdx = val.indexOf('.');
                                            if (dotIdx !== -1) val = val.slice(0, dotIdx + 1) + val.slice(dotIdx + 1).replace(/\./g, '');
                                            setCustomHourText(val);
                                            const parsed = parseFloat(val);
                                            if (!isNaN(parsed) && parsed >= 0) {
                                                setFormData({ ...formData, hours: parsed, reason: parsed === 0 ? '' : formData.reason });
                                            }
                                        }}
                                        className="w-20 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-center bg-gray-50 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                                        style={{ focusRingColor: '#0036A3' } as React.CSSProperties}
                                    />
                                    <span className="text-xs text-gray-400 font-medium">hrs</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {formData.hours !== 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">Reason / Task <span className="text-red-500">*</span></label>
                            <Textarea 
                                placeholder="Describe work done..." 
                                value={formData.reason}
                                onChange={e => setFormData({...formData, reason: e.target.value})}
                                className="bg-gray-50 border-0 min-h-[100px]"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} className="bg-black hover:bg-gray-800 text-white">Submit Claim</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};
