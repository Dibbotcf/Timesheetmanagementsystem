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

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);

    try {
      const parts = password.split('@');
      if (parts.length !== 2) {
        toast.error("Invalid password format");
        setLoading(false);
        return;
      }

      // Call Backend API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; // Direct usage for now to avoid extensive refactors
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Welcome back, ${data.user.name}`);
        // Save token
        localStorage.setItem('tcf_token', data.token);
        onLogin(data.user);
      } else {
        toast.error(data.error || "Invalid credentials");
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
