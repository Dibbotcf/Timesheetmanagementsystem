
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
import { Plus, Clock, CheckCircle, XCircle, Trash2, Search, Calendar as CalendarIcon, Download, Printer, Save, Folder as FolderIcon, FileText, FolderOpen, Check, ChevronsUpDown } from 'lucide-react';
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
            const M = 12; // margin
            const PW = 210;
            const CW = PW - M * 2; // 186mm content width
            let y = M;

            // ── Header box ──
            pdf.setFillColor(217, 234, 211);
            pdf.setDrawColor(0); pdf.setLineWidth(0.3);
            pdf.rect(M, y, CW, 22, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12); pdf.setTextColor(0);
            pdf.text('TOKYO CONSULTING FIRM LIMITED', PW / 2, y + 7, { align: 'center' });
            pdf.setFontSize(10);
            pdf.text('OT Summary', PW / 2, y + 13, { align: 'center' });
            pdf.setFontSize(9);
            pdf.text(`For the month of ${format(parseISO(`${viewReport.month}-01`), 'MMMM-yyyy')}`, PW / 2, y + 19, { align: 'center' });
            y += 26;

            // ── Column definitions ──
            const cols = [
                { label: 'SL. NO.',            w: 14,  align: 'center' as const },
                { label: 'Employees Name',      w: 80,  align: 'left'   as const },
                { label: 'OT Hour(s)',          w: 30,  align: 'center' as const },
                { label: 'Prev. Month End OT',  w: 38,  align: 'center' as const },
                { label: 'Total OT',            w: 24,  align: 'center' as const },
            ];
            const ROW_H = 6.5;
            const HDR_H = 8;

            const drawRow = (cells: string[], rowY: number, h: number, bold = false, fillColor?: [number,number,number]) => {
                if (fillColor) { pdf.setFillColor(...fillColor); pdf.rect(M, rowY, CW, h, 'F'); }
                pdf.rect(M, rowY, CW, h, 'S');
                pdf.setFont('helvetica', bold ? 'bold' : 'normal');
                let cx = M;
                cells.forEach((val, i) => {
                    if (i < cols.length - 1) pdf.line(cx + cols[i].w, rowY, cx + cols[i].w, rowY + h);
                    if (val) {
                        const tx = cols[i].align === 'center' ? cx + cols[i].w / 2 :
                                   cols[i].align === 'right'  ? cx + cols[i].w - 1.5 : cx + 2;
                        pdf.text(val, tx, rowY + h / 2 + 1.5, { align: cols[i].align });
                    }
                    cx += cols[i].w;
                });
            };

            // ── Table header ──
            pdf.setFontSize(8); pdf.setTextColor(0);
            drawRow(cols.map(c => c.label), y, HDR_H, true, [191, 191, 191]);
            y += HDR_H;

            // ── Sort rows ──
            const sortedRows = [...viewReport.data.reportData].sort((a: any, b: any) => {
                const parseN = (eid: string) => { const m = eid.match(/\d+/); return m ? parseInt(m[0], 10) : Infinity; };
                const eA = employees.find((e: any) => e.id === a.id)?.eid || '';
                const eB = employees.find((e: any) => e.id === b.id)?.eid || '';
                return parseN(eA) !== parseN(eB) ? parseN(eA) - parseN(eB) : eA.localeCompare(eB);
            });

            // ── Data rows ──
            pdf.setFontSize(8);
            sortedRows.forEach((row: any, idx: number) => {
                drawRow([
                    String(idx + 1),
                    row.name,
                    row.currentMonthOT > 0  ? row.currentMonthOT.toFixed(2)  : '',
                    row.prevMonthEndOT > 0  ? row.prevMonthEndOT.toFixed(2)  : '',
                    row.totalOT > 0         ? row.totalOT.toFixed(2)         : '-',
                ], y, ROW_H);
                y += ROW_H;
            });

            // ── Total row ──
            pdf.setFont('helvetica', 'bold');
            pdf.rect(M, y, CW, ROW_H + 1, 'S');
            pdf.setLineWidth(0.5); pdf.line(M, y, M + CW, y); pdf.setLineWidth(0.3);
            const totalColsStart = cols[0].w + cols[1].w;
            pdf.line(M + totalColsStart, y, M + totalColsStart, y + ROW_H + 1);
            pdf.text('TOTAL', M + totalColsStart / 2, y + (ROW_H + 1) / 2 + 1.5, { align: 'center' });
            let tx = M + totalColsStart;
            [[cols[2], viewReport.data.totals.current], [cols[3], viewReport.data.totals.prevEnd], [cols[4], viewReport.data.totals.total]].forEach(([col, val]: any, i, arr) => {
                if (i < arr.length - 1) pdf.line(tx + col.w, y, tx + col.w, y + ROW_H + 1);
                const v = val > 0 ? val.toFixed(2) : (i === 2 ? val.toFixed(2) : '');
                if (v) pdf.text(v, tx + col.w / 2, y + (ROW_H + 1) / 2 + 1.5, { align: 'center' });
                tx += col.w;
            });
            y += ROW_H + 1 + 18;

            // ── Signatures ──
            const savedSigs = viewReport.data.signatures || {};
            const sigW = 52;
            const sigSlots = [
                { role: 'Prepared By',   sig: savedSigs.preparedBy,   x: M },
                { role: 'Checked By',    sig: savedSigs.checkedBy,    x: PW / 2 - sigW / 2 },
                { role: 'Authorized By', sig: savedSigs.authorizedBy, x: PW - M - sigW },
            ];
            for (const slot of sigSlots) {
                if (slot.sig?.imageUrl) {
                    try { pdf.addImage(slot.sig.imageUrl, 'PNG', slot.x, y, sigW, 13); } catch {}
                }
                pdf.setLineWidth(0.3); pdf.line(slot.x, y + 15, slot.x + sigW, y + 15);
                pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
                pdf.text(slot.role, slot.x + sigW / 2, y + 20, { align: 'center' });
            }

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

        return (
             <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" onClick={() => setViewReport(null)}>
                        &larr; Back to Records
                    </Button>
                    <h2 className="text-xl font-bold">Report: {viewReport.name}</h2>
                    <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="ml-auto bg-green-600 hover:bg-green-700 text-white">
                        <Download className="mr-2 h-4 w-4" />
                        {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                    </Button>
                </div>
                <div className="bg-white p-8 shadow-lg border border-gray-200 w-full max-w-[210mm] mx-auto">
                    <div className="text-center mb-4 bg-[#d9ead3] border border-black p-3">
                        <h1 className="text-lg font-bold text-black uppercase">Tokyo Consulting Firm Limited</h1>
                        <h2 className="text-base font-bold text-black mt-1">OT Summary</h2>
                        <h3 className="text-sm font-bold text-black mt-1">For the month of {format(parseISO(`${viewReport.month}-01`), 'MMMM-yyyy')}</h3>
                    </div>
                    <div className="border border-black">
                         <table className="w-full text-xs table-fixed">
                            <colgroup>
                                <col style={{ width: '48px' }} />
                                <col />
                                <col style={{ width: '90px' }} />
                                <col style={{ width: '120px' }} />
                                <col style={{ width: '80px' }} />
                            </colgroup>
                            <thead>
                                <tr className="bg-[#bfbfbf] text-black divide-x divide-black border-b border-black">
                                    <th className="p-1.5 text-center font-bold border-r border-black">SL. NO.</th>
                                    <th className="p-1.5 text-center font-bold border-r border-black">Employees Name</th>
                                    <th className="p-1.5 text-center font-bold border-r border-black">OT Hour(s)</th>
                                    <th className="p-1.5 text-center font-bold border-r border-black">Prev. Month End OT</th>
                                    <th className="p-1.5 text-center font-bold">Total OT</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-black">
                                {(() => {
                                    const sortedRows = [...viewReport.data.reportData].sort((a: any, b: any) => {
                                        const empA = employees.find(e => e.id === a.id);
                                        const empB = employees.find(e => e.id === b.id);
                                        const eIdA = empA?.eid || '';
                                        const eIdB = empB?.eid || '';
                                        const parseEidNumber = (eid: string): number => {
                                            const match = eid.match(/\d+/);
                                            return match ? parseInt(match[0], 10) : Infinity;
                                        };
                                        const aNum = parseEidNumber(eIdA);
                                        const bNum = parseEidNumber(eIdB);
                                        if (aNum !== bNum) return aNum - bNum;
                                        return eIdA.localeCompare(eIdB);
                                    });
                                    return sortedRows.map((row: any, idx: number) => (
                                        <tr key={row.id} className="divide-x divide-black">
                                            <td className="py-1 px-1.5 text-center border-r border-black">{idx + 1}</td>
                                            <td className="py-1 px-1.5 text-left border-r border-black font-medium">{row.name}</td>
                                            <td className="py-1 px-1.5 text-right border-r border-black">{row.currentMonthOT > 0 ? row.currentMonthOT.toFixed(2) : ''}</td>
                                            <td className="py-1 px-1.5 text-right border-r border-black">{row.prevMonthEndOT > 0 ? row.prevMonthEndOT.toFixed(2) : ''}</td>
                                            <td className="py-1 px-1.5 text-right font-bold">{row.totalOT > 0 ? row.totalOT.toFixed(2) : '-'}</td>
                                        </tr>
                                    ));
                                })()}
                                <tr className="font-bold text-black border-t-2 border-black divide-x divide-black bg-white">
                                    <td colSpan={2} className="py-1.5 px-1.5 text-center uppercase border-r border-black">Total</td>
                                    <td className="py-1.5 px-1.5 text-right border-r border-black">{viewReport.data.totals.current > 0 ? viewReport.data.totals.current.toFixed(2) : ''}</td>
                                    <td className="py-1.5 px-1.5 text-right border-r border-black">{viewReport.data.totals.prevEnd > 0 ? viewReport.data.totals.prevEnd.toFixed(2) : ''}</td>
                                    <td className="py-1.5 px-1.5 text-right text-sm font-bold">{viewReport.data.totals.total.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-3 gap-8 mt-8 pt-4">
                         <SignatureBlock role="Prepared By" signature={savedSigs.preparedBy} readOnly />
                         <SignatureBlock role="Checked By" signature={savedSigs.checkedBy} readOnly />
                         <SignatureBlock role="Authorized By" signature={savedSigs.authorizedBy} readOnly />
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
    const [searchQuery, setSearchQuery] = useState('');

    const recordsForDate = useMemo(() => {
        let filtered = otRecords.filter(r => r.date === date);
        if (isStaff) {
            filtered = filtered.filter(r => r.employeeId === currentUser.id);
        }
        return filtered;
    }, [otRecords, date, isStaff, currentUser]);

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

        if (isStaff) {
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
                                        {!row.otRecord ? (
                                            <Button size="sm" variant="outline" onClick={() => onAddOT(row.id)}>
                                                <Plus className="h-3 w-3 mr-1" /> Add OT
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEditOT(row.otRecord!)}>
                                                <Clock className="h-4 w-4 text-blue-600" />
                                            </Button>
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
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(currentUser.role === 'Staff' ? [currentUser.id] : ['all']);
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
                {currentUser.role !== 'Staff' && (
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
                            {pendingRecords.length > 0 && (
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
                {/* For Staff: just show total */}
                {currentUser.role === 'Staff' && (
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
    otRecords
}: {
    employees: Employee[],
    otRecords: OTRecord[]
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
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Report Month:</span>
                        <Input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => { 
                                setSelectedMonth(e.target.value);
                                setReportName(`OT Summary - ${format(parseISO(`${e.target.value}-01`), 'MMMM-yyyy')}`);
                            }} 
                            className="w-48 bg-gray-50 border-0 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Prev. Month Date:</span>
                        <Input 
                            type="date" 
                            value={customPrevDate} 
                            onChange={(e) => setCustomPrevDate(e.target.value)} 
                            className="w-48 bg-gray-50 border-0 [&::-webkit-calendar-picker-indicator]:filter-[brightness(0)_saturate(100%)] [&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={openSaveDialog}>
                        <Save className="mr-2 h-4 w-4" /> Save Record
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Report
                    </Button>
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg print:hidden">
                <h4 className="font-medium text-sm text-blue-800 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Configure Report Signatures
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Prepared By</label>
                        <Select value={preparedById} onValueChange={setPreparedById}>
                            <SelectTrigger className="bg-white h-8 text-sm">
                                <SelectValue placeholder="Select Signature" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {signatures.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Checked By</label>
                         <Select value={checkedById} onValueChange={setCheckedById}>
                            <SelectTrigger className="bg-white h-8 text-sm">
                                <SelectValue placeholder="Select Signature" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {signatures.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Authorized By</label>
                         <Select value={authorizedById} onValueChange={setAuthorizedById}>
                            <SelectTrigger className="bg-white h-8 text-sm">
                                <SelectValue placeholder="Select Signature" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {signatures.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 min-h-[800px] print:p-0 print:shadow-none shadow-lg w-full max-w-[210mm] mx-auto">
                {/* Header */}
                <div className="text-center mb-6 bg-[#d9ead3] border border-black p-4">
                    <h1 className="text-xl font-bold text-black uppercase">Tokyo Consulting Firm Limited</h1>
                    <h2 className="text-lg font-bold text-black mt-1">OT Summary</h2>
                    <h3 className="text-md font-bold text-black mt-1">For the month of {currentMonthName}</h3>
                </div>

                {/* Table */}
                <div className="border border-black">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#bfbfbf] text-black divide-x divide-black border-b border-black">
                                <th className="p-2 w-16 text-center font-bold border-r border-black">SL. NO.</th>
                                <th className="p-2 text-left font-bold border-r border-black">Employees Name</th>
                                <th className="p-2 text-right font-bold border-r border-black">OT Hour(s)</th>
                                <th className="p-2 text-right font-bold border-r border-black">{prevDateMonthName} end date's OT</th>
                                <th className="p-2 text-right font-bold">Total OT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {reportData.map((row, idx) => (
                                <tr key={row.id} className="divide-x divide-black hover:bg-gray-50">
                                    <td className="p-2 text-center border-r border-black">{idx + 1}</td>
                                    <td className="p-2 text-left border-r border-black font-medium">{row.name}</td>
                                    <td className="p-2 text-right border-r border-black">{row.currentMonthOT > 0 ? row.currentMonthOT.toFixed(2) : ''}</td>
                                    <td className="p-2 text-right border-r border-black">{row.prevMonthEndOT > 0 ? row.prevMonthEndOT.toFixed(2) : ''}</td>
                                    <td className="p-2 text-right font-bold">{row.totalOT > 0 ? row.totalOT.toFixed(2) : '-'}</td>
                                </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="font-bold text-black border-t-2 border-black divide-x divide-black bg-white">
                                <td colSpan={2} className="p-2 text-center uppercase border-r border-black">Total</td>
                                <td className="p-2 text-right border-r border-black">{totals.current > 0 ? totals.current.toFixed(2) : ''}</td>
                                <td className="p-2 text-right border-r border-black">{totals.prevEnd > 0 ? totals.prevEnd.toFixed(2) : ''}</td>
                                <td className="p-2 text-right text-lg">{totals.total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-20 pt-8">
                    <SignatureBlock 
                        role="Prepared By" 
                        signature={signatures.find(s => s.id === preparedById)} 
                    />
                    <SignatureBlock 
                        role="Checked By" 
                        signature={signatures.find(s => s.id === checkedById)} 
                    />
                    <SignatureBlock 
                        role="Authorized By" 
                        signature={signatures.find(s => s.id === authorizedById)} 
                    />
                </div>

                {/* Page Number Mockup */}
                 <div className="text-center mt-8 text-gray-400 text-xs print:hidden">
                    Page 1
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
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
                        <div className="flex flex-wrap gap-3">
                            {[0, 1, 1.5, 2].map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, hours: h, reason: h === 0 ? '' : formData.reason })}
                                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                                        formData.hours === h
                                            ? 'text-white'
                                            : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                                    }`}
                                    style={formData.hours === h ? { backgroundColor: '#0036A3', borderColor: '#0036A3' } : {}}
                                >
                                    {h} {h === 1 || h === 0 ? 'Hour' : 'Hours'}
                                </button>
                            ))}
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
