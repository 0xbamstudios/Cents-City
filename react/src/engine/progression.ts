// Progression engine - stage advancement and game events
import { GameState, GameStage, AdvisorMessage } from './types';
import { THRESHOLDS, LEVEL_TIME_MINUTES } from './constants';

export function checkStageProgression(state: GameState): GameStage {
  const totalCash = state.checking.balance + state.savings.balance;

  // Check from highest to lowest
  if (totalCash >= THRESHOLDS.INVESTING && state.retirementAccounts.length > 0) {
    return 'LIFE_MILESTONES';
  }
  if (totalCash >= THRESHOLDS.INVESTING) {
    return 'INVESTING';
  }
  if (state.currentJob && parseInt(state.currentJob.level.replace('level', '')) >= 7) {
    return 'CAREER_GROWTH';
  }
  if (totalCash >= THRESHOLDS.MOBILITY && state.vehicle.owned) {
    return 'MOBILITY';
  }
  if (totalCash >= THRESHOLDS.CREDIT_BUILDING) {
    return 'CREDIT_BUILDING';
  }
  if (totalCash >= THRESHOLDS.INDEPENDENCE) {
    return 'INDEPENDENCE';
  }
  return 'GETTING_STARTED';
}

export function canSpeedUp(state: GameState): boolean {
  const elapsedMs = state.realTimePlayedMs - state.levelStartTime;
  const elapsedMinutes = elapsedMs / 60000;
  return elapsedMinutes >= LEVEL_TIME_MINUTES;
}

export function getStageDescription(stage: GameStage): string {
  const descriptions: Record<GameStage, string> = {
    GETTING_STARTED: 'Get your first job, open bank accounts, and start saving!',
    INDEPENDENCE: 'Move out of your parents\' basement and manage rent and bills.',
    CREDIT_BUILDING: 'Open a credit card and start building your credit score.',
    MOBILITY: 'Buy a car and unlock better-paying jobs.',
    CAREER_GROWTH: 'Land a professional job with benefits like a 401k.',
    INVESTING: 'Open a brokerage account and start investing.',
    LIFE_MILESTONES: 'Marriage, house, kids — the big life decisions!',
  };
  return descriptions[stage];
}

export function getStageNumber(stage: GameStage): number {
  const order: GameStage[] = [
    'GETTING_STARTED', 'INDEPENDENCE', 'CREDIT_BUILDING',
    'MOBILITY', 'CAREER_GROWTH', 'INVESTING', 'LIFE_MILESTONES',
  ];
  return order.indexOf(stage) + 1;
}

export function getStageMilestone(stage: GameStage): string {
  const milestones: Record<GameStage, string> = {
    GETTING_STARTED: `Save $${THRESHOLDS.INDEPENDENCE.toLocaleString()}`,
    INDEPENDENCE: `Save $${THRESHOLDS.CREDIT_BUILDING.toLocaleString()}`,
    CREDIT_BUILDING: `Save $${THRESHOLDS.MOBILITY.toLocaleString()}`,
    MOBILITY: 'Land a Level 7+ job',
    CAREER_GROWTH: `Save $${THRESHOLDS.INVESTING.toLocaleString()}`,
    INVESTING: 'Open retirement accounts',
    LIFE_MILESTONES: 'Achieve financial freedom!',
  };
  return milestones[stage];
}
