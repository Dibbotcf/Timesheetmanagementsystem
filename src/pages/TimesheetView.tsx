import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, TimesheetRecord, DailyEntry, SummaryEntry, SubmissionHistory } from '../App';
import { PrintableTimesheet } from '../components/PrintableTimesheet';
import { Button } from '../components/ui/button';
import { ArrowLeft, Save, Pencil, History, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";

export const TimesheetView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { timesheets, getTemplate, updateTimesheet, signatures, currentUser } = useAppStore();
  
  const [timesheet, setTimesheet] = useState<TimesheetRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localEntries, setLocalEntries] = useState<DailyEntry[]>([]);
  const [localSummary, setLocalSummary] = useState<SummaryEntry[]>([]);
  const [checkedBy, setCheckedBy] = useState<string | undefined>(undefined);
  const [approvedBy, setApprovedBy] = useState<string | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (id && timesheets.length > 0) {
      const ts = timesheets.find(t => t.id === id);
      if (ts) {
        setTimesheet(ts);
        
        // Initialize entries if missing
        if (ts.entries && ts.entries.length > 0) {
            setLocalEntries(ts.entries);
        } else {
            // Init default entries
            const daysInMonth = new Date(ts.year, ts.month + 1, 0).getDate();
            const defaults: DailyEntry[] = Array.from({ length: daysInMonth }, (_, i) => ({
                date: i + 1,
                inTime: '',
                outTime: '',
                ot: '',
                remarks: ''
            }));
            setLocalEntries(defaults);
        }
        
        // Initialize summary if missing
        if (ts.summary && ts.summary.length > 0) {
            setLocalSummary(ts.summary);
        } else {
            const sls = ['01', '02', '03', '04', '05', '06', '07', '08'];
            setLocalSummary(sls.map(sl => ({ sl, days: '', remarks: '' })));
        }

        // Initialize Signatures
        setCheckedBy(ts.checkedBySignatureId);
        setApprovedBy(ts.approvedBySignatureId);
      }
    }
  }, [id, timesheets]);

  if (!timesheet) {
    return <div className="p-8">Loading or Timesheet not found...</div>;
  }

  const handleSave = () => {
      updateTimesheet(timesheet.id, {
          entries: localEntries,
          summary: localSummary,
          checkedBySignatureId: checkedBy,
          approvedBySignatureId: approvedBy
      });
      setIsEditing(false);
      toast.success("Timesheet saved");
  };

  const handleSubmit = () => {
    const newSubmission: SubmissionHistory = {
      timestamp: new Date().toISOString(),
    };
    const updatedSubmissions = [...(timesheet.submissions || []), newSubmission];
    
    updateTimesheet(timesheet.id, {
        entries: localEntries,
        summary: localSummary,
        checkedBySignatureId: checkedBy,
        approvedBySignatureId: approvedBy,
        submissions: updatedSubmissions
    });
    toast.success("Timesheet submitted successfully");
  };

  const handlePrint = () => {
      window.print();
  };

  const template = getTemplate(timesheet.year, timesheet.month);

  return (
    <div className="min-h-screen bg-gray-100 pb-10 print:bg-white print:pb-0">
        {/* Toolbar - Hidden on Print */}
        <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 print:hidden shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{timesheet.employeeName}</h1>
                    <p className="text-sm text-gray-500">
                        {new Date(timesheet.year, timesheet.month).toLocaleString('default', { month: 'long' })} {timesheet.year}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isEditing && (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)} title="View Submission History">
                            <History className="h-5 w-5 text-gray-600" />
                        </Button>
                        <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white gap-2 mr-2">
                            <Send className="h-4 w-4" /> Submit
                        </Button>

                        <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                            <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button onClick={handlePrint} className="bg-blue-900 hover:bg-blue-800 text-white">
                            Download PDF
                        </Button>
                    </>
                )}

                {isEditing && (
                    <>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-900 hover:bg-blue-800 text-white gap-2">
                            <Save className="h-4 w-4" /> Save Changes
                        </Button>
                    </>
                )}
            </div>
        </div>

        {/* Main Content */}
        <div className="py-8 print:py-0 flex justify-center">
            <div className="print:w-full">
                <PrintableTimesheet 
                    timesheet={timesheet} 
                    template={template}
                    entries={localEntries}
                    summary={localSummary}
                    isEditing={isEditing}
                    onEntriesChange={setLocalEntries}
                    onSummaryChange={setLocalSummary}
                    signatures={signatures}
                    checkedBySignatureId={checkedBy}
                    approvedBySignatureId={approvedBy}
                    onCheckedByChange={setCheckedBy}
                    onApprovedByChange={setApprovedBy}
                    canEditSignatures={currentUser?.role !== 'Staff'}
                />
            </div>
        </div>

        {/* History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Submission History</DialogTitle>
                    <DialogDescription>
                        Record of timesheet submissions.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {timesheet.submissions && timesheet.submissions.length > 0 ? (
                        <div className="space-y-4">
                            {timesheet.submissions.slice().reverse().map((sub, i) => (
                                <div key={i} className="flex flex-col border-b pb-2 last:border-0">
                                    <span className="font-medium text-sm">
                                        Submission #{timesheet.submissions!.length - i}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(sub.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            No submissions yet.
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
};
