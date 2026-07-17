import { create } from 'zustand';
import { GameState, Job, W4Form, AdvisorMessage, RetirementAccountType, BankAccount } from '../engine/types';
import { createBankAccount, deposit, withdraw, applySavingsInterest, calculateWeeklyIncome, calculateWeeklyExpenses, formatCurrency } from '../engine/finance';
import { createDefaultW4, calculateWithholding, calculateAnnualTax as calculateAnnualTaxFn } from '../engine/taxes';
import { createInitialSkills, gainSkillsFromJob } from '../engine/skills';
import { calculateCreditScore, openCreditCard as openCard, makeCardPayment, applyCardInterest } from '../engine/credit';
import { checkStageProgression, canSpeedUp } from '../engine/progression';
import { generateAdvisorMessages } from '../engine/advisor';
import { applyForJob as engineApplyForJob } from '../engine/jobs';
import { GAME_WEEK_MS, HOUSING_COSTS, VEHICLE_COSTS, RETIREMENT } from '../engine/constants';

type Panel = 'dashboard' | 'jobs' | 'banking' | 'credit' | 'housing' | 'taxes' | 'investing';

interface GameStore extends GameState {
  activePanel: Panel;
  depositSplit: number;
  gameLoopInterval: number | null;

  // Actions
  startGame: (name: string) => void;
  setActivePanel: (panel: Panel) => void;
  setGameSpeed: (speed: number) => void;
  togglePause: () => void;
  advanceWeek: () => void;
  startGameLoop: () => void;
  stopGameLoop: () => void;

  // Player actions
  applyForJob: (job: Job) => void;
  transferMoney: (direction: 'toSavings' | 'toChecking', amount: number) => void;
  setDepositSplit: (percent: number) => void;
  updateW4: (w4: W4Form) => void;
  fileTaxes: () => void;
  moveToApartment: () => void;
  buyCar: () => void;
  openCreditCard: (cardId: string) => void;
  makeCreditCardPayment: (cardId: string, amount: number) => void;
  buyStock: (id: string, name: string, price: number, shares: number) => void;
  sellStock: (id: string, shares: number) => void;
  contributeRetirement: (type: RetirementAccountType, amount: number) => void;
  clearNotification: (index: number) => void;
  addNotification: (msg: string) => void;
}

const initialState = (): Omit<GameStore, 'startGame' | 'setActivePanel' | 'setGameSpeed' | 'togglePause' | 'advanceWeek' | 'startGameLoop' | 'stopGameLoop' | 'applyForJob' | 'transferMoney' | 'setDepositSplit' | 'updateW4' | 'fileTaxes' | 'moveToApartment' | 'buyCar' | 'openCreditCard' | 'makeCreditCardPayment' | 'buyStock' | 'sellStock' | 'contributeRetirement' | 'clearNotification' | 'addNotification'> => ({
  currentWeek: 0,
  gameSpeed: 1,
  isPaused: true,
  realTimePlayedMs: 0,
  levelStartTime: 0,
  canSpeedUp: false,
  playerName: '',
  stage: 'GETTING_STARTED',
  currentJob: null,
  previousJobs: [],
  checking: createBankAccount('checking'),
  savings: createBankAccount('savings'),
  totalSaved: 0,
  w4: createDefaultW4(),
  taxReturns: [],
  yearToDateIncome: 0,
  yearToDateWithholding: 0,
  creditCards: [],
  creditScore: null,
  creditHistory: [],
  vehicle: { owned: false, renting: false, vehicleId: null, name: '', value: 0, mpg: 0, reliability: 100, insuranceCostPerYear: 0, registrationCostPerYear: 0, rentalCostPerWeek: 0, hasLicense: false, licenseCost: 0 },
  housing: { type: 'parents_basement', rent: 0, utilities: 0 },
  investments: [],
  retirementAccounts: [],
  skills: createInitialSkills(),
  availableJobs: [],
  jobHistory: [],
  isMarried: false,
  children: 0,
  lifeEvents: [],
  advisorMessages: [],
  events: [],
  notifications: [],
  economy: { inflationMultiplier: 1.0, currentGasPrice: 3.50, weeklyFuelCost: 0 },
  multiplayer: { mode: 'single', playerId: '1', players: [], sharedJobMarket: [] },
  activePanel: 'dashboard',
  depositSplit: 20,
  gameLoopInterval: null,
});

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

  advanceWeek: () => {
    const state = get();
    if (!state.currentJob && state.currentWeek > 0) return; // no job, no progress after first week

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

    // Pay weekly expenses from checking
    const expenses = calculateWeeklyExpenses(state);
    if (checking.balance >= expenses.total) {
      checking = withdraw(checking, expenses.total, week, 'Weekly expenses', 'food')!;
    } else {
      // Partial payment - player is going broke
      const paid = checking.balance;
      checking = withdraw(checking, paid, week, 'Partial expenses (low funds!)', 'food')!;
    }

    // Apply savings interest (weekly)
    savings = applySavingsInterest(savings, week);

    // Apply credit card interest monthly (every 4 weeks)
    let creditCards = [...state.creditCards];
    if (week % 4 === 0) {
      creditCards = creditCards.map(applyCardInterest);
    }

    // Calculate credit score if player has credit
    let creditScore = state.creditScore;
    let creditHistory = [...state.creditHistory];
    if (creditCards.length > 0) {
      const tempState = { ...state, checking, savings, creditCards };
      creditScore = calculateCreditScore(tempState as any);
      creditHistory = [...creditHistory, creditScore.score];
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
      stage: newStage,
      realTimePlayedMs: realTimePlayed,
      canSpeedUp: speedUpAllowed,
      advisorMessages: [...state.advisorMessages.slice(-10), ...newMessages],
      investments,
      retirementAccounts,
      totalSaved: checking.balance + savings.balance,
    });
  },

  applyForJob: (job: Job) => {
    const state = get();
    const result = engineApplyForJob(job, state as any);
    if (result.success) {
      // Deduct education cost if needed
      let checking = { ...state.checking };
      if (job.educationCost > 0) {
        const newChecking = withdraw(checking, job.educationCost, state.currentWeek, `Training: ${job.title}`, 'education');
        if (newChecking) {
          checking = newChecking;
        } else {
          // Try savings
          let savings = { ...state.savings };
          const fromSavings = withdraw(savings, job.educationCost, state.currentWeek, `Training: ${job.title}`, 'education');
          if (fromSavings) savings = fromSavings;
          set({ savings });
        }
      }
      const previousJobs = state.currentJob
        ? [...state.previousJobs, state.currentJob.id]
        : state.previousJobs;
      set({
        currentJob: job,
        previousJobs,
        checking,
        notifications: [...state.notifications, result.message],
      });
    } else {
      set({ notifications: [...state.notifications, result.message] });
    }
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

  buyCar: () => {
    const state = get();
    const totalCost = VEHICLE_COSTS.cheapCarPrice + VEHICLE_COSTS.license;
    const newChecking = withdraw(state.checking, totalCost, state.currentWeek, 'Car purchase + license', 'transport');
    if (newChecking) {
      set({
        checking: newChecking,
        vehicle: {
          owned: true,
          renting: false,
          vehicleId: 'used_sedan',
          name: 'Used Sedan',
          value: VEHICLE_COSTS.cheapCarPrice,
          mpg: 28,
          reliability: 75,
          insuranceCostPerYear: VEHICLE_COSTS.insurance,
          registrationCostPerYear: VEHICLE_COSTS.registration,
          rentalCostPerWeek: 0,
          hasLicense: true,
          licenseCost: VEHICLE_COSTS.license,
        },
        notifications: [...state.notifications, `🚗 You bought a car! New job opportunities unlocked.`],
      });
    } else {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(totalCost)}`] });
    }
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

  buyStock: (id: string, name: string, price: number, shares: number) => {
    const state = get();
    const totalCost = price * shares;
    const newChecking = withdraw(state.checking, totalCost, state.currentWeek, `Buy ${shares}x ${id}`, 'investment');
    if (newChecking) {
      const existingIndex = state.investments.findIndex(i => i.id === id);
      let investments;
      if (existingIndex >= 0) {
        investments = [...state.investments];
        const existing = investments[existingIndex];
        const totalShares = existing.shares + shares;
        const avgPrice = ((existing.purchasePrice * existing.shares) + (price * shares)) / totalShares;
        investments[existingIndex] = { ...existing, shares: totalShares, purchasePrice: Math.round(avgPrice * 100) / 100 };
      } else {
        investments = [...state.investments, { id, type: 'stock' as const, name, shares, purchasePrice: price, currentPrice: price, purchaseWeek: state.currentWeek }];
      }
      set({
        checking: newChecking,
        investments,
        notifications: [...state.notifications, `📈 Bought ${shares} shares of ${id} at ${formatCurrency(price)}`],
      });
    } else {
      set({ notifications: [...state.notifications, `Insufficient funds. Need ${formatCurrency(totalCost)}`] });
    }
  },

  sellStock: (id: string, shares: number) => {
    const state = get();
    const invIndex = state.investments.findIndex(i => i.id === id);
    if (invIndex === -1) return;

    const inv = state.investments[invIndex];
    const sellShares = Math.min(shares, inv.shares);
    const proceeds = Math.round(sellShares * inv.currentPrice * 100) / 100;

    // Calculate capital gains
    const costBasis = sellShares * inv.purchasePrice;
    const gain = proceeds - costBasis;
    const weeksHeld = state.currentWeek - inv.purchaseWeek;
    const isLongTerm = weeksHeld >= 52;
    const taxRate = isLongTerm ? 0.15 : 0.22;
    const tax = gain > 0 ? Math.round(gain * taxRate * 100) / 100 : 0;
    const netProceeds = Math.round((proceeds - tax) * 100) / 100;

    // Update checking
    const checking = deposit(state.checking, netProceeds, state.currentWeek, `Sold ${sellShares}x ${id}`, 'investment');

    // Update investments
    let investments = [...state.investments];
    if (sellShares >= inv.shares) {
      investments.splice(invIndex, 1);
    } else {
      investments[invIndex] = { ...inv, shares: inv.shares - sellShares };
    }

    const gainLabel = gain >= 0 ? 'gain' : 'loss';
    const termLabel = isLongTerm ? 'long-term' : 'short-term';
    const taxNote = tax > 0 ? ` (${termLabel} capital gains tax: ${formatCurrency(tax)})` : '';

    set({
      checking,
      investments,
      notifications: [...state.notifications, `Sold ${sellShares} shares of ${id} for ${formatCurrency(proceeds)} — ${formatCurrency(Math.abs(gain))} ${gainLabel}${taxNote}`],
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
}));
