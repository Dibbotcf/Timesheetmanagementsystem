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
                    <div className="flex justify-center items-center">
                        <img src="/screenshots/manual_login.png" alt="Login Screen" className="rounded-xl shadow-lg border max-w-sm w-full" />
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 2: Dashboard */}
            <section id="dashboard" className="scroll-mt-20">
                <SectionHeader number="2" title="Dashboard Overview" icon={LayoutDashboard} color="bg-purple-100 text-purple-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <img src="/screenshots/manual_dashboard.png" alt="Dashboard" className="rounded-xl shadow-lg border w-full object-cover object-left-top" />
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
                    <img src="/screenshots/manual_employees.png" alt="Employee Management" className="rounded-xl shadow-lg border w-full object-cover object-left-top" />
                </div>
            </section>

            <hr />

            {/* Section 4: Templates */}
            <section id="templates" className="scroll-mt-20">
                <SectionHeader number="4" title="Monthly Templates & Holidays" icon={File} color="bg-indigo-100 text-indigo-700" />
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                    <img src="/screenshots/manual_templates.png" alt="Month Templates" className="rounded-xl shadow-lg border w-full object-cover object-left-top" />
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
                        <img src="/screenshots/manual_timesheets.png" alt="Timesheets Grid" className="rounded-xl shadow-lg border w-full object-cover object-left-top" />
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
                    <img src="/screenshots/manual_leaves.png" alt="Leave Management" className="rounded-xl shadow-lg border w-full object-cover object-left-top" />
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

/* --- Subcomponents for Styling --- */

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
