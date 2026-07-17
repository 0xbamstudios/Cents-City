import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';

export function UtilitiesPanel() {
  const state = useGameStore();
  const payBill = useGameStore((s) => s.payBill);
  const makeCreditCardPayment = useGameStore((s) => s.makeCreditCardPayment);
  const [ccPayAmounts, setCcPayAmounts] = useState<Record<string, string>>({});

  // Calculate monthly bills based on current state
  const bills = getBillsSummary(state);

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Utilities & Expenses</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Pay your bills here. Incidentals (coffee, food, gas) are charged to your credit card or checking automatically.
      </p>

      {/* Pending Bills */}
      {state.pendingBills.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Bills Due</span>
            <span className="card-badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-orange)' }}>
              {state.pendingBills.length} pending
            </span>
          </div>
          <div className="job-list">
            {state.pendingBills.map((bill) => {
              const overdue = bill.dueWeek <= state.currentWeek;
              return (
                <div key={bill.id} className="job-card" style={{ borderColor: overdue ? 'var(--accent-red)' : undefined }}>
                  <div className="job-info">
                    <h4>{bill.name}</h4>
                    <p>Due: Week {bill.dueWeek} {overdue && <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>OVERDUE</span>}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(bill.amount)}</span>
                    <button className="btn btn-success" onClick={() => payBill(bill.id)}>
                      Pay Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Expense Summary */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Monthly Expense Summary</span>
        </div>
        <div className="paycheck-stub">
          {bills.map((bill, i) => (
            <div className="paycheck-row" key={i}>
              <span>{bill.icon} {bill.name}</span>
              <span>{formatCurrency(bill.monthlyAmount)}/mo</span>
            </div>
          ))}
          <div className="paycheck-row total">
            <span>Total Monthly</span>
            <span>{formatCurrency(bills.reduce((s, b) => s + b.monthlyAmount, 0))}</span>
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          {state.settings.autoBillPay
            ? '✓ Auto-pay is ON — bills are paid automatically from checking.'
            : '⚠️ Auto-pay is OFF — you must pay bills manually before the due date or face late fees.'}
        </p>
      </div>

      {/* Credit Card Payments */}
      {state.creditCards.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Credit Card Payments</span>
          </div>
          {state.creditCards.map((card) => (
            <div key={card.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <strong>{card.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Balance: {formatCurrency(card.balance)} / {formatCurrency(card.limit)} • Min: {formatCurrency(card.minimumPayment)}
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: card.balance > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {formatCurrency(card.balance)}
                </div>
              </div>
              {card.balance > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={ccPayAmounts[card.id] || ''}
                    onChange={(e) => setCcPayAmounts({ ...ccPayAmounts, [card.id]: e.target.value })}
                    style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '120px' }}
                  />
                  <button className="btn btn-success" onClick={() => {
                    const amt = parseFloat(ccPayAmounts[card.id] || '0');
                    if (amt > 0) { makeCreditCardPayment(card.id, amt); setCcPayAmounts({ ...ccPayAmounts, [card.id]: '' }); }
                  }}>Pay</button>
                  <button className="btn btn-outline" onClick={() => setCcPayAmounts({ ...ccPayAmounts, [card.id]: String(card.minimumPayment) })}>
                    Min
                  </button>
                  <button className="btn btn-outline" onClick={() => setCcPayAmounts({ ...ccPayAmounts, [card.id]: String(card.balance) })}>
                    Full
                  </button>
                </div>
              )}
              {card.balance === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--accent-green)' }}>✓ No balance — paid in full!</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Incidentals - Card Assignment */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Incidentals & Payment Method</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Choose which credit card (or checking) is used for each expense category.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ExpenseCardRow category="food" label="🍔 Food & dining" amount="~$60/week" state={state} />
          <ExpenseCardRow category="coffee" label="☕ Coffee & snacks" amount="~$15/week" state={state} />
          <ExpenseCardRow category="entertainment" label="🎬 Entertainment" amount="~$25/week" state={state} />
          {(state.vehicle.owned || state.vehicle.leased) && (
            <ExpenseCardRow category="gas" label="⛽ Gas" amount="~$50/week" state={state} />
          )}
          <ExpenseCardRow category="phone" label="📱 Phone" amount="~$20/week" state={state} />
        </div>
      </div>
    </div>
  );
}

interface BillSummary {
  icon: string;
  name: string;
  monthlyAmount: number;
}

function getBillsSummary(state: any): BillSummary[] {
  const bills: BillSummary[] = [];

  // Housing
  if (state.housing.type === 'apartment') {
    bills.push({ icon: '🏢', name: 'Rent', monthlyAmount: 850 });
    bills.push({ icon: '⚡', name: 'Electric', monthlyAmount: 85 });
    bills.push({ icon: '💧', name: 'Water', monthlyAmount: 45 });
    bills.push({ icon: '🌐', name: 'Internet', monthlyAmount: 60 });
  } else if (state.housing.type === 'house') {
    bills.push({ icon: '🏡', name: 'Mortgage', monthlyAmount: state.housing.mortgage?.monthlyPayment || 0 });
    bills.push({ icon: '⚡', name: 'Electric', monthlyAmount: 120 });
    bills.push({ icon: '💧', name: 'Water', monthlyAmount: 65 });
    bills.push({ icon: '🌐', name: 'Internet', monthlyAmount: 60 });
    bills.push({ icon: '🏠', name: 'Home Insurance', monthlyAmount: Math.round(1200 / 12) });
  }

  // Vehicle
  if (state.vehicle.owned || state.vehicle.leased) {
    bills.push({ icon: '🚗', name: 'Auto Insurance', monthlyAmount: Math.round(state.vehicle.insuranceCostPerYear / 12) });
    if (state.vehicle.leased) {
      bills.push({ icon: '📋', name: 'Lease Payment', monthlyAmount: state.vehicle.monthlyPayment });
    }
  } else if (state.vehicle.transitPass) {
    bills.push({ icon: '🚌', name: 'Transit Pass', monthlyAmount: state.vehicle.monthlyPayment });
  }

  // Phone
  bills.push({ icon: '📱', name: 'Phone', monthlyAmount: 80 });

  return bills;
}

function ExpenseCardRow({ category, label, amount, state }: { category: string; label: string; amount: string; state: any }) {
  const setAssignment = useGameStore((s) => s.setExpenseCardAssignment);
  const currentCard = state.expenseCardAssignments[category] || null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
      <div>
        <span style={{ fontSize: '13px' }}>{label}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>{amount}</span>
      </div>
      <select
        value={currentCard || '__checking'}
        onChange={(e) => setAssignment(category, e.target.value === '__checking' ? null : e.target.value)}
        style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', minWidth: '160px' }}
      >
        <option value="__checking">🏦 Checking Account</option>
        {state.creditCards.map((card: any) => (
          <option key={card.id} value={card.id}>
            💳 {card.name} ({Math.round((card.balance / card.limit) * 100)}% used)
          </option>
        ))}
      </select>
    </div>
  );
}
