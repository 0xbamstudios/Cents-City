import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { RETIREMENT } from '../engine/constants';

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
  const [sellShares, setSellShares] = useState<Record<string, string>>({});
  const [retirementAmount, setRetirementAmount] = useState('');

  const has401k = state.currentJob &&
    parseInt(state.currentJob.level.replace('level', '')) >= 7;

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Investing</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Grow your wealth through stocks and retirement accounts.
      </p>

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
              return (
                <div key={inv.id} className="stock-card" style={{ flexWrap: 'wrap' }}>
                  <div>
                    <div className="stock-name">{inv.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {inv.shares} shares @ {formatCurrency(inv.purchasePrice)}
                      {' '}• held {state.currentWeek - inv.purchaseWeek} weeks
                      {state.currentWeek - inv.purchaseWeek >= 52 ? ' (long-term)' : ' (short-term)'}
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
                      onChange={(e) => setSellShares({ ...sellShares, [inv.id]: e.target.value })}
                      style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                    <button
                      className="btn btn-danger"
                      onClick={() => {
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
                      onClick={() => {
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
        </div>
      )}

      {/* Buy Stocks */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Stock Market</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Available: {formatCurrency(state.checking.balance)}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Buy stocks with your checking account. Held &lt;1 year = short-term capital gains (22%).
          Held &gt;1 year = long-term (15%).
        </p>
        <div className="stock-list">
          {MOCK_STOCKS.map((stock) => (
            <div key={stock.id} className="stock-card">
              <div>
                <div className="stock-name">{stock.id}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {stock.name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                  <div className="stock-price">{formatCurrency(stock.price)}</div>
                  <div className={`stock-change ${stock.change >= 0 ? 'up' : 'down'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={buyShares[stock.id] || ''}
                  onChange={(e) => setBuyShares({ ...buyShares, [stock.id]: e.target.value })}
                  style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const qty = parseInt(buyShares[stock.id] || '0');
                    if (qty > 0) {
                      buyStock(stock.id, stock.name, stock.price, qty);
                      setBuyShares({ ...buyShares, [stock.id]: '' });
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
            401(k) available when you reach a Level 7 job with benefits.
          </p>
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
