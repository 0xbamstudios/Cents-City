import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function Notifications() {
  const notifications = useGameStore((s) => s.notifications);
  const clearNotification = useGameStore((s) => s.clearNotification);
  const clearAllNotifications = useGameStore((s) => s.clearAllNotifications);

  // Auto-dismiss the oldest toast quickly so none lingers beyond ~6s (well under 12s),
  // even when several stack up.
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        clearNotification(0);
      }, notifications.length > 3 ? 2500 : 6000);
      return () => clearTimeout(timer);
    }
  }, [notifications, clearNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="notifications">
      {notifications.length > 1 && (
        <button
          onClick={clearAllNotifications}
          style={{
            alignSelf: 'flex-end',
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
          }}
        >
          Dismiss all ({notifications.length}) ✕
        </button>
      )}
      {notifications.slice(0, 3).map((note, i) => (
        <div
          key={`${note}-${i}`}
          className={`notification ${getNotificationType(note)}`}
          onClick={() => clearNotification(i)}
        >
          {note}
        </div>
      ))}
    </div>
  );
}

function getNotificationType(msg: string): string {
  if (msg.includes('Congratulations') || msg.includes('✓') || msg.includes('earned')) return 'success';
  if (msg.includes('denied') || msg.includes('Can\'t') || msg.includes('insufficient')) return 'error';
  if (msg.includes('due') || msg.includes('careful') || msg.includes('warning')) return 'warning';
  return 'info';
}
