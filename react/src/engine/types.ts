// Core types for Cents City game engine
// Designed to be portable to Roblox (Luau)

export type GameStage = 
  | 'GETTING_STARTED'
  | 'INDEPENDENCE'
  | 'CREDIT_BUILDING'
  | 'MOBILITY'
  | 'CAREER_GROWTH'
  | 'INVESTING'
  | 'LIFE_MILESTONES';

export type JobLevel = 'level0' | 'level1' | 'level2' | 'level3' | 'level4' | 'level5' | 'level6' | 'level7';

export type SkillType = 
  | 'customer_service'
  | 'physical_endurance'
  | 'responsibility'
  | 'financial_acumen'
  | 'time_management'
  | 'leadership'
  | 'communication'
  | 'problem_solving'
  | 'technical'
  | 'creativity'
  | 'sales'
  | 'organization'
  | 'negotiation'
  | 'data_analysis'
  | 'teamwork'
  | 'happiness'
  // Derived skills — appear only once prerequisite skills are mastered
  | 'executive_acumen'
  | 'financial_leadership';

export type AccountType = 'checking' | 'savings';

export type TaxFormType = 'W4_EZ' | 'W4_STANDARD' | 'W4_COMPLEX';

export type CreditScoreFactor = 
  | 'payment_history'
  | 'credit_utilization'
  | 'credit_age'
  | 'credit_mix'
  | 'hard_inquiries';

export type InvestmentType = 'stock' | 'bond' | 'index_fund';

export type RetirementAccountType = 'roth_ira' | 'traditional_ira' | '401k';

export type PayType = 'hourly' | 'salary';

export type JobFamily = 'general' | 'finance' | 'csuite' | 'ceo' | 'cfo' | 'bank' | 'marketing' | 'software' | 'engineering';

export interface Job {
  id: string;
  title: string;
  level: JobLevel;
  carNeeded: boolean;
  payType: PayType;
  perHourWage: number;
  maxTips: number;
  educationCost: number;
  skillsGained: Partial<Record<SkillType, number>>;
  hoursPerWeek: number;
  description: string;
  promotesFrom?: string;
  weeksRequired?: number;
  offers401k?: boolean; // true for all salary jobs + select hourly (e.g. municipal)

  // Advanced career gating
  family?: JobFamily;                 // classification used for prerequisite tracking
  minExecutiveAcumen?: number;        // requires Executive Acumen >= this (0-100)
  requiresFinancialLeadership?: boolean; // requires Financial Leadership to be unlocked
  requiresFamilyExperience?: JobFamily;  // must have worked a job of this family before
  requiresFamilyWeeks?: number;          // weeks of that family experience required
  minResponsibility?: number;            // requires Responsibility skill >= this (0-100)
  annualSalary?: number;              // for salaried exec/finance roles (overrides hourly calc)
  annualBonusMaxPct?: number;         // C-Suite: max annual bonus as % of salary (0-0.5)
}

export interface BankAccount {
  type: AccountType;
  balance: number;
  interestRate: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  date: number; // game week
  amount: number;
  description: string;
  category: TransactionCategory;
}

export type TransactionCategory = 
  | 'income'
  | 'rent'
  | 'utilities'
  | 'food'
  | 'transport'
  | 'insurance'
  | 'tax'
  | 'education'
  | 'credit_payment'
  | 'investment'
  | 'entertainment'
  | 'savings_transfer'
  | 'other';

export interface CreditCardCharge {
  week: number;
  amount: number;
  description: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  balance: number;
  statementBalance: number;
  lastStatementWeek: number;
  apr: number;
  minimumPayment: number;
  paymentHistory: CreditPayment[];
  recentCharges: CreditCardCharge[]; // last 20 charges for visibility
}

export interface CreditPayment {
  week: number;
  amount: number;
  onTime: boolean;
}

export interface CreditScore {
  score: number;
  factors: Record<CreditScoreFactor, number>;
}

export interface W4Form {
  type: TaxFormType;
  filingStatus: 'single' | 'married' | 'head_of_household';
  allowances: number;
  additionalWithholding: number;
  exemptFromWithholding: boolean;
}

// A prior-year return awaiting filing (window opens Jan 15, due Apr 15).
export interface PendingTaxReturn {
  year: number;            // the game-year the return is for
  income: number;          // that year's gross income (frozen snapshot)
  withholding: number;     // that year's federal withholding (frozen snapshot)
  openWeek: number;        // week the filing window opens (~Jan 15)
  dueWeek: number;         // week the return is due (~Apr 15)
  accruedPenalty: number;  // late fees + interest accrued so far
  weeksLate: number;       // weeks past the deadline while still unfiled
  flatFeeApplied: boolean; // one-time late fee already added?
  remindersFired: { open: boolean; reminder: boolean; due: boolean };
}

export interface TaxReturn {
  year: number;
  grossIncome: number;
  federalWithheld: number;
  stateWithheld: number;
  standardDeduction: number;
  itemizedDeductions: number;
  taxableIncome: number;
  taxOwed: number;
  underpaymentPenalty: number;
  refundOrOwed: number; // positive = refund, negative = owe (includes penalty)
}

export type VehicleType = 'none' | 'transit' | 'buy' | 'lease';

export interface VehicleOption {
  id: string;
  name: string;
  type: VehicleType;
  price: number;
  monthlyPayment: number;
  insurance: number;
  registration: number;
  mpg: number;
  reliability: number;
  description: string;
  unlocksCarJobs: boolean;
}

export interface Vehicle {
  owned: boolean;
  leased: boolean;
  transitPass: boolean;
  vehicleId: string | null;
  name: string;
  type: VehicleType;
  value: number;
  mpg: number;
  reliability: number;
  insuranceCostPerYear: number;
  registrationCostPerYear: number;
  monthlyPayment: number; // lease or transit pass payment
  hasLicense: boolean;
  licenseCost: number;
  purchaseWeek: number;
}

export interface Housing {
  type: 'parents_basement' | 'apartment' | 'nice_apartment' | 'house' | 'nice_house';
  rent: number;
  utilities: number;
  homeValue?: number; // current appreciated market value
  mortgage?: {
    principal: number;
    interestRate: number;
    monthlyPayment: number;
    remainingBalance: number;
  };
}

export interface InvestmentLot {
  shares: number;
  purchasePrice: number;
  purchaseWeek: number;
}

export type InvestmentAccount = 'brokerage' | 'roth_ira' | 'traditional_ira' | '401k';

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  shares: number;
  purchasePrice: number; // average cost basis
  currentPrice: number;
  purchaseWeek: number;
  lots: InvestmentLot[];
  account?: InvestmentAccount; // which account holds this position (default brokerage)
}

// A tradable stock in the global market.
export interface Stock {
  id: string;
  name: string;
  price: number;
  prevPrice: number;         // last week's price (for change %)
  volatility: number;        // base weekly volatility (0-1 scale)
  rateSensitivity: number;   // how much high interest rates drag the price (0-1)
  inflationSensitivity: number; // how much high inflation drags the price (0-1)
}

// A macro/market news headline. May target a specific stock and move its price.
export interface NewsItem {
  id: string;
  week: number;
  headline: string;
  stockId?: string;   // if set, this news moves that stock
  impactPct: number;  // signed % applied to the target stock next step (e.g. +0.08)
}

export interface RetirementAccount {
  id?: string;            // unique id (used to distinguish multiple 401ks from different jobs)
  type: RetirementAccountType;
  balance: number;
  contributions: number;
  employerMatch?: number;
  yearlyContributionLimit: number;
  invested?: number;      // portion invested in stocks/bonds (grows tax-free for IRAs)
  jobId?: string;         // for 401k: the job this account is tied to
  jobTitle?: string;      // for 401k: display name of the sponsoring employer
  active?: boolean;       // for 401k: false once you leave the job (rollover-eligible)
}

export type StartupStage = 'stealth' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'public';
export type FounderRole = 'lead' | 'board';

export interface Startup {
  id: string;                      // unique id (backend correlation)
  name: string;
  idea: string;                    // the founder's pitch, a few sentences
  foundedWeek: number;
  stage: StartupStage;
  founderRole: FounderRole;        // lead (70h once scaled) or board (12h, pays a CEO)
  founderEquityPct: number;        // player's ownership %, diluted by funding rounds
  valuation: number;               // current company valuation (tracks enterprise wealth)
  treasury: number;                // company's cash on hand — fails if this hits 0
  weeklyRevenue: number;           // money coming in each week (noisy)
  weeklyCosts: number;             // burn each week; grows as the company scales
  employees: number;
  cashRaised: number;              // total external capital raised
  weeklyFounderPay: number;        // salary the founder draws (0 until it can afford it)
  ceoSalary: number;               // paid if founderRole === 'board'
  failed: boolean;
  public: boolean;                 // has IPO'd
  lastRoundWeek: number;
  // Failed-round consequences
  costSurchargeUntilWeek: number;  // costs are +5% until this week (0 = none)
  fundingLockoutUntilWeek: number; // cannot attempt a raise until this week (0 = none)
  employeeAccrual: number;         // fractional employee growth carried between weeks
}

export type LoanType = 'auto_dealer' | 'auto_bank' | 'personal_bank';

export interface Loan {
  id: string;
  type: LoanType;
  name: string;
  principal: number;
  interestRate: number;      // annual APR
  monthlyPayment: number;
  remainingBalance: number;
  termMonths: number;
  startWeek: number;
  nextDueWeek: number;       // week the next payment is due
  weeksPastDue: number;      // how many weeks behind
}

export interface PlayerSkills {
  skills: Record<SkillType, number>; // 0-100
  hiddenMultipliers: Record<SkillType, number>;
}

export interface LifeEvent {
  type: 'marriage' | 'house_purchase' | 'child' | 'promotion' | 'layoff';
  week: number;
  description: string;
  financialImpact: number;
}

// A quick-time event awaiting the player's reaction. Holds the raw event effects
// (see QuickEventEffects in events.ts) plus when it fired, so the modal can time
// the reaction and scale the outcome.
export interface PendingQuickEvent {
  effects: {
    id: string;
    title: string;
    message: string;
    prompt?: string;
    reactable?: boolean;
    cashCost?: number;
    loseVehicle?: boolean;
    loaWeeks?: number;
    addLoan?: Omit<Loan, 'startWeek' | 'nextDueWeek' | 'weeksPastDue'>;
    insuranceSurchargePct?: number;
    insuranceSurchargeWeeks?: number;
    markRoofWeek?: boolean;
    markPaintWeek?: boolean;
    startChargingRent?: number;
    evict?: boolean;
    enableAutoTaxFiling?: boolean;
    enableBankingApp?: boolean;
  };
  week: number;
  firedAtMs: number; // Date.now() when the event popped, to measure reaction time
}

export interface AdvisorMessage {
  id: string;
  message: string;
  type: 'tip' | 'warning' | 'celebration' | 'opinion';
  week: number;
  dismissed: boolean;
}

export interface GameEvent {
  id: string;
  title: string;
  message: string;
  type: 'bill_due' | 'paycheck' | 'milestone' | 'opportunity' | 'emergency';
  week: number;
  actionRequired: boolean;
  action?: () => void;
}

export interface MultiplayerState {
  mode: 'single' | 'multiplayer';
  playerId: string;
  players: PlayerSummary[];
  sharedJobMarket: Job[];
}

export interface PlayerSummary {
  id: string;
  name: string;
  netWorth: number;
  creditScore: number;
  currentJob: string;
  stage: GameStage;
}

export type DegreeType = 'high_school' | 'trade_school' | 'associates' | 'bachelors' | 'mba';

export type ProgramType = 'trade_school' | 'college' | 'mba';
export type EnrollmentPace = 'full_time' | 'part_time';

export interface Enrollment {
  program: ProgramType;
  pace: EnrollmentPace;
  creditsRequired: number;
  creditsCompleted: number;
  creditsPerYearBenefit: number; // employer-covered credits per year (0 if none)
  tuitionPerCredit: number;
  startWeek: number;
}

export interface Certificate {
  name: string;
  weekEarned: number;
  cost: number;
  jobId: string; // the job that required it
}

export interface Education {
  highestDegree: DegreeType;
  certificates: Certificate[];
  enrollment: Enrollment | null;
  completedPrograms: ProgramType[];
  businessClassesTaken: number; // continuing-ed business classes (for startup path)
  employerCreditsUsedThisYear: number; // resets each game year
}

export interface Hobby {
  id: string;
  name: string;
  weeklyCost: number;
  skillsGained: Partial<Record<SkillType, number>>;
  description: string;
  icon: string;
}

export interface GameState {
  // Time
  currentWeek: number;
  gameSpeed: number; // 1, 2, 4, 8
  isPaused: boolean;
  realTimePlayedMs: number;
  levelStartTime: number;
  canSpeedUp: boolean;

  // Player
  playerName: string;
  stage: GameStage;
  currentJob: Job | null;       // primary job (salary or first hourly)
  secondaryJobs: Job[];         // additional hourly jobs
  jobNotices: Record<string, number>; // job id -> week when notice expires (last day)
  jobRejections: Record<string, number>; // job id -> week when a rejection cooldown expires
  totalWeeklyHours: number;     // computed: sum of all job hours
  exhaustion: number;           // 0-100, increases when >75h/week, slowly recovers
  hasHealthInsurance: boolean;  // true if any single hourly job is 40+ hours or any salary job
  has401kAccess: boolean;       // true if current job(s) offer 401k
  previousJobs: string[];

  // Hobbies
  activeHobbies: Hobby[];
  hobbyWeeks: Record<string, number>; // cumulative weeks spent on each hobby (by id)

  // Finances
  checking: BankAccount;
  savings: BankAccount;
  totalSaved: number;
  netWorthHistory: {
    week: number;
    total: number;
    pay: number;         // checking + savings
    investments: number; // brokerage stocks
    realEstate: number;  // home equity
    car: number;         // vehicle value
    fourOhOneK: number;
    traditionalIra: number;
    rothIra: number;
  }[];
  investmentHistory: {               // tracked each week
    total: number;
    brokerage: number;
    roth_ira: number;
    traditional_ira: number;
    fourOhOneK: number;
  }[];

  // Tax
  w4: W4Form;
  taxReturns: TaxReturn[];
  pendingTaxReturn: PendingTaxReturn | null; // prior-year return awaiting filing
  yearToDateIncome: number;
  yearToDateWithholding: number;

  // Credit
  creditCards: CreditCard[];
  creditScore: CreditScore | null;
  creditHistory: number[]; // weekly scores
  expenseCardAssignments: Record<string, string | null>; // expense category -> card id (null = checking)

  // Assets
  vehicle: Vehicle;
  housing: Housing;
  investments: Investment[];
  retirementAccounts: RetirementAccount[];
  loans: Loan[];
  startup: Startup | null;

  // Career
  skills: PlayerSkills;
  availableJobs: Job[];
  jobHistory: { job: Job; startWeek: number; endWeek: number }[];

  // Life
  age: number; // starts at 18
  education: Education;
  isMarried: boolean;
  children: number;
  lifeEvents: LifeEvent[];

  // Milestones
  achievedMilestones: string[];       // ids of celebrated milestones (fire once)
  employedSinceWeek: number | null;   // week continuous employment began (null if jobless)

  // Quick-time event reaction flow
  pendingQuickEvent: PendingQuickEvent | null; // active event awaiting player reaction (pauses time)
  firedEventIds: string[];            // ids of once-only events already triggered

  // Quick-time life events
  loaWeeksRemaining: number;          // unpaid (hourly) leave of absence weeks left
  carInsuranceSurcharge: {            // temporary insurance hike after an accident
    baseCostPerYear: number;          // pre-surcharge annual cost to restore later
    untilWeek: number;                // week the surcharge expires
  } | null;
  lastRoofRepairWeek: number;         // -1 if never
  lastPaintWeek: number;              // -1 if never

  // UI
  advisorMessages: AdvisorMessage[];
  events: GameEvent[];
  notifications: string[];

  // Economy
  economy: {
    inflationMultiplier: number;
    currentGasPrice: number;
    weeklyFuelCost: number;
    interestRate: number;   // short-term interest rate, as a percent (e.g. 4.5)
    inflationRate: number;  // annual inflation rate, as a percent (e.g. 3.0)
    costOfLivingIndex: number; // compounding cost-of-living multiplier (starts 1.0)
  };

  // Market & news
  stockMarket: Stock[];
  newsHistory: NewsItem[];

  // Multiplayer
  multiplayer: MultiplayerState;
}
