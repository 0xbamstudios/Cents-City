import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { RETIREMENT, CAPITAL_GAINS_RATES } from '../engine/constants';
import { Investment } from '../engine/types';
import { LineChart } from './LineChart';

const MOCK_STOCKS = [
  { id: 'CNTC', name: 'Cents City Corp', price: 42.50, change: 1.2 },
  { id: 'SVNG', name: 'SaveMore Inc', price: 128.00, change: -0.8 },
  { id: 'GRWT', name: 'GrowthTech', price: 85.75, change: 3.5 },
  { id: 'STDY', name: 'SteadyDiv Fund', price: 55.20, change: 0.3 },
  { id: 'INDX', name: 'Cents City Index', price: 210.00, change: 0.9 },
];

export function InvestingPanel() {
  const state = useGameStore();
  const buyStock = useGameStore((s) => s.buyStock);
  const sellStock = useGameStore((s) => s.sellStock);
  const contribute401k = useGameStore((s) => s.contributeRetirement);
  const [buyShares, setBuyShares] = useState<Record<string, string>>({});
  const [buyDollars, setBuyDollars] = useState<Record<string, string>>({});
  const [sellShares, setSellShares] = useState<Record<string, string>>({});
  const [retirementAmount, setRetirementAmount] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [fundSource, setFundSource] = useState<'checking' | 'savings'>('checking');
  const [chartView, setChartView] = useState<'total' | 'brokerage' | 'roth_ira' | 'traditional_ira' | 'fourOhOneK'>('total');

  const has401k = state.has401kAccess;
  const rollover401k = useGameStore((s) => s.rollover401k);
  const k401Balance = state.retirementAccounts.find(a => a.type === '401k')?.balance || 0;
  const canRollover = !has401k && k401Balance > 0;

  const selectedInvestment = state.investments.find(i => i.id === selectedStockId) || null;

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Investing</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Grow your wealth through stocks and retirement accounts. Click a holding to see purchase lot details.
      </p>

      {/* Investment Performance Chart */}
      {state.investmentHistory.length > 1 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Investment Performance</span>
            <select
              value={chartView}
              onChange={(e) => setChartView(e.target.value as any)}
              style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }}
            >
              <option value="total">All Investments</option>
              <option value="brokerage">Brokerage (Stocks)</option>
              <option value="roth_ira">Roth IRA</option>
              <option value="traditional_ira">Traditional IRA</option>
              <option value="fourOhOneK">401(k)</option>
            </select>
          </div>
          <LineChart
            data={state.investmentHistory.map(h => h[chartView])}
            label={chartView === 'total' ? 'Total Portfolio' : chartView === 'brokerage' ? 'Brokerage' : chartView === 'roth_ira' ? 'Roth IRA' : chartView === 'traditional_ira' ? 'Traditional IRA' : '401(k)'}
            color={chartView === 'total' ? '#8b5cf6' : chartView === 'brokerage' ? '#3b82f6' : '#10b981'}
          />
        </div>
      )}

      {/* Portfolio Summary */}
      {state.investments.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Your Portfolio</span>
          </div>
          <div className="stock-list">
            {state.investments.map((inv) => {
              const gain = (inv.currentPrice - inv.purchasePrice) * inv.shares;
              const gainPct = ((inv.currentPrice - inv.purchasePrice) / inv.purchasePrice) * 100;
              const isSelected = selectedStockId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="stock-card"
                  style={{
                    flexWrap: 'wrap', cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent-blue)' : undefined,
                    background: isSelected ? 'rgba(59,130,246,0.03)' : undefined,
                  }}
                  onClick={() => setSelectedStockId(isSelected ? null : inv.id)}
                >
                  <div>
                    <div className="stock-name">
                      {inv.name}
                      {isSelected && <span style={{ fontSize: '11px', marginLeft: '6px', color: 'var(--accent-blue)' }}>▼ lots</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {inv.shares} shares • avg cost {formatCurrency(inv.purchasePrice)} • {inv.lots?.length || 1} lot(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                      <div className="stock-price">{formatCurrency(inv.currentPrice * inv.shares)}</div>
                      <div className={`stock-change ${gain >= 0 ? 'up' : 'down'}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct.toFixed(1)}%)
                      </div>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={inv.shares}
                      placeholder="Qty"
                      value={sellShares[inv.id] || ''}
                      onChange={(e) => { e.stopPropagation(); setSellShares({ ...sellShares, [inv.id]: e.target.value }); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        const qty = parseInt(sellShares[inv.id] || '0');
                        if (qty > 0) {
                          sellStock(inv.id, qty);
                          setSellShares({ ...sellShares, [inv.id]: '' });
                        }
                      }}
                    >
                      Sell
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        sellStock(inv.id, inv.shares);
                      }}
                    >
                      Sell All
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lot Detail Panel */}
          {selectedInvestment && selectedInvestment.lots && selectedInvestment.lots.length > 0 && (
            <LotDetailPanel investment={selectedInvestment} currentWeek={state.currentWeek} />
          )}
        </div>
      )}

      {/* Buy Stocks */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Stock Market</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Checking: {formatCurrency(state.checking.balance)} | Savings: {formatCurrency(state.savings.balance)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>
            Enter shares OR a dollar amount. Held &lt;1 year = short-term (22%). Held 1+ year = long-term (15%).
          </p>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fund from:</span>
            <select
              value={fundSource}
              onChange={(e) => setFundSource(e.target.value as 'checking' | 'savings')}
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </div>
        <div className="stock-list">
          {MOCK_STOCKS.map((stock) => (
            <div key={stock.id} className="stock-card">
              <div>
                <div className="stock-name">{stock.id}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {stock.name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ textAlign: 'right', marginRight: '6px' }}>
                  <div className="stock-price">{formatCurrency(stock.price)}</div>
                  <div className={`stock-change ${stock.change >= 0 ? 'up' : 'down'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Shares"
                  value={buyShares[stock.id] || ''}
                  onChange={(e) => { setBuyShares({ ...buyShares, [stock.id]: e.target.value }); setBuyDollars({ ...buyDollars, [stock.id]: '' }); }}
                  style={{ width: '65px', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>or</span>
                <span style={{ fontSize: '12px' }}>$</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Amount"
                  value={buyDollars[stock.id] || ''}
                  onChange={(e) => { setBuyDollars({ ...buyDollars, [stock.id]: e.target.value }); setBuyShares({ ...buyShares, [stock.id]: '' }); }}
                  style={{ width: '75px', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    let qty = parseInt(buyShares[stock.id] || '0');
                    const dollarAmt = parseFloat(buyDollars[stock.id] || '0');
                    if (dollarAmt > 0) {
                      qty = Math.floor(dollarAmt / stock.price);
                    }
                    if (qty > 0) {
                      buyStock(stock.id, stock.name, stock.price, qty, fundSource);
                      setBuyShares({ ...buyShares, [stock.id]: '' });
                      setBuyDollars({ ...buyDollars, [stock.id]: '' });
                    }
                  }}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retirement Accounts */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Retirement</span>
        </div>
        {has401k && (
          <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>401(k)</strong></span>
              <span>{formatCurrency(state.retirementAccounts.find(a => a.type === '401k')?.balance || 0)}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Employer matches {RETIREMENT.employerMatchPercent * 100}% up to {RETIREMENT.employerMatchMax * 100}% of salary.
              Annual limit: {formatCurrency(RETIREMENT.fourOhOneKLimit)}
            </div>
          </div>
        )}
        {!has401k && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            401(k) available at jobs that offer it (salary roles, municipal positions).
          </p>
        )}

        {/* 401k Rollover */}
        {canRollover && (
          <div style={{ padding: '12px', background: 'rgba(59,130,246,0.05)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '13px' }}>401(k) Rollover Available</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  You left your 401(k) job. Roll over {formatCurrency(k401Balance)} to a Traditional IRA with no penalty.
                </div>
              </div>
              <button className="btn btn-primary" onClick={rollover401k}>
                Roll Over
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {(['roth_ira', 'traditional_ira', '401k'] as const).map((type) => {
            if (type === '401k' && !has401k) return null;
            const account = state.retirementAccounts.find(a => a.type === type);
            const label = type === 'roth_ira' ? 'Roth IRA' : type === 'traditional_ira' ? 'Traditional IRA' : '401(k)';
            return (
              <div key={type} style={{ flex: 1, padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  {formatCurrency(account?.balance || 0)}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Amount"
            value={retirementAmount}
            onChange={(e) => setRetirementAmount(e.target.value)}
            style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', width: '120px' }}
          />
          <button className="btn btn-primary" onClick={() => {
            const amt = parseFloat(retirementAmount);
            if (amt > 0) { contribute401k('roth_ira', amt); setRetirementAmount(''); }
          }}>Roth IRA</button>
          <button className="btn btn-outline" onClick={() => {
            const amt = parseFloat(retirementAmount);
            if (amt > 0) { contribute401k('traditional_ira', amt); setRetirementAmount(''); }
          }}>Traditional IRA</button>
          {has401k && (
            <button className="btn btn-success" onClick={() => {
              const amt = parseFloat(retirementAmount);
              if (amt > 0) { contribute401k('401k', amt); setRetirementAmount(''); }
            }}>401(k)</button>
          )}
        </div>
      </div>
    </div>
  );
}

function LotDetailPanel({ investment, currentWeek }: { investment: Investment; currentWeek: number }) {
  const totalUnrealizedGain = investment.lots.reduce((sum, lot) => {
    return sum + (investment.currentPrice - lot.purchasePrice) * lot.shares;
  }, 0);

  return (
    <div className="lot-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700 }}>
          Purchase Lots — {investment.name} ({investment.id})
        </h4>
        <span style={{ fontSize: '12px', color: totalUnrealizedGain >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          Unrealized: {totalUnrealizedGain >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedGain)}
        </span>
      </div>

      <div className="lot-row" style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)' }}>
        <span style={{ flex: 1 }}>Purchased</span>
        <span style={{ flex: 1 }}>Shares</span>
        <span style={{ flex: 1 }}>Cost Basis</span>
        <span style={{ flex: 1 }}>Current Value</span>
        <span style={{ flex: 1 }}>Gain/Loss</span>
        <span style={{ flex: 1 }}>Holding</span>
        <span style={{ flex: 1 }}>Type</span>
      </div>

      {investment.lots.map((lot, i) => {
        const weeksHeld = currentWeek - lot.purchaseWeek;
        const isLongTerm = weeksHeld >= CAPITAL_GAINS_RATES.longTermThresholdWeeks;
        const costBasis = lot.shares * lot.purchasePrice;
        const currentValue = lot.shares * investment.currentPrice;
        const gain = currentValue - costBasis;
        const gainPct = costBasis > 0 ? ((gain / costBasis) * 100).toFixed(1) : '0.0';
        const taxRate = isLongTerm ? CAPITAL_GAINS_RATES.longTerm : CAPITAL_GAINS_RATES.shortTerm;
        const potentialTax = gain > 0 ? gain * taxRate : 0;

        return (
          <div className="lot-row" key={i}>
            <span style={{ flex: 1 }}>Week {lot.purchaseWeek}</span>
            <span style={{ flex: 1 }}>{lot.shares}</span>
            <span style={{ flex: 1 }}>{formatCurrency(lot.purchasePrice)}/sh</span>
            <span style={{ flex: 1 }}>{formatCurrency(currentValue)}</span>
            <span style={{ flex: 1, color: gain >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct}%)
            </span>
            <span style={{ flex: 1 }}>{weeksHeld}w</span>
            <span style={{ flex: 1 }}>
              <span className={`lot-badge ${isLongTerm ? 'long-term' : 'short-term'}`}>
                {isLongTerm ? 'Long-term' : 'Short-term'}
              </span>
            </span>
          </div>
        );
      })}

      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
        <span>Short-term tax rate: {(CAPITAL_GAINS_RATES.shortTerm * 100)}%</span>
        <span>Long-term tax rate: {(CAPITAL_GAINS_RATES.longTerm * 100)}%</span>
        <span>Long-term threshold: {CAPITAL_GAINS_RATES.longTermThresholdWeeks} weeks (1 year)</span>
      </div>
      <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent-blue)' }}>
        Sold shares use FIFO (first-in, first-out). Oldest lots are sold first.
      </p>
    </div>
  );
}
