import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';

export function BankingPanel() {
  const state = useGameStore();
  const transfer = useGameStore((s) => s.transferMoney);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'toSavings' | 'toChecking'>('toSavings');
  const [showTransfer, setShowTransfer] = useState(false);

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;
    transfer(transferDirection, amount);
    setTransferAmount('');
    setShowTransfer(false);
  };

  const allTransactions = [
    ...state.checking.transactions.map(t => ({ ...t, account: 'Checking' })),
    ...state.savings.transactions.map(t => ({ ...t, account: 'Savings' })),
  ].sort((a, b) => b.date - a.date).slice(0, 20);

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Banking</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Manage your accounts. Your paycheck is deposited directly each week.
      </p>

      {/* Account Cards */}
      <div className="account-cards">
        <div className="account-card">
          <div className="account-type">Checking Account</div>
          <div className="account-balance">{formatCurrency(state.checking.balance)}</div>
          <div className="account-rate">APY: {(state.checking.interestRate * 100).toFixed(2)}%</div>
        </div>
        <div className="account-card savings">
          <div className="account-type">Savings Account</div>
          <div className="account-balance">{formatCurrency(state.savings.balance)}</div>
          <div className="account-rate">APY: {(state.savings.interestRate * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Transfer */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Transfer Funds</span>
          <button className="btn btn-outline" onClick={() => setShowTransfer(!showTransfer)}>
            {showTransfer ? 'Cancel' : 'Transfer'}
          </button>
        </div>
        {showTransfer && (
          <div className="transfer-form">
            <select
              value={transferDirection}
              onChange={(e) => setTransferDirection(e.target.value as 'toSavings' | 'toChecking')}
            >
              <option value="toSavings">Checking → Savings</option>
              <option value="toChecking">Savings → Checking</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              min="0"
              step="10"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleTransfer}>
                Transfer
              </button>
              <button className="btn btn-outline" onClick={() => {
                const max = transferDirection === 'toSavings' ? state.checking.balance : state.savings.balance;
                setTransferAmount(String(Math.floor(max)));
              }}>
                Max
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Available: {formatCurrency(transferDirection === 'toSavings' ? state.checking.balance : state.savings.balance)}
            </p>
          </div>
        )}
      </div>

      {/* Direct Deposit Config */}
      <DirectDepositConfig />

      {/* Transactions */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Transactions</span>
        </div>
        <div className="transaction-list">
          {allTransactions.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No transactions yet. Get a job to start earning!
            </p>
          )}
          {allTransactions.map((tx) => (
            <div className="transaction-item" key={tx.id}>
              <div>
                <div className="transaction-desc">{tx.description}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Week {tx.date} • {tx.account}
                </div>
              </div>
              <div className={`transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DirectDepositConfig() {
  const { depositSplit, setDepositSplit } = useGameStore();
  const [savingsPercent, setSavingsPercent] = useState(depositSplit);

  const handleSave = () => {
    setDepositSplit(savingsPercent);
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <span className="card-title">Direct Deposit Split</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Set what percentage of your paycheck goes to savings automatically.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="range"
          min="0"
          max="80"
          step="5"
          value={savingsPercent}
          onChange={(e) => setSavingsPercent(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontWeight: 700, minWidth: '40px' }}>{savingsPercent}%</span>
        <button className="btn btn-primary" onClick={handleSave}>Save</button>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
        {100 - savingsPercent}% to Checking • {savingsPercent}% to Savings
      </div>
    </div>
  );
}
