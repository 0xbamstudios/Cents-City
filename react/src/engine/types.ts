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

export interface Job {
  id: string;
  title: string;
  level: JobLevel;
  carNeeded: boolean;
  perHourWage: number;
  maxTips: number;
  educationCost: number;
  skillsGained: Partial<Record<SkillType, number>>;
  hoursPerWeek: number;
  description: string;
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
  refundOrOwed: number;
}

export interface Vehicle {
  owned: boolean;
  renting: boolean;
  vehicleId: string | null;   // id from vehicles.json
  name: string;
  value: number;
  mpg: number;
  reliability: number;
  insuranceCostPerYear: number;
  registrationCostPerYear: number;
  rentalCostPerWeek: number;  // 0 if owned
  hasLicense: boolean;
  licenseCost: number;
}

export interface Housing {
  type: 'parents_basement' | 'apartment' | 'house';
  rent: number;
  utilities: number;
  mortgage?: {
    principal: number;
    interestRate: number;
    monthlyPayment: number;
    remainingBalance: number;
  };
}

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseWeek: number;
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
  currentJob: Job | null;
  previousJobs: string[];

  // Finances
  checking: BankAccount;
  savings: BankAccount;
  totalSaved: number;

  // Tax
  w4: W4Form;
  taxReturns: TaxReturn[];
  yearToDateIncome: number;
  yearToDateWithholding: number;

  // Credit
  creditCards: CreditCard[];
  creditScore: CreditScore | null;
  creditHistory: number[]; // weekly scores

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
