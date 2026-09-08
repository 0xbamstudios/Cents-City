import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

// Mirrors the severity model in resolveQuickEvent: <=5s mild, ramps to full by 20s.
function severityLabel(seconds: number, reactable: boolean): { text: string; color: string } {
  if (!reactable) return { text: 'Acknowledge', color: 'var(--text-secondary)' };
  if (seconds <= 5) return { text: 'Quick reaction — minimal impact', color: 'var(--accent-green)' };
  if (seconds < 20) return { text: 'Reacting slowly — impact growing', color: 'var(--accent-orange)' };
  return { text: 'Too slow — full impact', color: 'var(--accent-red)' };
}

export function QuickEventModal() {
  const pending = useGameStore((s) => s.pendingQuickEvent);
  const resolveQuickEvent = useGameStore((s) => s.resolveQuickEvent);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Tick a live timer from when the event fired.
  useEffect(() => {
    if (!pending) return;
    setElapsedMs(Date.now() - pending.firedAtMs);
    const t = setInterval(() => setElapsedMs(Date.now() - pending.firedAtMs), 100);
    return () => clearInterval(t);
  }, [pending]);

  if (!pending) return null;
  const evt = pending.effects;
  const reactable = !!evt.reactable;
  const seconds = elapsedMs / 1000;
  const sev = severityLabel(seconds, reactable);

  // Reaction progress bar: green (fast) to red (slow) over the 5–20s window.
  const pct = Math.min(100, (seconds / 20) * 100);
  const barColor = seconds <= 5 ? 'var(--accent-green)' : seconds < 20 ? 'var(--accent-orange)' : 'var(--accent-red)';

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', border: '2px solid var(--accent-orange)' }}>
        <div className="modal-header">
          <h3>{evt.title}</h3>
        </div>

        <p style={{ fontSize: '14px', lineHeight: 1.5, margin: '4px 0 16px' }}>{evt.message}</p>

        {reactable && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>⏱️ Reaction time: {seconds.toFixed(1)}s</span>
              <span style={{ color: sev.color, fontWeight: 600 }}>{sev.text}</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.1s linear' }} />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Time is paused. React within 5 seconds to keep the impact mild — the longer you wait, the worse it gets.
            </p>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={() => resolveQuickEvent(Date.now() - pending.firedAtMs)}
          >
            {evt.prompt || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
