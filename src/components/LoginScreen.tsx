import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Employee } from '../App';

interface LoginScreenProps {
  employees: Employee[];
  onLogin: (employee: Employee) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ employees, onLogin }) => {
  const [lockClicks, setLockClicks] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLockClick = () => {
    const newCount = lockClicks + 1;
    setLockClicks(newCount);
    
    if (newCount >= 3) {
      setShowLoginModal(true);
      setLockClicks(0);
    }
  };

  const getTodayDateString = () => {
    const d = new Date();
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);

    try {
      // Logic:
      // Password format: firstname@suffix
      // 1. Parse password
      const parts = password.split('@');
      if (parts.length !== 2) {
        toast.error("Invalid password format");
        setLoading(false);
        return;
      }

      const [nameInput, suffixInput] = parts;
      const inputNameLower = nameInput.trim().toLowerCase();
      const suffix = suffixInput.trim(); // Keep case for now, though date/admin checks are specific
      const lowerSuffix = suffix.toLowerCase();
      const todayStr = getTodayDateString();

      // Special Case: Initial System Setup (No Employees)
      if (employees.length === 0) {
        if (lowerSuffix === 'tcfadmin' && nameInput.length > 0) {
           const tempAdmin: Employee = {
             id: 'sys-admin-temp',
             name: nameInput.charAt(0).toUpperCase() + nameInput.slice(1), // Capitalize
             eid: 'SYS001',
             role: 'Admin/HR',
             status: 'Active',
             dob: new Date().toISOString(),
             joiningDate: new Date().toISOString()
           };
           toast.success(`Welcome, ${tempAdmin.name} (System Setup)`);
           onLogin(tempAdmin);
           setLoading(false);
           return;
        }
      }

      // 2. Search for matching employee
      const foundEmployee = employees.find(emp => {
        const empNameLower = emp.name.toLowerCase();
        const empFirstName = empNameLower.split(' ')[0];

        // Check Name Match (Full Name OR First Name)
        const nameMatches = (empNameLower === inputNameLower) || (empFirstName === inputNameLower);
        
        if (!nameMatches) return false;

        // Check Credentials
        if (emp.role === 'Admin/HR') {
          return lowerSuffix === 'tcfadmin';
        } else {
          // Staff: Allow Today's Date OR their DOB (DD/MM/YYYY)
          
          // Helper to format DOB YYYY-MM-DD to DD/MM/YYYY
          let dobStr = '';
          if (emp.dob) {
              const datePart = emp.dob.split('T')[0];
              const [y, m, d] = datePart.split('-');
              if (y && m && d) dobStr = `${d}/${m}/${y}`;
          }

          return suffix === todayStr || (dobStr && suffix === dobStr);
        }
      });

      if (foundEmployee) {
        toast.success(`Welcome back, ${foundEmployee.name}`);
        onLogin(foundEmployee);
      } else {
        toast.error("Invalid credentials. Check format: Name@Passkey");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <div className="text-center space-y-8">
        
        <button 
          onClick={handleLockClick}
          className="p-8 bg-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform active:scale-95 group border-4 border-gray-200 hover:border-blue-500"
        >
          <Lock className="w-24 h-24 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>
        
        <div className="text-gray-400 text-sm font-mono">
          {/* Hint not visible, strictly purely obscure UX as requested */}
          System Locked
        </div>
      </div>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>System Access</DialogTitle>
            <DialogDescription>
              Enter your daily secure passkey to continue.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Passkey</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-10"
                  placeholder="Format: Name@Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800" disabled={loading}>
                {loading ? 'Verifying...' : 'Unlock System'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
