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
                    <h1 className="text-4xl font-bold text-purple-900">cPanel Deployment Guide</h1>
                    <p className="text-xl text-muted-foreground mt-4 leading-relaxed max-w-3xl">
                        Step-by-step guide to deploying this Timesheet System to a live cPanel server.
                        Download the necessary assets below.
                    </p>
                </div>
            </div>

            {/* Navigation Index */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { title: "1. Database Setup", icon: Database, color: "text-green-600", href: "#db" },
                    { title: "2. Backend Setup", icon: Server, color: "text-purple-600", href: "#backend" },
                    { title: "3. Frontend Build", icon: Terminal, color: "text-gray-800", href: "#build" },
                    { title: "4. cPanel Upload", icon: HardDrive, color: "text-orange-600", href: "#cpanel" },
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
                            <Download className="h-4 w-4" /> Download Assets
                        </h3>
                        <Button
                            onClick={() => handleDownload('/download/schema', 'timesheet_schema.sql')}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Download Database Schema (.sql)
                        </Button>
                    </div>

                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Log in to cPanel and go to <strong>MySQL Database Wizard</strong>.</li>
                        <li>Create a new database (e.g., <code>timesheet_db</code>).</li>
                        <li>Create a user and password.</li>
                        <li>Open <strong>phpMyAdmin</strong>.</li>
                        <li>Select your new database and click <strong>Import</strong>.</li>
                        <li>Upload the <code>timesheet_schema.sql</code> file you just downloaded.</li>
                    </ol>
                </div>
            </section>

            <hr />

            {/* Section 2: Backend Setup */}
            <section id="backend" className="scroll-mt-20">
                <SectionHeader number="2" title="Backend Deployment (Node.js)" icon={Server} color="bg-purple-100 text-purple-700" />
                <div className="mt-8 space-y-6 text-gray-600">
                    <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
                        <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                            <Download className="h-4 w-4" /> Download Source
                        </h3>
                        <Button
                            onClick={() => handleDownload('/download/backend', 'timesheet_backend.zip')}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Download Backend Code (.zip)
                        </Button>
                        <p className="text-xs text-purple-700 mt-2">Contains the 'server' folder ready for upload.</p>
                    </div>

                    <ol className="list-decimal pl-5 space-y-3">
                        <li>In cPanel, go to <strong>Setup Node.js App</strong>.</li>
                        <li>Create a new app:
                            <ul className="list-disc pl-5 mt-1 text-sm text-gray-500">
                                <li>Node Version: 18+</li>
                                <li>App Mode: Production</li>
                                <li>App Root: <code>server</code></li>
                                <li>Startup File: <code>index.js</code></li>
                            </ul>
                        </li>
                        <li>Upload and extract the <code>timesheet_backend.zip</code> to your server root. Ensure files are inside the <code>server</code> folder.</li>
                        <li>Click <strong>Run NPM Install</strong> in the cPanel Node.js interface.</li>
                        <li><strong>Environment Variables:</strong> Click 'Add Variable' in cPanel:
                            <ul className="list-disc pl-5 mt-2 bg-gray-100 p-3 rounded font-mono text-sm">
                                <li>DB_HOST: localhost</li>
                                <li>DB_USER: (your_database_user)</li>
                                <li>DB_PASSWORD: (your_database_password)</li>
                                <li>DB_NAME: (your_database_name)</li>
                                <li>PORT: 3001 (or as assigned by cPanel, usually handled automatically)</li>
                            </ul>
                        </li>
                    </ol>
                </div>
            </section>

            <hr />

            {/* Section 3: Frontend Build */}
            <section id="build" className="scroll-mt-20">
                <SectionHeader number="3" title="Frontend Build" icon={Terminal} color="bg-gray-100 text-gray-800" />
                <div className="mt-8 space-y-4 text-gray-600">
                    <p>The frontend must be built on your local machine before uploading.</p>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-800">
                        <strong>Note:</strong> You cannot download the build from here because it requires compilation.
                    </div>

                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Open the project in your local code editor (VS Code).</li>
                        <li>Rename <code>.env.example</code> to <code>.env</code> and set:
                            <div className="bg-gray-100 p-2 mt-1 rounded font-mono text-xs">VITE_API_URL=https://your-domain.com/server/api</div>
                            <span className="text-xs text-muted-foreground">(Replace with your actual cPanel domain path)</span>
                        </li>
                        <li>Open terminal and run: <code>npm run build</code></li>
                        <li>A <code>dist</code> folder will be created. Right-click and zip this <code>dist</code> folder.</li>
                    </ol>
                </div>
            </section>

            <hr />

            {/* Section 4: Upload */}
            <section id="cpanel" className="scroll-mt-20">
                <SectionHeader number="4" title="Frontend Upload" icon={HardDrive} color="bg-orange-100 text-orange-700" />
                <div className="mt-8 space-y-4 text-gray-600">
                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Go to <strong>File Manager</strong> in cPanel &rarr; <code>public_html</code>.</li>
                        <li>Upload your zipped <code>dist</code> contents.</li>
                        <li>Extract them directly into <code>public_html</code> (or your subdomain folder).</li>
                        <li>Create a new file named <code>.htaccess</code> and paste the following routing rules:</li>
                    </ol>
                    <div className="bg-slate-900 text-blue-300 p-4 rounded-lg shadow-lg border border-slate-700 font-mono text-sm overflow-x-auto">
                        <pre>{`RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /index.html [L]`}</pre>
                    </div>
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
