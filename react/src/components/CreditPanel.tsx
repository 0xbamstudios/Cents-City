import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { getCreditScoreRating, getAvailableCards } from '../engine/credit';
import { CREDIT_CARD_OPTIONS } from '../engine/constants';

export function CreditPanel() {
  const state = useGameStore();
  const openCard = useGameStore((s) => s.openCreditCard);
  const closeCard = useGameStore((s) => s.closeCreditCard);
  const makePayment = useGameStore((s) => s.makeCreditCardPayment);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  const score = state.creditScore?.score || 300;
  const rating = getCreditScoreRating(score);
  const availableCards = getAvailableCards(score);
  const ownedCardIds = state.creditCards.map(c => c.id);

  const handlePayment = (cardId: string) => {
    const amount = parseFloat(paymentAmounts[cardId] || '0');
    if (amount > 0) {
      makePayment(cardId, amount);
      setPaymentAmounts({ ...paymentAmounts, [cardId]: '' });
    }
  };

  const scoreColor = score >= 740 ? 'var(--accent-green)' :
    score >= 670 ? 'var(--accent-blue)' :
    score >= 580 ? 'var(--accent-orange)' : 'var(--accent-red)';

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Credit</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Build your credit score by using credit responsibly and paying on time.
      </p>

      {/* Credit Score */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="credit-gauge">
          <div className="credit-score-number" style={{ color: scoreColor }}>
            {state.creditScore ? score : '—'}
          </div>
          <div className="credit-score-label">
            {state.creditScore ? rating : 'No credit history yet'}
          </div>
          {state.creditScore && (
            <div className="credit-factors">
              <CreditFactor label="Payment History" value={state.creditScore.factors.payment_history} />
              <CreditFactor label="Credit Utilization" value={state.creditScore.factors.credit_utilization} />
              <CreditFactor label="Credit Age" value={state.creditScore.factors.credit_age} />
              <CreditFactor label="Credit Mix" value={state.creditScore.factors.credit_mix} />
              <CreditFactor label="Hard Inquiries" value={state.creditScore.factors.hard_inquiries} />
            </div>
          )}
        </div>
      </div>

      {/* Owned Cards */}
      {state.creditCards.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Your Cards</span>
          </div>
          {state.creditCards.map((card) => (
            <div key={card.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <strong>{card.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    APR: {(card.apr * 100).toFixed(1)}% • Limit: {formatCurrency(card.limit)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: card.balance > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {formatCurrency(card.balance)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {Math.round((card.balance / card.limit) * 100)}% utilized
                  </div>
                </div>
              </div>
              {card.balance > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Payment amount"
                    value={paymentAmounts[card.id] || ''}
                    onChange={(e) => setPaymentAmounts({ ...paymentAmounts, [card.id]: e.target.value })}
                    style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '140px' }}
                  />
                  <button className="btn btn-success" onClick={() => handlePayment(card.id)}>
                    Pay
                  </button>
                  <button className="btn btn-outline" onClick={() => {
                    setPaymentAmounts({ ...paymentAmounts, [card.id]: String(card.balance) });
                  }}>
                    Pay Full
                  </button>
                  <button className="btn btn-outline" onClick={() => {
                    setPaymentAmounts({ ...paymentAmounts, [card.id]: String(card.minimumPayment) });
                  }}>
                    Min ({formatCurrency(card.minimumPayment)})
                  </button>
                </div>
              )}
              <div style={{ marginTop: '8px' }}>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                  onClick={() => closeCard(card.id)}
                >
                  Close Account
                </button>
              </div>
              {/* Recent Charges */}
              {card.recentCharges && card.recentCharges.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Recent Charges
                  </div>
                  {card.recentCharges.slice(-8).reverse().map((charge, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Wk {charge.week} — {charge.description}</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Available Cards to Open */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Apply for a Card</span>
        </div>
        <div className="job-list">
          {CREDIT_CARD_OPTIONS.map((card) => {
            const owned = ownedCardIds.includes(card.id);
            const canApply = availableCards.some(c => c.id === card.id);
            return (
              <div key={card.id} className={`job-card ${!canApply || owned ? 'locked' : ''}`}>
                <div className="job-info">
                  <h4>{card.name}</h4>
                  <p>{card.description}</p>
                  <div className="job-meta">
                    <span className="job-tag">APR: {(card.apr * 100).toFixed(1)}%</span>
                    <span className="job-tag">Limit: {formatCurrency(card.limit)}</span>
                    {'minCreditScore' in card && card.minCreditScore && (
                      <span className="job-tag">Min Score: {card.minCreditScore}</span>
                    )}
                  </div>
                </div>
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={() => openCard(card.id)}
                    disabled={!canApply || owned}
                  >
                    {owned ? 'Owned' : canApply ? 'Apply' : 'Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CreditFactor({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'var(--accent-green)' :
    value >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
  return (
    <div className="credit-factor">
      <div className="credit-factor-label">{label}</div>
      <div className="credit-factor-bar">
        <div className="credit-factor-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
