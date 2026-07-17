import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function SetupScreen() {
  const [name, setName] = useState('');
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = () => {
    if (name.trim()) {
      startGame(name.trim());
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1>
          <span>Cents</span> City
        </h1>
        <p>Learn to earn, save, invest, and build your financial future</p>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          autoFocus
        />
        <button className="btn btn-primary" onClick={handleStart} disabled={!name.trim()}>
          Start Your Journey
        </button>
      </div>
    </div>
  );
}
