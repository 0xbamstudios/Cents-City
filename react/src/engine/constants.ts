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

// Tax filing calendar (0-based months). The prior year's return can be filed
// starting Jan 15 and must be filed by Apr 15, with a reminder on Apr 1.
export const TAX_DEADLINES = {
  openMonth: 0, openDay: 15,       // Jan 15 — filing window opens
  reminderMonth: 3, reminderDay: 1, // Apr 1 — reminder
  dueMonth: 3, dueDay: 15,         // Apr 15 — deadline
} as const;

// Penalties for filing late (after Apr 15)
export const TAX_LATE_PENALTY = {
  flatFee: 135,             // one-time failure-to-file fee
  weeklyInterestRate: 0.0015, // ~8%/yr, accrues weekly on the tax owed while unfiled
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
  employerMatchPercent: 0.04, // employer matches your contribution up to 4%
  employerMatchMax: 0.04,     // match caps at 4% — encourages diverting at least 4%
  salaryAutoContributionPercent: 0.06, // default starting contribution rate
  maxEmployeeContributionPercent: 0.10, // employees may divert up to 10% of pay
  iraGrowthWeekly: 0.0015,   // ~8% annual growth on invested IRA balances
} as const;

// Car loan financing options
export const CAR_LOAN = {
  dealer: {
    downPaymentPercent: 0.10, // 10% down at the dealer
    apr: 0.089,               // dealer financing is pricier (8.9%)
    termMonths: 60,
  },
  bank: {
    downPaymentPercent: 0.20, // banks want 20% down
    apr: 0.059,               // better rate (5.9%) but stricter
    termMonths: 48,
    minCreditScore: 640,      // bank requires decent credit
  },
} as const;

// Unsecured personal loan from the bank (when you need cash). Rate scales with
// credit score; limit scales with income and credit.
export const PERSONAL_LOAN = {
  termMonths: 36,
  minAmount: 500,
  maxAmount: 50000,
  // APR by credit tier
  aprExcellent: 0.09,   // 740+
  aprGood: 0.14,        // 670+
  aprFair: 0.22,        // 580+
  aprPoor: 0.32,        // below 580 (or no score)
  originationFeePct: 0.02, // 2% origination fee deducted from proceeds
} as const;

// Education programs. Full-time completes in `fullTimeWeeks`; part-time takes ~2x
// but lets you keep working. Tuition is charged per credit as you complete them.
export const EDUCATION = {
  fullTimeCreditsPerWeek: 1.15,   // ~30 credits/year full-time
  partTimeCreditsPerWeek: 0.46,   // ~12 credits/year part-time
  employerCreditsPerYear: 12,     // salaried benefit: covers up to 12 credits/yr
  programs: {
    trade_school: {
      label: 'Trade School',
      credits: 30,
      tuitionPerCredit: 265,   // ~$8k total
      grantsDegree: 'trade_school' as const,
    },
    college: {
      label: "College (Bachelor's)",
      credits: 120,
      tuitionPerCredit: 335,   // ~$40k total
      grantsDegree: 'bachelors' as const,
    },
    mba: {
      label: 'MBA Program',
      credits: 60,
      tuitionPerCredit: 1000,  // ~$60k total
      grantsDegree: 'mba' as const,
      requiresBachelors: true,
    },
  },
} as const;

// Startup / founder path
export const STARTUP = {
  successChance: 0.5,           // odds a funding round succeeds when attempted
  seedSelfFunding: 15000,       // cash the founder puts in to start (initial treasury)
  founderStartEquity: 1.0,      // 100% at founding

  // Stealth-stage starting economics
  startWeeklyRevenue: 400,      // modest early revenue
  startWeeklyCosts: 600,        // early burn (net negative — treasury slowly shrinks)
  startEmployees: 1,

  // Weekly organic dynamics
  revenueGrowthPerWeek: 0.006,  // revenue trends up ~0.6%/week...
  revenueNoise: 0.15,           // ...with ±15% weekly noise (can shrink)
  costGrowthPerWeek: 0.004,     // costs creep up ~0.4%/week as the company grows
  employeeGrowthPerWeek: 0.03,  // ~0.03 employee/week accrual (scales with size)
  valuationRevenueMultiple: 30, // valuation ≈ annualized revenue * this + treasury

  // Funding rounds — gated by valuation; each injects capital + dilutes founder
  rounds: {
    series_a: { minValuation: 100000, raise: 500000, dilution: 0.20, revenueBump: 3.0, costBump: 2.2, employeeBump: 6 },
    series_b: { minValuation: 250000, raise: 2000000, dilution: 0.18, revenueBump: 2.5, costBump: 2.0, employeeBump: 20 },
    series_c: { minValuation: 500000, raise: 8000000, dilution: 0.15, revenueBump: 2.2, costBump: 1.9, employeeBump: 60 },
    series_d: { minValuation: 2000000, raise: 20000000, dilution: 0.12, revenueBump: 2.0, costBump: 1.8, employeeBump: 150 },
  },
  ipo: {
    minValuation: 1000000,        // IPO once the company is worth at least $1M
    cashOutPct: 0.10,             // founder cashes out 10% of their stake at IPO
  },

  // Failed-round consequences
  failedRoundCostSurchargePct: 0.05, // +5% costs...
  failedRoundSurchargeWeeks: 13,     // ...for ~3 months
  failedRoundLockoutWeeks: 9,        // ...and can't retry for ~2 months

  leadHoursPerWeek: 70,           // once scaled
  boardHoursPerWeek: 12,
  ceoSalary: 4000,                // weekly cost of hiring a CEO (board option)
  scaleEmployeeThreshold: 6,
  scaleRevenueThreshold: 500000,
} as const;

export const CREDIT_CARD_OPTIONS = [
  {
    id: 'starter_card',
    name: 'Cents City Starter Card',
    limit: 500,
    apr: 0.24,
    description: 'A starter card to build credit. Low limit, 24% APR on past-due balances.',
  },
  {
    id: 'cashback_card',
    name: 'Cents City Cash Back',
    limit: 2000,
    apr: 0.21,
    minCreditScore: 650,
    description: '1.5% cash back on all purchases. 21% APR on past-due balances.',
  },
  {
    id: 'rewards_card',
    name: 'Cents City Rewards+',
    limit: 5000,
    apr: 0.19,
    minCreditScore: 720,
    description: '2x points on dining and travel. 19% APR on past-due balances.',
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

// The object of the game: retire with a net worth of at least this much.
export const RETIRE_TARGET = 3000000;

export const SKILL_GAIN_PER_WEEK = 0.8; // base skill points per week worked (gradual growth)
// Physical endurance is exempt from the slower pace — it builds/erodes at its own rate.
export const PHYSICAL_ENDURANCE_GAIN_PER_WEEK = 2;

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
