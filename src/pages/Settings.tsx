import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Book, Server, ChevronRight, Database, Download, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner@2.0.3';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const {
    employees, timesheets, templates, folders, signatures, leaves, otRecords,
    reportFolders, savedReports, leaveFolders, savedLeaveReports, currentUser
  } = useAppStore();

  const handleDownloadSQL = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let sqlContent = `-- TCF Timesheet System Backup (SQL Format)\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Target Table: kv_store\n\n`;
      sqlContent += `BEGIN;\n\n`;
      sqlContent += `-- Optional: Uncomment to clear existing data before restore\n`;
      sqlContent += `-- TRUNCATE TABLE kv_store;\n\n`;

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
      a.download = `backup_tcf_${timestamp}.sql`;
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

  const isAdmin = currentUser?.role === 'Admin/HR';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings & Documentation</h2>
        <p className="text-muted-foreground mt-2">System manuals, installation guides, and data management.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Manual - Visible to Everyone */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all border-blue-100 hover:border-blue-300 group"
          onClick={() => navigate('/manual')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold text-blue-900">
              System Manual
            </CardTitle>
            <Book className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mt-2 text-sm leading-relaxed">
              Comprehensive guide on how to operate the Timesheet Management System.
              Includes dashboard navigation, creating timesheets, managing employees, and generating reports.
            </CardDescription>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              Read Manual <ChevronRight className="ml-1 h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Admin Only Cards */}
        {isAdmin && (
          <>
            {/* Installation Guide */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border-purple-100 hover:border-purple-300 group"
              onClick={() => navigate('/installation')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold text-purple-900">
                  Installation Guide
                </CardTitle>
                <Server className="h-6 w-6 text-purple-500 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  Technical guide for deploying the application to a cPanel environment.
                  Covers build process, file upload, database connection, and routing configuration.
                </CardDescription>
                <div className="mt-4 flex items-center text-purple-600 text-sm font-medium">
                  View Guide <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>



            {/* Database Backup */}
            <Card className="border-green-100 hover:border-green-300 transition-all group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold text-green-900">
                  Database Backup
                </CardTitle>
                <Database className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  Quickly download a complete SQL dump of the system data without leaving this page.
                </CardDescription>
                <div className="mt-6">
                  <Button
                    onClick={handleDownloadSQL}
                    className="w-full bg-green-600 hover:bg-green-700 gap-2 shadow-sm"
                  >
                    <Download className="h-4 w-4" /> Download SQL Backup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  );
};
