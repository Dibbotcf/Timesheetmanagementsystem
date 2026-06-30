import React from 'react';
import { Button } from '../components/ui/button';
import { ArrowLeft, Server, Database, Terminal, FileCode, HardDrive, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { getAuthHeaders, API_BASE_URL } from '../utils/api';
import { toast } from 'sonner';

export const InstallationGuide: React.FC = () => {
    const navigate = useNavigate();

    const handleDownload = async (endpoint: string, filename: string) => {
        try {
            const token = localStorage.getItem('tcf_token');
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success(`Downloaded ${filename}`);
        } catch (error) {
            console.error(error);
            toast.error("Download failed. Server might be offline.");
        }
    };

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
                    <h1 className="text-4xl font-bold text-purple-900">System Deployment Workflow</h1>
                    <p className="text-xl text-muted-foreground mt-4 leading-relaxed max-w-3xl">
                        This guide outlines the actual automated deployment process for the Timesheet Management System. The system uses a React frontend and a lightweight PHP/MySQL API backend, deployed simultaneously via an automated FTP Node script.
                    </p>
                </div>
            </div>

            {/* Navigation Index */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { title: "1. Database Config", icon: Database, color: "text-green-600", href: "#db" },
                    { title: "2. Script Setup", icon: FileCode, color: "text-purple-600", href: "#script" },
                    { title: "3. Automated Build", icon: Terminal, color: "text-gray-800", href: "#build" },
                    { title: "4. Verification", icon: Server, color: "text-blue-600", href: "#verify" },
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

            {/* Section 1: Database Setup */}
            <section id="db" className="scroll-mt-20">
                <SectionHeader number="1" title="MySQL Database Setup" icon={Database} color="bg-green-100 text-green-700" />
                <div className="mt-8 space-y-6 text-gray-600">
                    <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                        <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <Download className="h-4 w-4" /> Optional: Download Legacy SQL Data
                        </h3>
                        <Button
                            onClick={() => handleDownload('/download/schema', 'timesheet_schema.sql')}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Download Database Schema (.sql)
                        </Button>
                    </div>

                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Log in to your hosting cPanel and open <strong>MySQL® Databases</strong>.</li>
                        <li>Create a new database (e.g., <code>tcfbdcom_hrm</code>).</li>
                        <li>Create a new database user and assign it full privileges to the newly created database.</li>
                        <li>Keep your database name, user, and password handy for the deployment script.</li>
                    </ol>
                </div>
            </section>

            <hr />

            {/* Section 2: Script Configuration */}
            <section id="script" className="scroll-mt-20">
                <SectionHeader number="2" title="Configure Deployment Script" icon={FileCode} color="bg-purple-100 text-purple-700" />
                <div className="mt-8 space-y-4 text-gray-600">
                    <p>The entire deployment process is controlled by the <code>deploy_now.js</code> file located in the root of the local project directory. Before deploying, you must configure the environment variables within this script.</p>

                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Open <code>deploy_now.js</code> in your code editor.</li>
                        <li>Locate the <code>envContent</code> string generator around line 23.</li>
                        <li>Update the configuration to match your live cPanel database and API path:</li>
                    </ol>
                    <div className="bg-slate-900 text-purple-300 p-4 rounded-lg shadow-lg border border-slate-700 font-mono text-sm overflow-x-auto">
                        <pre>{`const envContent = \`VITE_API_URL=https://hrm.tcfbd.com/api
DB_HOST=localhost
DB_USER=tcfbdcom_hrm
DB_PASSWORD=your_db_password
DB_NAME=tcfbdcom_hrm
\`;`}</pre>
                    </div>
                    
                    <ol className="list-decimal pl-5 space-y-3 mt-4" start={4}>
                        <li>Next, locate the FTP configuration block around line 36.</li>
                        <li>Update the FTP credentials to connect to your live cPanel server:</li>
                    </ol>
                    <div className="bg-slate-900 text-purple-300 p-4 rounded-lg shadow-lg border border-slate-700 font-mono text-sm overflow-x-auto">
                        <pre>{`await client.access({
    host: "b216.serverdiana.com",
    user: "tcfbdcom",
    password: "your_ftp_password",
    secure: false
});

// Update the target directory path
await client.ensureDir("hrm.tcfbd.com");`}</pre>
                    </div>
                </div>
            </section>

            <hr />

            {/* Section 3: Automated Build */}
            <section id="build" className="scroll-mt-20">
                <SectionHeader number="3" title="Run Automated Deployment" icon={Terminal} color="bg-gray-100 text-gray-800" />
                <div className="mt-8 space-y-4 text-gray-600">
                    <p>Once configured, the script will handle the build, compilation, and upload completely automatically.</p>

                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Open your local terminal in the project root directory.</li>
                        <li>Ensure dependencies are installed by running: <code>npm install</code></li>
                        <li>Execute the deployment script:
                            <div className="bg-gray-100 p-2 mt-2 rounded font-mono text-sm text-gray-800">node deploy_now.js</div>
                        </li>
                    </ol>

                    <h4 className="font-semibold text-gray-900 mt-6">What the script does:</h4>
                    <ul className="list-disc pl-5 space-y-2 mt-2 text-sm">
                        <li>Runs <code>npm run build</code> to compile the React frontend into static assets.</li>
                        <li>Creates a local <code>deployment</code> folder.</li>
                        <li>Copies the compiled React app (<code>dist</code>) into the deployment folder.</li>
                        <li>Copies the PHP backend code (<code>php_server</code>) into the <code>deployment/api</code> directory.</li>
                        <li>Generates the hidden <code>.env</code> file for PHP database connections.</li>
                        <li>Connects to the specified FTP server.</li>
                        <li><strong className="text-red-600">Clears the remote directory completely</strong> to remove cached chunks.</li>
                        <li>Uploads the entire package to the live server.</li>
                    </ul>
                </div>
            </section>

            <hr />

            {/* Section 4: Verification */}
            <section id="verify" className="scroll-mt-20">
                <SectionHeader number="4" title="Verification & Routing" icon={Server} color="bg-blue-100 text-blue-700" />
                <div className="mt-8 space-y-4 text-gray-600">
                    <p>The upload contains <code>.htaccess</code> files that handle React Router history fallback and API endpoints natively in Apache.</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li><strong>Frontend routing:</strong> Directs all non-file requests to <code>index.html</code> so React Router can process the URL path.</li>
                        <li><strong>Backend API routing:</strong> The <code>api/</code> folder intercepts requests and routes them to <code>api/index.php</code>, injecting the <code>.env</code> credentials into the PHP environment.</li>
                    </ul>
                    <p className="mt-4 font-semibold text-gray-900">To verify the deployment:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                        <li>Perform a Hard Refresh (<code>Ctrl + Shift + R</code>) on the live URL to clear browser caches.</li>
                        <li>Attempt to log in to ensure the database connection is functioning.</li>
                        <li>Ensure the deployment log in the terminal outputs <code>Deployment finished successfully!</code></li>
                    </ol>
                </div>
            </section>

        </div>
    );
};

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
