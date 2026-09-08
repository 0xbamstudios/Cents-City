// Skills engine - hidden skill tracking and job qualification
import { Job, PlayerSkills, SkillType, GameState } from './types';
import { SKILL_GAIN_PER_WEEK, PHYSICAL_ENDURANCE_GAIN_PER_WEEK } from './constants';

// Derived skills stay at -1 (hidden) until their prerequisite skills are all mastered.
export const DERIVED_SKILLS: SkillType[] = ['executive_acumen', 'financial_leadership'];
const HIDDEN = -1;
const DERIVED_GROWTH_PER_WEEK = 0.5; // ~full in ~4 game-years once unlocked

// Physical endurance naturally declines with age, starting at 35.
export const ENDURANCE_DECLINE_START_AGE = 35;
// Base loss of ~1% per year at age 35, accelerating ~1%/yr for each decade older.
const ENDURANCE_DECLINE_BASE_PER_YEAR = 1.0;
const ENDURANCE_DECLINE_ACCEL_PER_DECADE = 1.0;

// ── Happiness ──────────────────────────────────────────────────────────────
// Work-life balance drives happiness: long weeks wear you down, lighter weeks
// and hobbies restore it. When happiness gets low it starts harming your body
// and how well you connect with people.
export const HAPPINESS_OVERWORK_HOURS = 65;   // above this, happiness falls
export const HAPPINESS_RELIEF_HOURS = 50;     // below this, happiness rises
const HAPPINESS_OVERWORK_LOSS = 3;            // per week when overworked
const HAPPINESS_RELIEF_GAIN = 2;              // per week when under the relief line
const HAPPINESS_PER_HOBBY = 1.5;              // each active hobby adds this per week
export const HAPPINESS_LOW_THRESHOLD = 25;    // below this, consequences kick in
const ENDURANCE_UNHAPPY_LOSS_PCT = 0.10;      // lose 10% of endurance/week while unhappy
const ENDURANCE_UNHAPPY_FLOOR = 25;           // ...but not below 25%
const COMMUNICATION_UNHAPPY_LOSS = 2;         // communication drops per week while unhappy

export function createInitialSkills(): PlayerSkills {
  return {
    skills: {
      customer_service: 0,
      physical_endurance: 0,
      responsibility: 0,
      financial_acumen: 0,
      time_management: 0,
      leadership: 0,
      communication: 0,
      problem_solving: 0,
      technical: 0,
      creativity: 0,
      sales: 0,
      organization: 0,
      negotiation: 0,
      data_analysis: 0,
      teamwork: 0,
      happiness: 70,
      executive_acumen: HIDDEN,
      financial_leadership: HIDDEN,
    },
    hiddenMultipliers: {
      customer_service: 1,
      physical_endurance: 1,
      responsibility: 1,
      financial_acumen: 1,
      time_management: 1,
      leadership: 1,
      communication: 1,
      problem_solving: 1,
      technical: 1,
      creativity: 1,
      sales: 1,
      organization: 1,
      negotiation: 1,
      data_analysis: 1,
      teamwork: 1,
      happiness: 1,
      executive_acumen: 1,
      financial_leadership: 1,
    },
  };
}

// Is a derived skill unlocked (visible) yet?
export function isSkillVisible(skills: PlayerSkills, skill: SkillType): boolean {
  if (!DERIVED_SKILLS.includes(skill)) return true;
  return (skills.skills[skill] ?? HIDDEN) >= 0;
}

/**
 * Unlock and grow derived skills:
 * - Executive Acumen unlocks when Leadership, Time Management, Communication,
 *   Responsibility, and Problem Solving are all at 100%.
 * - Financial Leadership unlocks when Time Management, Responsibility, and
 *   Financial Acumen are all at 100%.
 * Once unlocked, each grows slowly every week.
 */
export function deriveSkills(skills: PlayerSkills): PlayerSkills {
  const s = { ...skills.skills };

  const at100 = (k: SkillType) => s[k] >= 100;

  // Executive Acumen
  const execReady = at100('leadership') && at100('time_management') &&
    at100('communication') && at100('responsibility') && at100('problem_solving');
  if (execReady) {
    if (s.executive_acumen < 0) s.executive_acumen = 0; // unlock
    s.executive_acumen = Math.min(100, s.executive_acumen + DERIVED_GROWTH_PER_WEEK);
  }

  // Financial Leadership
  const finReady = at100('time_management') && at100('responsibility') && at100('financial_acumen');
  if (finReady) {
    if (s.financial_leadership < 0) s.financial_leadership = 0; // unlock
    s.financial_leadership = Math.min(100, s.financial_leadership + DERIVED_GROWTH_PER_WEEK);
  }

  return { ...skills, skills: s };
}

/**
 * Physical endurance naturally declines once the player reaches 35.
 * The weekly loss grows with age: ~1%/yr at 35, accelerating ~1%/yr per decade
 * beyond that. No effect before 35, and endurance never drops below 0.
 */
export function declinePhysicalEndurance(skills: PlayerSkills, age: number): PlayerSkills {
  if (age < ENDURANCE_DECLINE_START_AGE) return skills;

  const decadesPast = (age - ENDURANCE_DECLINE_START_AGE) / 10;
  const yearlyLoss = ENDURANCE_DECLINE_BASE_PER_YEAR + ENDURANCE_DECLINE_ACCEL_PER_DECADE * decadesPast;
  const weeklyLoss = yearlyLoss / 52;

  const current = skills.skills.physical_endurance;
  if (current <= 0) return skills;

  const next = Math.max(0, Math.round((current - weeklyLoss) * 100) / 100);
  return { ...skills, skills: { ...skills.skills, physical_endurance: next } };
}

/**
 * Weekly happiness dynamics + low-happiness consequences.
 * - Working more than HAPPINESS_OVERWORK_HOURS/week lowers happiness.
 * - Working less than HAPPINESS_RELIEF_HOURS/week raises it.
 * - Each active hobby adds a small boost.
 * - While happiness is below HAPPINESS_LOW_THRESHOLD, physical endurance drains
 *   10%/week (down to a 25% floor) and communication slips.
 * Returns the updated skills plus any notifications worth surfacing.
 */
export function updateHappiness(
  skills: PlayerSkills,
  weeklyHours: number,
  activeHobbyCount: number
): { skills: PlayerSkills; notifications: string[] } {
  const s = { ...skills.skills };
  const notifications: string[] = [];

  let delta = 0;
  if (weeklyHours > HAPPINESS_OVERWORK_HOURS) delta -= HAPPINESS_OVERWORK_LOSS;
  else if (weeklyHours < HAPPINESS_RELIEF_HOURS) delta += HAPPINESS_RELIEF_GAIN;
  delta += activeHobbyCount * HAPPINESS_PER_HOBBY;

  const prev = s.happiness;
  s.happiness = Math.max(0, Math.min(100, Math.round((prev + delta) * 100) / 100));

  // Low-happiness consequences
  if (s.happiness < HAPPINESS_LOW_THRESHOLD) {
    // Physical endurance drops 10% of its current value per week, floored at 25%.
    if (s.physical_endurance > ENDURANCE_UNHAPPY_FLOOR) {
      const drained = s.physical_endurance * (1 - ENDURANCE_UNHAPPY_LOSS_PCT);
      s.physical_endurance = Math.max(ENDURANCE_UNHAPPY_FLOOR, Math.round(drained * 100) / 100);
    }
    // Communication suffers too.
    s.communication = Math.max(0, Math.round((s.communication - COMMUNICATION_UNHAPPY_LOSS) * 100) / 100);

    // Notify only when first crossing into the low zone
    if (prev >= HAPPINESS_LOW_THRESHOLD) {
      notifications.push('😞 Your happiness is critically low. Burnout is draining your physical endurance and hurting your communication. Cut back your hours or pick up a hobby.');
    }
  }

  return { skills: { ...skills, skills: s }, notifications };
}

export function gainSkillsFromJob(skills: PlayerSkills, job: Job): PlayerSkills {
  const newSkills = { ...skills.skills };
  const gained = job.skillsGained;

  // Every job builds time management slowly (gradual, matches base pace)
  newSkills.time_management = Math.min(100, newSkills.time_management + SKILL_GAIN_PER_WEEK * 0.5);

  // Apply job-specific skill gains. Physical endurance keeps its own (faster)
  // rate; all other skills grow at the more gradual base pace.
  for (const [skill, amount] of Object.entries(gained)) {
    const s = skill as SkillType;
    const rate = s === 'physical_endurance' ? PHYSICAL_ENDURANCE_GAIN_PER_WEEK : SKILL_GAIN_PER_WEEK;
    const gain = (amount || 0) * rate * skills.hiddenMultipliers[s];
    newSkills[s] = Math.min(100, newSkills[s] + gain);
  }

  return { ...skills, skills: newSkills };
}

export function meetsJobRequirements(job: Job, state: GameState): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check car requirement
  if (job.carNeeded && !state.vehicle.owned && !state.vehicle.leased) {
    reasons.push('Requires a car');
  }

  // Check education cost (must be able to afford)
  if (job.educationCost > 0 && (state.checking.balance + state.savings.balance) < job.educationCost) {
    reasons.push(`Requires $${job.educationCost} for training/education`);
  }

  // Check level prerequisites (hidden skill requirements)
  const levelNum = parseInt(job.level.replace('level', ''));
  
  if (levelNum >= 4) {
    // Need customer service or communication skills
    if (state.skills.skills.customer_service < 20 && state.skills.skills.communication < 20) {
      reasons.push('Needs more experience with people');
    }
  }

  if (levelNum >= 5) {
    if (state.skills.skills.responsibility < 30) {
      reasons.push('Needs to demonstrate more responsibility');
    }
  }

  if (levelNum >= 7) {
    if (state.skills.skills.financial_acumen < 40) {
      reasons.push('Needs financial knowledge');
    }
    if (state.skills.skills.problem_solving < 30) {
      reasons.push('Needs stronger problem-solving skills');
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

export function getSkillLevel(value: number): string {
  if (value >= 80) return 'Expert';
  if (value >= 60) return 'Advanced';
  if (value >= 40) return 'Intermediate';
  if (value >= 20) return 'Beginner';
  if (value > 0) return 'Novice';
  return 'None';
}

export function getTopSkills(skills: PlayerSkills, count: number = 3): { skill: SkillType; value: number }[] {
  return Object.entries(skills.skills)
    .map(([skill, value]) => ({ skill: skill as SkillType, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

export function getSkillLabel(skill: SkillType): string {
  const labels: Record<SkillType, string> = {
    customer_service: 'Customer Service',
    physical_endurance: 'Physical Endurance',
    responsibility: 'Responsibility',
    financial_acumen: 'Financial Acumen',
    time_management: 'Time Management',
    leadership: 'Leadership',
    communication: 'Communication',
    problem_solving: 'Problem Solving',
    technical: 'Technical',
    creativity: 'Creativity',
    sales: 'Sales',
    organization: 'Organization',
    negotiation: 'Negotiation',
    data_analysis: 'Data Analysis',
    teamwork: 'Teamwork',
    happiness: 'Happiness',
    executive_acumen: 'Executive Acumen',
    financial_leadership: 'Financial Leadership',
  };
  return labels[skill];
}
