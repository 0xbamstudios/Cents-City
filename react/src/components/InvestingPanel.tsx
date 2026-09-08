import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { RETIREMENT, CAPITAL_GAINS_RATES } from '../engine/constants';
import { Investment } from '../engine/types';
import { LineChart } from './LineChart';
import { StackedAreaChart } from './StackedAreaChart';

export function InvestingPanel() {
  const state = useGameStore();
  const buyStock = useGameStore((s) => s.buyStock);
  const sellStock = useGameStore((s) => s.sellStock);
  const buyStockInAccount = useGameStore((s) => s.buyStockInAccount);
  const sellStockInAccount = useGameStore((s) => s.sellStockInAccount);
  const contribute401k = useGameStore((s) => s.contributeRetirement);
  const [buyShares, setBuyShares] = useState<Record<string, string>>({});
  const [buyDollars, setBuyDollars] = useState<Record<string, string>>({});
  const [sellShares, setSellShares] = useState<Record<string, string>>({});
  const [retirementAmount, setRetirementAmount] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [fundSource, setFundSource] = useState<'checking' | 'savings'>('checking');
  const [buyAccount, setBuyAccount] = useState<'brokerage' | 'roth_ira' | 'traditional_ira' | '401k'>('brokerage');
  const [chartView, setChartView] = useState<'total' | 'brokerage' | 'roth_ira' | 'traditional_ira' | 'fourOhOneK'>('total');

  // Live market from state, with a week-over-week change %
  const MOCK_STOCKS = state.stockMarket.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    change: s.prevPrice > 0 ? Math.round(((s.price - s.prevPrice) / s.prevPrice) * 1000) / 10 : 0,
  }));

  // Cash available to invest inside each retirement account (balance minus stocks held there)
  const accountCash = (acct: 'roth_ira' | 'traditional_ira' | '401k') => {
    const bal = state.retirementAccounts.filter(a => a.type === acct && a.active !== false).reduce((s, a) => s + a.balance, 0);
    const invested = state.investments.filter(i => i.account === acct).reduce((s, i) => s + i.shares * i.currentPrice, 0);
    return Math.max(0, bal - invested);
  };

  const has401k = state.has401kAccess;
  const rollover401k = useGameStore((s) => s.rollover401k);

  // Active 401(k) (current job) vs. inactive/rollover-eligible ones (former jobs)
  const active401ks = state.retirementAccounts.filter(a => a.type === '401k' && a.active !== false);
  const inactive401ks = state.retirementAccounts.filter(a => a.type === '401k' && a.active === false && a.balance > 0);
  const active401kBalance = active401ks.reduce((s, a) => s + a.balance, 0);
  const rolloverBalance = inactive401ks.reduce((s, a) => s + a.balance, 0);
  const canRollover = rolloverBalance > 0;

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
          {chartView === 'total' ? (
            <StackedAreaChart
              label="Total Portfolio (all accounts)"
              series={[
                { label: 'Brokerage', color: '#3b82f6', data: state.investmentHistory.map(h => h.brokerage) },
                { label: 'Roth IRA', color: '#10b981', data: state.investmentHistory.map(h => h.roth_ira) },
                { label: 'Traditional IRA', color: '#f59e0b', data: state.investmentHistory.map(h => h.traditional_ira) },
                { label: '401(k)', color: '#8b5cf6', data: state.investmentHistory.map(h => h.fourOhOneK) },
              ]}
            />
          ) : (
            <LineChart
              data={state.investmentHistory.map(h => h[chartView])}
              label={chartView === 'brokerage' ? 'Brokerage' : chartView === 'roth_ira' ? 'Roth IRA' : chartView === 'traditional_ira' ? 'Traditional IRA' : '401(k)'}
              color={chartView === 'brokerage' ? '#3b82f6' : '#10b981'}
            />
          )}
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
                      {inv.account && inv.account !== 'brokerage' && (
                        <span style={{ fontSize: '10px', marginLeft: '6px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)' }}>
                          {inv.account === 'roth_ira' ? 'Roth IRA' : inv.account === 'traditional_ira' ? 'Trad IRA' : '401(k)'}
                        </span>
                      )}
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
                          if (inv.account && inv.account !== 'brokerage') sellStockInAccount(inv.id, qty);
                          else sellStock(inv.id, qty);
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
                        if (inv.account && inv.account !== 'brokerage') sellStockInAccount(inv.id, inv.shares);
                        else sellStock(inv.id, inv.shares);
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
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Account:</span>
            <select
              value={buyAccount}
              onChange={(e) => setBuyAccount(e.target.value as any)}
              style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
            >
              <option value="brokerage">Brokerage</option>
              <option value="roth_ira">Roth IRA ({formatCurrency(accountCash('roth_ira'))})</option>
              <option value="traditional_ira">Traditional IRA ({formatCurrency(accountCash('traditional_ira'))})</option>
              <option value="401k">401(k) ({formatCurrency(accountCash('401k'))})</option>
            </select>
            {buyAccount === 'brokerage' && (
              <select
                value={fundSource}
                onChange={(e) => setFundSource(e.target.value as 'checking' | 'savings')}
                style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            )}
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
                      if (buyAccount === 'brokerage') {
                        buyStock(stock.id, stock.name, stock.price, qty, fundSource);
                      } else {
                        buyStockInAccount(stock.id, stock.name, stock.price, qty, buyAccount);
                      }
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
        {/* Active 401(k) — automatic for salaried jobs */}
        {has401k && (
          <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>401(k)</strong> <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>• Auto-contributing</span></span>
              <span>{formatCurrency(active401kBalance)}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {RETIREMENT.salaryAutoContributionPercent * 100}% of your salary is contributed automatically,
              plus a {RETIREMENT.employerMatchPercent * 100}% employer match. Annual limit: {formatCurrency(RETIREMENT.fourOhOneKLimit)}
            </div>
          </div>
        )}
        {!has401k && active401kBalance === 0 && rolloverBalance === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            A 401(k) starts automatically when you take a salaried job. Contributions are deducted from each paycheck.
          </p>
        )}

        {/* 401k Rollover — inactive 401(k)s from former jobs */}
        {canRollover && (
          <div style={{ padding: '12px', background: 'rgba(59,130,246,0.05)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '13px' }}>Former 401(k) — Rollover Available</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  You have {formatCurrency(rolloverBalance)} in {inactive401ks.length} old 401(k){inactive401ks.length > 1 ? 's' : ''} from previous
                  {inactive401ks.length > 1 ? ' jobs' : ' a job'}. Roll it into a Traditional IRA (no penalty) to invest for tax-free growth.
                </div>
              </div>
              <button className="btn btn-primary" onClick={rollover401k}>
                Roll Over
              </button>
            </div>
          </div>
        )}

        {/* IRA balances */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {(['roth_ira', 'traditional_ira'] as const).map((type) => {
            const account = state.retirementAccounts.find(a => a.type === type);
            const label = type === 'roth_ira' ? 'Roth IRA' : 'Traditional IRA';
            const invested = account?.invested || 0;
            return (
              <div key={type} style={{ flex: 1, padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  {formatCurrency(account?.balance || 0)}
                </div>
                {invested > 0 && (
                  <div style={{ fontSize: '10px', color: 'var(--accent-green)' }}>
                    {formatCurrency(invested)} invested (tax-free growth)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          IRA contributions are invested in stocks and bonds. All gains grow tax-free.
        </p>
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
          }}>Invest in Roth IRA</button>
          <button className="btn btn-outline" onClick={() => {
            const amt = parseFloat(retirementAmount);
            if (amt > 0) { contribute401k('traditional_ira', amt); setRetirementAmount(''); }
          }}>Invest in Traditional IRA</button>
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
