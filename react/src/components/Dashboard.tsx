import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency, getNetWorth, calculateWeeklyExpenses, calculateWeeklyIncome } from '../engine/finance';
import { getStageDescription, getStageMilestone, getStageNumber } from '../engine/progression';
import { THRESHOLDS } from '../engine/constants';

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
    </div>
  );
}
