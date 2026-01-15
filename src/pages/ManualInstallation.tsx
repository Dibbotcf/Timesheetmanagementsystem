import React from 'react';
import { Button } from '../components/ui/button';
import { ArrowLeft, Download, Database, HardDrive, FileCode, Terminal, Upload, AlertTriangle, CheckCircle, FileText, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAppStore } from '../App';
import { toast } from 'sonner@2.0.3';

export const ManualInstallation: React.FC = () => {
  const navigate = useNavigate();
  const { 
    employees, timesheets, templates, folders, signatures, leaves, otRecords, 
    reportFolders, savedReports, leaveFolders, savedLeaveReports 
  } = useAppStore();

  const handleDownloadSQL = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let sqlContent = `-- TCF Timesheet System Backup (SQL Format)\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Target Table: kv_store\n\n`;
      sqlContent += `BEGIN;\n\n`;
      
      sqlContent += `INSERT INTO kv_store (key, value) VALUES\n`;

      const allItems: { key: string; value: string }[] = [];

      // Helper to add items
      const addItems = (items: any[], prefix: string) => {
        items.forEach(item => {
          if (!item.id) return;
          allItems.push({
            key: `${prefix}${item.id}`,
            value: JSON.stringify(item).replace(/'/g, "''") // Escape single quotes for SQL
          });
        });
      };

      // Collect all data
      addItems(employees, 'employees:');
      addItems(timesheets, 'timesheets:');
      addItems(templates, 'templates:');
      addItems(folders, 'folders:');
      addItems(signatures, 'signatures:');
      addItems(leaves, 'leaves:');
      addItems(otRecords, 'ot_records:');
      addItems(reportFolders, 'report_folders:');
      addItems(savedReports, 'saved_reports:');
      addItems(leaveFolders, 'leave_folders:');
      addItems(savedLeaveReports, 'saved_leave_reports:');

      if (allItems.length === 0) {
        toast.info("No data to backup.");
        return;
      }

      // Generate Value Lines
      const values = allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        return `('${item.key}', '${item.value}')${isLast ? '' : ','}`;
      });

      sqlContent += values.join('\n');
      sqlContent += `\nON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n\n`;
      sqlContent += `COMMIT;\n`;

      // Create Download
      const blob = new Blob([sqlContent], { type: 'text/sql' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tcf_database_${timestamp}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("SQL Backup downloaded successfully.");
    } catch (error) {
      console.error("Backup generation failed", error);
      toast.error("Failed to generate SQL backup.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-12 px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-4xl font-bold text-indigo-900">Manual Installation & Migration</h1>
          <p className="text-xl text-muted-foreground mt-4 leading-relaxed max-w-3xl">
            A comprehensive guide for downloading system assets and manually restoring or migrating the application to a live cPanel environment.
          </p>
        </div>
      </div>

      {/* Section 1: Download Assets */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
            Prepare Assets
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-indigo-50 border-indigo-100">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                        <Database className="h-5 w-5" /> Database Asset (SQL)
                    </CardTitle>
                    <CardDescription>
                        Contains all live data (Employees, Timesheets, Settings).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleDownloadSQL} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        <Download className="mr-2 h-4 w-4" /> Download .sql File
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <FileCode className="h-5 w-5" /> Application Code
                    </CardTitle>
                    <CardDescription>
                        You must build the application manually to generate the deployment files.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-white p-3 rounded border text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-2">Build Instructions:</p>
                        <ol className="list-decimal pl-4 space-y-1 mb-2">
                            <li>Open your terminal in the project folder.</li>
                            <li>Run command: <code className="bg-gray-100 px-1 rounded">npm run build</code></li>
                            <li>This creates a <code className="bg-gray-100 px-1 rounded font-bold">dist</code> folder.</li>
                            <li>Compress the contents of <code className="bg-gray-100 px-1 rounded">dist</code> into <code className="bg-gray-100 px-1 rounded font-bold">dist.zip</code>.</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Section 2: Database Installation */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center shadow-sm font-bold text-xl">2</div>
             <h2 className="text-2xl font-bold text-gray-900">Import Database</h2>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6 text-gray-600 text-lg">
                <p>
                    Restore your system data into Supabase. This will recreate all your records.
                </p>
                
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">1</div>
                        <div>
                            <p className="font-medium text-gray-900">Open SQL Editor</p>
                            <p className="text-sm">Log in to Supabase, select your project, and navigate to the <strong>SQL Editor</strong> tab on the left sidebar.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">2</div>
                        <div>
                            <p className="font-medium text-gray-900">Prepare the Script</p>
                            <p className="text-sm">Open the <code className="bg-gray-100 px-1">.sql</code> file you downloaded in a text editor (like Notepad). Select All (Ctrl+A) and Copy (Ctrl+C).</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">3</div>
                        <div>
                            <p className="font-medium text-gray-900">Execute Query</p>
                            <p className="text-sm">Paste the content into the SQL Editor and click <span className="text-green-600 font-bold">RUN</span>.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">4</div>
                        <div>
                            <p className="font-medium text-gray-900">Verify Data</p>
                            <p className="text-sm">Go to the <strong>Table Editor</strong> and check the <code>kv_store</code> table to ensure data has been populated.</p>
                        </div>
                    </div>
                </div>

            </div>
            <MockupSQLImport />
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Section 3: cPanel Installation */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center shadow-sm font-bold text-xl">3</div>
             <h2 className="text-2xl font-bold text-gray-900">Upload Application</h2>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
            <MockupCPanelUpload />
            <div className="space-y-6 text-gray-600 text-lg">
                <p>
                    Deploy the compiled application files to your web hosting.
                </p>
                
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">1</div>
                        <div>
                            <p className="font-medium text-gray-900">Access File Manager</p>
                            <p className="text-sm">Log in to cPanel and open <strong>File Manager</strong>.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">2</div>
                        <div>
                            <p className="font-medium text-gray-900">Clean Destination</p>
                            <p className="text-sm">Navigate to <code>public_html</code>. If updating, delete old application files to avoid conflicts.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">3</div>
                        <div>
                            <p className="font-medium text-gray-900">Upload & Extract</p>
                            <p className="text-sm">Upload <code>dist.zip</code>. Right-click and <strong>Extract</strong>. Ensure <code>index.html</code> is in the main folder.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Section 4: Routing Configuration */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shadow-sm font-bold text-xl">4</div>
             <h2 className="text-2xl font-bold text-gray-900">Configure Routing</h2>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6 text-gray-600 text-lg">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="text-yellow-800 font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> CRITICAL STEP</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                        Without this step, refreshing the page will cause a <strong>404 Not Found</strong> error.
                    </p>
                </div>
                
                <div className="space-y-4">
                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">1</div>
                        <div>
                            <p className="font-medium text-gray-900">Create .htaccess</p>
                            <p className="text-sm">In File Manager, create a new file named <code>.htaccess</code> (include the dot). Ensure "Show Hidden Files" is enabled in Settings.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1">2</div>
                        <div>
                            <p className="font-medium text-gray-900">Add Rewrite Rules</p>
                            <p className="text-sm">Paste the exact code block shown to the right into the file and save.</p>
                        </div>
                    </div>
                </div>
            </div>
            <MockupHtaccess />
        </div>
      </section>

    </div>
  );
};

/* --- Mockups --- */

const MockupSQLImport = () => (
    <div className="bg-white rounded-lg border shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gray-50 border-b p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-700">Supabase SQL Editor</span>
            </div>
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>
        </div>
        <div className="flex-1 bg-slate-900 p-4 font-mono text-xs text-gray-300 overflow-hidden relative min-h-[200px]">
            <div className="absolute top-0 left-0 bottom-0 w-10 bg-slate-800 border-r border-slate-700 flex flex-col items-end pr-2 pt-4 text-slate-500 select-none">
                1<br/>2<br/>3<br/>4<br/>5<br/>6
            </div>
            <div className="pl-12 pt-1">
                <span className="text-gray-500">-- TCF Timesheet System Backup</span><br/>
                <span className="text-pink-400">BEGIN</span>;<br/>
                <br/>
                <span className="text-blue-400">INSERT INTO</span> kv_store (key, value) <span className="text-blue-400">VALUES</span><br/>
                (<span className="text-orange-300">'employees:123'</span>, <span className="text-green-300">'&#123;"id":"123", "name":"John Doe"&#125;'</span>),<br/>
                (<span className="text-orange-300">'timesheets:456'</span>, <span className="text-green-300">'&#123;"id":"456", "entries":[...]&#125;'</span>)<br/>
                <span className="text-blue-400">ON CONFLICT</span> (key) <span className="text-blue-400">DO UPDATE SET</span>...
            </div>
            {/* Cursor */}
            <div className="absolute top-[120px] left-[60px] w-2 h-4 bg-white animate-pulse"></div>
        </div>
        <div className="bg-white border-t p-3 flex justify-end">
            <div className="bg-green-600 text-white text-sm px-6 py-2 rounded shadow hover:bg-green-700 cursor-pointer font-bold flex items-center gap-2">
                 RUN <div className="text-[10px] opacity-70">(CTRL+ENTER)</div>
            </div>
        </div>
    </div>
);

const MockupCPanelUpload = () => (
    <div className="bg-white rounded-lg border shadow-lg overflow-hidden flex flex-col">
        <div className="bg-orange-600 p-3 flex justify-between items-center text-white">
            <div className="font-bold flex items-center gap-2">
                <div className="bg-white/20 p-1 rounded"><Upload className="h-4 w-4" /></div>
                cPanel File Manager
            </div>
            <div className="text-xs bg-orange-700 px-2 py-1 rounded">public_html</div>
        </div>
        <div className="p-8 bg-gray-50 border-b border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 min-h-[200px]">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200 border-dashed">
                <Upload className="h-10 w-10 text-blue-400" />
            </div>
            <div className="text-center">
                <div className="text-gray-900 font-medium">Drop 'dist.zip' here</div>
                <div className="text-gray-500 text-sm mt-1">or <span className="text-blue-600 underline cursor-pointer">Select File</span></div>
            </div>
        </div>
        <div className="p-4 bg-white">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Upload Status</div>
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 p-2 rounded">
                <div className="bg-green-100 p-1 rounded text-green-700">
                    <FileCode className="h-4 w-4" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">dist.zip</div>
                    <div className="text-xs text-green-600">100% • 2.4 MB</div>
                </div>
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">
                    Done
                </div>
            </div>
        </div>
    </div>
);

const MockupHtaccess = () => (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-300 text-sm font-mono">
                <FileText className="h-4 w-4 text-yellow-500" /> .htaccess
            </div>
            <div className="text-xs text-gray-500">UTF-8</div>
        </div>
        <div className="p-4 font-mono text-sm text-green-400 overflow-x-auto">
            <div className="opacity-50 text-gray-500 mb-2"># React Router Configuration</div>
            <div>&lt;IfModule mod_rewrite.c&gt;</div>
            <div className="pl-4">RewriteEngine On</div>
            <div className="pl-4">RewriteBase /</div>
            <div className="pl-4">RewriteRule ^index\.html$ - [L]</div>
            <div className="pl-4">RewriteCond %&#123;REQUEST_FILENAME&#125; !-f</div>
            <div className="pl-4">RewriteCond %&#123;REQUEST_FILENAME&#125; !-d</div>
            <div className="pl-4">RewriteCond %&#123;REQUEST_FILENAME&#125; !-l</div>
            <div className="pl-4">RewriteRule . /index.html [L]</div>
            <div>&lt;/IfModule&gt;</div>
        </div>
    </div>
);
