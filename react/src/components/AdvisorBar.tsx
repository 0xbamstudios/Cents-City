import React from 'react';
import { useGameStore } from '../store/gameStore';

export function AdvisorBar() {
  const messages = useGameStore((s) => s.advisorMessages);
  const latestMessage = messages
    .filter((m) => !m.dismissed)
    .sort((a, b) => b.week - a.week)[0];

  if (!latestMessage) {
    return (
      <div className="advisor-bar">
        <div className="advisor-avatar">🧑‍💼</div>
        <div className="advisor-message">
          Welcome to Cents City! I'm your financial advisor. I'll share tips as you progress.
        </div>
      </div>
    );
  }

  return (
    <div className="advisor-bar">
      <div className="advisor-avatar">
        {latestMessage.type === 'tip' ? '💡' :
         latestMessage.type === 'warning' ? '⚠️' :
         latestMessage.type === 'celebration' ? '🎉' : '🤔'}
      </div>
      <div className={`advisor-message ${latestMessage.type}`}>
        {latestMessage.message}
      </div>
    </div>
  );
}
