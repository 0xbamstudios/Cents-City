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

    // Don't show jobs the player currently holds (primary or secondary)
    if (state.currentJob && state.currentJob.id === job.id) return false;
    if (state.secondaryJobs?.some(j => j.id === job.id)) return false;

    // Hide a job for 6 weeks after a rejection ("went with another candidate")
    const rejectedUntil = state.jobRejections?.[job.id];
    if (rejectedUntil !== undefined && state.currentWeek < rejectedUntil) return false;

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

    // ── Advanced career gating (C-Suite / Finance) ──
    // Executive Acumen requirement (skill hidden until unlocked; -1 means locked)
    if (job.minExecutiveAcumen !== undefined) {
      const ea = state.skills.skills.executive_acumen;
      if (ea < job.minExecutiveAcumen) return false;
    }
    // Financial Leadership must be unlocked (>= 0)
    if (job.requiresFinancialLeadership) {
      if ((state.skills.skills.financial_leadership ?? -1) < 0) return false;
    }
    // Family experience requirement (e.g. CEO needs prior C-Suite time)
    if (job.requiresFamilyExperience) {
      const weeks = weeksOfFamilyExperience(state, job.requiresFamilyExperience);
      if (weeks < (job.requiresFamilyWeeks || 52)) return false;
    }
    // Responsibility requirement (e.g. Principal Engineer / Eng Manager)
    if (job.minResponsibility !== undefined) {
      if ((state.skills.skills.responsibility ?? 0) < job.minResponsibility) return false;
    }

    return true;
  });
}

// Total weeks of experience the player has in a given job family (current + past)
export function weeksOfFamilyExperience(state: GameState, family: string): number {
  let weeks = 0;
  for (const entry of state.jobHistory) {
    if ((entry.job as any).family === family) {
      weeks += Math.max(0, entry.endWeek - entry.startWeek);
    }
  }
  // Include current job time
  const current = [state.currentJob, ...state.secondaryJobs].filter(Boolean) as Job[];
  for (const j of current) {
    if ((j as any).family === family) {
      const lastEnd = state.jobHistory.length > 0 ? state.jobHistory[state.jobHistory.length - 1].endWeek : 0;
      weeks += Math.max(0, state.currentWeek - lastEnd);
    }
  }
  return weeks;
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
  const base = job.annualSalary ? Math.round(job.annualSalary / 52) : job.perHourWage * job.hoursPerWeek;
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
