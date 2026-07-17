import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { calculateAnnualTax, getW4Complexity } from '../engine/taxes';
import { W4Form } from '../engine/types';

export function TaxesPanel() {
  const state = useGameStore();
  const updateW4 = useGameStore((s) => s.updateW4);
  const fileTaxes = useGameStore((s) => s.fileTaxes);
  const complexity = getW4Complexity(state.stage);

  const handleW4Change = (field: string, value: string | number | boolean) => {
    updateW4({ ...state.w4, [field]: value } as W4Form);
  };

  const taxPreview = calculateAnnualTax(state);
  const weeksInYear = state.currentWeek % 52 || 52;
  const canFile = weeksInYear >= 50; // can file near end of year

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Taxes</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Manage your W-4 withholding and file your annual tax return.
      </p>

      {/* Paycheck Stub */}
      {state.currentJob && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Latest Paycheck Stub</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Week {state.currentWeek}
            </span>
          </div>
          <div className="paycheck-stub">
            <div className="paycheck-row">
              <span>Gross Pay ({state.currentJob.hoursPerWeek}h × ${state.currentJob.perHourWage}/hr)</span>
              <span>{formatCurrency(state.currentJob.perHourWage * state.currentJob.hoursPerWeek)}</span>
            </div>
            <div className="paycheck-row">
              <span>Federal Withholding</span>
              <span style={{ color: 'var(--accent-red)' }}>
                -{formatCurrency(state.yearToDateWithholding / Math.max(1, state.currentWeek))}
              </span>
            </div>
            <div className="paycheck-row total">
              <span>Net Pay (deposited)</span>
              <span>{formatCurrency(
                (state.currentJob.perHourWage * state.currentJob.hoursPerWeek) -
                (state.yearToDateWithholding / Math.max(1, state.currentWeek))
              )}</span>
            </div>
            <div className="paycheck-row" style={{ marginTop: '12px', opacity: 0.7 }}>
              <span>YTD Gross</span>
              <span>{formatCurrency(state.yearToDateIncome)}</span>
            </div>
            <div className="paycheck-row" style={{ opacity: 0.7 }}>
              <span>YTD Withholding</span>
              <span>{formatCurrency(state.yearToDateWithholding)}</span>
            </div>
          </div>
        </div>
      )}

      {/* W-4 Form */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">
            W-4 Form {complexity === 'W4_EZ' ? '(EZ)' : complexity === 'W4_STANDARD' ? '(Standard)' : '(Complex)'}
          </span>
          <span className="card-badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}>
            {complexity}
          </span>
        </div>
        <div className="w4-form">
          <div className="form-group">
            <label>Filing Status</label>
            <select
              value={state.w4.filingStatus}
              onChange={(e) => handleW4Change('filingStatus', e.target.value)}
            >
              <option value="single">Single</option>
              <option value="married" disabled={!state.isMarried}>Married Filing Jointly</option>
              <option value="head_of_household" disabled={state.children === 0}>Head of Household</option>
            </select>
          </div>

          <div className="form-group">
            <label>Allowances (each reduces withholding ~$83/week)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={state.w4.allowances}
              onChange={(e) => handleW4Change('allowances', Number(e.target.value))}
            />
          </div>

          {complexity !== 'W4_EZ' && (
            <div className="form-group">
              <label>Additional Withholding (per week)</label>
              <input
                type="number"
                min="0"
                step="5"
                value={state.w4.additionalWithholding}
                onChange={(e) => handleW4Change('additionalWithholding', Number(e.target.value))}
              />
            </div>
          )}

          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {complexity === 'W4_EZ'
              ? 'The EZ form uses standard deduction. As your finances get more complex, more options will unlock.'
              : 'Adjust your withholding to match your expected tax liability. Too little = owe at filing. Too much = giving an interest-free loan.'}
          </p>
        </div>
      </div>

      {/* Tax Return / Filing */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Tax Return Preview</span>
          <button
            className="btn btn-primary"
            onClick={fileTaxes}
            disabled={!canFile}
          >
            {canFile ? 'File Return' : `File in ${52 - weeksInYear} weeks`}
          </button>
        </div>
        <div className="paycheck-stub">
          <div className="paycheck-row">
            <span>Gross Income (YTD)</span>
            <span>{formatCurrency(taxPreview.grossIncome)}</span>
          </div>
          <div className="paycheck-row">
            <span>{taxPreview.standardDeduction > 0 ? 'Standard Deduction' : 'Itemized Deductions'}</span>
            <span>-{formatCurrency(taxPreview.standardDeduction || taxPreview.itemizedDeductions)}</span>
          </div>
          <div className="paycheck-row">
            <span>Taxable Income</span>
            <span>{formatCurrency(taxPreview.taxableIncome)}</span>
          </div>
          <div className="paycheck-row">
            <span>Tax Owed</span>
            <span>{formatCurrency(taxPreview.taxOwed)}</span>
          </div>
          <div className="paycheck-row">
            <span>Total Withheld</span>
            <span>{formatCurrency(taxPreview.federalWithheld)}</span>
          </div>
          <div className="paycheck-row total">
            <span>{taxPreview.refundOrOwed >= 0 ? '🎉 Refund' : '⚠️ You Owe'}</span>
            <span style={{ color: taxPreview.refundOrOwed >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {formatCurrency(Math.abs(taxPreview.refundOrOwed))}
            </span>
          </div>
        </div>

        {/* Past Returns */}
        {state.taxReturns.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>Past Returns</h4>
            {state.taxReturns.map((ret, i) => (
              <div key={i} className="paycheck-row">
                <span>Year {ret.year}</span>
                <span style={{ color: ret.refundOrOwed >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {ret.refundOrOwed >= 0 ? 'Refund' : 'Owed'}: {formatCurrency(Math.abs(ret.refundOrOwed))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
