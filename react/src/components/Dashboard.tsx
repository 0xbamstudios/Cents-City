import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency, getNetWorth, calculateWeeklyExpenses, calculateWeeklyIncome } from '../engine/finance';
import { fetchStats, GameStats } from '../engine/api';
import { getStageDescription, getStageMilestone, getStageNumber } from '../engine/progression';
import { THRESHOLDS, RETIRE_TARGET } from '../engine/constants';
import { ResumeModal } from './ResumeModal';
import { NetWorthChart } from './NetWorthChart';
import { getSkillLabel } from '../engine/skills';
import { DegreeType, SkillType } from '../engine/types';

const STAGE_ORDER = [
  'GETTING_STARTED', 'INDEPENDENCE', 'CREDIT_BUILDING',
  'MOBILITY', 'CAREER_GROWTH', 'INVESTING', 'LIFE_MILESTONES',
];

export function Dashboard() {
  const state = useGameStore();
  const netWorth = getNetWorth(state);
  const income = calculateWeeklyIncome(state);
  const expenses = calculateWeeklyExpenses(state);
  const stageNum = getStageNumber(state.stage);
  const totalCash = state.checking.balance + state.savings.balance;
  const [showResume, setShowResume] = useState(false);

  const retire = useGameStore((s) => s.retire);
  const retireProgress = Math.min(100, Math.round((netWorth / RETIRE_TARGET) * 1000) / 10);
  const canRetire = netWorth >= RETIRE_TARGET && !state.retired;
  const [stats, setStats] = useState<GameStats | null>(null);

  // Load community stats once (and refresh when the player retires)
  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, [state.retired]);

  // Calculate progress to next milestone
  const getProgress = (): number => {
    switch (state.stage) {
      case 'GETTING_STARTED': return Math.min(100, (totalCash / THRESHOLDS.INDEPENDENCE) * 100);
      case 'INDEPENDENCE': return Math.min(100, (totalCash / THRESHOLDS.CREDIT_BUILDING) * 100);
      case 'CREDIT_BUILDING': return Math.min(100, (totalCash / THRESHOLDS.MOBILITY) * 100);
      case 'MOBILITY': return Math.min(100, (totalCash / THRESHOLDS.INVESTING) * 100);
      default: return 50;
    }
  };

  return (
    <div>
      {/* Stage Indicator */}
      <div className="stage-indicator">
        {STAGE_ORDER.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`stage-dot ${i < stageNum - 1 ? 'completed' : ''} ${i === stageNum - 1 ? 'current' : ''}`}>
              {i < stageNum - 1 ? '✓' : i + 1}
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={`stage-line ${i < stageNum - 1 ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Progress Section */}
      <div className="progress-section">
        <div className="progress-header">
          <span><strong>Stage {stageNum}:</strong> {getStageDescription(state.stage)}</span>
          <span>Goal: {getStageMilestone(state.stage)}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${getProgress()}%` }} />
        </div>
      </div>

      {/* Retire goal */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', border: canRetire ? '1px solid var(--accent-green)' : undefined }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>🏖️ Goal: Retire with {formatCurrency(RETIRE_TARGET)} net worth</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {state.retired ? 'You have retired. 🎉' : `Net worth ${formatCurrency(netWorth)} • ${retireProgress}% to goal`}
          </div>
        </div>
        <button
          className="btn btn-success"
          onClick={retire}
          disabled={!canRetire}
          title={canRetire ? 'Retire and win the game' : `Reach ${formatCurrency(RETIRE_TARGET)} net worth to retire`}
        >
          {state.retired ? 'Retired' : `Retire (${retireProgress}%)`}
        </button>
      </div>

      {/* Player Info */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">{state.playerName}</span>
          <button className="btn btn-outline" onClick={() => setShowResume(true)}>
            📄 Resume
          </button>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Age</span>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{state.age}</div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Education</span>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{getDegreeLabel(state.education.highestDegree)}</div>
          </div>
          {state.education.certificates.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Certificates</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                {state.education.certificates.map((cert, i) => (
                  <span key={i} style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)',
                  }}>
                    {cert.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value green">{formatCurrency(netWorth)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Weekly Income</div>
          <div className="stat-value blue">{formatCurrency(income.gross)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Weekly Expenses</div>
          <div className="stat-value orange">{formatCurrency(expenses.total)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Checking</div>
          <div className="stat-value">{formatCurrency(state.checking.balance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Savings</div>
          <div className="stat-value green">{formatCurrency(state.savings.balance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Credit Score</div>
          <div className="stat-value purple">
            {state.creditScore ? state.creditScore.score : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Interest Rate (short-term)</div>
          <div className="stat-value blue">{(state.economy.interestRate ?? 0).toFixed(2)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inflation Rate</div>
          <div className="stat-value orange">{(state.economy.inflationRate ?? 0).toFixed(2)}%</div>
        </div>
      </div>

      {/* Market News */}
      {state.newsHistory.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">📰 Market News</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {state.newsHistory.slice(-4).reverse().map((n) => (
              <div key={n.id} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--text-sidebar-dim)', minWidth: '52px' }}>Wk {n.week}</span>
                <span>{n.headline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Net Worth Chart */}
      {state.netWorthHistory.length > 1 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <NetWorthChart data={state.netWorthHistory} />
        </div>
      )}

      {/* Weekly Budget */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Weekly Budget</span>
          <span className="card-badge" style={{
            background: income.net > expenses.total ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: income.net > expenses.total ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {income.net > expenses.total ? '+' : ''}{formatCurrency(income.net - expenses.total)}/week
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Income</h4>
            <div className="paycheck-row">
              <span>Gross Pay</span>
              <span>{formatCurrency(income.gross)}</span>
            </div>
            {income.tips > 0 && (
              <div className="paycheck-row">
                <span>(includes tips)</span>
                <span>{formatCurrency(income.tips)}</span>
              </div>
            )}
            <div className="paycheck-row">
              <span>Tax Withholding</span>
              <span style={{ color: 'var(--accent-red)' }}>-{formatCurrency(income.tax)}</span>
            </div>
            <div className="paycheck-row total">
              <span>Net Pay</span>
              <span>{formatCurrency(income.net)}</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Expenses</h4>
            {Object.entries(expenses.breakdown).map(([name, amount]) => (
              <div className="paycheck-row" key={name}>
                <span>{name}</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            ))}
            <div className="paycheck-row total">
              <span>Total</span>
              <span>{formatCurrency(expenses.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <SkillsSection skills={state.skills.skills} />

      {/* Community Statistics */}
      {stats && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <span className="card-title">📊 Cents City Statistics</span>
          </div>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-label">Games Started</div>
              <div className="stat-value blue">{stats.gamesStarted.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Retirements</div>
              <div className="stat-value green">
                {stats.retirements.toLocaleString()}
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '6px' }}>({stats.retirementPct}%)</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Youngest Retiree</div>
              {stats.youngestRetiree ? (
                <div>
                  <div className="stat-value purple">Age {stats.youngestRetiree.age}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {stats.youngestRetiree.name} • {formatCurrency(stats.youngestRetiree.netWorth)}
                  </div>
                </div>
              ) : (
                <div className="stat-value">—</div>
              )}
            </div>
            <div className="stat-card">
              <div className="stat-label">Highest Net Worth at Retirement</div>
              {stats.highestNetWorth ? (
                <div>
                  <div className="stat-value green">{formatCurrency(stats.highestNetWorth.netWorth)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {stats.highestNetWorth.name} • age {stats.highestNetWorth.age}
                  </div>
                </div>
              ) : (
                <div className="stat-value">—</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showResume && <ResumeModal onClose={() => setShowResume(false)} />}
    </div>
  );
}

function getDegreeLabel(degree: DegreeType): string {
  const labels: Record<DegreeType, string> = {
    high_school: 'High School Diploma',
    trade_school: 'Trade School Certificate',
    associates: "Associate's Degree",
    bachelors: "Bachelor's Degree",
    mba: 'MBA',
  };
  return labels[degree];
}

function SkillsSection({ skills }: { skills: Record<string, number> }) {
  const allSkills = Object.entries(skills)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (allSkills.length === 0) return null;

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444', '#6366f1', '#f97316', '#06b6d4', '#84cc16', '#a855f7', '#e11d48', '#0ea5e9', '#eab308'];

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <span className="card-title">Skills</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {allSkills.length} developed
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {allSkills.map(([skill, value], i) => (
          <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span>{getSkillLabel(skill as SkillType)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{Math.round(value)}%</span>
              </div>
              <div style={{ height: '5px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${value}%`, background: colors[i % colors.length], borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
