import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { calculateAnnualTax } from '../engine/taxes';
import { STANDARD_DEDUCTION, TAX_BRACKETS_FEDERAL, CAPITAL_GAINS_RATES, RETIREMENT } from '../engine/constants';

interface Props {
  onClose: () => void;
  onFile: () => void;
}

export function TaxFilingModal({ onClose, onFile }: Props) {
  const state = useGameStore();

  const taxReturn = calculateAnnualTax(state as any);
  const filingStatus = state.w4.filingStatus;
  const standardDed = STANDARD_DEDUCTION[filingStatus];

  // Calculate capital gains details
  const capitalGains = state.investments.map((inv) => {
    const gain = (inv.currentPrice - inv.purchasePrice) * inv.shares;
    const weeksHeld = state.currentWeek - inv.purchaseWeek;
    const isLongTerm = weeksHeld >= CAPITAL_GAINS_RATES.longTermThresholdWeeks;
    const rate = isLongTerm ? CAPITAL_GAINS_RATES.longTerm : CAPITAL_GAINS_RATES.shortTerm;
    const tax = gain > 0 ? gain * rate : 0;
    return { name: inv.name, id: inv.id, gain, isLongTerm, rate, tax, weeksHeld, shares: inv.shares };
  }).filter(g => g.gain !== 0);

  const totalCapGainsTax = capitalGains.reduce((sum, g) => sum + g.tax, 0);

  // Retirement deductions
  const retirementDeductions = state.retirementAccounts
    .filter(a => a.type === 'traditional_ira' || a.type === '401k')
    .map(a => ({
      type: a.type === '401k' ? '401(k)' : 'Traditional IRA',
      amount: a.contributions,
    }));
  const totalRetirementDeduction = retirementDeductions.reduce((sum, r) => sum + r.amount, 0);

  // Determine if itemizing makes sense
  const itemizedTotal = totalRetirementDeduction +
    (state.housing.type === 'house' && state.housing.mortgage
      ? state.housing.mortgage.remainingBalance * state.housing.mortgage.interestRate
      : 0);
  const usingItemized = itemizedTotal > standardDed;

  // Calculate effective rate
  const effectiveRate = taxReturn.grossIncome > 0
    ? ((taxReturn.taxOwed / taxReturn.grossIncome) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tax Return — Year {Math.floor(state.currentWeek / 52) + 1}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Income Summary */}
        <div className="modal-section">
          <h4>Income</h4>
          <div className="paycheck-stub">
            <div className="paycheck-row">
              <span>Gross Wages (W-2)</span>
              <span>{formatCurrency(state.yearToDateIncome)}</span>
            </div>
            {capitalGains.length > 0 && (
              <div className="paycheck-row">
                <span>Capital Gains (see below)</span>
                <span>{formatCurrency(capitalGains.reduce((s, g) => s + Math.max(0, g.gain), 0))}</span>
              </div>
            )}
            <div className="paycheck-row total">
              <span>Total Gross Income</span>
              <span>{formatCurrency(taxReturn.grossIncome)}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="modal-section">
          <h4>Deductions</h4>
          <div className="paycheck-stub">
            <div className="paycheck-row">
              <span>Standard Deduction ({filingStatus})</span>
              <span>{formatCurrency(standardDed)}</span>
            </div>
            {retirementDeductions.map((r, i) => (
              <div className="paycheck-row" key={i}>
                <span>{r.type} contributions (tax-deferred)</span>
                <span>{formatCurrency(r.amount)}</span>
              </div>
            ))}
            {state.housing.type === 'house' && state.housing.mortgage && (
              <div className="paycheck-row">
                <span>Mortgage Interest</span>
                <span>{formatCurrency(state.housing.mortgage.remainingBalance * state.housing.mortgage.interestRate)}</span>
              </div>
            )}
            <div className="paycheck-row total">
              <span>Using: {usingItemized ? 'Itemized' : 'Standard'} Deduction</span>
              <span>-{formatCurrency(usingItemized ? itemizedTotal : standardDed)}</span>
            </div>
          </div>
          {totalRetirementDeduction > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '8px' }}>
              💡 Your {retirementDeductions.map(r => r.type).join(' and ')} contributions reduced your taxable income
              by {formatCurrency(totalRetirementDeduction)}. This is tax deferment — you'll pay taxes on withdrawal in retirement.
            </p>
          )}
        </div>

        {/* Tax Calculation */}
        <div className="modal-section">
          <h4>Federal Tax Calculation</h4>
          <div className="paycheck-stub">
            <div className="paycheck-row">
              <span>Taxable Income</span>
              <span>{formatCurrency(taxReturn.taxableIncome)}</span>
            </div>
            {TAX_BRACKETS_FEDERAL.map((bracket, i) => {
              const taxableInBracket = Math.max(0, Math.min(taxReturn.taxableIncome, bracket.max) - bracket.min);
              if (taxableInBracket <= 0) return null;
              return (
                <div className="paycheck-row" key={i} style={{ opacity: 0.8 }}>
                  <span style={{ paddingLeft: '12px' }}>
                    {(bracket.rate * 100)}% on {formatCurrency(bracket.min)}–{bracket.max === Infinity ? '∞' : formatCurrency(bracket.max)}
                  </span>
                  <span>{formatCurrency(taxableInBracket * bracket.rate)}</span>
                </div>
              );
            })}
            <div className="paycheck-row total">
              <span>Ordinary Income Tax</span>
              <span>{formatCurrency(taxReturn.taxOwed - totalCapGainsTax)}</span>
            </div>
          </div>
        </div>

        {/* Capital Gains */}
        {capitalGains.length > 0 && (
          <div className="modal-section">
            <h4>Capital Gains Tax</h4>
            <div className="paycheck-stub">
              {capitalGains.map((g, i) => (
                <div className="paycheck-row" key={i}>
                  <span>
                    {g.name} ({g.shares} shares) —{' '}
                    <span className={`lot-badge ${g.isLongTerm ? 'long-term' : 'short-term'}`}>
                      {g.isLongTerm ? 'Long-term' : 'Short-term'}
                    </span>
                    {' '}{(g.rate * 100)}%
                  </span>
                  <span style={{ color: g.gain >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {g.gain >= 0 ? '+' : ''}{formatCurrency(g.gain)} → tax: {formatCurrency(g.tax)}
                  </span>
                </div>
              ))}
              <div className="paycheck-row total">
                <span>Total Capital Gains Tax</span>
                <span>{formatCurrency(totalCapGainsTax)}</span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Short-term gains (held &lt;52 weeks) are taxed at {(CAPITAL_GAINS_RATES.shortTerm * 100)}%.
              Long-term gains (held 52+ weeks) are taxed at {(CAPITAL_GAINS_RATES.longTerm * 100)}%.
              Holding longer saves you {((CAPITAL_GAINS_RATES.shortTerm - CAPITAL_GAINS_RATES.longTerm) * 100)}% on gains.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="modal-section">
          <h4>Summary</h4>
          <div className="paycheck-stub">
            <div className="paycheck-row">
              <span>Total Tax Owed</span>
              <span>{formatCurrency(taxReturn.taxOwed)}</span>
            </div>
            <div className="paycheck-row">
              <span>Total Withheld (YTD)</span>
              <span>{formatCurrency(taxReturn.federalWithheld)}</span>
            </div>
            {taxReturn.underpaymentPenalty > 0 && (
              <div className="paycheck-row" style={{ color: 'var(--accent-red)' }}>
                <span>⚠️ Underpayment Penalty (4%)</span>
                <span>{formatCurrency(taxReturn.underpaymentPenalty)}</span>
              </div>
            )}
            <div className="paycheck-row">
              <span>Effective Tax Rate</span>
              <span>{effectiveRate}%</span>
            </div>
            {taxReturn.underpaymentPenalty > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--accent-red)', margin: '8px 0' }}>
                You owed more than $1,000 and withheld less than 90% of your tax liability.
                Increase your W-4 withholding to avoid this penalty next year.
              </p>
            )}
            <div className="paycheck-row total">
              <span style={{ fontSize: '15px' }}>
                {taxReturn.refundOrOwed >= 0 ? '🎉 Your Refund' : '⚠️ Amount You Owe'}
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 800,
                color: taxReturn.refundOrOwed >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {formatCurrency(Math.abs(taxReturn.refundOrOwed))}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onFile}>
            File Tax Return
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel (Review Later)
          </button>
        </div>

        {taxReturn.refundOrOwed >= 0 && (
          <p style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '8px', textAlign: 'center' }}>
            Your refund will be deposited into your checking account.
          </p>
        )}
      </div>
    </div>
  );
}
