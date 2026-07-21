import { create } from 'zustand';
import { GameState, Job, W4Form, AdvisorMessage, RetirementAccountType, BankAccount } from '../engine/types';
import { createBankAccount, deposit, withdraw, applySavingsInterest, calculateWeeklyIncome, calculateWeeklyExpenses, formatCurrency, getNetWorth } from '../engine/finance';
import { createDefaultW4, calculateWithholding, calculateAnnualTax as calculateAnnualTaxFn } from '../engine/taxes';
import { createInitialSkills, gainSkillsFromJob } from '../engine/skills';
import { calculateCreditScore, openCreditCard as openCard, makeCardPayment, applyCardInterest } from '../engine/credit';
import { checkStageProgression, canSpeedUp } from '../engine/progression';
import { generateAdvisorMessages } from '../engine/advisor';
import { applyForJob as engineApplyForJob } from '../engine/jobs';
import { GAME_WEEK_MS, HOUSING_COSTS, VEHICLE_COSTS, RETIREMENT, FEATURE_FLAGS } from '../engine/constants';
import vehiclesData from '../data/vehicles.json';
import hobbiesData from '../data/hobbies.json';

type Panel = 'dashboard' | 'jobs' | 'banking' | 'credit' | 'housing' | 'utilities' | 'taxes' | 'investing' | 'settings';

export interface GameSettings {
  autoBillPay: boolean;
  autoTaxFiling: boolean;
  autoCreditCardPay: boolean;
}

interface GameStore extends GameState {
  activePanel: Panel;
  sidebarCollapsed: boolean;
  depositSplit: number;
  gameLoopInterval: number | null;
  settings: GameSettings;
  pendingBills: PendingBill[];

  // Actions
  startGame: (name: string) => void;
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
  updateW4: (w4: W4Form) => void;
  fileTaxes: () => void;
  moveToApartment: () => void;
  moveToNiceApartment: () => void;
  buyHouse: (tier: 'house' | 'nice_house') => void;
  buyCar: () => void;
  acquireVehicle: (vehicleId: string) => void;
  sellVehicle: () => void;
  tradeInVehicle: (newVehicleId: string) => void;
  openCreditCard: (cardId: string) => void;
  closeCreditCard: (cardId: string) => void;
  setExpenseCardAssignment: (category: string, cardId: string | null) => void;
  makeCreditCardPayment: (cardId: string, amount: number) => void;
  buyStock: (id: string, name: string, price: number, shares: number, fundFrom?: 'checking' | 'savings') => void;
  sellStock: (id: string, shares: number) => void;
  contributeRetirement: (type: RetirementAccountType, amount: number) => void;
  rollover401k: () => void;
  clearNotification: (index: number) => void;
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

const initialState = (): Omit<GameStore, 'startGame' | 'setActivePanel' | 'setGameSpeed' | 'togglePause' | 'advanceWeek' | 'startGameLoop' | 'stopGameLoop' | 'updateSettings' | 'payBill' | 'applyForJob' | 'addAdditionalJob' | 'quitJob' | 'startHobby' | 'stopHobby' | 'transferMoney' | 'setDepositSplit' | 'updateW4' | 'fileTaxes' | 'moveToApartment' | 'moveToNiceApartment' | 'buyHouse' | 'buyCar' | 'acquireVehicle' | 'sellVehicle' | 'tradeInVehicle' | 'openCreditCard' | 'closeCreditCard' | 'setExpenseCardAssignment' | 'makeCreditCardPayment' | 'buyStock' | 'sellStock' | 'contributeRetirement' | 'rollover401k' | 'clearNotification' | 'addNotification'> => ({
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
  totalWeeklyHours: 0,
  exhaustion: 0,
  hasHealthInsurance: false,
  has401kAccess: false,
  previousJobs: [],
  activeHobbies: [],
  checking: createBankAccount('checking'),
  savings: { ...createBankAccount('savings'), balance: 500 },
  totalSaved: 500,
  netWorthHistory: [],
  investmentHistory: [],
  w4: createDefaultW4(),
  taxReturns: [],
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
  skills: createInitialSkills(),
  availableJobs: [],
  jobHistory: [],
  age: 18,
  education: { highestDegree: 'high_school', certificates: [] },
  isMarried: false,
  children: 0,
  lifeEvents: [],
  advisorMessages: [],
  events: [],
  notifications: [],
  economy: { inflationMultiplier: 1.0, currentGasPrice: 3.50, weeklyFuelCost: 0 },
  multiplayer: { mode: 'single', playerId: '1', players: [], sharedJobMarket: [] },
  activePanel: 'dashboard',
  sidebarCollapsed: typeof window !== 'undefined' && window.innerWidth < 768,
  depositSplit: 20,
  gameLoopInterval: null,
  settings: { autoBillPay: true, autoTaxFiling: true, autoCreditCardPay: false },
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
    set({ playerName: name, isPaused: false });
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

    const prevState = { ...state };
    let checking = { ...state.checking };
    let savings = { ...state.savings };
    let skills = { ...state.skills };
    let yearToDateIncome = state.yearToDateIncome;
    let yearToDateWithholding = state.yearToDateWithholding;
    const week = state.currentWeek + 1;

    // Pay player if they have a job
    if (state.currentJob) {
      const income = calculateWeeklyIncome(state);
      const withholding = calculateWithholding(income.gross, state.w4);
      const netPay = income.gross - withholding;
      yearToDateIncome += income.gross;
      yearToDateWithholding += withholding;

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
    for (const hobby of state.activeHobbies) {
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
      // Auto pay all bills from checking
      if (billAmount > 0) {
        const w = withdraw(checking, billAmount, week, 'Auto-pay bills', 'rent');
        if (w) checking = w;
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
        delete jobNotices[jobId];
        jobsChanged = true;
      }
    }

    const totalWeeklyHours = (currentJob?.hoursPerWeek || 0) + secondaryJobs.reduce((s, j) => s + j.hoursPerWeek, 0);
    const benefitsUpdate = jobsChanged ? computeBenefits(currentJob, secondaryJobs) : { hasHealthInsurance: state.hasHealthInsurance, has401kAccess: state.has401kAccess };

    // Auto tax filing (every 52 weeks)
    if (state.settings.autoTaxFiling && week % 52 === 0 && week > 0) {
      const taxState = { ...state, checking, savings, yearToDateIncome, yearToDateWithholding, currentWeek: week };
      const taxReturn = calculateAnnualTaxFn(taxState as any);
      if (taxReturn.refundOrOwed > 0) {
        checking = deposit(checking, taxReturn.refundOrOwed, week, 'Tax Refund (auto-filed)', 'tax');
      } else if (taxReturn.refundOrOwed < 0) {
        const owed = Math.abs(taxReturn.refundOrOwed);
        const paid = withdraw(checking, owed, week, 'Tax Payment (auto-filed)', 'tax');
        if (paid) checking = paid;
      }
      yearToDateIncome = 0;
      yearToDateWithholding = 0;
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

    // Update investment prices (random walk)
    const investments = state.investments.map(inv => ({
      ...inv,
      currentPrice: Math.round((inv.currentPrice * (1 + (Math.random() - 0.48) * 0.04)) * 100) / 100,
    }));

    // Grow retirement accounts (simplified weekly return)
    const retirementAccounts = state.retirementAccounts.map(acct => ({
      ...acct,
      balance: Math.round((acct.balance * 1.0015) * 100) / 100, // ~8% annual
    }));

    set({
      currentWeek: week,
      checking,
      savings,
      skills,
      yearToDateIncome,
      yearToDateWithholding,
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
      stage: newStage,
      realTimePlayedMs: realTimePlayed,
      canSpeedUp: speedUpAllowed,
      advisorMessages: [...state.advisorMessages.slice(-10), ...newMessages],
      investments,
      retirementAccounts,
      pendingBills,
      age,
      notifications,
      totalSaved: checking.balance + savings.balance,
      netWorthHistory: [...state.netWorthHistory.slice(-200), {
        week,
        total: getNetWorth({ ...state, checking, savings, investments, retirementAccounts, vehicle: state.vehicle, creditCards, housing: state.housing } as any),
        pay: checking.balance + savings.balance,
        investments: investments.reduce((s, i) => s + i.shares * i.currentPrice, 0),
        realEstate: (state.housing.type === 'house' || state.housing.type === 'nice_house') && state.housing.mortgage
          ? (state.housing.type === 'nice_house' ? 450000 : 250000) - state.housing.mortgage.remainingBalance
          : 0,
        car: state.vehicle.owned ? state.vehicle.value : 0,
        fourOhOneK: retirementAccounts.find(a => a.type === '401k')?.balance || 0,
        traditionalIra: retirementAccounts.find(a => a.type === 'traditional_ira')?.balance || 0,
        rothIra: retirementAccounts.find(a => a.type === 'roth_ira')?.balance || 0,
      }],
      investmentHistory: [...state.investmentHistory.slice(-200), {
        total: investments.reduce((s, i) => s + i.shares * i.currentPrice, 0) + retirementAccounts.reduce((s, a) => s + a.balance, 0),
        brokerage: investments.reduce((s, i) => s + i.shares * i.currentPrice, 0),
        roth_ira: retirementAccounts.find(a => a.type === 'roth_ira')?.balance || 0,
        traditional_ira: retirementAccounts.find(a => a.type === 'traditional_ira')?.balance || 0,
        fourOhOneK: retirementAccounts.find(a => a.type === '401k')?.balance || 0,
      }],
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
      set({ notifications: [...state.notifications, result.message] });
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

  updateW4: (w4: W4Form) => {
    set({ w4, notifications: [...get().notifications, 'W-4 updated. Withholding will change next paycheck.'] });
  },

  fileTaxes: () => {
    const state = get();
    const taxReturn = calculateAnnualTaxFn(state as any);
    let checking = { ...state.checking };
    const notifications = [...state.notifications];

    if (taxReturn.refundOrOwed > 0) {
      checking = deposit(checking, taxReturn.refundOrOwed, state.currentWeek, 'Tax Refund', 'tax');
      notifications.push(`🎉 Tax refund: ${formatCurrency(taxReturn.refundOrOwed)} deposited!`);
    } else if (taxReturn.refundOrOwed < 0) {
      const owed = Math.abs(taxReturn.refundOrOwed);
      const newChecking = withdraw(checking, owed, state.currentWeek, 'Tax Payment', 'tax');
      if (newChecking) {
        checking = newChecking;
        notifications.push(`Paid ${formatCurrency(owed)} in taxes owed.`);
      } else {
        notifications.push(`⚠️ You owe ${formatCurrency(owed)} but don't have enough funds!`);
      }
    }

    set({
      checking,
      taxReturns: [...state.taxReturns, taxReturn],
      yearToDateIncome: 0,
      yearToDateWithholding: 0,
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
    if (proceeds > 0) {
      checking = deposit(checking, proceeds, state.currentWeek, `Sold: ${state.vehicle.name}`, 'transport');
    }

    set({
      checking,
      vehicle: { owned: false, leased: false, transitPass: false, vehicleId: null, name: '', type: 'none', value: 0, mpg: 0, reliability: 100, insuranceCostPerYear: 0, registrationCostPerYear: 0, monthlyPayment: 0, hasLicense: state.vehicle.hasLicense, licenseCost: 0, purchaseWeek: 0 },
      notifications: [...state.notifications, message],
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

  contributeRetirement: (type: RetirementAccountType, amount: number) => {
    const state = get();
    const newChecking = withdraw(state.checking, amount, state.currentWeek, `${type} contribution`, 'investment');
    if (!newChecking) {
      set({ notifications: [...state.notifications, 'Insufficient funds'] });
      return;
    }

    const existingIndex = state.retirementAccounts.findIndex(a => a.type === type);
    let retirementAccounts = [...state.retirementAccounts];

    if (existingIndex >= 0) {
      retirementAccounts[existingIndex] = {
        ...retirementAccounts[existingIndex],
        balance: retirementAccounts[existingIndex].balance + amount,
        contributions: retirementAccounts[existingIndex].contributions + amount,
      };
    } else {
      const limit = type === '401k' ? RETIREMENT.fourOhOneKLimit :
        type === 'roth_ira' ? RETIREMENT.rothIraLimit : RETIREMENT.traditionalIraLimit;
      retirementAccounts.push({
        type,
        balance: amount,
        contributions: amount,
        yearlyContributionLimit: limit,
        employerMatch: type === '401k' ? amount * RETIREMENT.employerMatchPercent : undefined,
      });
      // Add employer match for 401k
      if (type === '401k') {
        const match = Math.round(amount * RETIREMENT.employerMatchPercent * 100) / 100;
        retirementAccounts[retirementAccounts.length - 1].balance += match;
      }
    }

    const label = type === 'roth_ira' ? 'Roth IRA' : type === 'traditional_ira' ? 'Traditional IRA' : '401(k)';
    set({
      checking: newChecking,
      retirementAccounts,
      notifications: [...state.notifications, `Contributed ${formatCurrency(amount)} to ${label}`],
    });
  },

  rollover401k: () => {
    const state = get();
    const k401Index = state.retirementAccounts.findIndex(a => a.type === '401k');
    if (k401Index === -1 || state.retirementAccounts[k401Index].balance <= 0) {
      set({ notifications: [...state.notifications, 'No 401(k) balance to roll over.'] });
      return;
    }

    // Can only rollover if no longer at a job that offers 401k
    if (state.has401kAccess) {
      set({ notifications: [...state.notifications, 'You can only roll over a 401(k) after leaving the job that provides it.'] });
      return;
    }

    const k401 = state.retirementAccounts[k401Index];
    const rolloverAmount = k401.balance;

    // Move to Traditional IRA (no penalty, no tax)
    let retirementAccounts = [...state.retirementAccounts];
    const iraIndex = retirementAccounts.findIndex(a => a.type === 'traditional_ira');

    if (iraIndex >= 0) {
      retirementAccounts[iraIndex] = {
        ...retirementAccounts[iraIndex],
        balance: retirementAccounts[iraIndex].balance + rolloverAmount,
      };
    } else {
      retirementAccounts.push({
        type: 'traditional_ira',
        balance: rolloverAmount,
        contributions: 0,
        yearlyContributionLimit: 7000,
      });
    }

    // Zero out 401k
    retirementAccounts[k401Index] = { ...k401, balance: 0, contributions: 0 };

    set({
      retirementAccounts,
      notifications: [...state.notifications, `Rolled over ${formatCurrency(rolloverAmount)} from 401(k) to Traditional IRA. No penalty.`],
    });
  },
}));
