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
  | 'teamwork';

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

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  balance: number;
  statementBalance: number; // balance at last statement date — interest accrues on this
  lastStatementWeek: number; // week when last statement was generated
  apr: number;
  minimumPayment: number;
  paymentHistory: CreditPayment[];
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

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  shares: number;
  purchasePrice: number; // average cost basis
  currentPrice: number;
  purchaseWeek: number;
  lots: InvestmentLot[];
}

export interface RetirementAccount {
  type: RetirementAccountType;
  balance: number;
  contributions: number;
  employerMatch?: number;
  yearlyContributionLimit: number;
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

export type DegreeType = 'high_school' | 'associates' | 'bachelors' | 'masters';

export interface Certificate {
  name: string;
  weekEarned: number;
  cost: number;
  jobId: string; // the job that required it
}

export interface Education {
  highestDegree: DegreeType;
  certificates: Certificate[];
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
  totalWeeklyHours: number;     // computed: sum of all job hours
  exhaustion: number;           // 0-100, increases when >75h/week, slowly recovers
  hasHealthInsurance: boolean;  // true if any single hourly job is 40+ hours or any salary job
  has401kAccess: boolean;       // true if current job(s) offer 401k
  previousJobs: string[];

  // Hobbies
  activeHobbies: Hobby[];

  // Finances
  checking: BankAccount;
  savings: BankAccount;
  totalSaved: number;
  netWorthHistory: number[];         // net worth at each week
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

  // UI
  advisorMessages: AdvisorMessage[];
  events: GameEvent[];
  notifications: string[];

  // Economy
  economy: {
    inflationMultiplier: number;
    currentGasPrice: number;
    weeklyFuelCost: number;
  };

  // Multiplayer
  multiplayer: MultiplayerState;
}
