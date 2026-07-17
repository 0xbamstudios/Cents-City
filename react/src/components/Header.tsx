import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency, getNetWorth } from '../engine/finance';

export function Header() {
  const state = useGameStore();
  const { currentWeek, gameSpeed, isPaused, canSpeedUp, setGameSpeed, togglePause } = state;
  const netWorth = getNetWorth(state);

  return (
    <div className="header">
      <div className="header-left">
        <span className="header-week">Week {currentWeek}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {state.playerName} • {state.currentJob ? state.currentJob.title : 'Unemployed'}
        </span>
      </div>
      <div className="header-right">
        <span className="header-balance">{formatCurrency(netWorth)}</span>
        <div className="speed-control">
          {[1, 2, 4, 8].map((speed) => (
            <button
              key={speed}
              className={`speed-btn ${gameSpeed === speed ? 'active' : ''}`}
              onClick={() => setGameSpeed(speed)}
              disabled={speed > 1 && !canSpeedUp}
              title={speed > 1 && !canSpeedUp ? 'Play more to unlock speed up' : `${speed}x speed`}
            >
              {speed}x
            </button>
          ))}
        </div>
        <button className={`pause-btn ${isPaused ? 'paused' : ''}`} onClick={togglePause}>
          {isPaused ? '▶ Play' : '⏸ Pause'}
        </button>
      </div>
    </div>
  );
}
