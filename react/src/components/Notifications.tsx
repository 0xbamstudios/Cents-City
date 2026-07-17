import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function Notifications() {
  const notifications = useGameStore((s) => s.notifications);
  const clearNotification = useGameStore((s) => s.clearNotification);

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        clearNotification(0);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notifications, clearNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="notifications">
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
