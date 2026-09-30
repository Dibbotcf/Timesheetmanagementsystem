import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, ChevronRight, FileText, Files, HelpCircle, Lock, LockOpen, Trash2, UserMinus, X } from 'lucide-react';

// In-app replacement for window.confirm(): `if (!(await confirmDialog({...}))) return;`
// Renders its own root, so any handler can await it without extra state.

type Tone = 'danger' | 'primary';
type IconName = 'trash' | 'warning' | 'lock' | 'unlock' | 'user-minus' | 'question';
export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  icon?: IconName;
  note?: React.ReactNode;   // optional highlighted line under the message
}

const FONT = '"Segoe UI", "Nirmala UI", Roboto, Helvetica, Arial, sans-serif';
const ICONS: Record<IconName, React.FC<any>> = { trash: Trash2, warning: AlertTriangle, lock: Lock, unlock: LockOpen, 'user-minus': UserMinus, question: HelpCircle };
const TONES: Record<Tone, { btn: string; btnHover: string; iconBg: string; iconFg: string }> = {
  danger: { btn: '#dc2626', btnHover: '#b91c1c', iconBg: '#fee2e2', iconFg: '#b91c1c' },
  primary: { btn: '#1e3a8a', btnHover: '#1e40af', iconBg: '#eff6ff', iconFg: '#1e3a8a' },
};

const Dialog: React.FC<ConfirmOptions & { onDone: (ok: boolean) => void }> = ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', icon, note, onDone }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const t = TONES[tone];
  const Icon = ICONS[icon || (tone === 'danger' ? 'warning' : 'question')];

  useEffect(() => {
    cancelRef.current?.focus(); // safe default: Enter on open = Cancel
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onDone(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onDone]);

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" onClick={() => onDone(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT, animation: 'confirm-fade 120ms ease-out' }}>
      <style>{`@keyframes confirm-fade { from { opacity: 0 } to { opacity: 1 } } @keyframes confirm-pop { from { transform: translateY(6px) scale(.98); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [role=alertdialog], [role=alertdialog] > div { animation: none !important } }`}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: 420, maxWidth: '100%', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', position: 'relative', animation: 'confirm-pop 160ms ease-out' }}>
        <button aria-label="Close" onClick={() => onDone(false)}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ padding: '22px 22px 6px', display: 'flex', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: t.iconBg, color: t.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon style={{ width: 20, height: 20 }} />
          </div>
          <div style={{ minWidth: 0, paddingRight: 18 }}>
            <h2 id="confirm-title" style={{ fontSize: 16.5, fontWeight: 600, color: '#111827', margin: '2px 0 0' }}>{title}</h2>
            <div id="confirm-message" style={{ fontSize: 13.5, color: '#4b5563', marginTop: 6, lineHeight: 1.5 }}>{message}</div>
            {note && <div style={{ fontSize: 12.5, color: '#1e3a8a', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '6px 10px', marginTop: 10 }}>{note}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px 18px' }}>
          <button ref={cancelRef} onClick={() => onDone(false)}
            style={{ height: 38, padding: '0 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: FONT }}>
            {cancelLabel}
          </button>
          <button onClick={() => onDone(true)}
            style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: t.btn, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
            onMouseEnter={e => (e.currentTarget.style.background = t.btnHover)} onMouseLeave={e => (e.currentTarget.style.background = t.btn)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok: boolean) => { root.unmount(); host.remove(); resolve(ok); };
    root.render(<Dialog {...opts} onDone={done} />);
  });
}

// ── "All in one or separately?" download chooser ─────────────────────────────
export type DownloadChoice = 'all' | 'separate';
export interface ChooseDownloadOptions {
  title: string;
  subtitle?: string;
  all: { label: string; description: string };
  separate: { label: string; description: string };
}

const ChoiceDialog: React.FC<ChooseDownloadOptions & { onDone: (c: DownloadChoice | null) => void }> = ({ title, subtitle, all, separate, onDone }) => {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onDone(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onDone]);
  const Option: React.FC<{ choice: DownloadChoice; icon: React.FC<any>; label: string; description: string; btnRef?: React.Ref<HTMLButtonElement> }> = ({ choice, icon: Icon, label, description, btnRef }) => (
    <button ref={btnRef} onClick={() => onDone(choice)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: FONT }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#f8fbff'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}>
      <span style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', color: '#1e3a8a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20 }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#111827' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{description}</span>
      </span>
      <ChevronRight style={{ width: 18, height: 18, color: '#9ca3af' }} />
    </button>
  );
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="choice-title" onClick={() => onDone(null)}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 440, maxWidth: '100%', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', position: 'relative', padding: '20px 20px 16px' }}>
        <button aria-label="Close" onClick={() => onDone(null)}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
        <h2 id="choice-title" style={{ fontSize: 16.5, fontWeight: 600, color: '#111827', margin: 0, paddingRight: 28 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{subtitle}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <Option choice="all" icon={FileText} btnRef={firstRef} {...all} />
          <Option choice="separate" icon={Files} {...separate} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={() => onDone(null)}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/** Ask whether to download everything as one PDF or as separate files. Resolves null on cancel. */
export function chooseDownload(opts: ChooseDownloadOptions): Promise<DownloadChoice | null> {
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (c: DownloadChoice | null) => { root.unmount(); host.remove(); resolve(c); };
    root.render(<ChoiceDialog {...opts} onDone={done} />);
  });
}
