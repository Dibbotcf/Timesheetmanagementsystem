import React from 'react';
import { Button } from '../components/ui/button';
import { ArrowLeft, Server, Database, Globe, Terminal, FileCode, Key, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';

export const InstallationGuide: React.FC = () => {
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
          <h1 className="text-4xl font-bold text-purple-900">cPanel Deployment & Installation</h1>
          <p className="text-xl text-muted-foreground mt-4 leading-relaxed max-w-3xl">
            A step-by-step technical guide to deploying the Timesheet System to a live cPanel server 
            and configuring the Supabase backend.
          </p>
        </div>
      </div>

       {/* Navigation Index */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { title: "1. Supabase Setup", icon: Database, color: "text-green-600", href: "#supabase" },
            { title: "2. Build App", icon: Terminal, color: "text-gray-800", href: "#build" },
            { title: "3. cPanel Upload", icon: HardDrive, color: "text-orange-600", href: "#cpanel" },
            { title: "4. Routing Fix", icon: FileCode, color: "text-blue-600", href: "#routing" },
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

      {/* Section 1: Supabase Setup */}
      <section id="supabase" className="scroll-mt-20">
        <SectionHeader number="1" title="Database Installation (Supabase)" icon={Database} color="bg-green-100 text-green-700" />
        
        <div className="mt-8 space-y-12">
            {/* Step 1.1: API Keys */}
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4 text-gray-600">
                    <h3 className="text-lg font-bold text-gray-900">A. Create Project & Get Keys</h3>
                    <p>The application requires a backend to store data. We use Supabase (PostgreSQL).</p>
                    <ol className="list-decimal pl-5 space-y-3">
                        <li>Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com</a> and create a new project.</li>
                        <li>Once created, navigate to <strong>Project Settings &gt; API</strong>.</li>
                        <li>You will need two values:
                            <ul className="list-disc pl-5 mt-1 text-sm text-gray-500">
                                <li><strong>Project URL</strong> (e.g., https://xyz.supabase.co)</li>
                                <li><strong>anon public key</strong> (starts with eyJ...)</li>
                            </ul>
                        </li>
                    </ol>
                </div>
                <MockupSupabaseKeys />
            </div>

            {/* Step 1.2: SQL Setup */}
            <div className="grid lg:grid-cols-2 gap-8">
                 <MockupSupabaseSQL />
                 <div className="space-y-4 text-gray-600">
                    <h3 className="text-lg font-bold text-gray-900">B. Run Database Schema</h3>
                    <p>You need to create the tables for the application to work.</p>
                    <ol className="list-decimal pl-5 space-y-3">
                        <li>In Supabase, go to the <strong>SQL Editor</strong> tab.</li>
                        <li>Click "New Query".</li>
                        <li>Copy and paste the following SQL command:</li>
                    </ol>
                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                        CREATE TABLE kv_store (<br/>
                        &nbsp;&nbsp;key text PRIMARY KEY,<br/>
                        &nbsp;&nbsp;value jsonb<br/>
                        );
                    </div>
                    <p className="text-sm italic">This creates the key-value store used by the application.</p>
                </div>
            </div>
        </div>
      </section>

      <hr />

      {/* Section 2: Build Application */}
      <section id="build" className="scroll-mt-20">
        <SectionHeader number="2" title="Building for Production" icon={Terminal} color="bg-gray-100 text-gray-800" />
        <div className="grid lg:grid-cols-2 gap-8 mt-6">
            <div className="space-y-4 text-gray-600">
                <p>Before uploading to cPanel, you must compile the React code into static HTML/CSS/JS files.</p>
                <ol className="list-decimal pl-5 space-y-3">
                    <li>Open your project in VS Code or Terminal.</li>
                    <li>Run the build command:
                        <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs text-gray-800">npm run build</div>
                    </li>
                    <li>Wait for the process to complete. It will create a <strong>dist</strong> folder.</li>
                    <li><strong>Critical:</strong> Create a <code>.env</code> file in the root (if testing locally) or prepare to add these keys to your cPanel environment/code. 
                    <br/><span className="text-xs text-gray-400">(For static builds, it's often easiest to hardcode the keys in <code>src/utils/supabase/info.tsx</code> before building, OR use a <code>.env.production</code> file).</span>
                    </li>
                </ol>
            </div>
            <MockupTerminal />
        </div>
      </section>

      <hr />

      {/* Section 3: cPanel Upload */}
      <section id="cpanel" className="scroll-mt-20">
        <SectionHeader number="3" title="Upload to cPanel" icon={HardDrive} color="bg-orange-100 text-orange-700" />
        <div className="grid lg:grid-cols-2 gap-8 mt-6">
             <MockupCPanel />
             <div className="space-y-4 text-gray-600">
                 <p>Deploy the built files to your live server.</p>
                 <ol className="list-decimal pl-5 space-y-3">
                    <li>Log in to <strong>cPanel</strong>.</li>
                    <li>Open <strong>File Manager</strong>.</li>
                    <li>Navigate to <code>public_html</code> (or your subdomain folder).</li>
                    <li><strong>Upload:</strong> specificially, upload the <em>contents</em> of the <code>dist</code> folder you created in Step 2.</li>
                    <li>Usually, this means zipping the contents of <code>dist</code>, uploading the zip, and extracting it.</li>
                    <li>Ensure <code>index.html</code> is in the root of your domain folder.</li>
                 </ol>
             </div>
        </div>
      </section>

      <hr />

      {/* Section 4: Routing Fix */}
      <section id="routing" className="scroll-mt-20">
        <SectionHeader number="4" title="Configure Routing (.htaccess)" icon={FileCode} color="bg-blue-100 text-blue-700" />
        <div className="grid lg:grid-cols-2 gap-8 mt-6">
            <div className="space-y-4 text-gray-600">
                <p>React is a "Single Page Application" (SPA). By default, cPanel returns a 404 error if you refresh a page like <code>/settings</code> because that file doesn't exist.</p>
                <p>You must fix this by creating a <code>.htaccess</code> file.</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>In cPanel File Manager, create a new file named <code>.htaccess</code>.</li>
                    <li>Edit the file and paste the code block shown.</li>
                    <li>Save changes.</li>
                </ol>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
                    <strong>Note:</strong> If you don't see the file after creating it, enable "Show Hidden Files" in cPanel Settings.
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 font-mono text-sm">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                    <span className="text-gray-400">.htaccess</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    </div>
                </div>
                <div className="text-blue-400">
                    <span className="text-pink-400">Options</span> -MultiViews<br/>
                    <span className="text-pink-400">RewriteEngine</span> On<br/>
                    <br/>
                    <span className="text-gray-500"># Redirect all requests to index.html</span><br/>
                    <span className="text-pink-400">RewriteCond</span> %&#123;REQUEST_FILENAME&#125; !-f<br/>
                    <span className="text-pink-400">RewriteRule</span> ^ index.html [QSA,L]
                </div>
            </div>
        </div>
      </section>

    </div>
  );
};

/* --- Mockup Components --- */

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

const MockupSupabaseKeys = () => (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 shadow-lg max-w-md w-full">
        <div className="border-b border-gray-800 pb-3 mb-3 flex justify-between items-center">
            <div className="text-gray-200 font-bold text-sm flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-sm"></div> Supabase Dashboard
            </div>
        </div>
        <div className="space-y-4">
            <div>
                <div className="text-gray-500 text-xs uppercase font-semibold mb-1">Project URL</div>
                <div className="bg-gray-800 p-2 rounded text-gray-300 text-xs font-mono border border-gray-700 flex justify-between">
                    https://xyzproject.supabase.co
                    <span className="text-blue-400 cursor-pointer">Copy</span>
                </div>
            </div>
            <div>
                <div className="text-gray-500 text-xs uppercase font-semibold mb-1">Anon Public Key</div>
                <div className="bg-gray-800 p-2 rounded text-gray-300 text-xs font-mono border border-gray-700 flex justify-between">
                    eyJhbGciOiJIUzI1NiIsInR5c...
                    <span className="text-blue-400 cursor-pointer">Copy</span>
                </div>
            </div>
            <div className="p-2 bg-yellow-900/20 border border-yellow-900/50 rounded text-yellow-500 text-xs">
                Do not share the Service Role Key!
            </div>
        </div>
    </div>
);

const MockupSupabaseSQL = () => (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b p-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-700">SQL Editor</span>
        </div>
        <div className="p-0 bg-gray-50">
            <div className="flex">
                <div className="w-10 bg-gray-100 border-r text-right pr-2 py-2 text-xs text-gray-400 font-mono leading-relaxed">
                    1<br/>2<br/>3<br/>4
                </div>
                <div className="flex-1 p-2 font-mono text-xs leading-relaxed">
                    <span className="text-blue-600 font-bold">create table</span> <span className="text-purple-700">kv_store</span> (<br/>
                    &nbsp;&nbsp;<span className="text-gray-800">key</span> <span className="text-orange-600">text primary key</span>,<br/>
                    &nbsp;&nbsp;<span className="text-gray-800">value</span> <span className="text-orange-600">jsonb</span><br/>
                    );
                </div>
            </div>
        </div>
        <div className="p-2 border-t bg-white flex justify-end">
            <div className="bg-green-600 text-white text-xs px-4 py-1.5 rounded font-bold shadow-sm">Run</div>
        </div>
    </div>
);

const MockupTerminal = () => (
    <div className="bg-black rounded-lg shadow-lg border border-gray-800 p-4 font-mono text-xs text-gray-300 leading-relaxed">
        <div className="flex gap-1.5 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div>
            <span className="text-green-400">user@macbook</span>:<span className="text-blue-400">~/timesheet-app</span>$ npm run build<br/>
            <br/>
            &gt; timesheet-app@0.0.0 build<br/>
            &gt; tsc && vite build<br/>
            <br/>
            <span className="text-gray-500">vite v4.0.0 building for production...</span><br/>
            <span className="text-green-400">✓</span> 45 modules transformed.<br/>
            dist/index.html <span className="text-gray-500">0.45 kB</span><br/>
            dist/assets/index-283.js <span className="text-gray-500">145.22 kB</span><br/>
            dist/assets/index-921.css <span className="text-gray-500">23.11 kB</span><br/>
            <br/>
            <span className="text-green-400">Done in 2.45s.</span>
        </div>
    </div>
);

const MockupCPanel = () => (
    <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="bg-orange-600 text-white p-2 px-4 flex justify-between items-center">
            <div className="font-bold text-sm">File Manager</div>
            <div className="text-xs opacity-80">public_html</div>
        </div>
        <div className="flex">
            {/* Sidebar */}
            <div className="w-1/3 border-r bg-gray-50 p-2 space-y-1">
                <div className="flex items-center gap-1 text-xs text-gray-600"><div className="w-3 h-3 bg-blue-200 rounded"></div> home</div>
                <div className="flex items-center gap-1 text-xs text-gray-800 bg-blue-50 p-1 rounded font-bold"><div className="w-3 h-3 bg-orange-200 rounded"></div> public_html</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 pl-4"><div className="w-3 h-3 bg-yellow-200 rounded"></div> cgi-bin</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 pl-4"><div className="w-3 h-3 bg-gray-200 rounded"></div> assets</div>
            </div>
            {/* Main */}
            <div className="flex-1 p-2">
                <div className="flex gap-2 border-b pb-2 mb-2 text-xs text-gray-600">
                    <div className="bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 cursor-pointer">+ Upload</div>
                    <div className="bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 cursor-pointer">+ New File</div>
                </div>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-gray-400">
                            <th className="font-normal pb-1">Name</th>
                            <th className="font-normal pb-1">Size</th>
                            <th className="font-normal pb-1">Date</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                         <tr className="border-b border-gray-50 hover:bg-blue-50">
                            <td className="py-1.5 flex items-center gap-2"><div className="w-4 h-4 bg-yellow-200 rounded text-[8px] flex items-center justify-center text-yellow-600">📂</div> assets</td>
                            <td>-</td>
                            <td>Oct 20</td>
                        </tr>
                        <tr className="border-b border-gray-50 hover:bg-blue-50">
                            <td className="py-1.5 flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 rounded text-[8px] flex items-center justify-center">⚙️</div> .htaccess</td>
                            <td>1 KB</td>
                            <td>Oct 20</td>
                        </tr>
                        <tr className="hover:bg-blue-50">
                            <td className="py-1.5 flex items-center gap-2"><div className="w-4 h-4 bg-blue-200 rounded text-[8px] flex items-center justify-center text-blue-600">&lt;&gt;</div> index.html</td>
                            <td>2 KB</td>
                            <td>Oct 20</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
