import { create } from 'zustand';
import { GameState, Job, W4Form, AdvisorMessage, RetirementAccountType, BankAccount, Loan, Startup } from '../engine/types';
import { createBankAccount, deposit, withdraw, applySavingsInterest, calculateWeeklyIncome, calculateWeeklyExpenses, formatCurrency, getNetWorth } from '../engine/finance';
import { createDefaultW4, calculateWithholding, calculateAnnualTax as calculateAnnualTaxFn, crossedCalendarDate, formatGameDate } from '../engine/taxes';
import { createInitialSkills, gainSkillsFromJob, deriveSkills, declinePhysicalEndurance, updateHappiness } from '../engine/skills';
import { calculateCreditScore, openCreditCard as openCard, makeCardPayment, applyCardInterest } from '../engine/credit';
import { checkStageProgression, canSpeedUp } from '../engine/progression';
import { generateAdvisorMessages } from '../engine/advisor';
import { applyForJob as engineApplyForJob } from '../engine/jobs';
import { canFoundStartup, nextRound, isStartupScaled, founderWeeklyHours, canIPO } from '../engine/startup';
import { rollQuickEvents } from '../engine/events';
import { detectMilestones } from '../engine/milestones';
import { createInitialStocks, stepMacro, stepMarket, maybeGenerateNews } from '../engine/market';
import { incrementGameCounter, saveStartupIdea, updateStartup as apiUpdateStartup, recordRetirement } from '../engine/api';
import { GAME_WEEK_MS, HOUSING_COSTS, VEHICLE_COSTS, RETIREMENT, FEATURE_FLAGS, CAR_LOAN, EDUCATION, STARTUP, RETIRE_TARGET, TAX_DEADLINES, TAX_LATE_PENALTY, PERSONAL_LOAN } from '../engine/constants';
import vehiclesData from '../data/vehicles.json';
import hobbiesData from '../data/hobbies.json';

type Panel = 'dashboard' | 'jobs' | 'education' | 'banking' | 'credit' | 'housing' | 'utilities' | 'taxes' | 'investing' | 'settings';

export interface GameSettings {
  autoBillPay: boolean;
  autoTaxFiling: boolean;
  autoCreditCardPay: boolean;
}

interface GameStore extends GameState {
  activePanel: Panel;
  sidebarCollapsed: boolean;
  depositSplit: number;
  contribution401kPercent: number; // player-chosen pre-tax 401(k) contribution % (whole number)
  gameLoopInterval: number | null;
  settings: GameSettings;
  pendingBills: PendingBill[];
  showTutorial: boolean; // getting-started tutorial overlay for new players
  gameId: string | null;  // unique id for this playthrough (backend correlation)
  retired: boolean;       // player retired (reached the net-worth goal and cashed out)

  // Actions
  startGame: (name: string) => void;
  dismissTutorial: () => void;
  resolveQuickEvent: (reactionMs: number) => void;
  setActivePanel: (panel: Panel) => void;
  setGameSpeed: (speed: number) => void;
  togglePause: () => void;
  advanceWeek: () => void;
  startGameLoop: () => void;
  stopGameLoop: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  payBill: (billId: string) => void;

  // Player actions
  applyForJob: (job: Job) => void;
  addAdditionalJob: (job: Job) => void;
  quitJob: (jobId: string) => void;
  startHobby: (hobbyId: string) => void;
  stopHobby: (hobbyId: string) => void;
  transferMoney: (direction: 'toSavings' | 'toChecking', amount: number) => void;
  setDepositSplit: (percent: number) => void;
  set401kContribution: (percent: number) => void;
  updateW4: (w4: W4Form) => void;
  fileTaxes: () => void;
  moveToApartment: () => void;
  moveToNiceApartment: () => void;
  buyHouse: (tier: 'house' | 'nice_house') => void;
  buyCar: () => void;
  acquireVehicle: (vehicleId: string) => void;
  financeVehicle: (vehicleId: string, lender: 'dealer' | 'bank') => void;
  takeBankLoan: (amount: number, toAccount?: 'checking' | 'savings') => void;
  sellVehicle: () => void;
  tradeInVehicle: (newVehicleId: string) => void;
  openCreditCard: (cardId: string) => void;
  closeCreditCard: (cardId: string) => void;
  setExpenseCardAssignment: (category: string, cardId: string | null) => void;
  makeCreditCardPayment: (cardId: string, amount: number) => void;
  buyStock: (id: string, name: string, price: number, shares: number, fundFrom?: 'checking' | 'savings') => void;
  sellStock: (id: string, shares: number) => void;
  buyStockInAccount: (stockId: string, name: string, price: number, shares: number, account: 'roth_ira' | 'traditional_ira' | '401k') => void;
  sellStockInAccount: (investmentId: string, shares: number) => void;
  contributeRetirement: (type: RetirementAccountType, amount: number) => void;
  rollover401k: () => void;
  enrollInProgram: (program: 'trade_school' | 'college' | 'mba', pace: 'full_time' | 'part_time') => void;
  switchEnrollmentPace: () => void;
  dropProgram: () => void;
  takeBusinessClass: () => void;
  foundStartup: (name: string, idea: string) => void;
  raiseFundingRound: () => void;
  setFounderRole: (role: 'lead' | 'board') => void;
  takeStartupPublic: () => void;
  exitStartup: () => void;
  retire: () => void;
  clearNotification: (index: number) => void;
  clearAllNotifications: () => void;
  addNotification: (msg: string) => void;
}

export interface PendingBill {
  id: string;
  name: string;
  amount: number;
  dueWeek: number;
  category: 'rent' | 'utilities' | 'insurance' | 'registration';
  paid: boolean;
}

const initialState = (): Omit<GameStore, 'startGame' | 'retire' | 'dismissTutorial' | 'resolveQuickEvent' | 'setActivePanel' | 'setGameSpeed' | 'togglePause' | 'advanceWeek' | 'startGameLoop' | 'stopGameLoop' | 'updateSettings' | 'payBill' | 'applyForJob' | 'addAdditionalJob' | 'quitJob' | 'startHobby' | 'stopHobby' | 'transferMoney' | 'setDepositSplit' | 'set401kContribution' | 'updateW4' | 'fileTaxes' | 'moveToApartment' | 'moveToNiceApartment' | 'buyHouse' | 'buyCar' | 'acquireVehicle' | 'financeVehicle' | 'takeBankLoan' | 'sellVehicle' | 'tradeInVehicle' | 'openCreditCard' | 'closeCreditCard' | 'setExpenseCardAssignment' | 'makeCreditCardPayment' | 'buyStock' | 'sellStock' | 'buyStockInAccount' | 'sellStockInAccount' | 'contributeRetirement' | 'rollover401k' | 'enrollInProgram' | 'switchEnrollmentPace' | 'dropProgram' | 'takeBusinessClass' | 'foundStartup' | 'raiseFundingRound' | 'setFounderRole' | 'takeStartupPublic' | 'exitStartup' | 'clearNotification' | 'clearAllNotifications' | 'addNotification'> => ({
  currentWeek: 0,
  gameSpeed: 1,
  isPaused: true,
  realTimePlayedMs: 0,
  levelStartTime: 0,
  canSpeedUp: FEATURE_FLAGS.DISABLE_SPEED_LOCK ? true : false,
  playerName: '',
  stage: 'GETTING_STARTED',
  currentJob: null,
  secondaryJobs: [],
  jobNotices: {},
  jobRejections: {},
  totalWeeklyHours: 0,
  exhaustion: 0,
  hasHealthInsurance: false,
  has401kAccess: false,
  previousJobs: [],
  activeHobbies: [],
  hobbyWeeks: {},
  checking: createBankAccount('checking'),
  savings: { ...createBankAccount('savings'), balance: 500 },
  totalSaved: 500,
  netWorthHistory: [],
  investmentHistory: [],
  w4: createDefaultW4(),
  taxReturns: [],
  pendingTaxReturn: null,
  yearToDateIncome: 0,
  yearToDateWithholding: 0,
  creditCards: [],
  creditScore: null,
  creditHistory: [],
  expenseCardAssignments: {
    food: null,
    entertainment: null,
    gas: null,
    coffee: null,
    phone: null,
  },
  vehicle: { owned: false, leased: false, transitPass: false, vehicleId: null, name: '', type: 'none', value: 0, mpg: 0, reliability: 100, insuranceCostPerYear: 0, registrationCostPerYear: 0, monthlyPayment: 0, hasLicense: false, licenseCost: 0, purchaseWeek: 0 },
  housing: { type: 'parents_basement', rent: 0, utilities: 0 },
  investments: [],
  retirementAccounts: [],
  loans: [],
  startup: null,
  skills: createInitialSkills(),
  availableJobs: [],
  jobHistory: [],
  age: 18,
  education: { highestDegree: 'high_school', certificates: [], enrollment: null, completedPrograms: [], businessClassesTaken: 0, employerCreditsUsedThisYear: 0 },
  isMarried: false,
  children: 0,
  lifeEvents: [],
  achievedMilestones: [],
  employedSinceWeek: null,
  pendingQuickEvent: null,
  firedEventIds: [],
  loaWeeksRemaining: 0,
  carInsuranceSurcharge: null,
  lastRoofRepairWeek: -1,
  lastPaintWeek: -1,
  advisorMessages: [],
  events: [],
  notifications: [],
  economy: { inflationMultiplier: 1.0, currentGasPrice: 3.50, weeklyFuelCost: 0, interestRate: 4.5, inflationRate: 3.0, costOfLivingIndex: 1.0 },
  stockMarket: createInitialStocks(),
  newsHistory: [],
  multiplayer: { mode: 'single', playerId: '1', players: [], sharedJobMarket: [] },
  activePanel: 'dashboard',
  sidebarCollapsed: typeof window !== 'undefined' && window.innerWidth < 768,
  depositSplit: 20,
  contribution401kPercent: 6,
  showTutorial: true,
  gameId: null,
  retired: false,
  gameLoopInterval: null,
  settings: { autoBillPay: false, autoTaxFiling: false, autoCreditCardPay: false },
  pendingBills: [],
});

// Helper: compute benefits based on active jobs
function computeBenefits(primary: Job | null, secondary: Job[]): { hasHealthInsurance: boolean; has401kAccess: boolean } {
  const allJobs = primary ? [primary, ...secondary] : secondary;
  
  // Health insurance: any single hourly job providing 40+ hours, OR any salary job
  const hasHealthInsurance = allJobs.some(j => 
    j.payType === 'salary' || (j.payType === 'hourly' && j.hoursPerWeek >= 40)
  );
  
  // 401k: salary jobs always offer it, select hourly jobs have offers401k flag
  const has401kAccess = allJobs.some(j => 
    j.payType === 'salary' || j.offers401k === true
  );
  
  return { hasHealthInsurance, has401kAccess };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState(),

  startGame: (name: string) => {
    const gameId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    set({ playerName: name, isPaused: false, gameId });
    // Count this game start on the backend (best-effort, non-blocking)
    incrementGameCounter();
    get().startGameLoop();
  },

  retire: () => {
    const state = get();
    if (state.retired) return;
    const netWorth = getNetWorth(state);
    if (netWorth < RETIRE_TARGET) {
      set({ notifications: [...state.notifications, `You need a net worth of ${formatCurrency(RETIRE_TARGET)} to retire. You're at ${formatCurrency(netWorth)}.`] });
      return;
    }
    // Capture the win on the backend, stop time, and celebrate
    recordRetirement({ name: state.playerName, age: state.age, netWorth, gameId: state.gameId || undefined });
    get().stopGameLoop();
    set({
      retired: true,
      isPaused: true,
      notifications: [...state.notifications, `🏖️ Congratulations! You retired at age ${state.age} with a net worth of ${formatCurrency(netWorth)}. You win!`],
    });
  },

  dismissTutorial: () => set({ showTutorial: false }),

  resolveQuickEvent: (reactionMs: number) => {
    const state = get();
    const pending = state.pendingQuickEvent;
    if (!pending) return;
    const evt = pending.effects;
    const week = state.currentWeek;

    // Severity factor: fast reactions soften the outcome.
    // <= 5s → 0.5 (not harsh); scales linearly to 1.0 by 20s; >= 20s → 1.0.
    const seconds = Math.max(0, reactionMs / 1000);
    let severity: number;
    if (!evt.reactable) {
      severity = 1;
    } else if (seconds <= 5) {
      severity = 0.5;
    } else if (seconds >= 20) {
      severity = 1;
    } else {
      severity = 0.5 + (seconds - 5) / 15 * 0.5; // 5s→0.5 ... 20s→1.0
    }

    let checking = { ...state.checking };
    let savings = { ...state.savings };
    let vehicle = state.vehicle;
    let loans = [...state.loans];
    let housing = { ...state.housing };
    let carInsuranceSurcharge = state.carInsuranceSurcharge;
    let loaWeeksRemaining = state.loaWeeksRemaining;
    let lastRoofRepairWeek = state.lastRoofRepairWeek;
    let lastPaintWeek = state.lastPaintWeek;
    const notifications = [...state.notifications];

    // Cash cost (scaled)
    if (evt.cashCost && evt.cashCost > 0) {
      const cost = Math.round(evt.cashCost * severity);
      let remaining = cost;
      const fromChecking = Math.min(checking.balance, remaining);
      if (fromChecking > 0) {
        const w = withdraw(checking, fromChecking, week, evt.title, 'other');
        if (w) { checking = w; remaining -= fromChecking; }
      }
      if (remaining > 0 && savings.balance > 0) {
        const fromSavings = Math.min(savings.balance, remaining);
        const w = withdraw(savings, fromSavings, week, evt.title, 'other');
        if (w) { savings = w; remaining -= fromSavings; }
      }
      notifications.push(remaining > 0
        ? `⚠️ ${evt.title}: cost ${formatCurrency(cost)} — ${formatCurrency(remaining)} still owed.`
        : `${evt.title}: handled for ${formatCurrency(cost)}.`);
    }

    // Vehicle total loss
    if (evt.loseVehicle) {
      vehicle = { ...vehicle, owned: false, leased: false, vehicleId: null, name: 'None', type: 'none', value: 0, insuranceCostPerYear: 0, registrationCostPerYear: 0, monthlyPayment: 0 };
      carInsuranceSurcharge = null;
    }

    // Insurance surcharge (surcharge % scaled by severity)
    if (evt.insuranceSurchargePct && (vehicle.owned || vehicle.leased)) {
      const base = carInsuranceSurcharge?.baseCostPerYear ?? vehicle.insuranceCostPerYear;
      const pct = evt.insuranceSurchargePct * severity;
      vehicle = { ...vehicle, insuranceCostPerYear: Math.round(base * (1 + pct)) };
      carInsuranceSurcharge = { baseCostPerYear: base, untilWeek: week + (evt.insuranceSurchargeWeeks || 104) };
    }

    // Leave of absence (weeks scaled, min 1 if any)
    if (evt.loaWeeks && evt.loaWeeks > 0) {
      const wks = Math.max(1, Math.round(evt.loaWeeks * severity));
      loaWeeksRemaining = Math.max(loaWeeksRemaining, wks);
    }

    // Medical debt loan (principal scaled)
    if (evt.addLoan) {
      const scaledBalance = Math.round(evt.addLoan.remainingBalance * severity);
      if (scaledBalance > 0) {
        loans = [...loans, {
          ...evt.addLoan,
          principal: scaledBalance,
          remainingBalance: scaledBalance,
          monthlyPayment: Math.max(1, Math.round(scaledBalance * 0.02)),
          startWeek: week,
          nextDueWeek: week + 4,
          weeksPastDue: 0,
        }];
      }
    }

    // Parents start charging rent (basement)
    if (evt.startChargingRent && housing.type === 'parents_basement') {
      housing = { ...housing, rent: evt.startChargingRent };
    }

    // Parents evict — move into an apartment (rent applies going forward)
    if (evt.evict && housing.type === 'parents_basement') {
      housing = { type: 'apartment', rent: HOUSING_COSTS.apartment.rent, utilities: HOUSING_COSTS.apartment.utilities };
      notifications.push('🏢 You moved into an apartment after leaving your parents\' place.');
    }

    if (evt.markRoofWeek) lastRoofRepairWeek = week;
    if (evt.markPaintWeek) lastPaintWeek = week;

    // Convenience unlocks toggle automation settings on
    let settings = state.settings;
    if (evt.enableAutoTaxFiling) {
      settings = { ...settings, autoTaxFiling: true };
      notifications.push('✅ Tax service hired — your taxes will now be filed automatically. Manage it in Settings.');
    }
    if (evt.enableBankingApp) {
      settings = { ...settings, autoBillPay: true, autoCreditCardPay: true };
      notifications.push('✅ Banking app enabled — bills, rent, loans, and credit cards will now auto-pay. Manage it in Settings.');
    }

    // Record once-only events so they don't fire again
    const firedEventIds = evt.id && !state.firedEventIds.includes(evt.id)
      ? [...state.firedEventIds, evt.id]
      : state.firedEventIds;

    notifications.push(`${evt.title} — resolved.`);

    set({
      pendingQuickEvent: null,
      firedEventIds,
      checking,
      savings,
      vehicle,
      loans,
      housing,
      settings,
      carInsuranceSurcharge,
      loaWeeksRemaining,
      lastRoofRepairWeek,
      lastPaintWeek,
      notifications,
      isPaused: false,
    });
    // Resume time
    get().startGameLoop();
  },

  setActivePanel: (panel: Panel) => set({ activePanel: panel }),

  setGameSpeed: (speed: number) => {
    set({ gameSpeed: speed });
    // Restart game loop with new speed
    get().stopGameLoop();
    get().startGameLoop();
  },

  togglePause: () => {
    const wasPaused = get().isPaused;
    set({ isPaused: !wasPaused });
    if (wasPaused) {
      get().startGameLoop();
    } else {
      get().stopGameLoop();
    }
  },

  startGameLoop: () => {
    const { gameSpeed, isPaused, gameLoopInterval } = get();
    if (isPaused) return;
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    const interval = window.setInterval(() => {
      get().advanceWeek();
    }, GAME_WEEK_MS / gameSpeed);
    set({ gameLoopInterval: interval });
  },

  stopGameLoop: () => {
    const { gameLoopInterval } = get();
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      set({ gameLoopInterval: null });
    }
  },

  addNotification: (msg: string) => {
    set((s) => ({ notifications: [...s.notifications.slice(-4), msg] }));
  },

  clearNotification: (index: number) => {
    set((s) => ({ notifications: s.notifications.filter((_, i) => i !== index) }));
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
  },

  updateSettings: (newSettings: Partial<GameSettings>) => {
    const state = get();
    set({ settings: { ...state.settings, ...newSettings } });
  },

  payBill: (billId: string) => {
    const state = get();
    const billIndex = state.pendingBills.findIndex(b => b.id === billId);
    if (billIndex === -1) return;
    const bill = state.pendingBills[billIndex];
    const newChecking = withdraw(state.checking, bill.amount, state.currentWeek, `Paid: ${bill.name}`, bill.category === 'rent' ? 'rent' : bill.category === 'utilities' ? 'utilities' : 'insurance');
    if (newChecking) {
      set({
        checking: newChecking,
        pendingBills: state.pendingBills.filter(b => b.id !== billId),
        notifications: [...state.notifications, `✓ Paid ${bill.name}: ${formatCurrency(bill.amount)}`],
      });
    } else {
      set({ notifications: [...state.notifications, `Insufficient funds to pay ${bill.name}`] });
    }
  },

  advanceWeek: () => {
    const state = get();

    // Time is frozen while a quick-time event is awaiting the player's reaction.
    if (state.pendingQuickEvent) {
      get().stopGameLoop();
      return;
    }

    const prevState = { ...state };
    let checking = { ...state.checking };
    let savings = { ...state.savings };
    let skills = { ...state.skills };
    let yearToDateIncome = state.yearToDateIncome;
    let yearToDateWithholding = state.yearToDateWithholding;
    const week = state.currentWeek + 1;

    // Retirement accounts (may receive auto-401k contributions below)
    let retirementAccountsWeekly = state.retirementAccounts.map(a => ({ ...a }));

    // Leave of absence: hourly workers earn nothing while on LOA; salaried keep pay.
    const onLoa = (state.loaWeeksRemaining ?? 0) > 0;
    const loaBlocksPay = onLoa && state.currentJob?.payType !== 'salary';

    // Pay player if they have a job (and aren't on unpaid hourly leave)
    if (state.currentJob && !loaBlocksPay) {
      const income = calculateWeeklyIncome(state);
      const withholding = calculateWithholding(income.gross, state.w4);
      let netPay = income.gross - withholding;
      yearToDateIncome += income.gross;
      yearToDateWithholding += withholding;

      // Salaried jobs contribute to a 401(k) (pre-tax, taken from gross).
      // The player chooses the contribution rate on the Jobs page; the employer
      // matches your rate up to their cap (employerMatchMax).
      if (state.currentJob.payType === 'salary') {
        const contribRate = Math.max(0, Math.min(RETIREMENT.maxEmployeeContributionPercent * 100, state.contribution401kPercent ?? 0)) / 100;
        const matchRate = Math.min(contribRate, RETIREMENT.employerMatchMax);
        const contribution = Math.round(income.gross * contribRate * 100) / 100;
        const employerMatch = Math.round(income.gross * matchRate * 100) / 100;
        netPay = Math.max(0, netPay - contribution);

        // Only touch the 401(k) when something is actually being contributed
        // (a 0% rate means no new account is created and net pay is unaffected).
        if (contribution + employerMatch > 0) {
          const k401Index = retirementAccountsWeekly.findIndex(
            a => a.type === '401k' && a.active !== false && a.jobId === state.currentJob!.id
          );
          if (k401Index >= 0) {
            retirementAccountsWeekly[k401Index] = {
              ...retirementAccountsWeekly[k401Index],
              balance: Math.round((retirementAccountsWeekly[k401Index].balance + contribution + employerMatch) * 100) / 100,
              contributions: Math.round((retirementAccountsWeekly[k401Index].contributions + contribution) * 100) / 100,
              employerMatch: Math.round(((retirementAccountsWeekly[k401Index].employerMatch || 0) + employerMatch) * 100) / 100,
            };
          } else {
            // Start a fresh 401(k) for this job
            retirementAccountsWeekly.push({
              id: `401k_${state.currentJob.id}_${week}`,
              type: '401k',
              balance: Math.round((contribution + employerMatch) * 100) / 100,
              contributions: contribution,
              employerMatch,
              yearlyContributionLimit: RETIREMENT.fourOhOneKLimit,
              jobId: state.currentJob.id,
              jobTitle: state.currentJob.title,
              active: true,
            });
          }
        }
      }

      // Direct deposit split
      const savingsAmount = Math.round(netPay * (state.depositSplit / 100) * 100) / 100;
      const checkingAmount = Math.round((netPay - savingsAmount) * 100) / 100;

      checking = deposit(checking, checkingAmount, week, `Paycheck - ${state.currentJob.title}`, 'income');
      if (savingsAmount > 0) {
        savings = deposit(savings, savingsAmount, week, 'Direct deposit (auto-save)', 'savings_transfer');
      }

      // Gain skills
      skills = gainSkillsFromJob(skills, state.currentJob);
    }

    // Hobby costs and skill gains
    const hobbyWeeks = { ...state.hobbyWeeks };
    for (const hobby of state.activeHobbies) {
      // Track cumulative weeks spent on this hobby (for startup exposure conditions)
      hobbyWeeks[hobby.id] = (hobbyWeeks[hobby.id] || 0) + 1;
      // Charge hobby cost
      if (hobby.weeklyCost > 0) {
        const w = withdraw(checking, hobby.weeklyCost, week, `Hobby: ${hobby.name}`, 'entertainment');
        if (w) checking = w;
      }
      // Gain skills from hobbies (at half the rate of jobs)
      if (hobby.skillsGained) {
        const hobbyAsJob = { ...hobby, hoursPerWeek: 5, level: 'level0', carNeeded: false, perHourWage: 0, maxTips: 0, educationCost: 0, id: hobby.id, title: hobby.name, payType: 'hourly' } as any;
        skills = gainSkillsFromJob(skills, hobbyAsJob);
      }
    }

    // Unlock & grow derived skills (Executive Acumen, Financial Leadership)
    skills = deriveSkills(skills);

    // Pay weekly expenses from checking
    const expenses = calculateWeeklyExpenses(state);
    let pendingBills = [...state.pendingBills];
    let creditCards = [...state.creditCards];

    // Categorize expenses for routing
    const expenseCategories: Record<string, { amount: number; description: string }> = {
      food: { amount: (expenses.breakdown['Food'] || 0), description: 'Food & dining' },
      entertainment: { amount: (expenses.breakdown['Entertainment'] || 0), description: 'Entertainment' },
      gas: { amount: (expenses.breakdown['Gas & Transport'] || 0) + (expenses.breakdown['Transport'] || 0) + (expenses.breakdown['Transit Pass'] || 0), description: 'Transport & gas' },
      coffee: { amount: 0, description: 'Coffee & snacks' }, // included in food
      phone: { amount: (expenses.breakdown['Phone'] || 0), description: 'Phone' },
    };

    // Bills (rent, utilities, insurance, lease, registration, etc.)
    const incidentalCategories = ['food', 'entertainment', 'gas', 'coffee', 'phone'];
    const totalIncidentals = incidentalCategories.reduce((s, cat) => s + (expenseCategories[cat]?.amount || 0), 0);
    const billAmount = expenses.total - totalIncidentals;

    // Route each expense category based on user's card assignments
    for (const category of incidentalCategories) {
      const expense = expenseCategories[category];
      if (!expense || expense.amount <= 0) continue;

      const assignedCardId = state.expenseCardAssignments[category];

      if (assignedCardId) {
        // Charge to the assigned credit card (only if directed by user)
        const cardIndex = creditCards.findIndex(c => c.id === assignedCardId);
        if (cardIndex >= 0 && (creditCards[cardIndex].limit - creditCards[cardIndex].balance) >= expense.amount) {
          const newBal = Math.min(creditCards[cardIndex].limit, Math.round((creditCards[cardIndex].balance + expense.amount) * 100) / 100);
          creditCards[cardIndex] = {
            ...creditCards[cardIndex],
            balance: newBal,
            recentCharges: [...creditCards[cardIndex].recentCharges.slice(-19), { week, amount: expense.amount, description: expense.description }],
          };
        } else {
          // Card full or not found — fall back to checking
          const w = withdraw(checking, expense.amount, week, expense.description, 'food');
          if (w) checking = w;
        }
      } else {
        // No card assigned — pay from checking
        const w = withdraw(checking, expense.amount, week, expense.description, 'food');
        if (w) checking = w;
      }
    }

    if (state.settings.autoBillPay) {
      // Auto-pay this week's recurring bills (rent, utilities, mortgage, insurance,
      // registration, lease) from checking.
      if (billAmount > 0) {
        const w = withdraw(checking, billAmount, week, 'Auto-pay bills', 'rent');
        if (w) checking = w;
      }
      // Also clear any pending bills generated while auto-pay was off (e.g. before
      // enabling the banking app). Pay what we can from checking; keep unpayable ones.
      if (pendingBills.some(b => !b.paid)) {
        pendingBills = pendingBills.filter((bill) => {
          if (bill.paid) return false;
          const w = withdraw(checking, bill.amount, week, `Auto-pay: ${bill.name}`, bill.category === 'rent' ? 'rent' : 'utilities');
          if (w) { checking = w; return false; } // paid — drop from queue
          return true; // couldn't afford it — leave it pending
        });
      }
    } else {
      // Generate bills for rent, utilities, insurance (monthly = every 4 weeks)
      if (week % 4 === 0) {
        if (state.housing.type === 'apartment') {
          pendingBills.push({
            id: `rent_${week}`, name: 'Rent', amount: Math.round(state.housing.rent),
            dueWeek: week + 2, category: 'rent', paid: false,
          });
          pendingBills.push({
            id: `util_${week}`, name: 'Utilities', amount: Math.round(state.housing.utilities),
            dueWeek: week + 2, category: 'utilities', paid: false,
          });
        }
        if (state.vehicle.owned || state.vehicle.leased) {
          if (week % 52 < 4) {
            pendingBills.push({
              id: `ins_${week}`, name: 'Auto Insurance', amount: Math.round(state.vehicle.insuranceCostPerYear),
              dueWeek: week + 4, category: 'insurance', paid: false,
            });
            if (state.vehicle.registrationCostPerYear > 0) {
              pendingBills.push({
                id: `reg_${week}`, name: 'Car Registration', amount: state.vehicle.registrationCostPerYear,
                dueWeek: week + 4, category: 'registration', paid: false,
              });
            }
          }
        }
      }

      // Remove overdue bills and apply penalty
      const overdue = pendingBills.filter(b => !b.paid && b.dueWeek < week);
      if (overdue.length > 0) {
        for (const bill of overdue) {
          const lateFee = Math.round(bill.amount * 0.05);
          const w = withdraw(checking, bill.amount + lateFee, week, `LATE: ${bill.name} + $${lateFee} fee`, bill.category === 'rent' ? 'rent' : 'utilities');
          if (w) checking = w;
        }
        pendingBills = pendingBills.filter(b => b.paid || b.dueWeek >= week);
      }
    }

    // Apply savings interest (weekly)
    savings = applySavingsInterest(savings, week);

    // Apply credit card billing cycle (every 4 weeks = ~monthly, "1st of month")
    // Interest only accrues on unpaid statement balance from prior cycle
    if (week % 4 === 0) {
      creditCards = creditCards.map(c => applyCardInterest(c, week));

      // Auto-pay credit cards: pay full balance from checking on statement date
      if (state.settings.autoCreditCardPay) {
        for (let i = 0; i < creditCards.length; i++) {
          if (creditCards[i].balance > 0) {
            const payAmt = Math.min(creditCards[i].balance, checking.balance);
            if (payAmt > 0) {
              const w = withdraw(checking, payAmt, week, `Auto-pay: ${creditCards[i].name}`, 'credit_payment');
              if (w) {
                checking = w;
                creditCards[i] = makeCardPayment(creditCards[i], payAmt, week);
              }
            }
          }
        }
      }
    }

    // Calculate credit score if player has credit
    let creditScore = state.creditScore;
    let creditHistory = [...state.creditHistory];
    let notifications = [...state.notifications];
    if (creditCards.length > 0) {
      const tempState = { ...state, checking, savings, creditCards };
      creditScore = calculateCreditScore(tempState as any);
      creditHistory = [...creditHistory, creditScore.score];

      // Credit limit increases: check every 12 weeks if score improved significantly
      if (week % 12 === 0 && state.creditScore) {
        const prevScore = state.creditScore.score;
        const newScore = creditScore.score;
        // If score crossed a tier threshold, banks may increase limits
        const tiers = [580, 650, 700, 740, 780];
        for (const tier of tiers) {
          if (prevScore < tier && newScore >= tier) {
            // Increase all card limits by 25-50%
            creditCards = creditCards.map(c => {
              const increase = Math.round(c.limit * (0.25 + Math.random() * 0.25));
              const newLimit = c.limit + increase;
              notifications.push(`💳 ${c.name}: Credit limit increased to ${formatCurrency(newLimit)}! (Score reached ${tier}+)`);
              return { ...c, limit: newLimit };
            });
            break; // only one tier bump per cycle
          }
        }
      }
    }

    // Age the player (every 52 weeks = 1 birthday)
    const age = 18 + Math.floor(week / 52);

    // Physical endurance begins to fade once the player reaches 35
    skills = declinePhysicalEndurance(skills, age);

    // ── Education progress ────────────────────────────────────────────────
    let education = { ...state.education };
    if (education.enrollment) {
      const enr = education.enrollment;
      // Reset employer credit allowance at each game-year boundary
      let employerUsed = education.employerCreditsUsedThisYear;
      if (week % 52 === 0) employerUsed = 0;

      const creditsThisWeek = enr.pace === 'full_time'
        ? EDUCATION.fullTimeCreditsPerWeek
        : EDUCATION.partTimeCreditsPerWeek;

      // Employer benefit covers up to N credits per year, rest is out of pocket
      const benefitRemaining = Math.max(0, enr.creditsPerYearBenefit - employerUsed);
      const coveredCredits = Math.min(creditsThisWeek, benefitRemaining);
      const paidCredits = creditsThisWeek - coveredCredits;
      const tuitionDue = Math.round(paidCredits * enr.tuitionPerCredit * 100) / 100;

      // Charge tuition from checking (fall back to savings)
      if (tuitionDue > 0) {
        const w = withdraw(checking, tuitionDue, week, `Tuition: ${enr.program}`, 'education');
        if (w) {
          checking = w;
        } else {
          const s = withdraw(savings, tuitionDue, week, `Tuition: ${enr.program}`, 'education');
          if (s) savings = s;
        }
      }

      const newCredits = enr.creditsCompleted + creditsThisWeek;
      employerUsed += coveredCredits;

      if (newCredits >= enr.creditsRequired) {
        // Program complete — grant the degree
        const cfg = EDUCATION.programs[enr.program];
        const degreeRank: Record<string, number> = { high_school: 0, trade_school: 1, associates: 1, bachelors: 2, mba: 3 };
        const newDegree = cfg.grantsDegree;
        const highestDegree = degreeRank[newDegree] > degreeRank[education.highestDegree]
          ? newDegree : education.highestDegree;
        education = {
          ...education,
          highestDegree,
          enrollment: null,
          completedPrograms: [...education.completedPrograms, enr.program],
          employerCreditsUsedThisYear: 0,
        };
        // A completed program boosts relevant skills
        const bump = enr.program === 'mba'
          ? { leadership: 15, financial_acumen: 15, communication: 10 }
          : enr.program === 'college'
          ? { problem_solving: 12, communication: 10, data_analysis: 8 }
          : { technical: 15, problem_solving: 8 };
        const bumped = { ...skills.skills };
        for (const [k, v] of Object.entries(bump)) {
          bumped[k as keyof typeof bumped] = Math.min(100, bumped[k as keyof typeof bumped] + v);
        }
        skills = { ...skills, skills: bumped };
        notifications.push(`🎓 Graduated! You earned your ${cfg.label} credential.`);
      } else {
        education = {
          ...education,
          enrollment: { ...enr, creditsCompleted: Math.round(newCredits * 10) / 10 },
          employerCreditsUsedThisYear: employerUsed,
        };
      }
    }

    // Process job notice expirations
    let currentJob = state.currentJob;
    let secondaryJobs = [...state.secondaryJobs];
    let jobNotices = { ...state.jobNotices };
    let previousJobs = [...state.previousJobs];
    let jobsChanged = false;

    for (const [jobId, lastWeek] of Object.entries(jobNotices)) {
      if (week >= lastWeek) {
        // Notice period expired — remove the job
        if (currentJob?.id === jobId) {
          previousJobs.push(jobId);
          notifications.push(`Left ${currentJob.title}. Notice period complete.`);
          // Promote first secondary
          currentJob = secondaryJobs.length > 0 ? secondaryJobs[0] : null;
          secondaryJobs = secondaryJobs.slice(1);
        } else {
          const leavingJob = secondaryJobs.find(j => j.id === jobId);
          if (leavingJob) {
            notifications.push(`Left ${leavingJob.title}. Notice period complete.`);
            previousJobs.push(jobId);
            secondaryJobs = secondaryJobs.filter(j => j.id !== jobId);
          }
        }
        // Deactivate the 401(k) tied to the job you just left (becomes rollover-eligible)
        retirementAccountsWeekly = retirementAccountsWeekly.map(a =>
          a.type === '401k' && a.jobId === jobId && a.active !== false
            ? { ...a, active: false }
            : a
        );
        const leftK401 = retirementAccountsWeekly.find(a => a.type === '401k' && a.jobId === jobId);
        if (leftK401 && leftK401.balance > 0) {
          notifications.push(`Your 401(k) from that job (${formatCurrency(leftK401.balance)}) can now be rolled over to a Traditional IRA.`);
        }
        delete jobNotices[jobId];
        jobsChanged = true;
      }
    }

    const founderHours = (state.startup && !state.startup.failed) ? founderWeeklyHours(state.startup) : 0;
    const totalWeeklyHours = (currentJob?.hoursPerWeek || 0) + secondaryJobs.reduce((s, j) => s + j.hoursPerWeek, 0) + founderHours;
    const benefitsUpdate = jobsChanged ? computeBenefits(currentJob, secondaryJobs) : { hasHealthInsurance: state.hasHealthInsurance, has401kAccess: state.has401kAccess };

    // Happiness: work-life balance + hobbies drive it; low happiness harms body & communication
    {
      const happinessResult = updateHappiness(skills, totalWeeklyHours, state.activeHobbies.length);
      skills = happinessResult.skills;
      if (happinessResult.notifications.length > 0) notifications.push(...happinessResult.notifications);
    }

    // C-Suite annual bonus (every 52 weeks): 0%–50% of salary, randomized
    if (week % 52 === 0 && week > 0) {
      const bonusJobs = [currentJob, ...secondaryJobs].filter(
        (j): j is NonNullable<typeof j> => !!j && !!j.annualBonusMaxPct && !!j.annualSalary
      );
      for (const j of bonusJobs) {
        const pct = Math.random() * (j.annualBonusMaxPct || 0);
        const bonus = Math.round((j.annualSalary || 0) * pct);
        if (bonus > 0) {
          checking = deposit(checking, bonus, week, `Annual bonus - ${j.title}`, 'income');
          yearToDateIncome += bonus;
          notifications.push(`🎉 ${j.title} annual bonus: ${formatCurrency(bonus)} (${Math.round(pct * 100)}% of salary)!`);
        }
      }
    }

    // ── Taxes: deadlines, reminders, penalties ────────────────────────────
    let pendingTaxReturn = state.pendingTaxReturn ? { ...state.pendingTaxReturn, remindersFired: { ...state.pendingTaxReturn.remindersFired } } : null;
    let taxReturns = state.taxReturns;

    // At each game-year boundary, close out the year: the prior year's return
    // becomes due (window opens ~Jan 15, deadline ~Apr 15). We do NOT file it here.
    if (week % 52 === 0 && week > 0 && yearToDateIncome > 0 && !pendingTaxReturn) {
      pendingTaxReturn = {
        year: Math.floor(week / 52),
        income: yearToDateIncome,
        withholding: yearToDateWithholding,
        openWeek: week + 1,   // ~Jan 15 (a week after the Jan 6 year start)
        dueWeek: week + 14,   // ~Apr 15
        accruedPenalty: 0,
        weeksLate: 0,
        flatFeeApplied: false,
        remindersFired: { open: false, reminder: false, due: false },
      };
      // The new year starts fresh
      yearToDateIncome = 0;
      yearToDateWithholding = 0;
    }

    // Process an outstanding return: reminders, deadline, penalties, auto-file.
    if (pendingTaxReturn) {
      const p = pendingTaxReturn;

      // Reminder toasts on the exact calendar dates
      if (!p.remindersFired.open && crossedCalendarDate(week, TAX_DEADLINES.openMonth, TAX_DEADLINES.openDay)) {
        p.remindersFired.open = true;
        notifications.push(`🧾 Tax filing is now open for ${p.year}. You can file any time before Apr 15.`);
      }
      if (!p.remindersFired.reminder && crossedCalendarDate(week, TAX_DEADLINES.reminderMonth, TAX_DEADLINES.reminderDay)) {
        p.remindersFired.reminder = true;
        notifications.push(`🧾 Reminder: your ${p.year} taxes are due Apr 15 — about two weeks left to file.`);
      }
      if (!p.remindersFired.due && crossedCalendarDate(week, TAX_DEADLINES.dueMonth, TAX_DEADLINES.dueDay)) {
        p.remindersFired.due = true;
        notifications.push(`🧾 Today is the Apr 15 deadline to file your ${p.year} taxes! File now to avoid late fees and interest.`);
      }

      // Auto-file (if enabled) right at the deadline so you're never late.
      if (state.settings.autoTaxFiling && week >= p.dueWeek) {
        const taxState = { ...state, yearToDateIncome: p.income, yearToDateWithholding: p.withholding, currentWeek: week };
        const taxReturn = calculateAnnualTaxFn(taxState as any);
        if (taxReturn.refundOrOwed > 0) {
          checking = deposit(checking, taxReturn.refundOrOwed, week, 'Tax Refund (auto-filed)', 'tax');
        } else if (taxReturn.refundOrOwed < 0) {
          const owed = Math.abs(taxReturn.refundOrOwed);
          const paid = withdraw(checking, owed, week, 'Tax Payment (auto-filed)', 'tax');
          if (paid) checking = paid;
        }
        taxReturns = [...taxReturns, taxReturn];
        notifications.push(`🧾 Your ${p.year} taxes were auto-filed on time.`);
        pendingTaxReturn = null;
      } else if (week > p.dueWeek) {
        // Past the deadline and still unfiled — accrue late penalties.
        // Recompute the actual tax owed to use as the interest basis.
        const taxState = { ...state, yearToDateIncome: p.income, yearToDateWithholding: p.withholding, currentWeek: week };
        const tr = calculateAnnualTaxFn(taxState as any);
        const owed = tr.refundOrOwed < 0 ? Math.abs(tr.refundOrOwed) : 0;

        p.weeksLate += 1;
        if (!p.flatFeeApplied) {
          p.accruedPenalty += TAX_LATE_PENALTY.flatFee;
          p.flatFeeApplied = true;
          notifications.push(`⚠️ Your ${p.year} taxes are past due! The IRS applied a ${formatCurrency(TAX_LATE_PENALTY.flatFee)} late-filing fee, and interest is now accruing.`);
        }
        // Weekly interest on the amount owed (only bites if you actually owe)
        if (owed > 0) {
          p.accruedPenalty += Math.round(owed * TAX_LATE_PENALTY.weeklyInterestRate * 100) / 100;
        }
        // Occasional nag while still unfiled
        if (p.weeksLate % 4 === 0) {
          notifications.push(`⚠️ Your ${p.year} taxes are ${p.weeksLate} weeks late. Penalties so far: ${formatCurrency(p.accruedPenalty)}. File in the Taxes panel.`);
        }
      }
    }

    // Check stage progression
    const tempState = { ...state, checking, savings, creditCards, creditScore, creditHistory, currentWeek: week };
    const newStage = checkStageProgression(tempState as any);

    // Check speed up eligibility
    const realTimePlayed = state.realTimePlayedMs + (GAME_WEEK_MS / state.gameSpeed);
    const speedUpAllowed = canSpeedUp({ ...state, realTimePlayedMs: realTimePlayed } as any);

    // Generate advisor messages
    const newMessages = generateAdvisorMessages(
      { ...tempState, stage: newStage } as any,
      prevState as any
    );

    // ── Macroeconomy + stock market ──────────────────────────────────────
    const macro = stepMacro(state.economy.interestRate ?? 4.5, state.economy.inflationRate ?? 3.0);

    // Generate news (may target a stock) and build this week's per-stock impact map
    const news = maybeGenerateNews(state.stockMarket, week);
    const newsImpactByStock: Record<string, number> = {};
    if (news && news.stockId) newsImpactByStock[news.stockId] = news.impactPct;

    const stockMarket = stepMarket(state.stockMarket, macro.interestRate, macro.inflationRate, newsImpactByStock);
    const newsHistory = news ? [...state.newsHistory.slice(-30), news] : state.newsHistory;
    if (news) {
      notifications.push(news.stockId ? `📰 ${news.headline}` : `📰 ${news.headline}`);
    }
    // Cost of living compounds weekly at the current inflation rate — expenses rise over time
    const priorCoL = state.economy.costOfLivingIndex ?? 1.0;
    const costOfLivingIndex = Math.round(priorCoL * (1 + macro.inflationRate / 100 / 52) * 10000) / 10000;
    const economy = { ...state.economy, interestRate: macro.interestRate, inflationRate: macro.inflationRate, costOfLivingIndex };

    // Owned holdings track their stock's market price; unlisted holdings drift mildly
    const priceById: Record<string, number> = {};
    for (const s of stockMarket) priceById[s.id] = s.price;
    const investments = state.investments.map(inv => {
      // Retirement positions use a composite id (`STOCK__account`); map back to the
      // base stock id so every holding of a stock tracks the same market price.
      const baseId = inv.id.includes('__') ? inv.id.split('__')[0] : inv.id;
      const marketPrice = priceById[baseId];
      return {
        ...inv,
        currentPrice: marketPrice !== undefined
          ? marketPrice
          : Math.round((inv.currentPrice * (1 + (Math.random() - 0.48) * 0.04)) * 100) / 100,
      };
    });

    // Grow retirement accounts (simplified weekly return)
    // Grow retirement accounts. Uninvested balances earn a modest default return;
    // invested IRA balances grow at the market rate (tax-free).
    const retirementAccounts = retirementAccountsWeekly.map(acct => {
      // Cap the auto-invested figure at the current balance (stock purchases may
      // have moved cash out into specific holdings tracked separately).
      const invested = Math.min(acct.invested || 0, acct.balance);
      const uninvested = Math.max(0, acct.balance - invested);
      // Invested portion grows at market rate; uninvested at a smaller default rate
      const grownInvested = invested * (1 + RETIREMENT.iraGrowthWeekly);
      const grownUninvested = uninvested * 1.0005; // ~2.6% annual on cash sitting in the account
      const newBalance = Math.round((grownInvested + grownUninvested) * 100) / 100;
      return {
        ...acct,
        balance: newBalance,
        invested: invested > 0 ? Math.round(grownInvested * 100) / 100 : acct.invested,
      };
    });

    // ── Startup weekly processing ─────────────────────────────────────────
    let startup = state.startup ? { ...state.startup } : null;
    if (startup && !startup.failed) {
      // Revenue trends up with weekly noise (can shrink some weeks)
      const revNoise = 1 + (Math.random() - 0.5) * 2 * STARTUP.revenueNoise;
      startup.weeklyRevenue = Math.max(0, Math.round(startup.weeklyRevenue * (1 + STARTUP.revenueGrowthPerWeek) * revNoise));

      // Costs creep up as the company grows; a failed-round surcharge may apply
      const surcharge = week < (startup.costSurchargeUntilWeek || 0) ? STARTUP.failedRoundCostSurchargePct : 0;
      startup.weeklyCosts = Math.round(startup.weeklyCosts * (1 + STARTUP.costGrowthPerWeek));
      const effectiveCosts = Math.round(startup.weeklyCosts * (1 + surcharge));

      // Employees grow slowly (accrue fractional headcount, scaled by size)
      startup.employeeAccrual = (startup.employeeAccrual || 0) + STARTUP.employeeGrowthPerWeek * Math.max(1, Math.sqrt(startup.employees));
      if (startup.employeeAccrual >= 1) {
        const added = Math.floor(startup.employeeAccrual);
        startup.employees += added;
        startup.employeeAccrual -= added;
      }

      // Board founders pay a CEO out of the company treasury
      const ceoCost = (startup.founderRole === 'board' && isStartupScaled(startup)) ? startup.ceoSalary : 0;

      // Treasury moves with net weekly cash flow
      const netFlow = startup.weeklyRevenue - effectiveCosts - ceoCost;
      startup.treasury = Math.round(startup.treasury + netFlow);

      // Valuation tracks enterprise wealth: annualized revenue * multiple + treasury
      startup.valuation = Math.max(0, Math.round(startup.weeklyRevenue * 52 * STARTUP.valuationRevenueMultiple + Math.max(0, startup.treasury)));

      // Founder draws modest pay from the treasury once it can comfortably afford it
      if (startup.treasury > effectiveCosts * 8 && startup.weeklyRevenue > effectiveCosts) {
        const pay = Math.round(startup.weeklyRevenue * 0.05);
        if (pay > 0 && startup.treasury > pay) {
          startup.treasury -= pay;
          startup.weeklyFounderPay = pay;
          checking = deposit(checking, pay, week, `Founder pay — ${startup.name}`, 'income');
          yearToDateIncome += pay;
          yearToDateWithholding += Math.round(pay * 0.18 * 100) / 100;
        }
      } else {
        startup.weeklyFounderPay = 0;
      }

      // The company fails only if it runs out of money
      if (startup.treasury <= 0) {
        startup.treasury = 0;
        startup.failed = true;
        startup.valuation = 0;
        apiUpdateStartup({ startupId: startup.id, status: 'failed', event: 'ran_out_of_money', week });
        notifications.push(`💥 ${startup.name} ran out of money and shut down. Your equity is now worthless.`);
      }
    }

    // Real estate appreciation (5-25% annually, applied weekly)
    let housing = { ...state.housing };
    if ((housing.type === 'house' || housing.type === 'nice_house') && housing.mortgage) {
      // Annual rate between 5-25%, seeded per game-year for consistency
      const yearSeed = Math.floor(week / 52);
      const annualRate = 0.05 + (((yearSeed * 7919) % 100) / 100) * 0.20;
      const weeklyMultiplier = Math.pow(1 + annualRate, 1 / 52);

      // Appreciate home value
      const currentHomeValue = housing.homeValue || (housing.type === 'nice_house' ? 450000 : 250000);
      const newHomeValue = Math.round(currentHomeValue * weeklyMultiplier);

      // Principal paydown (~30% of monthly payment goes to principal early in loan)
      const principalPaydown = housing.mortgage.monthlyPayment / 4.33 * 0.3;
      const newRemainingBalance = Math.max(0, Math.round((housing.mortgage.remainingBalance - principalPaydown) * 100) / 100);

      housing = {
        ...housing,
        homeValue: newHomeValue,
        mortgage: {
          ...housing.mortgage,
          remainingBalance: newRemainingBalance,
        },
      };
    }

    // Process loan payments (car loans, etc.) — payments are due monthly (~every 4 weeks)
    let loans = state.loans.map(loan => ({ ...loan }));
    for (let i = 0; i < loans.length; i++) {
      const loan = loans[i];
      if (loan.remainingBalance <= 0) continue;

      if (week >= loan.nextDueWeek) {
        // Payment due — try to pay from checking
        const payment = Math.min(loan.monthlyPayment, loan.remainingBalance +
          Math.round(loan.remainingBalance * (loan.interestRate / 12) * 100) / 100);
        const w = withdraw(checking, payment, week, `Loan payment: ${loan.name}`, 'transport');
        if (w) {
          checking = w;
          // Apply interest then reduce balance
          const interest = Math.round(loan.remainingBalance * (loan.interestRate / 12) * 100) / 100;
          const principalPaid = Math.max(0, payment - interest);
          loans[i] = {
            ...loan,
            remainingBalance: Math.max(0, Math.round((loan.remainingBalance - principalPaid) * 100) / 100),
            nextDueWeek: loan.nextDueWeek + 4,
            weeksPastDue: 0,
          };
        } else {
          // Missed payment — accrue interest and mark past due
          const interest = Math.round(loan.remainingBalance * (loan.interestRate / 12) * 100) / 100;
          loans[i] = {
            ...loan,
            remainingBalance: Math.round((loan.remainingBalance + interest) * 100) / 100,
            nextDueWeek: loan.nextDueWeek + 4,
            weeksPastDue: loan.weeksPastDue + 4,
          };
        }
      }
    }
    // Drop fully paid-off loans
    loans = loans.filter(l => l.remainingBalance > 0);

    // ── Quick-time life events ────────────────────────────────────────────
    let vehicle = state.vehicle;
    let loaWeeksRemaining = Math.max(0, (state.loaWeeksRemaining ?? 0) - 1); // tick down this week
    let carInsuranceSurcharge = state.carInsuranceSurcharge;
    let lastRoofRepairWeek = state.lastRoofRepairWeek ?? -1;
    let lastPaintWeek = state.lastPaintWeek ?? -1;

    // Expire an auto-insurance surcharge once its window passes (restore base cost)
    if (carInsuranceSurcharge && week >= carInsuranceSurcharge.untilWeek) {
      vehicle = { ...vehicle, insuranceCostPerYear: carInsuranceSurcharge.baseCostPerYear };
      carInsuranceSurcharge = null;
      notifications.push('Your post-accident insurance surcharge has expired — premiums are back to normal.');
    }

    // Roll for a quick-time event. Rather than applying it immediately, queue it
    // as a pending event and pause time; the QuickEventModal lets the player react
    // (faster reaction = softer outcome), and resolveQuickEvent applies the effects.
    let pendingQuickEvent: GameState['pendingQuickEvent'] = state.pendingQuickEvent;
    if (!pendingQuickEvent) {
      const evt = rollQuickEvents({ ...state, currentWeek: week } as any, week);
      if (evt) {
        pendingQuickEvent = { effects: evt as any, week, firedAtMs: Date.now() };
      }
    }

    // Track continuous employment (for the 6-month tenure milestone)
    const isEmployed = !!currentJob || secondaryJobs.length > 0;
    let employedSinceWeek = state.employedSinceWeek;
    if (isEmployed && employedSinceWeek === null) {
      employedSinceWeek = week; // just became employed
    } else if (!isEmployed) {
      employedSinceWeek = null; // lost all jobs — tenure resets
    }

    // ── Milestone toasts ──────────────────────────────────────────────────
    let achievedMilestones = state.achievedMilestones;
    {
      const snapshot = {
        ...state,
        currentWeek: week,
        currentJob,
        secondaryJobs,
        previousJobs,
        checking,
        savings,
        skills,
        creditScore,
        creditCards,
        retirementAccounts,
        investments,
        hasHealthInsurance: benefitsUpdate.hasHealthInsurance,
        employedSinceWeek,
      } as GameState;
      const { ids, toasts } = detectMilestones(snapshot, achievedMilestones);
      if (ids.length > 0) {
        achievedMilestones = [...achievedMilestones, ...ids];
        notifications.push(...toasts);
      }
    }

    set({
      currentWeek: week,
      loans,
      vehicle,
      loaWeeksRemaining,
      carInsuranceSurcharge,
      lastRoofRepairWeek,
      lastPaintWeek,
      achievedMilestones,
      employedSinceWeek,
      pendingQuickEvent,
      ...(pendingQuickEvent && !state.pendingQuickEvent ? { isPaused: true } : {}),
      checking,
      savings,
      skills,
      yearToDateIncome,
      yearToDateWithholding,
      pendingTaxReturn,
      taxReturns,
      creditCards,
      creditScore,
      creditHistory,
      currentJob,
      secondaryJobs,
      jobNotices,
      previousJobs,
      totalWeeklyHours,
      hasHealthInsurance: benefitsUpdate.hasHealthInsurance,
      has401kAccess: benefitsUpdate.has401kAccess,
      housing,
      stage: newStage,
      realTimePlayedMs: realTimePlayed,
      canSpeedUp: speedUpAllowed,
      advisorMessages: [...state.advisorMessages.slice(-10), ...newMessages],
      investments,
      retirementAccounts,
      pendingBills,
      age,
      education,
      hobbyWeeks,
      startup,
      economy,
      stockMarket,
      newsHistory,
      notifications,
      totalSaved: checking.balance + savings.balance,
      netWorthHistory: [...state.netWorthHistory.slice(-200), {
        week,
        total: getNetWorth({ ...state, checking, savings, investments, retirementAccounts, vehicle, creditCards, housing } as any),
        pay: checking.balance + savings.balance,
        investments: investments.reduce((s, i) => s + i.shares * i.currentPrice, 0),
        realEstate: (housing.type === 'house' || housing.type === 'nice_house') && housing.mortgage
          ? (housing.homeValue || 0) - housing.mortgage.remainingBalance
          : 0,
        car: state.vehicle.owned ? state.vehicle.value : 0,
        fourOhOneK: retirementAccounts.find(a => a.type === '401k')?.balance || 0,
        traditionalIra: retirementAccounts.find(a => a.type === 'traditional_ira')?.balance || 0,
        rothIra: retirementAccounts.find(a => a.type === 'roth_ira')?.balance || 0,
      }],
      investmentHistory: [...state.investmentHistory.slice(-200), (() => {
        const invValue = (acct: string) => investments
          .filter(i => (i.account || 'brokerage') === acct)
          .reduce((s, i) => s + i.shares * i.currentPrice, 0);
        const acctBalance = (t: string) => retirementAccounts.filter(a => a.type === t).reduce((s, a) => s + a.balance, 0);
        const brokerage = invValue('brokerage');
        // Retirement bucket = account cash balance + stocks held inside that account
        const roth = acctBalance('roth_ira') + invValue('roth_ira');
        const trad = acctBalance('traditional_ira') + invValue('traditional_ira');
        const k401 = acctBalance('401k') + invValue('401k');
        return {
          total: brokerage + roth + trad + k401,
          brokerage,
          roth_ira: roth,
          traditional_ira: trad,
          fourOhOneK: k401,
        };
      })()],
    });
  },

  applyForJob: (job: Job) => {
    const state = get();
    const result = engineApplyForJob(job, state as any);
    if (result.success) {
      // Deduct education cost if needed
      let checking = { ...state.checking };
      let education = { ...state.education };
      if (job.educationCost > 0) {
        const newChecking = withdraw(checking, job.educationCost, state.currentWeek, `Training: ${job.title}`, 'education');
        if (newChecking) {
          checking = newChecking;
          education = {
            ...education,
            certificates: [...education.certificates, {
              name: `${job.title} Certification`,
              weekEarned: state.currentWeek,
              cost: job.educationCost,
              jobId: job.id,
            }],
          };
        } else {
          let savings = { ...state.savings };
          const fromSavings = withdraw(savings, job.educationCost, state.currentWeek, `Training: ${job.title}`, 'education');
          if (fromSavings) {
            savings = fromSavings;
            education = {
              ...education,
              certificates: [...education.certificates, {
                name: `${job.title} Certification`,
                weekEarned: state.currentWeek,
                cost: job.educationCost,
                jobId: job.id,
              }],
            };
          }
          set({ savings });
        }
      }

      // Job accumulation logic:
      // - Promotion: replaces the prerequisite job directly (no notice needed)
      // - Salary job: replaces all existing jobs (you go full-time)
      // - Hourly job: added alongside existing jobs (doesn't remove any)
      let newPrimary: Job | null = state.currentJob;
      let newSecondaryJobs = [...state.secondaryJobs];
      let previousJobs = [...state.previousJobs];

      // If this is a promotion, remove the job it promotes from
      if (job.promotesFrom) {
        if (newPrimary?.id === job.promotesFrom) {
          previousJobs.push(newPrimary.id);
          newPrimary = null;
        } else {
          const promoFrom = newSecondaryJobs.find(j => j.id === job.promotesFrom);
          if (promoFrom) previousJobs.push(promoFrom.id);
          newSecondaryJobs = newSecondaryJobs.filter(j => j.id !== job.promotesFrom);
        }
        // Also clear any pending notice for the old job
        const newNotices = { ...state.jobNotices };
        if (job.promotesFrom in newNotices) delete newNotices[job.promotesFrom];
        set({ jobNotices: newNotices });
      }

      if (job.payType === 'salary') {
        // Salary replaces everything — move all current jobs to previous
        if (newPrimary) previousJobs.push(newPrimary.id);
        previousJobs.push(...newSecondaryJobs.map(j => j.id));
        newPrimary = job;
        newSecondaryJobs = [];
      } else {
        // Hourly: add alongside existing jobs
        if (!newPrimary) {
          newPrimary = job;
        } else {
          newSecondaryJobs = [...newSecondaryJobs, job];
        }
      }

      const newHours = (newPrimary?.hoursPerWeek || 0) + newSecondaryJobs.reduce((s: number, j: Job) => s + j.hoursPerWeek, 0);
      const benefits = computeBenefits(newPrimary, newSecondaryJobs);

      set({
        currentJob: newPrimary,
        secondaryJobs: newSecondaryJobs,
        previousJobs,
        totalWeeklyHours: newHours,
        hasHealthInsurance: benefits.hasHealthInsurance,
        has401kAccess: benefits.has401kAccess,
        checking,
        education,
        notifications: [...state.notifications, result.message],
      });
    } else {
      // Rejection — hide this job from the listings for 6 weeks
      set({
        jobRejections: { ...state.jobRejections, [job.id]: state.currentWeek + 6 },
        notifications: [...state.notifications, result.message],
      });
    }
  },

  addAdditionalJob: (job: Job) => {
    const state = get();
    // Only hourly jobs can be added as additional
    if (job.payType !== 'hourly') {
      set({ notifications: [...state.notifications, 'Only hourly jobs can be added as a second job.'] });
      return;
    }
    // Check 90 hour limit
    const currentHours = (state.currentJob?.hoursPerWeek || 0) + state.secondaryJobs.reduce((s, j) => s + j.hoursPerWeek, 0);
    if (currentHours + job.hoursPerWeek > 90) {
      set({ notifications: [...state.notifications, `Can't exceed 90h/week. Currently at ${currentHours}h, this job adds ${job.hoursPerWeek}h.`] });
      return;
    }
    // Check if already working this job
    if (state.currentJob?.id === job.id || state.secondaryJobs.some(j => j.id === job.id)) {
      set({ notifications: [...state.notifications, 'Already working this job.'] });
      return;
    }
    // Deduct education cost if needed
    let checking = { ...state.checking };
    if (job.educationCost > 0) {
      const w = withdraw(checking, job.educationCost, state.currentWeek, `Training: ${job.title}`, 'education');
      if (w) { checking = w; } else {
        set({ notifications: [...state.notifications, `Need ${formatCurrency(job.educationCost)} for training.`] });
        return;
      }
    }
    const newHours = currentHours + job.hoursPerWeek;
    set({
      secondaryJobs: [...state.secondaryJobs, job],
      totalWeeklyHours: newHours,
      checking,
      notifications: [...state.notifications, `Added ${job.title} as additional job (${newHours}h/week total)`],
    });
  },

  quitJob: (jobId: string) => {
    const state = get();
    // Give 2-week notice instead of instant quit
    if (state.jobNotices[jobId]) {
      set({ notifications: [...state.notifications, 'Notice already given for this job.'] });
      return;
    }
    const jobTitle = state.currentJob?.id === jobId
      ? state.currentJob.title
      : state.secondaryJobs.find(j => j.id === jobId)?.title || 'job';
    const lastDay = state.currentWeek + 2; // 2 weeks notice
    set({
      jobNotices: { ...state.jobNotices, [jobId]: lastDay },
      notifications: [...state.notifications, `Gave 2-week notice at ${jobTitle}. Last day: Week ${lastDay}.`],
    });
  },

  startHobby: (hobbyId: string) => {
    const state = get();
    const hobby = (hobbiesData as any[]).find((h: any) => h.id === hobbyId);
    if (!hobby) return;
    if (state.activeHobbies.some(h => h.id === hobbyId)) {
      set({ notifications: [...state.notifications, `Already doing ${hobby.name}.`] });
      return;
    }
    set({
      activeHobbies: [...state.activeHobbies, hobby],
      notifications: [...state.notifications, `${hobby.icon} Started ${hobby.name}! Cost: ${hobby.weeklyCost > 0 ? `$${hobby.weeklyCost}/week` : 'Free'}`],
    });
  },

  stopHobby: (hobbyId: string) => {
    const state = get();
    const hobby = state.activeHobbies.find(h => h.id === hobbyId);
    set({
      activeHobbies: state.activeHobbies.filter(h => h.id !== hobbyId),
      notifications: [...state.notifications, `Stopped ${hobby?.name || 'hobby'}.`],
    });
  },

  transferMoney: (direction: 'toSavings' | 'toChecking', amount: number) => {
    const state = get();
    if (direction === 'toSavings') {
      const newChecking = withdraw(state.checking, amount, state.currentWeek, 'Transfer to Savings', 'savings_transfer');
      if (newChecking) {
        const newSavings = deposit(state.savings, amount, state.currentWeek, 'Transfer from Checking', 'savings_transfer');
        set({ checking: newChecking, savings: newSavings, notifications: [...state.notifications, `Transferred ${formatCurrency(amount)} to Savings`] });
      } else {
        set({ notifications: [...state.notifications, 'Insufficient funds in Checking'] });
      }
    } else {
      const newSavings = withdraw(state.savings, amount, state.currentWeek, 'Transfer to Checking', 'savings_transfer');
      if (newSavings) {
        const newChecking = deposit(state.checking, amount, state.currentWeek, 'Transfer from Savings', 'savings_transfer');
        set({ savings: newSavings, checking: newChecking, notifications: [...state.notifications, `Transferred ${formatCurrency(amount)} to Checking`] });
      } else {
        set({ notifications: [...state.notifications, 'Insufficient funds in Savings'] });
      }
    }
  },

  setDepositSplit: (percent: number) => {
    set({ depositSplit: percent, notifications: [...get().notifications, `Direct deposit: ${percent}% to savings, ${100 - percent}% to checking`] });
  },

  set401kContribution: (percent: number) => {
    const maxPct = Math.round(RETIREMENT.maxEmployeeContributionPercent * 100);
    const clamped = Math.max(0, Math.min(maxPct, Math.round(percent)));
    const match = Math.min(clamped, Math.round(RETIREMENT.employerMatchMax * 100));
    set({
      contribution401kPercent: clamped,
      notifications: [
        ...get().notifications,
        `401(k) contribution set to ${clamped}% pre-tax (employer matches ${match}%).`,
      ],
    });
  },

  updateW4: (w4: W4Form) => {
    set({ w4, notifications: [...get().notifications, 'W-4 updated. Withholding will change next paycheck.'] });
  },

  fileTaxes: () => {
    const state = get();
    const p = state.pendingTaxReturn;
    let checking = { ...state.checking };
    const notifications = [...state.notifications];

    // Nothing due yet
    if (!p) {
      set({ notifications: [...notifications, 'You have no tax return due right now. A return becomes due after each year ends.'] });
      return;
    }
    // The window opens Jan 15
    if (state.currentWeek < p.openWeek) {
      set({ notifications: [...notifications, `Tax filing for ${p.year} opens ${formatGameDate(p.openWeek)}. You can't file before then.`] });
      return;
    }

    // Compute the return from the frozen prior-year snapshot
    const taxState = { ...state, yearToDateIncome: p.income, yearToDateWithholding: p.withholding };
    const base = calculateAnnualTaxFn(taxState as any);
    const penalty = Math.round((p.accruedPenalty || 0) * 100) / 100;
    // Fold any late penalty into the outcome
    const refundOrOwed = Math.round((base.refundOrOwed - penalty) * 100) / 100;
    const taxReturn = { ...base, year: p.year, underpaymentPenalty: base.underpaymentPenalty + penalty, refundOrOwed };

    const late = state.currentWeek > p.dueWeek;
    const lateNote = late ? ` (filed late — ${formatCurrency(penalty)} in fees & interest)` : '';

    if (refundOrOwed > 0) {
      checking = deposit(checking, refundOrOwed, state.currentWeek, `Tax Refund ${p.year}`, 'tax');
      notifications.push(`🎉 Tax refund: ${formatCurrency(refundOrOwed)} deposited!${lateNote}`);
    } else if (refundOrOwed < 0) {
      const owed = Math.abs(refundOrOwed);
      const newChecking = withdraw(checking, owed, state.currentWeek, `Tax Payment ${p.year}`, 'tax');
      if (newChecking) {
        checking = newChecking;
        notifications.push(`Paid ${formatCurrency(owed)} in taxes owed.${lateNote}`);
      } else {
        notifications.push(`⚠️ You owe ${formatCurrency(owed)} but don't have enough funds!`);
      }
    } else {
      notifications.push(`Filed your ${p.year} taxes — all square.${lateNote}`);
    }

    set({
      checking,
      taxReturns: [...state.taxReturns, taxReturn],
      pendingTaxReturn: null,
      notifications,
    });
  },

  moveToApartment: () => {
    const state = get();
    const cost = HOUSING_COSTS.apartment.securityDeposit;
    const newChecking = withdraw(state.checking, cost, state.currentWeek, 'Security deposit - Apartment', 'rent');
    if (newChecking) {
      set({
        checking: newChecking,
        housing: { type: 'apartment', rent: HOUSING_COSTS.apartment.rent, utilities: HOUSING_COSTS.apartment.utilities },
        notifications: [...state.notifications, `🏢 Moved into an apartment! Security deposit: ${formatCurrency(cost)}`],
      });
    } else {
      set({ notifications: [...state.notifications, 'Insufficient funds for security deposit'] });
    }
  },

  moveToNiceApartment: () => {
    const state = get();
    const cost = HOUSING_COSTS.niceApartment.securityDeposit;
    const newChecking = withdraw(state.checking, cost, state.currentWeek, 'Security deposit - Nice Apartment', 'rent');
    if (newChecking) {
      set({
        checking: newChecking,
        housing: { type: 'nice_apartment', rent: HOUSING_COSTS.niceApartment.rent, utilities: HOUSING_COSTS.niceApartment.utilities },
        notifications: [...state.notifications, `🏢 Upgraded to a nicer apartment! Deposit: ${formatCurrency(cost)}`],
      });
    } else {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(cost)} for security deposit.`] });
    }
  },

  buyHouse: (tier: 'house' | 'nice_house') => {
    const state = get();
    const config = tier === 'nice_house' ? HOUSING_COSTS.niceHouse : HOUSING_COSTS.house;
    const downPayment = Math.round(config.homePrice * config.downPayment);
    const newChecking = withdraw(state.checking, downPayment, state.currentWeek, `Down payment - ${tier === 'nice_house' ? 'Nice House' : 'House'}`, 'rent');
    if (!newChecking) {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(downPayment)} for the down payment.`] });
      return;
    }
    // Check credit score for mortgage approval
    const score = state.creditScore?.score || 0;
    if (score < 620) {
      set({ notifications: [...state.notifications, `Mortgage denied — minimum credit score of 620 required. Yours: ${score}.`] });
      return;
    }
    // Calculate mortgage
    const loanAmount = config.homePrice - downPayment;
    const monthlyRate = config.mortgageRate / 12;
    const numPayments = config.mortgageTermYears * 12;
    const monthlyPayment = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1));

    set({
      checking: newChecking,
      housing: {
        type: tier === 'nice_house' ? 'nice_house' : 'house',
        rent: 0,
        utilities: config.utilities,
        homeValue: config.homePrice,
        mortgage: {
          principal: loanAmount,
          interestRate: config.mortgageRate,
          monthlyPayment,
          remainingBalance: loanAmount,
        },
      },
      notifications: [...state.notifications, `🏡 Congratulations! You bought a ${tier === 'nice_house' ? 'beautiful' : ''} home! Mortgage: ${formatCurrency(monthlyPayment)}/mo`],
    });
  },

  buyCar: () => {}, // deprecated - use acquireVehicle

  acquireVehicle: (vehicleId: string) => {
    const state = get();
    const vData = (vehiclesData as any[]).find((v: any) => v.id === vehicleId);
    if (!vData) return;

    const licenseCost = !state.vehicle.hasLicense ? VEHICLE_COSTS.license : 0;
    const upfrontCost = vData.price + licenseCost;

    const newChecking = withdraw(state.checking, upfrontCost, state.currentWeek, `Vehicle: ${vData.name}`, 'transport');
    if (!newChecking) {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(upfrontCost)}`] });
      return;
    }

    const isOwned = vData.type === 'buy';
    const isLeased = vData.type === 'lease';
    const isTransit = vData.type === 'transit';

    set({
      checking: newChecking,
      vehicle: {
        owned: isOwned,
        leased: isLeased,
        transitPass: isTransit,
        vehicleId: vData.id,
        name: vData.name,
        type: vData.type,
        value: isOwned ? vData.price : 0,
        mpg: vData.mpg,
        reliability: vData.reliability,
        insuranceCostPerYear: vData.insurance,
        registrationCostPerYear: vData.registration,
        monthlyPayment: vData.monthlyPayment,
        hasLicense: true,
        licenseCost: VEHICLE_COSTS.license,
        purchaseWeek: state.currentWeek,
      },
      notifications: [...state.notifications, `🚗 ${isLeased ? 'Leased' : isTransit ? 'Activated' : 'Purchased'}: ${vData.name}!`],
    });
  },

  financeVehicle: (vehicleId: string, lender: 'dealer' | 'bank') => {
    const state = get();
    const vData = (vehiclesData as any[]).find((v: any) => v.id === vehicleId);
    if (!vData) return;
    if (vData.type !== 'buy') {
      set({ notifications: [...state.notifications, 'Only purchased vehicles can be financed with a car loan.'] });
      return;
    }

    const config = lender === 'bank' ? CAR_LOAN.bank : CAR_LOAN.dealer;

    // Bank financing requires decent credit
    if (lender === 'bank') {
      const score = state.creditScore?.score || 0;
      if (score < CAR_LOAN.bank.minCreditScore) {
        set({ notifications: [...state.notifications, `Bank auto loan denied — needs a credit score of ${CAR_LOAN.bank.minCreditScore}+. Yours: ${score || 'no credit history'}.`] });
        return;
      }
    }

    const licenseCost = !state.vehicle.hasLicense ? VEHICLE_COSTS.license : 0;
    const downPayment = Math.round(vData.price * config.downPaymentPercent);
    const upfront = downPayment + licenseCost;

    const newChecking = withdraw(state.checking, upfront, state.currentWeek, `Down payment: ${vData.name}`, 'transport');
    if (!newChecking) {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(upfront)} for the down payment${licenseCost ? ' + license' : ''}.`] });
      return;
    }

    // Amortized monthly payment
    const loanAmount = vData.price - downPayment;
    const monthlyRate = config.apr / 12;
    const n = config.termMonths;
    const monthlyPayment = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));

    const loan: Loan = {
      id: `autoloan_${state.currentWeek}`,
      type: lender === 'bank' ? 'auto_bank' : 'auto_dealer',
      name: `Auto Loan (${lender === 'bank' ? 'Bank' : 'Dealer'})`,
      principal: loanAmount,
      interestRate: config.apr,
      monthlyPayment,
      remainingBalance: loanAmount,
      termMonths: config.termMonths,
      startWeek: state.currentWeek,
      nextDueWeek: state.currentWeek + 4,
      weeksPastDue: 0,
    };

    set({
      checking: newChecking,
      loans: [...state.loans, loan],
      vehicle: {
        owned: true,
        leased: false,
        transitPass: false,
        vehicleId: vData.id,
        name: vData.name,
        type: vData.type,
        value: vData.price,
        mpg: vData.mpg,
        reliability: vData.reliability,
        insuranceCostPerYear: vData.insurance,
        registrationCostPerYear: vData.registration,
        monthlyPayment: 0,
        hasLicense: true,
        licenseCost: VEHICLE_COSTS.license,
        purchaseWeek: state.currentWeek,
      },
      notifications: [...state.notifications, `🚗 Financed ${vData.name} via ${lender === 'bank' ? 'bank' : 'dealer'} loan. ${formatCurrency(downPayment)} down, ${formatCurrency(monthlyPayment)}/mo for ${config.termMonths} months.`],
    });
  },

  // Take an unsecured personal loan from the bank when you need cash.
  takeBankLoan: (amount: number, toAccount: 'checking' | 'savings' = 'checking') => {
    const state = get();
    const principal = Math.round(amount);
    if (principal < PERSONAL_LOAN.minAmount) {
      set({ notifications: [...state.notifications, `The minimum personal loan is ${formatCurrency(PERSONAL_LOAN.minAmount)}.`] });
      return;
    }
    if (principal > PERSONAL_LOAN.maxAmount) {
      set({ notifications: [...state.notifications, `The maximum personal loan is ${formatCurrency(PERSONAL_LOAN.maxAmount)}.`] });
      return;
    }

    // APR scales with credit score (no score = poor tier)
    const score = state.creditScore?.score ?? 0;
    const apr = score >= 740 ? PERSONAL_LOAN.aprExcellent
      : score >= 670 ? PERSONAL_LOAN.aprGood
      : score >= 580 ? PERSONAL_LOAN.aprFair
      : PERSONAL_LOAN.aprPoor;

    // Amortized monthly payment
    const monthlyRate = apr / 12;
    const n = PERSONAL_LOAN.termMonths;
    const monthlyPayment = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));

    // Proceeds after a small origination fee
    const fee = Math.round(principal * PERSONAL_LOAN.originationFeePct);
    const proceeds = principal - fee;

    const loan: Loan = {
      id: `personalloan_${state.currentWeek}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'personal_bank',
      name: 'Personal Loan',
      principal,
      interestRate: apr,
      monthlyPayment,
      remainingBalance: principal,
      termMonths: PERSONAL_LOAN.termMonths,
      startWeek: state.currentWeek,
      nextDueWeek: state.currentWeek + 4,
      weeksPastDue: 0,
    };

    const target = toAccount === 'savings' ? state.savings : state.checking;
    const funded = deposit(target, proceeds, state.currentWeek, 'Personal loan disbursement', 'other');

    set({
      loans: [...state.loans, loan],
      ...(toAccount === 'savings' ? { savings: funded } : { checking: funded }),
      notifications: [...state.notifications,
        `🏦 Took a ${formatCurrency(principal)} personal loan at ${(apr * 100).toFixed(1)}% APR. ${formatCurrency(proceeds)} deposited (after ${formatCurrency(fee)} fee). Payments: ${formatCurrency(monthlyPayment)}/mo for ${PERSONAL_LOAN.termMonths} months.`,
      ],
    });
  },

  sellVehicle: () => {
    const state = get();
    if (!state.vehicle.owned && !state.vehicle.leased && !state.vehicle.transitPass) {
      set({ notifications: [...state.notifications, 'No vehicle to sell.'] });
      return;
    }

    let proceeds = 0;
    let message = '';

    if (state.vehicle.owned) {
      // Depreciation: lose 15% per year held
      const weeksHeld = state.currentWeek - state.vehicle.purchaseWeek;
      const yearsHeld = weeksHeld / 52;
      const depreciationRate = Math.min(0.8, yearsHeld * 0.15);
      proceeds = Math.round(state.vehicle.value * (1 - depreciationRate));
      message = `Sold ${state.vehicle.name} for ${formatCurrency(proceeds)}`;
    } else if (state.vehicle.leased) {
      // Early lease termination - costs money
      proceeds = 0;
      message = `Returned leased ${state.vehicle.name}. Lease terminated.`;
    } else {
      message = 'Cancelled transit pass.';
    }

    let checking = state.checking;
    let loans = [...state.loans];
    const notifications = [...state.notifications];

    // Pay off any outstanding auto loan from the sale proceeds
    const autoLoan = loans.find(l => (l.type === 'auto_bank' || l.type === 'auto_dealer') && l.remainingBalance > 0);
    if (autoLoan) {
      const payoff = autoLoan.remainingBalance;
      proceeds -= payoff;
      loans = loans.filter(l => l.id !== autoLoan.id);
      if (proceeds >= 0) {
        notifications.push(`Paid off ${autoLoan.name} (${formatCurrency(payoff)}) from the sale.`);
      } else {
        // Sale didn't cover the loan — the shortfall comes out of checking
        notifications.push(`Sale didn't cover the ${autoLoan.name}. You owe ${formatCurrency(-proceeds)} out of pocket.`);
      }
    }

    if (proceeds > 0) {
      checking = deposit(checking, proceeds, state.currentWeek, `Sold: ${state.vehicle.name}`, 'transport');
    } else if (proceeds < 0) {
      const w = withdraw(checking, -proceeds, state.currentWeek, `Loan shortfall: ${state.vehicle.name}`, 'transport');
      if (w) checking = w;
    }

    notifications.push(message);

    set({
      checking,
      loans,
      vehicle: { owned: false, leased: false, transitPass: false, vehicleId: null, name: '', type: 'none', value: 0, mpg: 0, reliability: 100, insuranceCostPerYear: 0, registrationCostPerYear: 0, monthlyPayment: 0, hasLicense: state.vehicle.hasLicense, licenseCost: 0, purchaseWeek: 0 },
      notifications,
    });
  },

  tradeInVehicle: (newVehicleId: string) => {
    const state = get();
    const newVData = (vehiclesData as any[]).find((v: any) => v.id === newVehicleId);
    if (!newVData) return;

    // Calculate trade-in value
    let tradeValue = 0;
    if (state.vehicle.owned) {
      const weeksHeld = state.currentWeek - state.vehicle.purchaseWeek;
      const yearsHeld = weeksHeld / 52;
      const depreciationRate = Math.min(0.8, yearsHeld * 0.15);
      tradeValue = Math.round(state.vehicle.value * (1 - depreciationRate));
    }

    const netCost = Math.max(0, newVData.price - tradeValue);
    const newChecking = withdraw(state.checking, netCost, state.currentWeek, `Trade-in + ${newVData.name}`, 'transport');
    if (!newChecking) {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(netCost)} after trade-in credit of ${formatCurrency(tradeValue)}.`] });
      return;
    }

    const isOwned = newVData.type === 'buy';
    const isLeased = newVData.type === 'lease';

    set({
      checking: newChecking,
      vehicle: {
        owned: isOwned,
        leased: isLeased,
        transitPass: newVData.type === 'transit',
        vehicleId: newVData.id,
        name: newVData.name,
        type: newVData.type,
        value: isOwned ? newVData.price : 0,
        mpg: newVData.mpg,
        reliability: newVData.reliability,
        insuranceCostPerYear: newVData.insurance,
        registrationCostPerYear: newVData.registration,
        monthlyPayment: newVData.monthlyPayment,
        hasLicense: true,
        licenseCost: VEHICLE_COSTS.license,
        purchaseWeek: state.currentWeek,
      },
      notifications: [...state.notifications, `🔄 Traded in ${state.vehicle.name} (${formatCurrency(tradeValue)} credit) → ${newVData.name}`],
    });
  },

  openCreditCard: (cardId: string) => {
    const state = get();
    const score = state.creditScore?.score || 300;
    const card = openCard(cardId, score);
    if (card) {
      const creditScore = state.creditScore || { score: 300, factors: { payment_history: 0, credit_utilization: 100, credit_age: 0, credit_mix: 0, hard_inquiries: 0 } };
      set({
        creditCards: [...state.creditCards, card],
        creditScore,
        notifications: [...state.notifications, `💳 Opened ${card.name}! Use responsibly.`],
      });
    } else {
      set({ notifications: [...state.notifications, 'Application denied. Your credit score is too low.'] });
    }
  },

  closeCreditCard: (cardId: string) => {
    const state = get();
    const card = state.creditCards.find(c => c.id === cardId);
    if (!card) return;
    if (card.balance > 0) {
      set({ notifications: [...state.notifications, `Cannot close ${card.name} — pay off the $${card.balance.toFixed(0)} balance first.`] });
      return;
    }
    // Remove any expense assignments pointing to this card
    const newAssignments = { ...state.expenseCardAssignments };
    for (const key of Object.keys(newAssignments)) {
      if (newAssignments[key] === cardId) newAssignments[key] = null;
    }
    set({
      creditCards: state.creditCards.filter(c => c.id !== cardId),
      expenseCardAssignments: newAssignments,
      notifications: [...state.notifications, `Closed ${card.name}. This may temporarily affect your credit score (reduced credit mix and age).`],
    });
  },

  setExpenseCardAssignment: (category: string, cardId: string | null) => {
    const state = get();
    set({
      expenseCardAssignments: { ...state.expenseCardAssignments, [category]: cardId },
    });
  },

  makeCreditCardPayment: (cardId: string, amount: number) => {
    const state = get();
    const cardIndex = state.creditCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = state.creditCards[cardIndex];
    const payAmount = Math.min(amount, card.balance);
    const newChecking = withdraw(state.checking, payAmount, state.currentWeek, `CC Payment - ${card.name}`, 'credit_payment');
    if (newChecking) {
      const updatedCard = makeCardPayment(card, payAmount, state.currentWeek);
      const updatedCards = [...state.creditCards];
      updatedCards[cardIndex] = updatedCard;
      set({
        checking: newChecking,
        creditCards: updatedCards,
        notifications: [...state.notifications, `✓ Paid ${formatCurrency(payAmount)} on ${card.name}`],
      });
    } else {
      set({ notifications: [...state.notifications, 'Insufficient funds for payment'] });
    }
  },

  buyStock: (id: string, name: string, price: number, shares: number, fundFrom: 'checking' | 'savings' = 'checking') => {
    const state = get();
    const totalCost = price * shares;
    const sourceAccount = fundFrom === 'savings' ? state.savings : state.checking;
    const withdrawn = withdraw(sourceAccount, totalCost, state.currentWeek, `Buy ${shares}x ${id}`, 'investment');
    if (withdrawn) {
      const newLot = { shares, purchasePrice: price, purchaseWeek: state.currentWeek };
      const existingIndex = state.investments.findIndex(i => i.id === id);
      let investments;
      if (existingIndex >= 0) {
        investments = [...state.investments];
        const existing = investments[existingIndex];
        const totalShares = existing.shares + shares;
        const avgPrice = ((existing.purchasePrice * existing.shares) + (price * shares)) / totalShares;
        investments[existingIndex] = {
          ...existing,
          shares: totalShares,
          purchasePrice: Math.round(avgPrice * 100) / 100,
          lots: [...existing.lots, newLot],
        };
      } else {
        investments = [...state.investments, {
          id, type: 'stock' as const, name, shares,
          purchasePrice: price, currentPrice: price,
          purchaseWeek: state.currentWeek,
          lots: [newLot],
        }];
      }
      const update: any = { investments, notifications: [...state.notifications, `📈 Bought ${shares} shares of ${id} at ${formatCurrency(price)} from ${fundFrom}`] };
      if (fundFrom === 'savings') {
        update.savings = withdrawn;
      } else {
        update.checking = withdrawn;
      }
      set(update);
    } else {
      set({ notifications: [...state.notifications, `Insufficient funds in ${fundFrom}. Need ${formatCurrency(totalCost)}`] });
    }
  },

  sellStock: (id: string, shares: number) => {
    const state = get();
    const invIndex = state.investments.findIndex(i => i.id === id);
    if (invIndex === -1) return;

    const inv = state.investments[invIndex];
    const sellShares = Math.min(shares, inv.shares);
    const currentPrice = inv.currentPrice;
    const proceeds = Math.round(sellShares * currentPrice * 100) / 100;

    // Sell from lots using FIFO (first in, first out)
    let remainingToSell = sellShares;
    let totalTax = 0;
    let totalGain = 0;
    const updatedLots = [...inv.lots];
    const soldLotDetails: string[] = [];

    while (remainingToSell > 0 && updatedLots.length > 0) {
      const lot = updatedLots[0];
      const lotSellShares = Math.min(remainingToSell, lot.shares);
      const lotProceeds = lotSellShares * currentPrice;
      const lotCostBasis = lotSellShares * lot.purchasePrice;
      const lotGain = lotProceeds - lotCostBasis;
      const weeksHeld = state.currentWeek - lot.purchaseWeek;
      const isLongTerm = weeksHeld >= 52;
      const taxRate = isLongTerm ? 0.15 : 0.22;
      const lotTax = lotGain > 0 ? Math.round(lotGain * taxRate * 100) / 100 : 0;

      totalTax += lotTax;
      totalGain += lotGain;
      soldLotDetails.push(`${lotSellShares}@${formatCurrency(lot.purchasePrice)} (${isLongTerm ? 'LT' : 'ST'})`);

      if (lotSellShares >= lot.shares) {
        updatedLots.shift();
      } else {
        updatedLots[0] = { ...lot, shares: lot.shares - lotSellShares };
      }
      remainingToSell -= lotSellShares;
    }

    const netProceeds = Math.round((proceeds - totalTax) * 100) / 100;
    const checking = deposit(state.checking, netProceeds, state.currentWeek, `Sold ${sellShares}x ${id}`, 'investment');

    // Update investments
    let investments = [...state.investments];
    if (sellShares >= inv.shares) {
      investments.splice(invIndex, 1);
    } else {
      const newTotalShares = inv.shares - sellShares;
      const newAvgPrice = updatedLots.length > 0
        ? updatedLots.reduce((s, l) => s + l.shares * l.purchasePrice, 0) / newTotalShares
        : inv.purchasePrice;
      investments[invIndex] = {
        ...inv,
        shares: newTotalShares,
        purchasePrice: Math.round(newAvgPrice * 100) / 100,
        lots: updatedLots,
      };
    }

    const gainLabel = totalGain >= 0 ? 'gain' : 'loss';
    const taxNote = totalTax > 0 ? ` (tax: ${formatCurrency(totalTax)})` : '';

    set({
      checking,
      investments,
      notifications: [...state.notifications, `Sold ${sellShares} shares of ${id} for ${formatCurrency(proceeds)} — ${formatCurrency(Math.abs(totalGain))} ${gainLabel}${taxNote}`],
    });
  },

  // Buy a stock inside a retirement account, funded by that account's cash balance.
  // The position is tracked as an Investment tagged with the account, using a
  // composite id so it stays distinct from a brokerage holding of the same stock.
  buyStockInAccount: (stockId: string, name: string, price: number, shares: number, account: 'roth_ira' | 'traditional_ira' | '401k') => {
    const state = get();
    if (shares <= 0) return;
    const totalCost = Math.round(price * shares * 100) / 100;

    // Cash available in the account = balance minus value already invested in specific stocks
    const acctInvested = state.investments
      .filter(i => i.account === account)
      .reduce((s, i) => s + i.shares * i.currentPrice, 0);
    const acctIndex = state.retirementAccounts.findIndex(a => a.type === account && a.active !== false);
    const acct = acctIndex >= 0 ? state.retirementAccounts[acctIndex] : null;
    const cashAvailable = acct ? Math.max(0, acct.balance - acctInvested) : 0;

    if (!acct || cashAvailable < totalCost) {
      const label = account === 'roth_ira' ? 'Roth IRA' : account === 'traditional_ira' ? 'Traditional IRA' : '401(k)';
      set({ notifications: [...state.notifications, `Not enough cash in your ${label} to buy that. Available: ${formatCurrency(cashAvailable)}.`] });
      return;
    }

    // Move cash out of the account balance into a stock position (no double count).
    const retirementAccounts = [...state.retirementAccounts];
    retirementAccounts[acctIndex] = {
      ...acct,
      balance: Math.round((acct.balance - totalCost) * 100) / 100,
    };

    const compositeId = `${stockId}__${account}`;
    const newLot = { shares, purchasePrice: price, purchaseWeek: state.currentWeek };
    const existingIndex = state.investments.findIndex(i => i.id === compositeId);
    let investments;
    if (existingIndex >= 0) {
      investments = [...state.investments];
      const existing = investments[existingIndex];
      const totalShares = existing.shares + shares;
      const avgPrice = ((existing.purchasePrice * existing.shares) + (price * shares)) / totalShares;
      investments[existingIndex] = {
        ...existing,
        shares: totalShares,
        purchasePrice: Math.round(avgPrice * 100) / 100,
        currentPrice: price,
        lots: [...existing.lots, newLot],
      };
    } else {
      investments = [...state.investments, {
        id: compositeId, type: 'stock' as const, name, shares,
        purchasePrice: price, currentPrice: price,
        purchaseWeek: state.currentWeek, lots: [newLot], account,
      }];
    }

    const label = account === 'roth_ira' ? 'Roth IRA' : account === 'traditional_ira' ? 'Traditional IRA' : '401(k)';
    set({
      retirementAccounts,
      investments,
      notifications: [...state.notifications, `📈 Bought ${shares} shares of ${stockId} in your ${label} at ${formatCurrency(price)}.`],
    });
  },

  // Sell a retirement-account stock position; proceeds return to that account's
  // cash balance (no capital-gains tax inside a retirement account).
  sellStockInAccount: (investmentId: string, shares: number) => {
    const state = get();
    const invIndex = state.investments.findIndex(i => i.id === investmentId);
    if (invIndex === -1) return;
    const inv = state.investments[invIndex];
    const account = inv.account;
    if (!account || account === 'brokerage') return;

    const sellShares = Math.min(shares, inv.shares);
    if (sellShares <= 0) return;
    const proceeds = Math.round(sellShares * inv.currentPrice * 100) / 100;

    // FIFO reduce lots
    let remaining = sellShares;
    const updatedLots = [...inv.lots];
    while (remaining > 0 && updatedLots.length > 0) {
      const lot = updatedLots[0];
      const take = Math.min(remaining, lot.shares);
      if (take >= lot.shares) updatedLots.shift();
      else updatedLots[0] = { ...lot, shares: lot.shares - take };
      remaining -= take;
    }

    let investments = [...state.investments];
    if (sellShares >= inv.shares) {
      investments.splice(invIndex, 1);
    } else {
      const newTotalShares = inv.shares - sellShares;
      const newAvg = updatedLots.length > 0
        ? updatedLots.reduce((s, l) => s + l.shares * l.purchasePrice, 0) / newTotalShares
        : inv.purchasePrice;
      investments[invIndex] = { ...inv, shares: newTotalShares, purchasePrice: Math.round(newAvg * 100) / 100, lots: updatedLots };
    }

    // Return proceeds to the account balance
    const retirementAccounts = state.retirementAccounts.map(a =>
      a.type === account && a.active !== false
        ? { ...a, balance: Math.round((a.balance + proceeds) * 100) / 100 }
        : a
    );

    const label = account === 'roth_ira' ? 'Roth IRA' : account === 'traditional_ira' ? 'Traditional IRA' : '401(k)';
    set({
      retirementAccounts,
      investments,
      notifications: [...state.notifications, `Sold ${sellShares} shares in your ${label} for ${formatCurrency(proceeds)} (returned to account cash).`],
    });
  },

  contributeRetirement: (type: RetirementAccountType, amount: number) => {
    const state = get();

    // 401(k) contributions are automatic for salaried jobs — no manual contribution
    if (type === '401k') {
      set({ notifications: [...state.notifications, '401(k) contributions are automatic while you hold a salaried job.'] });
      return;
    }

    const newChecking = withdraw(state.checking, amount, state.currentWeek, `${type} contribution`, 'investment');
    if (!newChecking) {
      set({ notifications: [...state.notifications, 'Insufficient funds'] });
      return;
    }

    // IRA contributions are invested in stocks/bonds and grow tax-free
    const existingIndex = state.retirementAccounts.findIndex(a => a.type === type);
    let retirementAccounts = [...state.retirementAccounts];

    if (existingIndex >= 0) {
      retirementAccounts[existingIndex] = {
        ...retirementAccounts[existingIndex],
        balance: Math.round((retirementAccounts[existingIndex].balance + amount) * 100) / 100,
        contributions: Math.round((retirementAccounts[existingIndex].contributions + amount) * 100) / 100,
        invested: Math.round(((retirementAccounts[existingIndex].invested || 0) + amount) * 100) / 100,
      };
    } else {
      const limit = type === 'roth_ira' ? RETIREMENT.rothIraLimit : RETIREMENT.traditionalIraLimit;
      retirementAccounts.push({
        type,
        balance: amount,
        contributions: amount,
        invested: amount,
        yearlyContributionLimit: limit,
      });
    }

    const label = type === 'roth_ira' ? 'Roth IRA' : 'Traditional IRA';
    set({
      checking: newChecking,
      retirementAccounts,
      notifications: [...state.notifications, `Contributed ${formatCurrency(amount)} to ${label} (invested, grows tax-free)`],
    });
  },

  rollover401k: () => {
    const state = get();

    // Roll over every inactive 401(k) (from jobs you've left) into a Traditional IRA
    const inactive401ks = state.retirementAccounts.filter(a => a.type === '401k' && a.active === false && a.balance > 0);

    if (inactive401ks.length === 0) {
      set({ notifications: [...state.notifications, 'No rollover-eligible 401(k). You can roll over after leaving a job that provided one.'] });
      return;
    }

    const rolloverAmount = Math.round(inactive401ks.reduce((s, a) => s + a.balance, 0) * 100) / 100;

    let retirementAccounts = [...state.retirementAccounts];
    // Remove the inactive 401ks
    retirementAccounts = retirementAccounts.filter(a => !(a.type === '401k' && a.active === false && a.balance > 0));

    // Move to Traditional IRA (no penalty, no tax). Rolled funds count as invested (grow tax-free).
    const iraIndex = retirementAccounts.findIndex(a => a.type === 'traditional_ira');
    if (iraIndex >= 0) {
      retirementAccounts[iraIndex] = {
        ...retirementAccounts[iraIndex],
        balance: Math.round((retirementAccounts[iraIndex].balance + rolloverAmount) * 100) / 100,
        invested: Math.round(((retirementAccounts[iraIndex].invested || 0) + rolloverAmount) * 100) / 100,
      };
    } else {
      retirementAccounts.push({
        type: 'traditional_ira',
        balance: rolloverAmount,
        contributions: 0,
        invested: rolloverAmount,
        yearlyContributionLimit: RETIREMENT.traditionalIraLimit,
      });
    }

    set({
      retirementAccounts,
      notifications: [...state.notifications, `Rolled over ${formatCurrency(rolloverAmount)} from former 401(k) to Traditional IRA. No penalty, invested for tax-free growth.`],
    });
  },

  enrollInProgram: (program: 'trade_school' | 'college' | 'mba', pace: 'full_time' | 'part_time') => {
    const state = get();
    if (state.education.enrollment) {
      set({ notifications: [...state.notifications, 'You are already enrolled in a program. Finish or drop it first.'] });
      return;
    }
    const cfg = EDUCATION.programs[program];
    // MBA requires a bachelor's
    if (program === 'mba' && state.education.highestDegree !== 'bachelors' && state.education.highestDegree !== 'mba') {
      set({ notifications: [...state.notifications, "An MBA requires a bachelor's degree first."] });
      return;
    }
    // ── Full-time study means leaving full-time work ──
    // A full-time job is any salaried role or an hourly role of 35+ hours/week.
    // Enrolling full-time makes you leave those jobs; part-time hourly work stays.
    const isFullTimeJob = (j: Job) => j.payType === 'salary' || j.hoursPerWeek >= 35;
    let currentJob = state.currentJob;
    let secondaryJobs = [...state.secondaryJobs];
    const previousJobs = [...state.previousJobs];
    const jobNotices = { ...state.jobNotices };
    const leftJobIds: string[] = [];
    const leftTitles: string[] = [];

    if (pace === 'full_time') {
      const leaving = [currentJob, ...secondaryJobs].filter((j): j is Job => !!j && isFullTimeJob(j));
      for (const j of leaving) {
        leftJobIds.push(j.id);
        leftTitles.push(j.title);
        previousJobs.push(j.id);
        delete jobNotices[j.id];
      }
      // Keep only part-time hourly jobs
      const remaining = [currentJob, ...secondaryJobs].filter((j): j is Job => !!j && !isFullTimeJob(j));
      currentJob = remaining[0] || null;
      secondaryJobs = remaining.slice(1);
    }

    // Deactivate any 401(k) tied to a job we just left (becomes rollover-eligible)
    const retirementAccounts = state.retirementAccounts.map(a =>
      a.type === '401k' && a.jobId && leftJobIds.includes(a.jobId) && a.active !== false
        ? { ...a, active: false }
        : a
    );

    const newHours = (currentJob?.hoursPerWeek || 0) + secondaryJobs.reduce((s, j) => s + j.hoursPerWeek, 0);
    const benefits = computeBenefits(currentJob, secondaryJobs);

    // Does the player's (remaining) job cover credits? Salaried job = employer benefit
    const hasBenefit = benefits.has401kAccess || (currentJob?.payType === 'salary');
    const creditsPerYearBenefit = hasBenefit ? EDUCATION.employerCreditsPerYear : 0;

    const leaveMsg = leftTitles.length > 0
      ? ` Left full-time work: ${leftTitles.join(', ')}.`
      : '';

    set({
      currentJob,
      secondaryJobs,
      previousJobs,
      jobNotices,
      totalWeeklyHours: newHours,
      hasHealthInsurance: benefits.hasHealthInsurance,
      has401kAccess: benefits.has401kAccess,
      retirementAccounts,
      education: {
        ...state.education,
        enrollment: {
          program,
          pace,
          creditsRequired: cfg.credits,
          creditsCompleted: 0,
          creditsPerYearBenefit,
          tuitionPerCredit: cfg.tuitionPerCredit,
          startWeek: state.currentWeek,
        },
        employerCreditsUsedThisYear: 0,
      },
      notifications: [...state.notifications, `📚 Enrolled in ${cfg.label} (${pace === 'full_time' ? 'Full-Time' : 'Part-Time'}).${leaveMsg}${creditsPerYearBenefit ? ` Employer covers ${creditsPerYearBenefit} credits/yr.` : ''}`],
    });
  },

  dropProgram: () => {
    const state = get();
    if (!state.education.enrollment) return;
    set({
      education: { ...state.education, enrollment: null },
      notifications: [...state.notifications, 'You dropped out of your program. Completed credits are lost.'],
    });
  },

  // Toggle an active enrollment between full-time and part-time (College/MBA).
  // Switching to full-time means leaving full-time employment (same rule as enrolling).
  switchEnrollmentPace: () => {
    const state = get();
    const enr = state.education.enrollment;
    if (!enr) return;
    const toFullTime = enr.pace !== 'full_time';

    let currentJob = state.currentJob;
    let secondaryJobs = [...state.secondaryJobs];
    const previousJobs = [...state.previousJobs];
    const jobNotices = { ...state.jobNotices };
    const leftJobIds: string[] = [];
    const leftTitles: string[] = [];

    if (toFullTime) {
      const isFullTimeJob = (j: Job) => j.payType === 'salary' || j.hoursPerWeek >= 35;
      const leaving = [currentJob, ...secondaryJobs].filter((j): j is Job => !!j && isFullTimeJob(j));
      for (const j of leaving) {
        leftJobIds.push(j.id);
        leftTitles.push(j.title);
        previousJobs.push(j.id);
        delete jobNotices[j.id];
      }
      const remaining = [currentJob, ...secondaryJobs].filter((j): j is Job => !!j && !isFullTimeJob(j));
      currentJob = remaining[0] || null;
      secondaryJobs = remaining.slice(1);
    }

    // Deactivate any 401(k) tied to a job we just left
    const retirementAccounts = state.retirementAccounts.map(a =>
      a.type === '401k' && a.jobId && leftJobIds.includes(a.jobId) && a.active !== false
        ? { ...a, active: false }
        : a
    );

    const newHours = (currentJob?.hoursPerWeek || 0) + secondaryJobs.reduce((s, j) => s + j.hoursPerWeek, 0);
    const benefits = computeBenefits(currentJob, secondaryJobs);
    const leaveMsg = leftTitles.length > 0 ? ` Left full-time work: ${leftTitles.join(', ')}.` : '';

    set({
      currentJob,
      secondaryJobs,
      previousJobs,
      jobNotices,
      totalWeeklyHours: newHours,
      hasHealthInsurance: benefits.hasHealthInsurance,
      has401kAccess: benefits.has401kAccess,
      retirementAccounts,
      education: {
        ...state.education,
        enrollment: { ...enr, pace: toFullTime ? 'full_time' : 'part_time' },
      },
      notifications: [...state.notifications, `Switched to ${toFullTime ? 'Full-Time' : 'Part-Time'} study.${leaveMsg}`],
    });
  },

  takeBusinessClass: () => {
    const state = get();
    const cost = 600;
    const newChecking = withdraw(state.checking, cost, state.currentWeek, 'Continuing-ed business class', 'education');
    if (!newChecking) {
      set({ notifications: [...state.notifications, `Insufficient funds. A business class costs ${formatCurrency(cost)}.`] });
      return;
    }
    set({
      checking: newChecking,
      education: { ...state.education, businessClassesTaken: state.education.businessClassesTaken + 1 },
      skills: { ...state.skills, skills: { ...state.skills.skills, financial_acumen: Math.min(100, state.skills.skills.financial_acumen + 3), leadership: Math.min(100, state.skills.skills.leadership + 2) } },
      notifications: [...state.notifications, '🎓 Completed a continuing-ed business class. (+Financial Acumen, +Leadership)'],
    });
  },

  foundStartup: (name: string, idea: string) => {
    const state = get();
    if (state.startup) {
      set({ notifications: [...state.notifications, 'You already have a startup.'] });
      return;
    }
    if (!canFoundStartup(state)) {
      set({ notifications: [...state.notifications, 'You have not unlocked the founder path yet.'] });
      return;
    }
    // Self-fund the seed round from checking (fall back to savings)
    const seed = STARTUP.seedSelfFunding;
    let checking = state.checking;
    let savings = state.savings;
    const w = withdraw(checking, seed, state.currentWeek, `Seed funding — ${name}`, 'investment');
    if (w) {
      checking = w;
    } else {
      const s = withdraw(savings, seed, state.currentWeek, `Seed funding — ${name}`, 'investment');
      if (!s) {
        set({ notifications: [...state.notifications, `You need ${formatCurrency(seed)} to self-fund a startup.`] });
        return;
      }
      savings = s;
    }

    const startupId = `${state.gameId || 'game'}_su_${Date.now().toString(36)}`;
    const startup: Startup = {
      id: startupId,
      name,
      idea,
      foundedWeek: state.currentWeek,
      stage: 'stealth',
      founderRole: 'lead',
      founderEquityPct: STARTUP.founderStartEquity,
      valuation: Math.round(STARTUP.startWeeklyRevenue * 52 * STARTUP.valuationRevenueMultiple + seed),
      treasury: seed,
      weeklyRevenue: STARTUP.startWeeklyRevenue,
      weeklyCosts: STARTUP.startWeeklyCosts,
      employees: STARTUP.startEmployees,
      cashRaised: 0,
      weeklyFounderPay: 0,
      ceoSalary: STARTUP.ceoSalary,
      failed: false,
      public: false,
      lastRoundWeek: state.currentWeek,
      costSurchargeUntilWeek: 0,
      fundingLockoutUntilWeek: 0,
      employeeAccrual: 0,
    };

    // Persist the idea to the backend (best-effort)
    saveStartupIdea({ startupId, name, idea, gameId: state.gameId || undefined, week: state.currentWeek });

    set({
      checking,
      savings,
      startup,
      notifications: [...state.notifications, `🚀 You founded ${name} in stealth mode with ${formatCurrency(seed)} of runway. Grow its value, then raise a Series A once it's worth ${formatCurrency(STARTUP.rounds.series_a.minValuation)}.`],
    });
  },

  raiseFundingRound: () => {
    const state = get();
    const startup = state.startup;
    if (!startup || startup.failed || startup.public) return;
    const week = state.currentWeek;

    const next = nextRound(startup.stage);
    if (!next || next === 'public') {
      set({ notifications: [...state.notifications, 'No further funding rounds available — consider an IPO.'] });
      return;
    }
    const cfg = (STARTUP.rounds as any)[next];
    if (!cfg) return;

    const roundLabel = next.replace('series_', 'Series ').toUpperCase();

    // Locked out after a recent failed attempt?
    if (week < (startup.fundingLockoutUntilWeek || 0)) {
      const wksLeft = startup.fundingLockoutUntilWeek - week;
      set({ notifications: [...state.notifications, `Investors need time after your last failed raise — you can try again in ${wksLeft} week(s).`] });
      return;
    }
    // Valuation gate
    if (startup.valuation < cfg.minValuation) {
      set({ notifications: [...state.notifications, `${startup.name} needs to be worth at least ${formatCurrency(cfg.minValuation)} to raise its ${roundLabel}. Current valuation: ${formatCurrency(startup.valuation)}.`] });
      return;
    }

    // Attempt the round — success is chance-based
    const success = Math.random() < STARTUP.successChance;
    if (!success) {
      // No company failure — just costlier operations + a retry lockout
      set({
        startup: {
          ...startup,
          costSurchargeUntilWeek: week + STARTUP.failedRoundSurchargeWeeks,
          fundingLockoutUntilWeek: week + STARTUP.failedRoundLockoutWeeks,
        },
        notifications: [...state.notifications,
          `😬 ${startup.name}'s ${roundLabel} fell through. The scramble raised costs +${Math.round(STARTUP.failedRoundCostSurchargePct * 100)}% for ~3 months, and investors won't revisit for ~2 months.`,
        ],
      });
      return;
    }

    // Success: capital lands in the treasury, founder is diluted, company scales up
    const newEquity = Math.round(startup.founderEquityPct * (1 - cfg.dilution) * 1000) / 1000;
    const newRevenue = Math.round(startup.weeklyRevenue * cfg.revenueBump);
    const newCosts = Math.round(startup.weeklyCosts * cfg.costBump);
    const newTreasury = startup.treasury + cfg.raise;
    const updated: Startup = {
      ...startup,
      stage: next,
      founderEquityPct: newEquity,
      treasury: newTreasury,
      weeklyRevenue: newRevenue,
      weeklyCosts: newCosts,
      employees: startup.employees + cfg.employeeBump,
      cashRaised: startup.cashRaised + cfg.raise,
      valuation: Math.round(newRevenue * 52 * STARTUP.valuationRevenueMultiple + Math.max(0, newTreasury)),
      lastRoundWeek: week,
    };

    apiUpdateStartup({ startupId: startup.id, status: 'active', event: `raised_${next}`, week, detail: `Valuation ${updated.valuation}` });
    set({
      startup: updated,
      notifications: [...state.notifications,
        `🎉 ${startup.name} closed its ${roundLabel}! Raised ${formatCurrency(cfg.raise)} into the treasury. You were diluted to ${Math.round(newEquity * 100)}% — but the company is now valued at ${formatCurrency(updated.valuation)}.`,
      ],
    });
  },

  setFounderRole: (role: 'lead' | 'board') => {
    const state = get();
    if (!state.startup || state.startup.failed) return;
    set({
      startup: { ...state.startup, founderRole: role },
      notifications: [...state.notifications, role === 'board'
        ? `You stepped back to the board of ${state.startup.name} and hired a CEO (${formatCurrency(STARTUP.ceoSalary)}/wk). Now ~${STARTUP.boardHoursPerWeek}h/week.`
        : `You took the reins as CEO of ${state.startup.name}. Leading a scaled startup is ~${STARTUP.leadHoursPerWeek}h/week.`],
    });
  },

  takeStartupPublic: () => {
    const state = get();
    const startup = state.startup;
    if (!startup || !canIPO(startup)) {
      set({ notifications: [...state.notifications, `Your startup must be worth at least ${formatCurrency(STARTUP.ipo.minValuation)} to IPO.`] });
      return;
    }
    // IPO uses the company's current valuation; founder cashes out a portion
    const ipoValuation = startup.valuation;
    const founderStakeValue = Math.round(ipoValuation * startup.founderEquityPct);
    const cashOut = Math.round(founderStakeValue * STARTUP.ipo.cashOutPct);
    const checking = deposit(state.checking, cashOut, state.currentWeek, `IPO cash-out — ${startup.name}`, 'income');

    apiUpdateStartup({ startupId: startup.id, status: 'ipo', event: 'ipo', week: state.currentWeek, detail: `Valuation ${ipoValuation}` });
    set({
      checking,
      startup: {
        ...startup,
        stage: 'public',
        public: true,
      },
      notifications: [...state.notifications,
        `📈 ${startup.name} went public at a ${formatCurrency(ipoValuation)} valuation! Your ${Math.round(startup.founderEquityPct * 100)}% stake is worth ${formatCurrency(founderStakeValue)}. You cashed out ${formatCurrency(cashOut)}.`,
      ],
    });
  },

  exitStartup: () => {
    const state = get();
    const startup = state.startup;
    if (!startup) return;
    if (startup.failed) {
      set({ startup: null, notifications: [...state.notifications, `Wound down ${startup.name}.`] });
      return;
    }
    // Sell your equity at current valuation
    const proceeds = Math.round(startup.valuation * startup.founderEquityPct);
    const checking = deposit(state.checking, proceeds, state.currentWeek, `Sold equity — ${startup.name}`, 'income');
    apiUpdateStartup({ startupId: startup.id, status: 'sold', event: 'sold', week: state.currentWeek, detail: `Proceeds ${proceeds}` });
    set({
      checking,
      startup: null,
      notifications: [...state.notifications, `You sold your ${Math.round(startup.founderEquityPct * 100)}% stake in ${startup.name} for ${formatCurrency(proceeds)}.`],
    });
  },
}));
