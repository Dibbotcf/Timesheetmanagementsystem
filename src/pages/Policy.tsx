import React, { useState, useRef } from 'react';
import { Download, FileText, FileCheck, ShieldAlert, BookOpen, UserCheck, CheckSquare, FileSignature, Landmark, HeartHandshake, Briefcase, Upload, Loader2 } from 'lucide-react';
import { useAppStore } from '../App';
import { API_BASE_URL } from '../utils/api';
import { toast } from 'sonner';

const policies = [
  { id: 1, title: 'Company Policy', filename: 'Company Policy 2026.pdf', icon: Landmark, color: '#3b82f6', colorEnd: '#4f46e5', badge: 'Core' },
  { id: 2, title: '27 Doctrines', filename: '27 Doctrines.pdf', icon: BookOpen, color: '#10b981', colorEnd: '#0d9488', badge: 'Culture' },
  { id: 3, title: '10 Code of Capable Person', filename: '10 Code of Capable Person.pdf', icon: UserCheck, color: '#8b5cf6', colorEnd: '#9333ea', badge: 'Guidelines' },
  { id: 4, title: 'Corporate Etiquette', filename: 'Corporate Etiquette.pdf', icon: Briefcase, color: '#f59e0b', colorEnd: '#ea580c', badge: 'Guidelines' },
  { id: 5, title: 'Leave Process Notice', filename: 'Leave Process Notice.pdf', icon: FileCheck, color: '#ec4899', colorEnd: '#e11d48', badge: 'Notice' },
  { id: 6, title: 'Rules for Prevention from Sexual and Power Harassment in Workplace', filename: 'Rules for Prevention from Sexual and Power Harassment in Workplace.pdf', icon: ShieldAlert, color: '#ef4444', colorEnd: '#e11d48', badge: 'Policy' },
  { id: 7, title: "Leave Rules for What's app use", filename: "Leave Rules for What's app use.pdf", icon: CheckSquare, color: '#06b6d4', colorEnd: '#2563eb', badge: 'Rules' },
  { id: 8, title: 'TCF - Leave Application', filename: 'TCF - Leave Application Fillable  DEC 2025.pdf', icon: FileSignature, color: '#2563eb', colorEnd: '#4338ca', badge: 'Form' },
  { id: 9, title: 'TCF Bangladesh Profile', filename: 'TCF Bangladesh Profile.pdf', icon: HeartHandshake, color: '#059669', colorEnd: '#15803d', badge: 'Profile' },
  { id: 10, title: 'TCF Letterhead new', filename: 'TCF Letterhead new.pdf', icon: FileText, color: '#475569', colorEnd: '#1e293b', badge: 'Asset' },
];

export const Policy: React.FC = () => {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'Admin/HR';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [fileVersions, setFileVersions] = useState<Record<number, number>>({});

  const triggerFileInput = (policyId: number) => {
    setSelectedPolicyId(policyId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || selectedPolicyId === null) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }

    const policy = policies.find(p => p.id === selectedPolicyId);
    if (!policy) return;

    setUploadingId(selectedPolicyId);
    const toastId = toast.loading(`Uploading replacement for ${policy.title}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('tcf_token') || '';
      const response = await fetch(`${API_BASE_URL}/upload-pdf?filename=${encodeURIComponent(policy.filename)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFileVersions(prev => ({
          ...prev,
          [policy.id]: Date.now()
        }));
        toast.success(`Successfully replaced PDF for ${policy.title}`, { id: toastId });
      } else {
        toast.error(result.error || 'Failed to upload PDF', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred during file upload', { id: toastId });
    } finally {
      setUploadingId(null);
      setSelectedPolicyId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto" style={{ backgroundColor: '#f8fafc' }}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />

      {/* Header */}
      <div className="relative shrink-0 overflow-hidden px-8 py-10 shadow-md" style={{ backgroundColor: '#1a237e' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at top right, #ffffff, transparent)' }} />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Company Policies & Resources</h1>
            <p className="mt-2 text-base max-w-2xl font-medium" style={{ color: '#bfdbfe' }}>
              Access and download official company doctrines, essential policies, and necessary operational forms.
            </p>
          </div>
        </div>
      </div>
      
      {/* Cards Grid */}
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {policies.map((policy) => {
            const Icon = policy.icon;
            const currentVersion = fileVersions[policy.id] || 0;
            const downloadUrl = `/Download TCF items/${policy.filename}${currentVersion ? `?v=${currentVersion}` : ''}`;
            
            return (
              <div 
                key={policy.id} 
                className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                style={{ border: '1px solid #e2e8f0', transform: 'translateY(0)' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Decorative Top Accent */}
                <div className="w-full" style={{ height: '6px', background: `linear-gradient(to right, ${policy.color}, ${policy.colorEnd})` }} />
                
                <div className="p-6 flex-1 flex flex-col relative" style={{ overflow: 'hidden' }}>
                   {/* Background watermark icon */}
                   <Icon 
                     style={{ position: 'absolute', bottom: '-16px', right: '-16px', width: '128px', height: '128px', opacity: 0.04, color: policy.colorEnd, pointerEvents: 'none', transition: 'transform 500ms' }} 
                     className="group-hover:scale-110" 
                   />
                   
                   <div className="flex items-start justify-between mb-5 relative z-10">
                      <div 
                        className="flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                        style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(to bottom right, ${policy.color}, ${policy.colorEnd})`, color: 'white' }}
                      >
                        <Icon style={{ width: '24px', height: '24px' }} className="drop-shadow-sm" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => triggerFileInput(policy.id)}
                            disabled={uploadingId === policy.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm bg-white border border-slate-200 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Replace PDF"
                          >
                            {uploadingId === policy.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                          </button>
                        )}
                        <span 
                          className="inline-flex items-center uppercase tracking-wider bg-slate-100 border border-slate-200" 
                          style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, color: '#475569' }}
                        >
                           {policy.badge}
                        </span>
                      </div>
                   </div>
                   
                   <h3 className="font-bold text-lg leading-tight mb-2 transition-colors relative z-10" style={{ color: '#1e293b' }}>
                     {policy.title}
                   </h3>
                   <p className="text-xs font-medium mt-auto flex items-center gap-1.5 relative z-10" style={{ color: '#64748b' }}>
                      <FileText style={{ width: '14px', height: '14px' }} /> PDF Document
                   </p>
                </div>

                <div className="p-4 mt-auto relative z-10" style={{ backgroundColor: 'rgba(248, 250, 252, 0.8)', borderTop: '1px solid #f1f5f9' }}>
                  <a 
                    href={downloadUrl}
                    download={policy.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-white py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg outline-none"
                    style={{ backgroundColor: '#1a237e' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e40af'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a237e'}
                  >
                    <Download style={{ width: '16px', height: '16px' }} /> Download PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
