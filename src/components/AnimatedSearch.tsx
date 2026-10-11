import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Search box that always shows its "active" look (blue border + soft glow). While it's empty, the hint types
// itself out and cycles through `hints`; typing stops the animation. ✕ clears it.
// Used by the Leaves employee board and the Pending Leaves filters.
export const AnimatedSearch: React.FC<{
  value: string;
  onChange: (v: string) => void;
  hints: string[];
  ariaLabel: string;
  width?: number | string;
  height?: number;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, hints, ariaLabel, width = '100%', height = 40, autoFocus, style }) => {
  const [hint, setHint] = useState(hints[0]);
  const hintKey = hints.join('|');
  useEffect(() => {
    if (value) return; // no animation while something is typed
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setHint(hints[0]); return; }
    let phrase = 0, len = 0, erasing = false, timer = 0;
    const tick = () => {
      const full = hints[phrase];
      len += erasing ? -1 : 1;
      setHint(full.slice(0, len) + '▏');
      if (!erasing && len === full.length) { erasing = true; timer = window.setTimeout(tick, 1800); return; } // hold the full line
      if (erasing && len === 0) { erasing = false; phrase = (phrase + 1) % hints.length; timer = window.setTimeout(tick, 350); return; }
      timer = window.setTimeout(tick, erasing ? 25 : 55);
    };
    timer = window.setTimeout(tick, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hintKey]);

  const iconTop = Math.round((height - 16) / 2);
  const clearTop = Math.round((height - 24) / 2);
  return (
    <div style={{ position: 'relative', width, maxWidth: '100%', ...style }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', left: 13, top: iconTop }}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={hint} aria-label={ariaLabel} autoFocus={autoFocus}
        style={{ width: '100%', height, borderRadius: 10, border: '1px solid #3b82f6', padding: '0 36px', fontSize: 13.5, outline: 'none', background: '#fff', boxShadow: '0 0 0 4px rgba(59,130,246,0.15)', fontFamily: 'inherit' }} />
      <button type="button" aria-label="Clear search" onMouseDown={e => e.preventDefault()} onClick={() => onChange('')}
        style={{ position: 'absolute', right: 8, top: clearTop, width: 24, height: 24, borderRadius: 999, border: 'none', background: '#e5e7eb', color: '#4b5563', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          opacity: value ? 1 : 0, transform: value ? 'scale(1)' : 'scale(.6)', pointerEvents: value ? 'auto' : 'none', transition: 'opacity .15s, transform .15s' }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
};
