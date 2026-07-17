// Tax engine - W4 forms, withholding, filing
import { W4Form, TaxReturn, GameState } from './types';
import { TAX_BRACKETS_FEDERAL, STANDARD_DEDUCTION } from './constants';

export function createDefaultW4(): W4Form {
  return {
    type: 'W4_EZ',
    filingStatus: 'single',
    allowances: 1,
    additionalWithholding: 0,
    exemptFromWithholding: false,
  };
}

export function calculateWithholding(grossPay: number, w4: W4Form): number {
  if (w4.exemptFromWithholding) return 0;

  // Annualize the pay
  const annualGross = grossPay * 52;
  const deduction = STANDARD_DEDUCTION[w4.filingStatus];
  const taxableIncome = Math.max(0, annualGross - deduction);

  // Calculate federal tax
  let federalTax = 0;
  for (const bracket of TAX_BRACKETS_FEDERAL) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      federalTax += taxableInBracket * bracket.rate;
    }
  }

  // Adjust for allowances (each reduces taxable by ~$4,300)
  const allowanceReduction = w4.allowances * 4300 * 0.12; // rough reduction
  federalTax = Math.max(0, federalTax - allowanceReduction);

  // Weekly withholding
  let weeklyWithholding = federalTax / 52;

  // Add additional withholding
  weeklyWithholding += w4.additionalWithholding;

  return Math.round(weeklyWithholding * 100) / 100;
}

export function calculateAnnualTax(state: GameState): TaxReturn {
  const grossIncome = state.yearToDateIncome;
  const filingStatus = state.w4.filingStatus;
  const deduction = STANDARD_DEDUCTION[filingStatus];

  // Itemized deductions (available at higher stages)
  let itemizedDeductions = 0;
  if (state.housing.type === 'house' && state.housing.mortgage) {
    // Mortgage interest deduction
    itemizedDeductions += state.housing.mortgage.remainingBalance * state.housing.mortgage.interestRate;
  }
  // Property tax deduction
  if (state.housing.type === 'house') {
    itemizedDeductions += 250000 * 0.012; // property tax
  }
  // Retirement contributions
  for (const account of state.retirementAccounts) {
    if (account.type === 'traditional_ira' || account.type === '401k') {
      itemizedDeductions += account.contributions;
    }
  }

  const useItemized = itemizedDeductions > deduction;
  const actualDeduction = useItemized ? itemizedDeductions : deduction;
  const taxableIncome = Math.max(0, grossIncome - actualDeduction);

  // Calculate tax owed
  let taxOwed = 0;
  for (const bracket of TAX_BRACKETS_FEDERAL) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      taxOwed += taxableInBracket * bracket.rate;
    }
  }

  // Capital gains
  for (const inv of state.investments) {
    const gain = (inv.currentPrice - inv.purchasePrice) * inv.shares;
    if (gain > 0) {
      const weeksHeld = state.currentWeek - inv.purchaseWeek;
      const rate = weeksHeld >= 52 ? 0.15 : 0.22; // long vs short term
      taxOwed += gain * rate;
    }
  }

  taxOwed = Math.round(taxOwed * 100) / 100;
  const refundOrOwed = Math.round((state.yearToDateWithholding - taxOwed) * 100) / 100;

  return {
    year: Math.floor(state.currentWeek / 52) + 1,
    grossIncome,
    federalWithheld: state.yearToDateWithholding,
    stateWithheld: 0, // simplified
    standardDeduction: useItemized ? 0 : deduction,
    itemizedDeductions: useItemized ? itemizedDeductions : 0,
    taxableIncome,
    taxOwed,
    refundOrOwed, // positive = refund, negative = owe
  };
}

export function getW4Complexity(stage: string): 'W4_EZ' | 'W4_STANDARD' | 'W4_COMPLEX' {
  switch (stage) {
    case 'GETTING_STARTED':
    case 'INDEPENDENCE':
      return 'W4_EZ';
    case 'CREDIT_BUILDING':
    case 'MOBILITY':
      return 'W4_STANDARD';
    default:
      return 'W4_COMPLEX';
  }
}
