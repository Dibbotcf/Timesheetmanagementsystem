import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Eye, EyeOff, BookmarkCheck, BookmarkX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Employee } from '../App';

const SAVED_PASSKEY_KEY = 'tcf_saved_passkey';

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
  const [rememberMe, setRememberMe] = useState(false);
  const [hasSavedPasskey, setHasSavedPasskey] = useState(false);

  // On mount, check if there's a saved passkey
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_PASSKEY_KEY);
    setHasSavedPasskey(!!saved);
  }, []);

  // When modal opens, pre-fill saved passkey if it exists
  useEffect(() => {
    if (showLoginModal) {
      const saved = localStorage.getItem(SAVED_PASSKEY_KEY);
      if (saved) {
        setPassword(saved);
        setRememberMe(true);
        setHasSavedPasskey(true);
      } else {
        setPassword('');
        setRememberMe(false);
      }
    }
  }, [showLoginModal]);

  const handleLockClick = () => {
    const newCount = lockClicks + 1;
    setLockClicks(newCount);

    if (newCount >= 3) {
      setShowLoginModal(true);
      setLockClicks(0);
    }
  };

  const handleForgetPasskey = () => {
    localStorage.removeItem(SAVED_PASSKEY_KEY);
    setHasSavedPasskey(false);
    setRememberMe(false);
    setPassword('');
    toast.success('Saved passkey cleared');
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save or clear passkey based on remember-me
        if (rememberMe) {
          localStorage.setItem(SAVED_PASSKEY_KEY, password);
          setHasSavedPasskey(true);
        } else {
          localStorage.removeItem(SAVED_PASSKEY_KEY);
          setHasSavedPasskey(false);
        }
        toast.success(`Welcome back, ${data.user.name}`);
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
          System Locked
        </div>
      </div>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              System Access
              {hasSavedPasskey && (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: '#dcfce7', color: '#16a34a',
                    border: '1px solid #bbf7d0', borderRadius: '9999px',
                    fontSize: '10px', fontWeight: 700,
                    padding: '1px 8px', lineHeight: '18px'
                  }}
                >
                  <BookmarkCheck style={{ width: '11px', height: '11px' }} />
                  Passkey Saved
                </span>
              )}
            </DialogTitle>
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
                  autoComplete="current-password"
                  autoFocus={!hasSavedPasskey}
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

            {/* Remember Me row */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="remember-me"
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{ fontSize: '13px', color: '#374151' }}
              >
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{
                    width: '15px', height: '15px',
                    accentColor: '#1d4ed8', cursor: 'pointer'
                  }}
                />
                <BookmarkCheck style={{ width: '14px', height: '14px', color: rememberMe ? '#1d4ed8' : '#9ca3af' }} />
                Remember this passkey
              </label>

              {hasSavedPasskey && (
                <button
                  type="button"
                  onClick={handleForgetPasskey}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
                  style={{ fontSize: '11px', fontWeight: 600 }}
                  title="Remove saved passkey"
                >
                  <BookmarkX style={{ width: '13px', height: '13px' }} />
                  Forget
                </button>
              )}
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
