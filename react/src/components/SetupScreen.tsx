import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { fetchStats, GameStats } from '../engine/api';
import { formatCurrency } from '../engine/finance';
import { RETIRE_TARGET } from '../engine/constants';

export function SetupScreen() {
  const [name, setName] = useState('');
  const [stats, setStats] = useState<GameStats | null>(null);
  const startGame = useGameStore((s) => s.startGame);

  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);

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

        {/* About + objective */}
        <div style={{ marginTop: '24px', textAlign: 'left', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>About the game</h3>
          <p style={{ marginBottom: '10px' }}>
            Cents City is a life-simulation game about personal finance. Start out in your parents'
            basement and work your way up: land a job, budget your paycheck, build credit, buy a car
            and a home, invest, and navigate the surprises life throws at you.
          </p>
          <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>The objective</h3>
          <p>
            Retire with a net worth of at least <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(RETIRE_TARGET)}</strong>.
            The younger you get there — and the higher you climb — the better.
          </p>
        </div>

        {/* Community statistics */}
        {stats && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>📊 Cents City by the numbers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left' }}>
              <SetupStat label="Games Started" value={stats.gamesStarted.toLocaleString()} />
              <SetupStat
                label="Retirements"
                value={`${stats.retirements.toLocaleString()} (${stats.retirementPct}%)`}
              />
              <SetupStat
                label="Youngest Retiree"
                value={stats.youngestRetiree ? `Age ${stats.youngestRetiree.age}` : '—'}
                sub={stats.youngestRetiree ? `${stats.youngestRetiree.name} • ${formatCurrency(stats.youngestRetiree.netWorth)}` : undefined}
              />
              <SetupStat
                label="Highest Net Worth"
                value={stats.highestNetWorth ? formatCurrency(stats.highestNetWorth.netWorth) : '—'}
                sub={stats.highestNetWorth ? `${stats.highestNetWorth.name} • age ${stats.highestNetWorth.age}` : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}
