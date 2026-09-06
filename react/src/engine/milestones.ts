// Milestone detection engine.
// Each week (and after key actions) detectMilestones inspects the player's
// situation and returns any milestones newly reached this tick, so the store
// can fire a celebratory toast exactly once per achievement.
import { GameState } from './types';

export const TENURE_MILESTONE_WEEKS = 26; // ~6 months

// Total value of the investment portfolio, including retirement accounts.
export function portfolioValue(state: GameState): number {
  const brokerage = state.investments.reduce((sum, inv) => sum + inv.shares * inv.currentPrice, 0);
  const retirement = state.retirementAccounts.reduce((sum, acct) => sum + acct.balance, 0);
  return brokerage + retirement;
}

interface MilestoneDef {
  id: string;
  message: string;
  reached: (state: GameState) => boolean;
}

// Order matters only for display when several land in the same week.
const MILESTONES: MilestoneDef[] = [
  {
    id: 'first_job',
    message: '🎉 Milestone: You landed your first job! Every financial journey starts with a paycheck.',
    reached: (s) => !!s.currentJob || s.previousJobs.length > 0,
  },
  {
    id: 'saved_1000',
    message: '🎉 Milestone: You saved your first $1,000! A cash cushion is the start of stability.',
    reached: (s) => s.checking.balance + s.savings.balance >= 1000,
  },
  {
    id: 'job_6_months',
    message: '🎉 Milestone: Six months at the same job! Steady employment builds your career and your credit.',
    reached: (s) => s.employedSinceWeek !== null && (s.currentWeek - s.employedSinceWeek) >= TENURE_MILESTONE_WEEKS,
  },
  {
    id: 'health_insurance',
    message: '🎉 Milestone: You got Health Insurance! One surprise illness can no longer wipe you out.',
    reached: (s) => s.hasHealthInsurance,
  },
  {
    id: 'retirement_started',
    message: '🎉 Milestone: You started investing for retirement! Time in the market is your biggest advantage.',
    reached: (s) => s.retirementAccounts.some((a) => a.balance > 0),
  },
  {
    id: 'first_credit_card',
    message: '🎉 Milestone: You got your first credit card! Use it responsibly and it becomes a powerful tool.',
    reached: (s) => s.creditCards.length > 0,
  },
  {
    id: 'credit_established',
    message: '🎉 Milestone: You started establishing credit! Lenders can now see your track record.',
    reached: (s) => s.creditScore !== null && s.creditScore.score > 0,
  },
  {
    id: 'credit_700',
    message: '🎉 Milestone: Your credit score reached 700! You now qualify for better rates and terms.',
    reached: (s) => (s.creditScore?.score ?? 0) >= 700,
  },
  {
    id: 'credit_800',
    message: '🎉 Milestone: Your credit score reached 800! That is excellent credit — the best rates are yours.',
    reached: (s) => (s.creditScore?.score ?? 0) >= 800,
  },
  {
    id: 'happiness_100',
    message: '🎉 Milestone: Your happiness reached 100%! Great work-life balance keeps you healthy and sharp.',
    reached: (s) => (s.skills.skills.happiness ?? 0) >= 100,
  },
  {
    id: 'portfolio_500k',
    message: '🎉 Milestone: Your investment portfolio (including retirement) passed $500,000! Compounding is working for you.',
    reached: (s) => portfolioValue(s) >= 500000,
  },
  {
    id: 'portfolio_1m',
    message: '🎉 Milestone: Your investment portfolio (including retirement) passed $1,000,000! You are a millionaire investor.',
    reached: (s) => portfolioValue(s) >= 1000000,
  },
];

/**
 * Returns the ids and toast messages for milestones reached that are not yet in
 * the achieved list. Pure — the caller merges ids into state.achievedMilestones
 * and pushes the toasts to notifications.
 */
export function detectMilestones(state: GameState, achieved: string[]): { ids: string[]; toasts: string[] } {
  const ids: string[] = [];
  const toasts: string[] = [];
  for (const m of MILESTONES) {
    if (achieved.includes(m.id)) continue;
    if (m.reached(state)) {
      ids.push(m.id);
      toasts.push(m.message);
    }
  }
  return { ids, toasts };
}
