import React from 'react';
import { Button } from '../components/ui/button';
import { ArrowLeft, ShieldCheck, LayoutDashboard, FileInput, Users, File, Calendar, Database, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export const SystemManual: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-16 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="space-y-6 pt-6">
                <Button
                    variant="ghost"
                    className="pl-0 hover:pl-2 transition-all gap-2 text-muted-foreground"
                    onClick={() => navigate('/settings')}
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Settings
                </Button>
                <div className="border-b pb-6">
                    <h1 className="text-4xl font-bold text-blue-950">System Operating Manual</h1>
                    <p className="text-xl text-muted-foreground mt-4 leading-relaxed max-w-3xl">
                        Detailed documentation for the TCF Timesheet Management System.
                        This guide covers all features available to Staff and HR Admin users.
                    </p>
                </div>
            </div>

            {/* Navigation Index */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { title: "1. Getting Started", icon: ShieldCheck, color: "text-blue-600", href: "#start" },
                    { title: "2. Dashboard", icon: LayoutDashboard, color: "text-purple-600", href: "#dashboard" },
                    { title: "3. Employees", icon: Users, color: "text-orange-600", href: "#employees" },
                    { title: "4. Templates", icon: File, color: "text-indigo-600", href: "#templates" },
                    { title: "5. Timesheets", icon: FileInput, color: "text-green-600", href: "#timesheets" },
                    { title: "6. Leave Mgmt", icon: Calendar, color: "text-pink-600", href: "#leaves" },
                    { title: "7. Overtime", icon: Clock, color: "text-red-600", href: "#overtime" },
                    { title: "8. Backups", icon: Database, color: "text-gray-600", href: "#backups" },
                ].map((item, i) => (
                    <a key={i} href={item.href} className="block group">
                        <Card className="h-full hover:shadow-md transition-all cursor-pointer border-l-4 hover:bg-slate-50" style={{ borderLeftColor: 'currentColor' }}>
                            <CardContent className="p-4 flex items-center gap-3">
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                                <span className="font-semibold text-sm">{item.title}</span>
                            </CardContent>
                        </Card>
                    </a>
                ))}
            </div>

            {/* Section 1: Getting Started */}
            <section id="start" className="scroll-mt-20">
                <SectionHeader number="1" title="Getting Started & Login" icon={ShieldCheck} color="bg-blue-100 text-blue-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <div className="space-y-4 text-gray-600">
                        <p>The system is accessible via web browser. Users must authenticate to access their dashboard.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Access URL:</strong> Navigate to the provided application URL.</li>
                            <li><strong>Credentials:</strong> Use the email/password provided by HR.</li>
                            <li><strong>Role Detection:</strong> The system automatically loads the correct interface based on your role (Admin/HR or Staff).</li>
                            <li><strong>Session Security:</strong> Sessions persist for 24 hours. Always use the Logout button when on a shared computer.</li>
                        </ul>
                    </div>
                    <MockupLogin />
                </div>
            </section>

            <hr />

            {/* Section 2: Dashboard */}
            <section id="dashboard" className="scroll-mt-20">
                <SectionHeader number="2" title="Dashboard Overview" icon={LayoutDashboard} color="bg-purple-100 text-purple-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <MockupDashboard />
                    <div className="space-y-4 text-gray-600">
                        <p>The Dashboard acts as the central hub for all activities.</p>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                <h4 className="font-semibold text-purple-900">Stats Cards</h4>
                                <p className="text-sm">Real-time counters for Employees, Pending Leaves, and Active Timesheets.</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                <h4 className="font-semibold text-purple-900">Action Center</h4>
                                <p className="text-sm">Use "Quick Actions" for common tasks like submitting a leave request or checking your profile.</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                <h4 className="font-semibold text-purple-900">Recent Activity</h4>
                                <p className="text-sm">A chronological log of system events (e.g., "John Doe submitted a timesheet").</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 3: Employee Management */}
            <section id="employees" className="scroll-mt-20">
                <SectionHeader number="3" title="Employee Management (HR Only)" icon={Users} color="bg-orange-100 text-orange-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <div className="space-y-4 text-gray-600">
                        <p>HR Admins can manage the entire workforce database.</p>
                        <ol className="list-decimal pl-5 space-y-3">
                            <li><strong>Add Employee:</strong> Click the "+ Add Employee" button. Fill in:
                                <ul className="list-disc pl-5 text-sm mt-1 text-gray-500">
                                    <li>Full Name & EID (Employee ID)</li>
                                    <li>Designation & Role (Admin vs Staff)</li>
                                    <li>Joining Date & DOB</li>
                                    <li>Leave Quotas (Casual, Sick, Annual)</li>
                                </ul>
                            </li>
                            <li><strong>Edit Details:</strong> Update leave balances or change designations as employees get promoted.</li>
                            <li><strong>Status:</strong> Deactivate employees who have left the company to preserve their historical data without allowing login access.</li>
                        </ol>
                    </div>
                    <MockupEmployeeTable />
                </div>
            </section>

            <hr />

            {/* Section 4: Templates */}
            <section id="templates" className="scroll-mt-20">
                <SectionHeader number="4" title="Monthly Templates & Holidays" icon={File} color="bg-indigo-100 text-indigo-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <MockupCalendar />
                    <div className="space-y-4 text-gray-600">
                        <p className="font-medium text-indigo-900">Critical Step for Timesheet Accuracy</p>
                        <p>Before any employee can create a timesheet for a new month, an Admin must set up the <strong>Month Template</strong>.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Select Month:</strong> Choose the Year and Month to configure.</li>
                            <li><strong>Mark Holidays:</strong> Click on calendar dates to toggle them as Holidays or Weekends.</li>
                            <li><strong>Set Reason:</strong> Assign names to holidays (e.g., "National Day").</li>
                            <li><strong>Save Template:</strong> Once saved, all timesheets created for this month will automatically inherit these non-working days.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 5: Timesheets */}
            <section id="timesheets" className="scroll-mt-20">
                <SectionHeader number="5" title="Timesheet Creation & Printing" icon={FileInput} color="bg-green-100 text-green-700" />
                <div className="space-y-8 mt-6">
                    {/* Creation Phase */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="space-y-4 text-gray-600">
                            <h3 className="text-lg font-bold text-green-800">A. Creating & Editing</h3>
                            <p>Employees generate their own timesheets monthly.</p>
                            <ol className="list-decimal pl-5 space-y-2">
                                <li>Go to <strong>Create Timesheet</strong>.</li>
                                <li>Select the Month. The grid will load with dates.</li>
                                <li><strong>Enter Time:</strong> Input 'In' and 'Out' times (e.g., 09:00, 18:00).</li>
                                <li><strong>Auto-Calculation:</strong> The system calculates total hours.</li>
                                <li><strong>Remarks:</strong> Add notes for any discrepancies or leave days.</li>
                                <li><strong>Signatures:</strong> Admins can attach digital signatures for "Checked By" and "Approved By".</li>
                            </ol>
                        </div>
                        <MockupTimesheetGrid />
                    </div>

                    {/* Printing Phase */}
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <h3 className="text-lg font-bold text-green-800 mb-2">B. Finalizing & Printing (Tokyo Consulting Firm Layout)</h3>
                        <p className="text-gray-700 mb-4">
                            The system features a specialized "Print Mode" that renders the timesheet in a pixel-perfect A4 format compliant with version 112 standards.
                        </p>
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 text-sm space-y-2">
                                <p><strong>1. View Mode:</strong> Click the "Eye" icon on a timesheet.</p>
                                <p><strong>2. Print Button:</strong> Click the generic "Print" button at the top.</p>
                                <p><strong>3. Layout Engine:</strong> The system reformats the data, ensuring summary rows (18px/20px heights) fit perfectly on one page.</p>
                                <p><strong>4. PDF Output:</strong> The browser's print dialog opens. Select "Save as PDF".</p>
                            </div>
                            <div className="w-full md:w-1/2 bg-white p-4 shadow-sm border text-xs font-mono">
                                <div className="border-b pb-2 mb-2 font-bold text-center">TCF TIMESHEET</div>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    <div className="col-span-2">Name: John Doe</div>
                                    <div className="col-span-2 text-right">Month: October</div>
                                </div>
                                <div className="border h-20 flex items-center justify-center text-gray-400 bg-gray-50">
                                    [Standardized Grid Layout Preview]
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 6: Leave Management */}
            <section id="leaves" className="scroll-mt-20">
                <SectionHeader number="6" title="Leave Management" icon={Calendar} color="bg-pink-100 text-pink-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <MockupLeaveCard />
                    <div className="space-y-4 text-gray-600">
                        <div className="space-y-3">
                            <h4 className="font-bold text-pink-900">For Staff:</h4>
                            <p className="text-sm">Go to "My Leaves" to submit a request. Select dates, type (Sick/Casual), and reason. Pending requests appear on your dashboard.</p>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-bold text-pink-900">For HR/Admin:</h4>
                            <p className="text-sm">Navigate to "Leaves". You will see a list of pending requests.</p>
                            <ul className="list-disc pl-5 text-sm">
                                <li><strong>Approve/Reject:</strong> Actions trigger email notifications (simulated).</li>
                                <li><strong>Folders:</strong> Organize leave records into folders for archiving.</li>
                                <li><strong>Saved Reports:</strong> Generate and save monthly leave summaries for payroll.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 7: Overtime */}
            <section id="overtime" className="scroll-mt-20">
                <SectionHeader number="7" title="Overtime (OT) Tracking" icon={Clock} color="bg-red-100 text-red-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <div className="space-y-4 text-gray-600">
                        <p>Managing extra hours requires a strict approval process.</p>
                        <ul className="space-y-3">
                            <li className="flex gap-3 items-start">
                                <CheckCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <span><strong>Submission:</strong> Employees log OT hours in their timesheet or via the separate OT Request form.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <CheckCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <span><strong>Verification:</strong> Managers review the "Reason" and "Hours".</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <CheckCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <span><strong>Integration:</strong> Approved OT is automatically summed in the monthly Timesheet Summary row for payroll calculation.</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                            <span className="font-bold text-sm">OT Requests</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Pending: 2</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                <div>
                                    <div className="font-medium">J. Smith</div>
                                    <div className="text-xs text-gray-500">Oct 12 • 2.5 hrs</div>
                                </div>
                                <div className="flex gap-1">
                                    <div className="h-6 w-6 bg-green-100 text-green-600 rounded flex items-center justify-center text-xs">✓</div>
                                    <div className="h-6 w-6 bg-red-100 text-red-600 rounded flex items-center justify-center text-xs">✗</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 8: Backups */}
            <section id="backups" className="scroll-mt-20">
                <SectionHeader number="8" title="Data Backups" icon={Database} color="bg-gray-100 text-gray-700" />
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="font-bold text-gray-900 mb-2">System Safety</h3>
                    <p className="text-gray-600 mb-4">
                        The "Backups" page allows Administrators to download a full JSON dump of the MySQL database.
                        This includes Employees, Timesheets, Leaves, and Settings.
                    </p>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="gap-2 pointer-events-none">
                            <Database className="h-4 w-4" /> Download Full Backup
                        </Button>
                        <span className="text-sm text-gray-500 italic">Recommended weekly.</span>
                    </div>
                </div>
            </section>

        </div>
    );
};

/* --- Subcomponents for Styling & Mockups --- */

const SectionHeader: React.FC<{ number: string; title: string; icon: any; color: string }> = ({ number, title, icon: Icon, color }) => (
    <div className="flex items-center gap-4">
        <div className={`h-12 w-12 ${color} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
            <span className="text-gray-400 mr-2">#{number}</span>{title}
        </h2>
    </div>
);

// 1. Login Mockup
const MockupLogin = () => (
    <div className="bg-white p-6 rounded-lg shadow-lg border max-w-sm mx-auto w-full">
        <div className="text-center mb-6">
            <div className="h-8 w-8 bg-blue-600 rounded-full mx-auto mb-2"></div>
            <div className="font-bold text-gray-800">Sign In</div>
        </div>
        <div className="space-y-3">
            <div className="h-9 bg-gray-100 rounded border w-full flex items-center px-3 text-xs text-gray-400">email@company.com</div>
            <div className="h-9 bg-gray-100 rounded border w-full flex items-center px-3 text-xs text-gray-400">••••••••</div>
            <div className="h-9 bg-blue-600 rounded w-full flex items-center justify-center text-white text-xs font-bold">Login</div>
        </div>
    </div>
);

// 2. Dashboard Mockup
const MockupDashboard = () => (
    <div className="bg-slate-100 p-4 rounded-lg border shadow-inner">
        <div className="flex gap-4 mb-4">
            <div className="w-16 h-full bg-white rounded-lg border shadow-sm flex flex-col items-center py-2 gap-2">
                <div className="h-4 w-4 bg-blue-200 rounded"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </div>
            <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                    <div className="flex-1 bg-white h-20 rounded-lg border p-3 shadow-sm">
                        <div className="h-2 w-12 bg-blue-100 rounded mb-2"></div>
                        <div className="h-6 w-8 bg-gray-800 rounded"></div>
                    </div>
                    <div className="flex-1 bg-white h-20 rounded-lg border p-3 shadow-sm">
                        <div className="h-2 w-12 bg-purple-100 rounded mb-2"></div>
                        <div className="h-6 w-8 bg-gray-800 rounded"></div>
                    </div>
                </div>
                <div className="bg-white h-24 rounded-lg border p-3 shadow-sm">
                    <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="space-y-2">
                        <div className="h-2 w-full bg-gray-50 rounded"></div>
                        <div className="h-2 w-3/4 bg-gray-50 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
        <div className="text-center text-xs text-gray-400 font-mono mt-2">System Dashboard Preview</div>
    </div>
);

// 3. Employee Table Mockup
const MockupEmployeeTable = () => (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
            <div className="text-xs font-bold text-gray-600">Employees</div>
            <div className="h-5 w-16 bg-blue-600 rounded text-[10px] text-white flex items-center justify-center">Add New</div>
        </div>
        <table className="w-full text-xs text-left">
            <thead>
                <tr className="border-b bg-gray-50/50">
                    <th className="p-2 font-medium text-gray-500">Name</th>
                    <th className="p-2 font-medium text-gray-500">Role</th>
                    <th className="p-2 font-medium text-gray-500">Status</th>
                </tr>
            </thead>
            <tbody className="text-gray-600">
                <tr className="border-b">
                    <td className="p-2">John Doe</td>
                    <td className="p-2">Admin</td>
                    <td className="p-2 text-green-600">Active</td>
                </tr>
                <tr className="border-b">
                    <td className="p-2">Jane Smith</td>
                    <td className="p-2">Staff</td>
                    <td className="p-2 text-green-600">Active</td>
                </tr>
                <tr>
                    <td className="p-2">Bob Wilson</td>
                    <td className="p-2">Staff</td>
                    <td className="p-2 text-red-500">Inactive</td>
                </tr>
            </tbody>
        </table>
    </div>
);

// 4. Calendar Mockup
const MockupCalendar = () => (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex justify-between mb-3">
            <div className="text-sm font-bold">October 2023</div>
            <div className="text-xs text-gray-400">Template Setup</div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[10px] text-gray-400 font-bold">{d}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }).map((_, i) => {
                const isWeekend = (i + 1) % 7 === 0 || (i + 1) % 7 === 1;
                const isHoliday = i === 14; // Mock holiday
                return (
                    <div key={i} className={`h-6 rounded-sm flex items-center justify-center text-[10px] 
                        ${isHoliday ? 'bg-red-100 text-red-700 font-bold' : isWeekend ? 'bg-gray-100 text-gray-500' : 'bg-white border text-gray-700'}`}>
                        {i + 1}
                    </div>
                )
            })}
        </div>
        <div className="mt-3 flex gap-3 text-[10px] text-gray-500">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-100 rounded-full"></div>Weekend</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-100 rounded-full"></div>Holiday</div>
        </div>
    </div>
);

// 5. Timesheet Grid Mockup
const MockupTimesheetGrid = () => (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm text-xs">
        <div className="bg-gray-800 text-white p-2 flex justify-between">
            <span>Edit Timesheet</span>
            <span>Oct 2023</span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-gray-200 p-px">
            <div className="bg-gray-100 p-1 font-bold">Date</div>
            <div className="bg-gray-100 p-1 font-bold">In</div>
            <div className="bg-gray-100 p-1 font-bold">Out</div>
            <div className="bg-gray-100 p-1 font-bold">Check</div>

            {/* Row 1 */}
            <div className="bg-white p-1">01 (Sun)</div>
            <div className="bg-gray-50 p-1 text-gray-400">-</div>
            <div className="bg-gray-50 p-1 text-gray-400">-</div>
            <div className="bg-white p-1 text-center">WK</div>

            {/* Row 2 */}
            <div className="bg-white p-1">02 (Mon)</div>
            <div className="bg-blue-50 p-1 text-blue-800">09:00</div>
            <div className="bg-blue-50 p-1 text-blue-800">18:00</div>
            <div className="bg-white p-1 text-center">✓</div>

            {/* Row 3 */}
            <div className="bg-white p-1">03 (Tue)</div>
            <div className="bg-blue-50 p-1 text-blue-800">09:15</div>
            <div className="bg-blue-50 p-1 text-blue-800">18:30</div>
            <div className="bg-white p-1 text-center">✓</div>
        </div>
    </div>
);

// 6. Leave Card Mockup
const MockupLeaveCard = () => (
    <div className="border rounded-lg bg-white p-4 shadow-sm max-w-sm">
        <div className="flex justify-between items-start mb-3">
            <div>
                <div className="text-sm font-bold">Sick Leave</div>
                <div className="text-xs text-gray-500">Nov 12 - Nov 13</div>
            </div>
            <div className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-full font-bold">Pending</div>
        </div>
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3">
            "Feeling unwell, visiting doctor."
        </div>
        <div className="flex gap-2">
            <div className="h-6 flex-1 bg-green-600 rounded flex items-center justify-center text-white text-xs font-medium opacity-50">Approve</div>
            <div className="h-6 flex-1 bg-red-100 text-red-600 rounded flex items-center justify-center text-xs font-medium opacity-50">Reject</div>
        </div>
    </div>
);
