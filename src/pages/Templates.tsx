
import React, { useState } from 'react';
import { useAppStore, MonthTemplate, Holiday } from '../App';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner@2.0.3';
import { Save, Trash2, Calendar as CalendarIcon, Printer } from 'lucide-react';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

const YearlyView: React.FC<{
  year: number;
  templates: MonthTemplate[];
  onMonthSelect: (month: number) => void;
}> = ({ year, templates, onMonthSelect }) => {

  const getMonthData = (monthIndex: number) => {
    const date = new Date(year, monthIndex, 1);
    const firstDay = date.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  // Aggregate all holidays for the year, excluding "Weekly Holiday"
  const annualHolidays = React.useMemo(() => {
    const all: { month: number; date: number; reason: string }[] = [];
    
    MONTHS.forEach((_, monthIndex) => {
      const monthTemplate = templates.find(t => t.year === year && t.month === monthIndex);
      if (monthTemplate && monthTemplate.holidays) {
        monthTemplate.holidays.forEach(h => {
          // Filter out weekly holidays (case insensitive check)
          if (!h.reason.toLowerCase().includes("weekly holiday")) {
            all.push({
              month: monthIndex,
              date: h.date,
              reason: h.reason
            });
          }
        });
      }
    });

    // Sort by date
    return all.sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.date - b.date;
    });
  }, [year, templates]);

  const formatHolidayDate = (month: number, date: number) => {
    const d = new Date(year, month, date);
    const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit' });
    return (
      <span className="font-bold text-blue-900">
        {monthStr} <span className="text-blue-700">{dateStr}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <style type="text/css" media="print">
        {`
          @page { size: landscape; margin: 5mm; }
        `}
      </style>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full print:gap-3">
        {MONTHS.map((monthName, monthIndex) => {
          const { firstDay, daysInMonth } = getMonthData(monthIndex);
          const monthTemplate = templates.find(t => t.year === year && t.month === monthIndex);
          const holidays = monthTemplate ? monthTemplate.holidays : [];
          
          // Generate grid cells
          const blanks = Array.from({ length: firstDay }, (_, i) => i);
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          return (
            <Card key={monthIndex} className="hover:shadow-md transition-shadow cursor-pointer h-fit border shadow-sm print:shadow-none print:border-gray-300" onClick={() => onMonthSelect(monthIndex)}>
              <CardHeader className="p-2 pb-1.5">
                <CardTitle className="text-sm font-bold flex justify-between items-center text-blue-900">
                  {monthName}
                  {monthTemplate && <span className="print:hidden text-[9px] font-normal bg-green-100 text-green-800 px-1 py-0.5 rounded-full">Set</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] mb-0.5 text-gray-400 font-medium">
                  <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                  {blanks.map((x) => (
                    <div key={`blank-${x}`} />
                  ))}
                  {days.map((d) => {
                    const isHoliday = holidays.some(h => h.date === d);
                    // Simple weekend check for visualization if no template
                    const date = new Date(year, monthIndex, d);
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                    
                    let bgClass = "hover:bg-gray-100";
                    let textClass = "text-gray-700";

                    if (isHoliday) {
                      bgClass = "bg-gray-400 text-white font-medium print:bg-gray-300 print:text-black";
                      textClass = "";
                    } else if (!monthTemplate && isWeekend) {
                      // Show potential weekends as light gray if not configured
                      bgClass = "bg-gray-50 text-gray-400";
                    }

                    return (
                      <div 
                        key={d} 
                        className={`h-5 w-5 flex items-center justify-center rounded-sm mx-auto ${bgClass} ${textClass}`}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Holidays List (Bottom) */}
      <div className="w-full mt-2 print:mt-4 break-inside-avoid">
        <h3 className="text-lg font-bold text-blue-900 mb-3 border-b border-gray-200 pb-1 print:text-base">TCF Holidays</h3>
        <div className="bg-white rounded-md">
          {annualHolidays.length === 0 ? (
             <div className="text-gray-400 text-sm italic">
               No holidays configured for {year}.
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1.5 text-sm print:text-xs">
              {annualHolidays.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-12 shrink-0 text-right">
                    {formatHolidayDate(h.month, h.date)}
                  </div>
                  <div className="text-gray-800 truncate font-medium">
                    {h.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Templates: React.FC = () => {
  const { templates, updateTemplate, getTemplate, currentUser } = useAppStore();
  
  // Default to current month
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  
  // Set initial tab based on role
  const isStaff = currentUser?.role === 'Staff';
  const [activeTab, setActiveTab] = useState(isStaff ? "yearly" : "monthly");
  
  // Working state for current template
  const [currentHolidays, setCurrentHolidays] = useState<Holiday[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  // Load template when year/month changes
  React.useEffect(() => {
    const existing = getTemplate(selectedYear, selectedMonth);
    if (existing) {
      setCurrentHolidays(existing.holidays);
    } else {
      setCurrentHolidays([]);
    }
  }, [selectedYear, selectedMonth, templates, getTemplate]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get day name (Mon, Tue, etc)
  const getDayName = (day: number) => {
    return new Date(selectedYear, selectedMonth, day).toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  const isWeekend = (day: number) => {
    const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
    return dayOfWeek === 5 || dayOfWeek === 6; 
  };

  const handleDayClick = (day: number) => {
    const existingHoliday = currentHolidays.find(h => h.date === day);
    setEditingDate(day);
    setReason(existingHoliday ? existingHoliday.reason : (isWeekend(day) ? 'Weekly Holiday' : ''));
    setIsModalOpen(true);
  };

  const saveHoliday = () => {
    if (editingDate === null) return;
    
    const newHolidays = currentHolidays.filter(h => h.date !== editingDate);
    if (reason.trim()) {
      newHolidays.push({ date: editingDate, reason: reason.trim() });
    }
    
    setCurrentHolidays(newHolidays);
    setIsModalOpen(false);
  };
  
  const removeHoliday = () => {
    if (editingDate === null) return;
    setCurrentHolidays(currentHolidays.filter(h => h.date !== editingDate));
    setIsModalOpen(false);
  };

  const handleSaveTemplate = () => {
    updateTemplate({
      id: `temp_${selectedYear}_${selectedMonth}`,
      year: selectedYear,
      month: selectedMonth,
      holidays: currentHolidays
    });
    toast.success('Template settings saved successfully');
  };

  const handleYearlyMonthSelect = (monthIndex: number) => {
    if (isStaff) return; // Prevent staff from switching to edit view
    setSelectedMonth(monthIndex);
    setActiveTab("monthly");
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Template Settings</h1>
        {isStaff && (
             <div className="text-sm text-gray-500 italic">
                 Read-only view of holidays
             </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 print:space-y-0">
        {!isStaff && (
            <div className="flex justify-between items-center print:hidden">
            <TabsList>
                <TabsTrigger value="monthly">Monthly View</TabsTrigger>
                <TabsTrigger value="yearly">Yearly View</TabsTrigger>
            </TabsList>
            
            {activeTab === 'monthly' && (
                <Button onClick={handleSaveTemplate} className="bg-blue-900 hover:bg-blue-800">
                <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
            )}
            </div>
        )}

        {!isStaff && (
          <TabsContent value="monthly" className="space-y-4 print:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Configure Month Template</CardTitle>
                <CardDescription>Select a year and month, then click on dates to set holidays or off-days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="w-40">
                    <Label>Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40">
                    <Label>Month</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {days.map(day => {
                    const holiday = currentHolidays.find(h => h.date === day);
                    const dayName = getDayName(day);
                    const isWknd = isWeekend(day);
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`
                          h-24 p-2 border rounded-md flex flex-col items-start justify-between transition-colors hover:border-blue-500 text-left
                          ${holiday ? 'bg-gray-400 text-white border-gray-500' : 'bg-white'}
                          ${!holiday && isWknd ? 'bg-gray-50' : ''}
                        `}
                      >
                        <span className="font-bold text-lg">{day} <span className="text-xs font-normal opacity-70">{dayName}</span></span>
                        {holiday && (
                          <span className="text-xs leading-tight w-full truncate font-medium">
                            {holiday.reason}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="yearly" className="space-y-4 print:block print:space-y-0">
          <div className="flex justify-between items-end mb-4 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print Year
            </Button>
            <div className="w-40">
                <Label>Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
          </div>
          <YearlyView 
            year={selectedYear} 
            templates={templates} 
            onMonthSelect={handleYearlyMonthSelect} 
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Day Status: {MONTHS[selectedMonth]} {editingDate}, {selectedYear}</DialogTitle>
            <DialogDescription>Manage holidays and observances for this date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status / Reason</Label>
              <Input 
                placeholder="e.g. Weekly Holiday, Sick Leave, Public Holiday" 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
              <p className="text-sm text-gray-500">
                Enter a reason to mark this day as an "Off Day" or "Holiday". Clear the text to make it a regular working day.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
             {currentHolidays.find(h => h.date === editingDate) && (
               <Button variant="destructive" onClick={removeHoliday} className="mr-auto">
                 <Trash2 className="w-4 h-4 mr-2" /> Clear Holiday
               </Button>
             )}
             <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button onClick={saveHoliday} className="bg-blue-900 hover:bg-blue-800">Set Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
