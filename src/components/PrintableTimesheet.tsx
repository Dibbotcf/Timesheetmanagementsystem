import React, { useMemo } from 'react';
import { TimesheetRecord, MonthTemplate, DailyEntry, SummaryEntry, Signature } from '../App';
import TCF_LOGO_PATH from 'figma:asset/e496b3c659675b1f9399acaf1a235cbe1d77b03e.png';

interface InputCellProps {
    value: string;
    onChange: (v: string) => void;
    className?: string;
    align?: "left" | "center" | "right";
    isEditing?: boolean;
}

const InputCell = React.memo(({ value, onChange, className = "", align = "center", isEditing }: InputCellProps) => (
    isEditing ? (
        <input 
            type="text" 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className={`w-full h-full bg-transparent border-none outline-none px-1 focus:bg-[#eff6ff] transition-colors ${className} ${align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'}`}
            style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
        />
    ) : (
        <div className={`w-full h-full flex items-center ${align === 'left' ? 'justify-start pl-1' : align === 'right' ? 'justify-end pr-1' : 'justify-center'}`}>
             <span className={`block truncate ${className}`}>{value}</span>
        </div>
    )
));

interface Props {
    timesheet: TimesheetRecord;
    template?: MonthTemplate;
    entries?: DailyEntry[];
    summary?: SummaryEntry[];
    isEditing?: boolean;
    onEntriesChange?: (entries: DailyEntry[]) => void;
    onSummaryChange?: (summary: SummaryEntry[]) => void;
    signatures?: Signature[];
    checkedBySignatureId?: string;
    approvedBySignatureId?: string;
    onCheckedByChange?: (id: string) => void;
    onApprovedByChange?: (id: string) => void;
    canEditSignatures?: boolean; 
}

// LAYOUT CONSTANTS - Compressed for A4
const PAGE_WIDTH = 794;
const CONTENT_WIDTH = 730; // Approx content width
const PAD_TOP = 24;
const PAD_LEFT = 32;

const HEADER_H = 60;
const HEADER_GAP = 12;
const META_H = 52;
const META_GAP = 12;
const TABLE_HEADER_H = 22;
const ROW_H = 18;
const HR_GAP = 12;
const HR_LABEL_H = 16;
const SUMMARY_GAP = 8;
const SUMMARY_ROW_H = 20;
const SIG_GAP = 24;
const SIG_H = 100;

export const PrintableTimesheet: React.FC<Props> = ({ 
    timesheet, 
    template, 
    entries, 
    summary, 
    isEditing = false,
    onEntriesChange,
    onSummaryChange,
    signatures = [],
    checkedBySignatureId,
    approvedBySignatureId,
    onCheckedByChange,
    onApprovedByChange,
    canEditSignatures = true
}) => {
    const daysInMonth = new Date(timesheet.year, timesheet.month + 1, 0).getDate();
    const monthName = new Date(timesheet.year, timesheet.month).toLocaleString('default', { month: 'long' });
    
    const days = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const date = i + 1;
            const d = new Date(timesheet.year, timesheet.month, date);
            const holiday = template?.holidays?.find(h => h.date === date);
            const isWeekend = template ? false : (d.getDay() === 5 || d.getDay() === 6); 
            
            const entry = entries?.find(e => e.date === date) || { date: date, inTime: '', outTime: '', ot: '', remarks: '', signatureId: '' };

            return {
                date,
                isWeekend,
                holiday,
                entry
            };
        });
    }, [timesheet, template, daysInMonth, entries]);

    const handleEntryChange = (date: number, field: keyof DailyEntry, value: string) => {
        if (!onEntriesChange || !entries) return;
        const newEntries = [...entries];
        const index = newEntries.findIndex(e => e.date === date);
        if (index >= 0) {
            newEntries[index] = { ...newEntries[index], [field]: value };
        } else {
             newEntries.push({ date, inTime: '', outTime: '', ot: '', remarks: '', [field]: value } as DailyEntry);
        }
        onEntriesChange(newEntries);
    };

    const handleSummaryChange = (sl: string, field: keyof SummaryEntry, value: string) => {
        if (!onSummaryChange || !summary) return;
        const newSummary = [...summary];
        const index = newSummary.findIndex(s => s.sl === sl);
        if (index >= 0) {
            newSummary[index] = { ...newSummary[index], [field]: value };
        }
        onSummaryChange(newSummary);
    }

    const getSignature = (id?: string) => signatures.find(s => s.id === id);

    const fontRegular = "font-['Times_New_Roman',serif]";
    const fontBold = "font-['Times_New_Roman',serif] font-bold";
    
    const DailySignatureCell = ({ entry }: { entry: DailyEntry }) => {
        const sig = getSignature(entry.signatureId);
        return (
            <div className="w-full h-full relative flex items-center justify-center">
                {sig && (
                    <img src={sig.imageUrl} alt="Sig" className="max-h-[14px] max-w-[90px] object-contain" />
                )}
                {isEditing && canEditSignatures && (
                    <select
                        value={entry.signatureId || ''}
                        onChange={(e) => handleEntryChange(entry.date, 'signatureId', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Click to select signature"
                    >
                        <option value="">None</option>
                        {signatures.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>
        );
    };

    // Calculate Sections Positions
    const headerTop = PAD_TOP;
    const metaTop = headerTop + HEADER_H + HEADER_GAP;
    const tableTop = metaTop + META_H + META_GAP;
    const tableBodyTop = tableTop + TABLE_HEADER_H;
    const tableHeight = TABLE_HEADER_H + (days.length * ROW_H);
    const hrLabelTop = tableTop + tableHeight + HR_GAP;
    const summaryTop = hrLabelTop + HR_LABEL_H + SUMMARY_GAP;
    
    // Summary Rows Calculation
    const summaryRows = [
        { sl: '01', label: 'Sick Leave', h: SUMMARY_ROW_H },
        { sl: '02', label: 'Casual Leave', h: SUMMARY_ROW_H },
        { sl: '03', label: 'Earn Leave', h: SUMMARY_ROW_H },
        { sl: '04', label: 'Late', h: SUMMARY_ROW_H },
        { sl: '05', label: 'Other Leave', h: SUMMARY_ROW_H },
        { sl: '06', label: 'Eligible for Attendance Bonus', h: SUMMARY_ROW_H },
        { sl: '07', label: 'Last Working day OT of Previous Month', h: SUMMARY_ROW_H },
        { sl: '08', label: 'Total OT', h: SUMMARY_ROW_H },
    ];
    const summaryHeight = summaryRows.reduce((acc, row) => acc + row.h, 0) + TABLE_HEADER_H; // + header
    
    const sigTop = summaryTop + summaryHeight + SIG_GAP;

    return (
        <div className="w-[794px] min-h-[1123px] bg-white mx-auto relative text-black shadow-lg my-4 overflow-hidden"
             style={{ backgroundColor: '#ffffff', color: '#000000' }}>
             
             <div className="box-border flex flex-col items-start relative size-full">
                
                {/* Header & Metadata */}
                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${headerTop}px`, height: `${HEADER_H}px` }}>
                    <div className="absolute h-[40px] left-0 top-[10px] w-[84px]">
                        <p className={`${fontRegular} leading-[40px] text-[#99a1af] text-[24px] tracking-[-1.8px] whitespace-pre`}>Timesheet</p>
                    </div>
                    <div className="absolute h-full left-[562px] top-0 w-[135px]">
                         <img src={TCF_LOGO_PATH} alt="TCF" className="absolute inset-0 object-contain size-full" />
                    </div>
                </div>

                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${metaTop}px`, height: `${META_H}px` }}>
                    <div className="absolute flex flex-col gap-[4px] h-full items-start left-0 top-0 w-[364.844px]">
                         {/* Name */}
                         <div className="flex h-[24px] items-start relative shrink-0 w-full">
                            <div className="bg-[#f9fafb] h-full relative shrink-0 w-[96px]">
                                <div aria-hidden="true" className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 1px 1px' }} />
                                <div className="flex h-full items-center pl-[10px]">
                                    <p className={`${fontBold} text-[13px]`}>Name:</p>
                                </div>
                            </div>
                            <div className="flex-1 h-full relative shrink-0">
                                <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                                <div className="flex h-full items-center pl-[9px]">
                                     <p className={`${fontBold} text-[13px]`}>{timesheet.employeeName}</p>
                                </div>
                            </div>
                         </div>
                         {/* EID */}
                         <div className="flex h-[24px] items-start relative shrink-0 w-full">
                            <div className="bg-[#f9fafb] h-full relative shrink-0 w-[96px]">
                                <div aria-hidden="true" className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 1px 1px' }} />
                                <div className="flex h-full items-center pl-[10px]">
                                    <p className={`${fontBold} text-[13px]`}>EID No:</p>
                                </div>
                            </div>
                            <div className="flex-1 h-full relative shrink-0">
                                <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                                <div className="flex h-full items-center pl-[9px]">
                                     <p className={`${fontBold} text-[13px]`}>{timesheet.eid}</p>
                                </div>
                            </div>
                         </div>
                    </div>
                    
                    <div className="absolute h-[20px] left-[477px] bottom-0 w-[220px]">
                        <p className={`${fontBold} text-[13px] text-right absolute right-0 bottom-[2px]`}>For the Month of {monthName}, {timesheet.year}</p>
                    </div>
                </div>

                {/* MAIN TABLE */}
                <div className="absolute left-[32px] w-[730.688px]" style={{ top: `${tableTop}px`, height: `${tableHeight + 2}px` }}>
                     <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                     
                     {/* Table Header */}
                     <div className="absolute left-[0.5px] top-[0.5px] w-[729.688px]" style={{ height: `${TABLE_HEADER_H}px` }}>
                         <div className="absolute bg-[#e5e7eb] h-full left-0 top-0 w-full">
                             <div className="absolute h-full left-0 top-0 w-[40px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Date</p>
                             </div>
                             <div className="absolute h-full left-[40px] top-0 w-[80px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>In Time</p>
                             </div>
                             <div className="absolute h-full left-[120px] top-0 w-[80px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap`}>Out Time</p>
                             </div>
                             <div className="absolute h-full left-[200px] top-0 w-[56px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>OT</p>
                             </div>
                             <div className="absolute h-full left-[256px] top-0 w-[377.688px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Remarks</p>
                             </div>
                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                 <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Signature</p>
                             </div>
                         </div>
                     </div>

                     {/* Table Body */}
                     <div className="absolute left-[0.5px] w-[729.688px]" style={{ top: `${TABLE_HEADER_H}px` }}>
                         {days.map((day, i) => {
                             const top = i * ROW_H;
                             const isHoliday = day.isWeekend || day.holiday;
                             const bgClass = isHoliday ? 'bg-[#d1d5dc]' : '';
                             
                             return (
                                 <div key={day.date} className={`absolute left-0 w-[729.688px] ${bgClass}`} style={{ top: `${top}px`, height: `${ROW_H}px` }}>
                                     <div className="absolute h-full left-0 top-0 w-[40px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>{day.date}</p>
                                     </div>

                                     {isHoliday ? (
                                         <>
                                             <div className="absolute h-full left-[40px] top-0 w-[593.688px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                                 <p className={`${fontRegular} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                                                     {day.holiday ? day.holiday.reason : 'Weekly Holiday'}
                                                 </p>
                                             </div>
                                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                                 <DailySignatureCell entry={day.entry} />
                                             </div>
                                         </>
                                     ) : (
                                         <>
                                             <div className="absolute h-full left-[40px] top-0 w-[80px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <InputCell isEditing={isEditing} value={day.entry.inTime} onChange={(v) => handleEntryChange(day.date, 'inTime', v)} className={`${fontRegular} text-[11px]`} />
                                             </div>
                                             <div className="absolute h-full left-[120px] top-0 w-[80px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <InputCell isEditing={isEditing} value={day.entry.outTime} onChange={(v) => handleEntryChange(day.date, 'outTime', v)} className={`${fontRegular} text-[11px]`} />
                                             </div>
                                             <div className="absolute h-full left-[200px] top-0 w-[56px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <InputCell isEditing={isEditing} value={day.entry.ot} onChange={(v) => handleEntryChange(day.date, 'ot', v)} className={`${fontRegular} text-[11px]`} />
                                             </div>
                                             <div className="absolute h-full left-[256px] top-0 w-[377.688px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                                 <InputCell isEditing={isEditing} value={day.entry.remarks} onChange={(v) => handleEntryChange(day.date, 'remarks', v)} className={`${fontRegular} text-[11px]`} align="left" />
                                             </div>
                                             <div className="absolute h-full left-[633.69px] top-0 w-[96px]">
                                                 <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                                 <DailySignatureCell entry={day.entry} />
                                             </div>
                                         </>
                                     )}
                                 </div>
                             )
                         })}
                     </div>
                </div>

                {/* HR Comments Label */}
                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${hrLabelTop}px`, height: `${HR_LABEL_H}px` }}>
                    <p className={`${fontBold} text-[12px] leading-[16px]`}>H.R Comments :</p>
                </div>

                {/* SUMMARY TABLE */}
                <div className="absolute left-[32px] w-[730.688px]" style={{ top: `${summaryTop}px`, height: `${summaryHeight}px` }}>
                     <div aria-hidden="true" className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
                     
                     {/* Header */}
                     <div className="absolute left-[0.5px] top-[0.5px] w-[729.688px]" style={{ height: `${TABLE_HEADER_H}px` }}>
                         <div className="absolute h-full left-0 top-0 w-[40px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Sl.</p>
                         </div>
                         <div className="absolute h-full left-[40px] top-0 w-[192px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-[9px] top-1/2 -translate-y-1/2`}>Particulars</p>
                         </div>
                         <div className="absolute h-full left-[232px] top-0 w-[160px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap`}>Day/s, Hour, Minutes, Eligibility</p>
                         </div>
                         <div className="absolute h-full left-[392px] top-0 w-[337.688px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                             <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>Remarks</p>
                         </div>
                     </div>

                     {/* Body */}
                     <div className="absolute left-[0.5px] w-[729.688px]" style={{ top: `${TABLE_HEADER_H}px` }}>
                        {summaryRows.map((row, idx) => {
                            // Calculate cumulative top
                            const rowTop = summaryRows.slice(0, idx).reduce((sum, r) => sum + r.h, 0);
                            const summaryItem = summary?.find(s => s.sl === row.sl) || { days: '', remarks: '' };
                            
                            return (
                                <div key={row.sl} className="absolute left-0 w-full" style={{ height: `${row.h}px`, top: `${rowTop}px` }}>
                                    <div className="absolute h-full left-0 top-0 w-[40px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <p className={`${fontBold} text-[11px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>{row.sl}</p>
                                    </div>
                                    <div className="absolute h-full left-[40px] top-0 w-[192px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <p className={`${fontRegular} text-[11px] absolute left-[9px] top-1/2 -translate-y-1/2`}>{row.label}</p>
                                    </div>
                                    <div className="absolute h-full left-[232px] top-0 w-[160px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 1px 1px 0px' }} />
                                         <InputCell isEditing={isEditing} value={summaryItem.days} onChange={(v) => handleSummaryChange(row.sl, 'days', v)} className={`${fontRegular} text-[11px]`} />
                                    </div>
                                    <div className="absolute h-full left-[392px] top-0 w-[337.688px]">
                                         <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '0px 0px 1px 0px' }} />
                                         <InputCell isEditing={isEditing} value={summaryItem.remarks} onChange={(v) => handleSummaryChange(row.sl, 'remarks', v)} className={`${fontRegular} text-[11px]`} align="left" />
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                </div>

                {/* SIGNATURES FOOTER */}
                <div className="absolute left-[32px] w-[697.688px]" style={{ top: `${sigTop}px`, height: `${SIG_H}px` }}>
                     {/* Checked By */}
                     <div className="absolute h-full left-[10px] top-0 w-[200px]">
                         <div className="absolute bottom-[40px] w-full flex justify-center">
                              {(() => {
                                const sig = getSignature(checkedBySignatureId);
                                return sig ? <img src={sig.imageUrl} alt="Sig" className="max-h-[50px] max-w-[180px] object-contain" /> : null;
                              })()}
                              {isEditing && canEditSignatures && onCheckedByChange && (
                                <select 
                                    value={checkedBySignatureId || ''} 
                                    onChange={(e) => onCheckedByChange(e.target.value)}
                                    className="absolute bottom-0 w-full h-[50px] opacity-0 cursor-pointer"
                                >
                                    <option value="">Select Signature</option>
                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             )}
                         </div>
                         <div className="absolute h-px left-0 bottom-[38px] w-[200px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 0px 0px' }} />
                         </div>
                         <div className="absolute left-[67.16px] bottom-[20px] w-[65.672px]">
                             <p className={`${fontBold} text-[12px] whitespace-pre`}>Checked By:</p>
                         </div>
                         {(() => {
                             const sig = getSignature(checkedBySignatureId);
                             return sig ? (
                                <div className="absolute left-[56.61px] bottom-[2px] w-[86.781px]">
                                    <p className={`${fontRegular} text-[10px]`}>{sig.name} - {sig.role}</p>
                                </div>
                             ) : null;
                         })()}
                     </div>

                     {/* Approved By */}
                     <div className="absolute h-full left-[487.69px] top-0 w-[200px]">
                         <div className="absolute bottom-[40px] w-full flex justify-center">
                              {(() => {
                                const sig = getSignature(approvedBySignatureId);
                                return sig ? <img src={sig.imageUrl} alt="Sig" className="max-h-[50px] max-w-[180px] object-contain" /> : null;
                              })()}
                              {isEditing && canEditSignatures && onApprovedByChange && (
                                <select 
                                    value={approvedBySignatureId || ''} 
                                    onChange={(e) => onApprovedByChange(e.target.value)}
                                    className="absolute bottom-0 w-full h-[50px] opacity-0 cursor-pointer"
                                >
                                    <option value="">Select Signature</option>
                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             )}
                         </div>
                         <div className="absolute h-px left-0 bottom-[38px] w-[200px]">
                             <div className="absolute border-[#000000] border-solid inset-0 pointer-events-none" style={{ borderWidth: '1px 0px 0px 0px' }} />
                         </div>
                         <div className="absolute left-[64.59px] bottom-[20px] w-[70.797px]">
                             <p className={`${fontBold} text-[12px] whitespace-pre`}>Approved by:</p>
                         </div>
                         {(() => {
                             const sig = getSignature(approvedBySignatureId);
                             return sig ? (
                                <div className="absolute left-[56.61px] bottom-[2px] w-[86.781px]">
                                    <p className={`${fontRegular} text-[10px]`}>{sig.name} - {sig.role}</p>
                                </div>
                             ) : null;
                         })()}
                     </div>
                </div>

             </div>
        </div>
    );
}
