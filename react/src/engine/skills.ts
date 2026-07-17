// Skills engine - hidden skill tracking and job qualification
import { Job, PlayerSkills, SkillType, GameState } from './types';
import { SKILL_GAIN_PER_WEEK } from './constants';

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
    },
  };
}

export function gainSkillsFromJob(skills: PlayerSkills, job: Job): PlayerSkills {
  const newSkills = { ...skills.skills };
  const gained = job.skillsGained;

  // Every job builds time management slowly
  newSkills.time_management = Math.min(100, newSkills.time_management + 1);

  // Apply job-specific skill gains
  for (const [skill, amount] of Object.entries(gained)) {
    const s = skill as SkillType;
    const gain = (amount || 0) * SKILL_GAIN_PER_WEEK * skills.hiddenMultipliers[s];
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
  };
  return labels[skill];
}
