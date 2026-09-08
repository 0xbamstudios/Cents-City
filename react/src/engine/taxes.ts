// Tax engine - W4 forms, withholding, filing
import { W4Form, TaxReturn, GameState } from './types';
import { TAX_BRACKETS_FEDERAL, STANDARD_DEDUCTION } from './constants';

// The in-game calendar: week 0 is Jan 6, 2025; each week is 7 days.
const GAME_START = new Date(2025, 0, 6);

export function gameDate(week: number): Date {
  return new Date(GAME_START.getTime() + week * 7 * 24 * 60 * 60 * 1000);
}

// Did this week cross a given calendar month/day (0-based month) since last week?
// True when last week was before the target date and this week is on/after it.
export function crossedCalendarDate(week: number, month: number, day: number): boolean {
  const prev = gameDate(week - 1);
  const curr = gameDate(week);
  const year = curr.getFullYear();
  // Build the target for the year the current week falls in; also check prev year's
  // target in case the week straddles a year boundary.
  const targets = [new Date(year, month, day), new Date(prev.getFullYear(), month, day)];
  return targets.some((t) => prev.getTime() < t.getTime() && curr.getTime() >= t.getTime());
}

// Format a week as a short calendar date (e.g. "Apr 15, 2026").
export function formatGameDate(week: number): string {
  return gameDate(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
  const refundBeforePenalty = state.yearToDateWithholding - taxOwed;

  // Underpayment penalty: IRS charges ~4% annualized penalty if you owe > $1000
  // and withheld less than 90% of tax owed
  let underpaymentPenalty = 0;
  if (refundBeforePenalty < -1000) {
    const withheldPercent = taxOwed > 0 ? state.yearToDateWithholding / taxOwed : 1;
    if (withheldPercent < 0.90) {
      // Penalty is approximately 4% of the underpayment amount
      const underpaymentAmount = Math.abs(refundBeforePenalty);
      underpaymentPenalty = Math.round(underpaymentAmount * 0.04 * 100) / 100;
    }
  }

  const refundOrOwed = Math.round((refundBeforePenalty - underpaymentPenalty) * 100) / 100;

  return {
    year: Math.floor(state.currentWeek / 52) + 1,
    grossIncome,
    federalWithheld: state.yearToDateWithholding,
    stateWithheld: 0,
    standardDeduction: useItemized ? 0 : deduction,
    itemizedDeductions: useItemized ? itemizedDeductions : 0,
    taxableIncome,
    taxOwed,
    underpaymentPenalty,
    refundOrOwed,
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
