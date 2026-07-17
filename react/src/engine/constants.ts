// Game constants and configuration
// Tunable thresholds and parameters

// Feature flags
export const FEATURE_FLAGS = {
  DISABLE_SPEED_LOCK: true, // when true, all speed options available immediately
} as const;

export const THRESHOLDS = {
  INDEPENDENCE: 2000,       // threshold_one: move out of parents basement
  CREDIT_BUILDING: 5000,    // threshold_two: start building credit
  MOBILITY: 10000,          // threshold_three: buy a car
  INVESTING: 25000,         // threshold_five: open brokerage account
} as const;

export const LEVEL_TIME_MINUTES = 12; // minimum real-time minutes per level before speed up

export const TAX_BRACKETS_FEDERAL = [
  { min: 0, max: 11000, rate: 0.10 },
  { min: 11001, max: 44725, rate: 0.12 },
  { min: 44726, max: 95375, rate: 0.22 },
  { min: 95376, max: 182100, rate: 0.24 },
  { min: 182101, max: 231250, rate: 0.32 },
  { min: 231251, max: 578125, rate: 0.35 },
  { min: 578126, max: Infinity, rate: 0.37 },
] as const;

export const STANDARD_DEDUCTION = {
  single: 14600,
  married: 29200,
  head_of_household: 21900,
} as const;

export const CAPITAL_GAINS_RATES = {
  shortTerm: 0.22, // taxed as ordinary income (using 22% bracket)
  longTerm: 0.15,  // 15% for most earners
  longTermThresholdWeeks: 52, // 1 year = long term
} as const;

export const CREDIT_SCORE_RANGES = {
  POOR: { min: 300, max: 579 },
  FAIR: { min: 580, max: 669 },
  GOOD: { min: 670, max: 739 },
  VERY_GOOD: { min: 740, max: 799 },
  EXCELLENT: { min: 800, max: 850 },
} as const;

export const VEHICLE_COSTS = {
  insurance: 800,       // per year
  registration: 59,     // per year
  license: 100,         // one-time
  cheapCarPrice: 5000,
  usedCarPrice: 12000,
} as const;

// Fuel and inflation
export const FUEL = {
  basePricePerGallon: 3.50,    // starting gas price
  weeklyMiles: 150,            // average miles driven per week (commute + errands)
  weeklyMilesWithCarJob: 250,  // delivery/driving jobs use more
} as const;

export const INFLATION = {
  annualRate: 0.03,            // 3% annual inflation
  weeksPerAdjustment: 13,     // prices adjust quarterly
  fuelVolatility: 0.08,       // gas prices fluctuate more
} as const;

export const HOUSING_COSTS = {
  apartment: {
    rent: 850,
    utilities: 150,
    securityDeposit: 1700,
  },
  niceApartment: {
    rent: 1400,
    utilities: 180,
    securityDeposit: 2800,
  },
  house: {
    downPayment: 0.20,
    homePrice: 250000,
    propertyTaxRate: 0.012,
    insurance: 1200,
    utilities: 250,
    mortgageRate: 0.065, // 6.5% 30-year fixed
    mortgageTermYears: 30,
  },
  niceHouse: {
    downPayment: 0.20,
    homePrice: 450000,
    propertyTaxRate: 0.012,
    insurance: 2000,
    utilities: 350,
    mortgageRate: 0.065,
    mortgageTermYears: 30,
  },
} as const;

export const RETIREMENT = {
  rothIraLimit: 7000,        // annual contribution limit
  traditionalIraLimit: 7000,
  fourOhOneKLimit: 23000,
  employerMatchPercent: 0.04, // 4% match
  employerMatchMax: 0.06,     // up to 6% of salary
} as const;

export const CREDIT_CARD_OPTIONS = [
  {
    id: 'starter_card',
    name: 'Cents City Starter Card',
    limit: 500,
    apr: 0.2499,
    description: 'A starter card to build credit. Low limit, high APR.',
  },
  {
    id: 'cashback_card',
    name: 'Cents City Cash Back',
    limit: 2000,
    apr: 0.1999,
    minCreditScore: 650,
    description: '1.5% cash back on all purchases.',
  },
  {
    id: 'rewards_card',
    name: 'Cents City Rewards+',
    limit: 5000,
    apr: 0.1699,
    minCreditScore: 720,
    description: '2x points on dining and travel.',
  },
] as const;

export const GAME_WEEK_MS = 8000; // 8 seconds per game week at 1x speed

export const WEEKLY_EXPENSES = {
  food: 75,
  transport_no_car: 30,
  transport_car: 50, // gas
  entertainment: 25,
  phone: 20,
} as const;

export const SKILL_GAIN_PER_WEEK = 2; // base skill points per week worked

export const WORK_LIMITS = {
  maxHoursPerWeek: 90,
  exhaustionThreshold: 75, // hours above this cause exhaustion
  exhaustionGainPerWeek: 8, // exhaustion points gained per week over threshold
  exhaustionRecoveryPerWeek: 3, // exhaustion recovery per week when below threshold
  maxExhaustion: 100,
} as const;

export const STAGES_ORDER = [
  'GETTING_STARTED',
  'INDEPENDENCE',
  'CREDIT_BUILDING',
  'MOBILITY',
  'CAREER_GROWTH',
  'INVESTING',
  'LIFE_MILESTONES',
] as const;
