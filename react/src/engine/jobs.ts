// Jobs engine - job management and career progression
import { Job, JobLevel, GameState } from './types';
import { THRESHOLDS } from './constants';
import { meetsJobRequirements } from './skills';
import jobsData from '../data/jobs.json';

export function loadJobs(): Job[] {
  return jobsData as Job[];
}

export function getAvailableJobsForStage(state: GameState): Job[] {
  const allJobs = loadJobs();

  // Filter jobs based on player's current level and progression
  const maxLevel = getMaxJobLevel(state);

  return allJobs.filter(job => {
    const jobLevelNum = parseInt(job.level.replace('level', ''));
    if (jobLevelNum > maxLevel) return false;

    // Don't show current job
    if (state.currentJob && state.currentJob.id === job.id) return false;

    // Check promotion prerequisites
    if (job.promotesFrom) {
      const weeksRequired = job.weeksRequired || 12;
      // Player must have worked the prerequisite job
      const hasWorkedPrereq = state.previousJobs.includes(job.promotesFrom) ||
        (state.currentJob && state.currentJob.id === job.promotesFrom);

      if (!hasWorkedPrereq) return false;

      // Check time in the prerequisite role
      const prereqHistory = state.jobHistory.find(h => h.job.id === job.promotesFrom);
      const currentlyInPrereq = state.currentJob && state.currentJob.id === job.promotesFrom;

      let weeksInRole = 0;
      if (prereqHistory) {
        weeksInRole = prereqHistory.endWeek - prereqHistory.startWeek;
      }
      if (currentlyInPrereq) {
        // Find when current job started (latest jobHistory entry or week 0)
        const lastHistoryEnd = state.jobHistory.length > 0
          ? state.jobHistory[state.jobHistory.length - 1].endWeek
          : 0;
        weeksInRole = state.currentWeek - lastHistoryEnd;
      }

      if (weeksInRole < weeksRequired) return false;
    }

    return true;
  });
}

function getMaxJobLevel(state: GameState): number {
  const totalSaved = state.checking.balance + state.savings.balance;

  // Base level available
  let maxLevel = 2; // levels 0-2 always available

  if (state.vehicle.owned) {
    maxLevel = 3; // car unlocks level 3
  }

  if (totalSaved >= THRESHOLDS.INDEPENDENCE) {
    maxLevel = Math.max(maxLevel, 4);
  }

  if (totalSaved >= THRESHOLDS.CREDIT_BUILDING) {
    maxLevel = Math.max(maxLevel, 5);
  }

  if (totalSaved >= THRESHOLDS.MOBILITY && state.vehicle.owned) {
    maxLevel = Math.max(maxLevel, 6);
  }

  if (totalSaved >= THRESHOLDS.INVESTING) {
    maxLevel = Math.max(maxLevel, 7);
  }

  return maxLevel;
}

export function applyForJob(job: Job, state: GameState): { success: boolean; message: string } {
  const { eligible, reasons } = meetsJobRequirements(job, state);

  if (!eligible) {
    return {
      success: false,
      message: `Application denied: ${reasons.join(', ')}`,
    };
  }

  // Education cost check
  if (job.educationCost > 0) {
    const canAfford = (state.checking.balance + state.savings.balance) >= job.educationCost;
    if (!canAfford) {
      return {
        success: false,
        message: `You need $${job.educationCost} for training/certification`,
      };
    }
  }

  // Simple success probability based on skills
  const skillBonus = calculateSkillBonus(job, state);
  const successChance = Math.min(0.95, 0.5 + skillBonus);
  const roll = Math.random();

  if (roll <= successChance) {
    return {
      success: true,
      message: `Congratulations! You got the ${job.title} job!`,
    };
  }

  return {
    success: false,
    message: `The employer went with another candidate. Keep building your skills!`,
  };
}

function calculateSkillBonus(job: Job, state: GameState): number {
  let bonus = 0;
  const skills = state.skills.skills;

  // Check job's skill requirements
  for (const [skill, weight] of Object.entries(job.skillsGained)) {
    const playerSkill = skills[skill as keyof typeof skills] || 0;
    bonus += (playerSkill / 100) * (weight || 0) * 0.1;
  }

  // Experience bonus - each previous job adds a small bonus
  bonus += state.previousJobs.length * 0.05;

  return Math.min(0.45, bonus);
}

export function calculateWeeklyPay(job: Job): { base: number; maxWithTips: number } {
  const base = job.perHourWage * job.hoursPerWeek;
  const maxTips = job.maxTips * job.hoursPerWeek * 0.3; // estimated tips per week
  return { base, maxWithTips: base + maxTips };
}

export function getJobLevelLabel(level: JobLevel): string {
  const num = parseInt(level.replace('level', ''));
  const labels = [
    'Entry Level',
    'Level 1',
    'Level 2',
    'Level 3',
    'Level 4',
    'Level 5',
    'Level 6',
    'Professional',
  ];
  return labels[num] || level;
}
