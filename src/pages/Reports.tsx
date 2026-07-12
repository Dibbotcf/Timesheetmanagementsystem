import React, { useState, useRef } from 'react';
import { useAppStore, Employee, LeaveRecord } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowLeft, Download, Smartphone, Calendar, Clock, ClipboardList, HelpCircle, Timer, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SummaryReportView } from './OTManagement';
import { EmployeeRecordsReport } from './EmployeeRecordsReport';
import { LateDelayReport } from './LateDelayReport';
import { ZKTAttendanceReport } from './ZKTAttendanceReport';

export const Reports: React.FC = () => {
  const { employees, leaves, otRecords } = useAppStore();
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | ''>(new Date().getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Dynamic years list from 2024 to 2030
  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

  // Filter and sort active employees by their EID serial naturally
  const activeEmployees = employees
    .filter(e => e.status === 'Active')
    .sort((a, b) => a.eid.localeCompare(b.eid, undefined, { numeric: true, sensitivity: 'base' }));

  // Safe helper to count leave days for a specific employee in the selected month
  const getApprovedLeaveDaysForMonth = (employeeId: string, year: number, month: number) => {
    let total = 0;
    const approvedLeaves = leaves.filter(l => l.employeeId === employeeId && l.status === 'Approved');

    for (const leave of approvedLeaves) {
      // Exclude partial or hourly leaves (where partialHours is set/greater than 0 or days is 0)
      if (leave.partialHours && leave.partialHours > 0) continue;
      if (leave.days === 0) continue;

      const startParts = leave.startDate.split('-');
      const endParts = leave.endDate.split('-');
      if (startParts.length < 3 || endParts.length < 3) continue;

      const sYear = parseInt(startParts[0], 10);
      const sMonth = parseInt(startParts[1], 10);
      const sDay = parseInt(startParts[2], 10);

      const eYear = parseInt(endParts[0], 10);
      const eMonth = parseInt(endParts[1], 10);
      const eDay = parseInt(endParts[2], 10);

      // Handle half-day leaves specifically
      if (leave.days === 0.5) {
        if (sYear === year && sMonth === month) {
          total += 0.5;
        }
        continue;
      }

      // Handle full or multi-day leaves day-by-day to cleanly count days in target month
      const startDateObj = new Date(sYear, sMonth - 1, sDay);
      const endDateObj = new Date(eYear, eMonth - 1, eDay);

      let current = new Date(startDateObj);
      while (current <= endDateObj) {
        const curYear = current.getFullYear();
        const curMonth = current.getMonth() + 1; // 1-indexed
        if (curYear === year && curMonth === month) {
          total += 1.0;
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return total;
  };

  // Days in month calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Get short month name representation like May '2026
  const getMonthYearString = (year: number, monthVal: number) => {
    const dateObj = new Date(year, monthVal - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const shortYear = year.toString().slice(-2);
    return `For the month of ${monthName} '${shortYear}`;
  };

  // Deduction calculation logic based on rules
  const getDeduction = (leaveDays: number) => {
    if (leaveDays <= 1) return 0;
    return leaveDays * 30;
  };

  // Download PDF Action
  const handleDownloadPDF = async () => {
    if (!reportRef.current || !selectedMonth || !selectedYear) return;
    setIsDownloading(true);
    toast.info('Generating PDF, please wait...');
    try {
      const element = reportRef.current;

      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const marginX = 0;
      const marginY = 0;
      const availW = pageW - marginX * 2;
      const availH = pageH - marginY * 2;
      const ratio = Math.min(availW / img.width, availH / img.height);
      const finalW = img.width * ratio;
      const finalH = img.height * ratio;
      const offsetX = marginX + (availW - finalW) / 2;
      const offsetY = marginY + (availH - finalH) / 2;

      pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, finalW, finalH);

      const monthLabel = months.find(m => m.value === selectedMonth)?.label || 'Report';
      const filename = `Mobile_Allowance_Report_${monthLabel}_${selectedYear}.pdf`;
      pdf.save(filename);
      toast.success('PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error(`Failed to generate PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Data processing for the table
  const reportRows = selectedMonth && selectedYear ? activeEmployees.map((emp, index) => {
    const leaveDays = getApprovedLeaveDaysForMonth(emp.id, selectedYear, selectedMonth);
    const allowance = 1000;
    const deduction = getDeduction(leaveDays);
    const payable = allowance - deduction;

    return {
      sl: index + 1,
      name: emp.name,
      leaveDays,
      allowance,
      deduction,
      payable
    };
  }) : [];

  const totals = reportRows.reduce(
    (acc, curr) => {
      acc.leaveDays += curr.leaveDays;
      acc.allowance += curr.allowance;
      acc.deduction += curr.deduction;
      acc.payable += curr.payable;
      return acc;
    },
    { leaveDays: 0, allowance: 0, deduction: 0, payable: 0 }
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {activeReport === null ? (
        // Reports Grid View
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-500 mt-1">Select a report from the cards below to generate, print, and export data.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Mobile Allowance Report */}
            <Card 
              className="hover:shadow-lg transition-all duration-300 border border-gray-200 cursor-pointer group hover:border-blue-300"
              onClick={() => setActiveReport('mobile_allowance')}
            >
              <CardHeader className="flex flex-row items-center space-y-0 gap-4 pb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold group-hover:text-blue-900">Mobile Allowance Report</CardTitle>
                  <CardDescription className="text-xs mt-1">Fixed allowance & leave deductions</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Generate monthly allowance report for employees, accounting for leave-based deductions. Supports exporting to 1-page PDF.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" className="text-blue-700 hover:text-blue-900 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                    Generate Report &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Late & Delay Report */}
            <Card
              className="hover:shadow-lg transition-all duration-300 border border-gray-200 cursor-pointer group hover:border-violet-300"
              onClick={() => setActiveReport('late_report')}
            >
              <CardHeader className="flex flex-row items-center space-y-0 gap-4 pb-4">
                <div className="p-3 rounded-lg bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Timer className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold group-hover:text-violet-900">Late &amp; Delay Report</CardTitle>
                  <CardDescription className="text-xs mt-1">Late days, minutes &amp; leave breakdown</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Monthly late arrival summary per employee — late days, total delay minutes, late dates, and leave type breakdown.
                </p>
                <div className="mt-4 flex justify-end items-center">
                  <Button variant="ghost" className="text-violet-700 hover:text-violet-900 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                    Generate Report &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Overtime Report */}
            <Card 
              className="hover:shadow-lg transition-all duration-300 border border-gray-200 cursor-pointer group hover:border-blue-300"
              onClick={() => setActiveReport('overtime_summary')}
            >
              <CardHeader className="flex flex-row items-center space-y-0 gap-4 pb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold group-hover:text-blue-900">Overtime Report</CardTitle>
                  <CardDescription className="text-xs mt-1">Extra hours summary</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Track overtime hours compiled per employee for payroll compensation audits.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" className="text-blue-700 hover:text-blue-900 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                    Generate Report &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Employee Records Report */}
            <Card
              className="hover:shadow-lg transition-all duration-300 border border-gray-200 cursor-pointer group hover:border-blue-300"
              onClick={() => setActiveReport('employee_records')}
            >
              <CardHeader className="flex flex-row items-center space-y-0 gap-4 pb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold group-hover:text-blue-900">Employee Records</CardTitle>
                  <CardDescription className="text-xs mt-1">Monthly & Yearly Stats</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  View comprehensive monthly and yearly records for every employee including OT, Leaves, and Late arrivals.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" className="text-blue-700 hover:text-blue-900 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                    Generate Report &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: ZKT Attendance Report */}
            <Card
              className="hover:shadow-lg transition-all duration-300 border border-gray-200 cursor-pointer group hover:border-emerald-300"
              onClick={() => setActiveReport('zkt_attendance')}
            >
              <CardHeader className="flex flex-row items-center space-y-0 gap-4 pb-4">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold group-hover:text-emerald-900">ZKT Attendance Report</CardTitle>
                  <CardDescription className="text-xs mt-1">Live biometric device logs</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Pull attendance records directly from the ZKTeco biometric machine. View fingerprint, card, and face logs with date filters.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                    View Report &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeReport === 'zkt_attendance' ? (
        <ZKTAttendanceReport onBack={() => setActiveReport(null)} />
      ) : activeReport === 'late_report' ? (
        <LateDelayReport onBack={() => setActiveReport(null)} />
      ) : activeReport === 'mobile_allowance' ? (
        // Mobile Allowance Report Detail View
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  setActiveReport(null);
                  setSelectedMonth('');
                  setSelectedYear('');
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mobile Allowance Report</h1>
                <p className="text-xs text-gray-500">Tokyo Consulting Firm Limited</p>
              </div>
            </div>

            {/* Month Year Selectors */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-700">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40 shadow-sm transition-shadow hover:shadow"
                >
                  <option value="">Select Month</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-700">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32 shadow-sm transition-shadow hover:shadow"
                >
                  <option value="">Select Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* PDF Download Button */}
              {selectedMonth && selectedYear && (
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={isDownloading}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm flex items-center gap-2"
                >
                  <Download className="h-4 w-4" /> {isDownloading ? 'Downloading...' : 'Download PDF'}
                </Button>
              )}
            </div>
          </div>

          {/* Report Container */}
          {!selectedMonth || !selectedYear ? (
            <Card className="border border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
              <CardContent className="flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">No Report Generated</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Please select a Month and Year in the toolbar above to generate the Mobile Allowance Report.
                </p>
              </CardContent>
            </Card>
          ) : (
            // Printable Report Section
            <div className="w-full overflow-x-auto bg-gray-100 p-8 rounded-xl border">
              {/* Force white background, fixed width A4 proportion for clean PDF renders */}
              <div className="mx-auto shadow-lg bg-white" style={{ width: '1000px' }}>
                <div 
                  ref={reportRef} 
                  className="bg-white text-black box-border"
                  style={{ width: '1000px', minHeight: '1414px', fontFamily: '"Times New Roman", Times, serif', padding: '100px 120px' }}
                >
                {/* Header */}
                <div className="text-center space-y-1 mb-8">
                  <h2 className="text-2xl font-bold tracking-normal text-black" style={{ fontFamily: 'Georgia, serif' }}>
                    Tokyo Consulting Firm Limited
                  </h2>
                  <h3 className="text-lg font-bold text-black tracking-normal">
                    Mobile Allowance
                  </h3>
                  <h4 className="text-md font-bold text-black italic">
                    {getMonthYearString(selectedYear, selectedMonth)}
                  </h4>
                </div>

                {/* Main Table */}
                <table className="w-full border-collapse border border-black text-sm mb-6">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-black px-2 py-2 text-center font-bold text-black w-[50px]">
                        SL. No.
                      </th>
                      <th className="border border-black px-3 py-2 text-left font-bold text-black">
                        Name of Employee
                      </th>
                      <th className="border border-black px-2 py-2 text-center font-bold text-black w-[90px]">
                        Leave Day(s)
                      </th>
                      <th className="border border-black px-2 py-2 text-right font-bold text-black w-[120px]">
                        Mobile Allowance
                      </th>
                      <th className="border border-black px-2 py-2 text-right font-bold text-black w-[100px]">
                        Deduction
                      </th>
                      <th className="border border-black px-2 py-2 text-right font-bold text-black w-[140px]">
                        Payable Amount in BDT.
                      </th>
                      <th className="border border-black px-3 py-2 text-center font-bold text-black w-[160px]">
                        Recipients Signature
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row) => (
                      <tr key={row.sl} className="hover:bg-gray-50/50">
                        <td className="border border-black px-2 py-2 text-center text-black">
                          {row.sl}
                        </td>
                        <td className="border border-black px-3 py-2 text-left font-medium text-black">
                          {row.name}
                        </td>
                        <td className="border border-black px-2 py-2 text-center text-black">
                          {row.leaveDays === 0 ? '' : row.leaveDays}
                        </td>
                        <td className="border border-black px-2 py-2 text-right text-black">
                          {row.allowance.toLocaleString()}
                        </td>
                        <td className="border border-black px-2 py-2 text-right text-black">
                          {row.deduction === 0 ? '-' : row.deduction.toLocaleString()}
                        </td>
                        <td className="border border-black px-2 py-2 text-right text-black">
                          {row.payable.toLocaleString()}
                        </td>
                        <td className="border border-black px-3 py-2 text-center text-black">
                          {/* Blank for physical signature */}
                        </td>
                      </tr>
                    ))}
                    {/* Grand Total Row */}
                    <tr className="bg-gray-50 font-bold">
                      <td className="border border-black px-2 py-2 text-center text-black" colSpan={2}>
                        Total
                      </td>
                      <td className="border border-black px-2 py-2 text-center text-black">
                        {totals.leaveDays === 0 ? '' : totals.leaveDays}
                      </td>
                      <td className="border border-black px-2 py-2 text-right text-black">
                        {totals.allowance.toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-2 text-right text-black">
                        {totals.deduction === 0 ? '-' : totals.deduction.toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-2 text-right text-black">
                        {totals.payable.toLocaleString()}
                      </td>
                      <td className="border border-black px-3 py-2 text-center text-black">
                        {/* Blank */}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer and rules block */}
                <div className="flex justify-between items-start mt-8 pb-8">
                  {/* Left Column: Number of Days & Deduction Factor */}
                  <div className="flex flex-col gap-6 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-black">
                        *Number of Day of this month
                      </span>
                      <div className="border border-black bg-yellow-300 font-bold text-black w-16 h-8 flex items-center justify-center text-sm">
                        {getDaysInMonth(selectedYear as number, selectedMonth as number)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Deduction Table Lookup */}
                  <div className="mr-4">
                    <table className="border-collapse border border-black text-sm w-64 shadow-sm">
                      <thead>
                        <tr>
                          <th className="border border-black px-3 py-2 text-center font-bold bg-gray-50 text-black">
                            Leave Days
                          </th>
                          <th className="border border-black px-3 py-2 text-center font-bold bg-gray-50 text-black">
                            Deduction Amounts (BDT)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-3 py-1.5 text-center text-black font-medium">1 Day</td>
                          <td className="border border-black px-3 py-1.5 text-center text-black">0</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-3 py-1.5 text-center text-black font-medium">1.5 Days</td>
                          <td className="border border-black px-3 py-1.5 text-center text-black">45</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-3 py-1.5 text-center text-black font-medium">2 Days</td>
                          <td className="border border-black px-3 py-1.5 text-center text-black">60</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-3 py-1.5 text-center text-black font-medium">3 Days</td>
                          <td className="border border-black px-3 py-1.5 text-center text-black">90</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-3 py-1.5 text-center text-black font-medium">5 Days</td>
                          <td className="border border-black px-3 py-1.5 text-center text-black">150</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="mt-20 flex justify-between text-sm font-bold text-black px-2">
                  <div className="text-center w-40">
                    <div className="border-t border-black mb-2 w-full"></div>
                    Prepared by
                  </div>
                  <div className="text-center w-40">
                    <div className="border-t border-black mb-2 w-full"></div>
                    Checked by
                  </div>
                  <div className="text-center w-40">
                    <div className="border-t border-black mb-2 w-full"></div>
                    Approved by
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      ) : activeReport === 'overtime_summary' ? (
        <SummaryReportView employees={employees} otRecords={otRecords} onBack={() => setActiveReport(null)} />
      ) : activeReport === 'employee_records' ? (
        <EmployeeRecordsReport onBack={() => setActiveReport(null)} />
      ) : null}
    </div>
  );
};
