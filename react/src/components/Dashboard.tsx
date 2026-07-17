import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency, getNetWorth, calculateWeeklyExpenses, calculateWeeklyIncome } from '../engine/finance';
import { getStageDescription, getStageMilestone, getStageNumber } from '../engine/progression';
import { THRESHOLDS } from '../engine/constants';
import { ResumeModal } from './ResumeModal';
import { LineChart } from './LineChart';
import { DegreeType } from '../engine/types';

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
      </div>

      {/* Net Worth Chart */}
      {state.netWorthHistory.length > 1 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <LineChart data={state.netWorthHistory} label="Net Worth Over Time" color="#10b981" />
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

      {showResume && <ResumeModal onClose={() => setShowResume(false)} />}
    </div>
  );
}

function getDegreeLabel(degree: DegreeType): string {
  const labels: Record<DegreeType, string> = {
    high_school: 'High School Diploma',
    associates: "Associate's Degree",
    bachelors: "Bachelor's Degree",
    masters: "Master's Degree",
  };
  return labels[degree];
}
