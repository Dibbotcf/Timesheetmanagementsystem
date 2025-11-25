
import React, { useState } from 'react';
import { useAppStore, TimesheetRecord } from '../App';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { Printer, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useNavigate } from 'react-router-dom';
import { PrintableTimesheet } from '../components/PrintableTimesheet';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

export const Timesheet: React.FC = () => {
  const { employees, getTemplate, folders, addTimesheet, signatures, currentUser } = useAppStore();
  const navigate = useNavigate();
  
  const isStaff = currentUser?.role === 'Staff';
  
  if (isStaff) {
      return (
          <div className="flex items-center justify-center h-[50vh] text-gray-500">
              You do not have permission to view this page.
          </div>
      );
  }

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const template = getTemplate(selectedYear, selectedMonth);
  
  const handlePrint = () => {
    window.print();
  };

  const handleGenerate = () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!selectedFolderId) {
      toast.error('Please select a target folder');
      return;
    }

    addTimesheet({
      id: Math.random().toString(36).substr(2, 9), // Generate ID
      folderId: selectedFolderId,
      employeeId: selectedEmployeeId,
      employeeName: selectedEmployee?.name || 'Unknown',
      eid: selectedEmployee?.eid || 'Unknown',
      year: selectedYear,
      month: selectedMonth,
    });

    toast.success('Timesheet generated and saved to dashboard');
    navigate('/'); // Redirect to dashboard
  };

  // Construct a preview record
  const previewTimesheet: TimesheetRecord = {
    id: 'preview',
    folderId: selectedFolderId,
    employeeId: selectedEmployeeId,
    employeeName: selectedEmployee?.name || '',
    eid: selectedEmployee?.eid || '',
    year: selectedYear,
    month: selectedMonth,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content Area */}
      <div className="flex-1 space-y-6 pb-8">
        {/* Controls - Not visible in print */}
        <div className="print:hidden space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Create Timesheet</h1>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print Preview
              </Button>
            </div>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Employee</label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.eid})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Year</label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-600">Save to Folder</label>
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                  <SelectTrigger className="border-blue-200 bg-blue-50">
                    <SelectValue placeholder="Select output folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.length === 0 ? (
                       <SelectItem value="none" disabled>No folders created yet</SelectItem>
                    ) : (
                      folders.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {folders.length === 0 && (
                  <p className="text-xs text-red-500">Please create a folder in Dashboard first.</p>
                )}
              </div>
            </div>
            
            {!template && (
              <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                Warning: No template configuration found for {MONTHS[selectedMonth]} {selectedYear}. 
                Holidays may not be marked automatically. Go to Templates to configure.
              </div>
            )}
          </Card>
        </div>

        {/* Printable Area */}
        <div className="bg-gray-100 p-4 md:p-8 print:p-0 print:bg-white flex justify-center print:block print:overflow-visible rounded-lg border overflow-x-auto">
            <PrintableTimesheet 
              timesheet={previewTimesheet}
              template={template}
              entries={[]}
              summary={[]}
              signatures={signatures}
              isEditing={false} // Preview mode only
            />
        </div>
      </div>

      {/* Sticky Footer Generate Button */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg flex justify-end items-center gap-4 print:hidden z-10 mt-auto">
        <div className="text-sm text-gray-500 mr-auto hidden md:block">
           {selectedEmployeeId && selectedFolderId 
             ? `Ready to generate for ${selectedEmployee?.name}` 
             : 'Select Employee and Folder to generate'}
        </div>
        <Button 
          size="lg" 
          className="bg-green-600 hover:bg-green-700 shadow-md w-full md:w-auto"
          onClick={handleGenerate}
          disabled={!selectedEmployeeId || !selectedFolderId}
        >
          <Save className="mr-2 h-5 w-5" /> Generate & Save
        </Button>
      </div>
    </div>
  );
};
