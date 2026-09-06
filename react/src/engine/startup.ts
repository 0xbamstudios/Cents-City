// Startup engine — exposure conditions, founding, funding rounds, IPO
import { GameState, Startup, StartupStage } from './types';
import { STARTUP } from './constants';
import { weeksOfFamilyExperience } from './jobs';

/**
 * Determine whether the "Found a Startup" option should be exposed to the player.
 * Any one of these paths unlocks it:
 *  - Financial Leadership visible AND has worked in a bank
 *  - Executive Acumen visible AND time with Online Coding Practice OR success as Jr Coder/Web Dev
 *  - Coding practice/dev experience AND Toastmasters for 2+ years
 *  - Volunteering 3+ years AND at least 1 continuing-ed business class
 *  - Has an MBA
 */
export function startupExposureReasons(state: GameState): string[] {
  const reasons: string[] = [];
  const s = state.skills.skills;

  const financialLeadershipVisible = (s.financial_leadership ?? -1) >= 0;
  const executiveAcumenVisible = (s.executive_acumen ?? -1) >= 0;

  const workedInBank = hasWorkedFamily(state, 'bank') || hasWorkedJobId(state, 'bank_teller');
  const codingExperience = hasHobbyHistory(state, 'coding_bootcamp_hobby') ||
    hasWorkedJobId(state, 'web_developer_jr') || hasWorkedJobId(state, 'senior_developer');
  const toastmastersYears = hobbyWeeks(state, 'toastmasters') / 52;
  const volunteeringYears = hobbyWeeks(state, 'volunteering') / 52;
  const hasMba = state.education.highestDegree === 'mba';
  const businessClasses = state.education.businessClassesTaken;

  if (financialLeadershipVisible && workedInBank) {
    reasons.push('Financial Leadership + banking experience');
  }
  if (executiveAcumenVisible && codingExperience) {
    reasons.push('Executive Acumen + software development experience');
  }
  if (codingExperience && toastmastersYears >= 2) {
    reasons.push('Software development experience + 2 years of Toastmasters');
  }
  if (volunteeringYears >= 3 && businessClasses >= 1) {
    reasons.push('3+ years volunteering + a business class');
  }
  if (hasMba) {
    reasons.push('You hold an MBA');
  }

  return reasons;
}

export function canFoundStartup(state: GameState): boolean {
  return !state.startup && startupExposureReasons(state).length > 0;
}

// Has the startup scaled enough that leading it becomes a 70h/week commitment?
export function isStartupScaled(startup: Startup): boolean {
  return startup.employees >= STARTUP.scaleEmployeeThreshold ||
    startup.stage === 'series_c' || startup.stage === 'series_d' || startup.public ||
    startup.annualRevenue >= STARTUP.scaleRevenueThreshold;
}

export function founderWeeklyHours(startup: Startup): number {
  if (!isStartupScaled(startup)) return 20; // early stage is lighter
  return startup.founderRole === 'lead' ? STARTUP.leadHoursPerWeek : STARTUP.boardHoursPerWeek;
}

export function nextRound(stage: StartupStage): StartupStage | null {
  const order: StartupStage[] = ['seed', 'series_a', 'series_b', 'series_c', 'series_d'];
  const idx = order.indexOf(stage);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

export function stageLabel(stage: StartupStage): string {
  switch (stage) {
    case 'seed': return 'Seed (Self-Funded)';
    case 'series_a': return 'Series A';
    case 'series_b': return 'Series B';
    case 'series_c': return 'Series C';
    case 'series_d': return 'Series D';
    case 'public': return 'Public (IPO)';
  }
}

export function canIPO(startup: Startup): boolean {
  if (startup.public || startup.failed) return false;
  // Must be at least Series C and profitable (revenue > 0 and reasonable scale)
  const stageOK = startup.stage === 'series_c' || startup.stage === 'series_d';
  return stageOK && startup.annualRevenue >= STARTUP.scaleRevenueThreshold;
}

// ── helpers ──
function hasWorkedFamily(state: GameState, family: string): boolean {
  return weeksOfFamilyExperience(state, family) > 0;
}
function hasWorkedJobId(state: GameState, jobId: string): boolean {
  if (state.previousJobs.includes(jobId)) return true;
  if (state.currentJob?.id === jobId) return true;
  return state.secondaryJobs.some(j => j.id === jobId);
}
function hobbyWeeks(state: GameState, hobbyId: string): number {
  return state.hobbyWeeks?.[hobbyId] || 0;
}
function hasHobbyHistory(state: GameState, hobbyId: string): boolean {
  return (state.hobbyWeeks?.[hobbyId] || 0) > 0;
}
