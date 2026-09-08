// Finance engine - handles banking, budgeting, and money management
import { BankAccount, Transaction, TransactionCategory, GameState } from './types';
import { WEEKLY_EXPENSES, HOUSING_COSTS, VEHICLE_COSTS } from './constants';

let txIdCounter = 0;

export function createTransaction(
  week: number,
  amount: number,
  description: string,
  category: TransactionCategory
): Transaction {
  return {
    id: `tx_${++txIdCounter}_${week}`,
    date: week,
    amount,
    description,
    category,
  };
}

export function createBankAccount(type: 'checking' | 'savings'): BankAccount {
  return {
    type,
    balance: 0,
    interestRate: type === 'savings' ? 0.045 : 0.001, // 4.5% savings, 0.1% checking
    transactions: [],
  };
}

export function deposit(account: BankAccount, amount: number, week: number, description: string, category: TransactionCategory): BankAccount {
  const tx = createTransaction(week, amount, description, category);
  return {
    ...account,
    balance: Math.round((account.balance + amount) * 100) / 100,
    transactions: [...account.transactions.slice(-50), tx], // keep last 50
  };
}

export function withdraw(account: BankAccount, amount: number, week: number, description: string, category: TransactionCategory): BankAccount | null {
  if (account.balance < amount) return null; // insufficient funds
  const tx = createTransaction(week, -amount, description, category);
  return {
    ...account,
    balance: Math.round((account.balance - amount) * 100) / 100,
    transactions: [...account.transactions.slice(-50), tx],
  };
}

export function applySavingsInterest(account: BankAccount, week: number): BankAccount {
  // Apply weekly interest (annual rate / 52)
  if (account.type !== 'savings' || account.balance <= 0) return account;
  const weeklyRate = account.interestRate / 52;
  const interest = Math.round(account.balance * weeklyRate * 100) / 100;
  if (interest < 0.01) return account;
  const tx = createTransaction(week, interest, 'Savings interest', 'income');
  return {
    ...account,
    balance: Math.round((account.balance + interest) * 100) / 100,
    transactions: [...account.transactions.slice(-50), tx],
  };
}

export function calculateWeeklyExpenses(state: GameState): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // Cost of living rises over time with inflation (compounds weekly in the loop).
  const col = state.economy?.costOfLivingIndex ?? 1.0;

  // Standard of living: nicer housing means pricier food, snacks, and dining out.
  const solByHousing: Record<string, number> = {
    parents_basement: 0.85,
    apartment: 1.0,
    nice_apartment: 1.25,
    house: 1.5,
    nice_house: 2.0,
  };
  const foodStandardFactor = solByHousing[state.housing.type] ?? 1.0;

  // Food / snacks — scales with both cost of living and standard of living
  breakdown['Food'] = Math.round(WEEKLY_EXPENSES.food * col * foodStandardFactor);

  // Transport
  if (state.vehicle.owned || state.vehicle.leased) {
    breakdown['Gas & Transport'] = Math.round(WEEKLY_EXPENSES.transport_car * col);
  } else if (state.vehicle.transitPass) {
    breakdown['Transit Pass'] = Math.round(state.vehicle.monthlyPayment / 4.33);
  } else {
    breakdown['Transport'] = Math.round(WEEKLY_EXPENSES.transport_no_car * col);
  }

  // Entertainment — also nudged up by standard of living
  breakdown['Entertainment'] = Math.round(WEEKLY_EXPENSES.entertainment * col * (0.75 + 0.25 * foodStandardFactor));

  // Phone
  breakdown['Phone'] = Math.round(WEEKLY_EXPENSES.phone * col);

  // Housing (monthly costs converted to weekly)
  if (state.housing.type === 'apartment' || state.housing.type === 'nice_apartment') {
    breakdown['Rent'] = Math.round(state.housing.rent / 4.33);
    breakdown['Utilities'] = Math.round(state.housing.utilities / 4.33);
  } else if (state.housing.type === 'house' || state.housing.type === 'nice_house') {
    if (state.housing.mortgage) {
      breakdown['Mortgage'] = Math.round(state.housing.mortgage.monthlyPayment / 4.33);
    }
    breakdown['Utilities'] = Math.round(state.housing.utilities / 4.33);
    const homePrice = state.housing.type === 'nice_house' ? HOUSING_COSTS.niceHouse.homePrice : HOUSING_COSTS.house.homePrice;
    const insuranceAmt = state.housing.type === 'nice_house' ? HOUSING_COSTS.niceHouse.insurance : HOUSING_COSTS.house.insurance;
    breakdown['Home Insurance'] = Math.round(insuranceAmt / 52);
    breakdown['Property Tax'] = Math.round((homePrice * HOUSING_COSTS.house.propertyTaxRate) / 52);
  }

  // Vehicle costs (annual to weekly)
  if (state.vehicle.owned || state.vehicle.leased) {
    breakdown['Auto Insurance'] = Math.round(state.vehicle.insuranceCostPerYear / 52);
    if (state.vehicle.registrationCostPerYear > 0) {
      breakdown['Registration'] = Math.round(state.vehicle.registrationCostPerYear / 52);
    }
    if (state.vehicle.monthlyPayment > 0) {
      breakdown['Lease Payment'] = Math.round(state.vehicle.monthlyPayment / 4.33);
    }
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { total, breakdown };
}

export function calculateWeeklyIncome(state: GameState): { gross: number; net: number; tax: number; tips: number } {
  if (!state.currentJob) return { gross: 0, net: 0, tax: 0, tips: 0 };

  const allJobs = [state.currentJob, ...(state.secondaryJobs || [])];
  const weeklyPay = (job: typeof state.currentJob): number => {
    if (!job) return 0;
    return job.annualSalary ? Math.round(job.annualSalary / 52) : job.perHourWage * job.hoursPerWeek;
  };
  const gross = allJobs.reduce((s, j) => s + weeklyPay(j), 0);
  const tips = allJobs.reduce((s, j) => s + (j && j.maxTips > 0 ? Math.round(Math.random() * j.maxTips * j.hoursPerWeek * 0.3) : 0), 0);
  const totalGross = gross + tips;

  // Simple withholding based on W4
  const annualized = totalGross * 52;
  const taxRate = getEffectiveTaxRate(annualized);
  const tax = Math.round(totalGross * taxRate * 100) / 100;
  const net = Math.round((totalGross - tax) * 100) / 100;

  return { gross: totalGross, net, tax, tips };
}

function getEffectiveTaxRate(annualIncome: number): number {
  // Simplified effective tax rate
  if (annualIncome <= 14600) return 0; // below standard deduction
  if (annualIncome <= 25600) return 0.10;
  if (annualIncome <= 55725) return 0.12;
  if (annualIncome <= 109975) return 0.18;
  return 0.22;
}

export function getNetWorth(state: GameState): number {
  let netWorth = 0;

  // Cash
  netWorth += state.checking.balance;
  netWorth += state.savings.balance;

  // Investments
  for (const inv of state.investments) {
    netWorth += inv.shares * inv.currentPrice;
  }

  // Retirement
  for (const ret of state.retirementAccounts) {
    netWorth += ret.balance;
  }

  // Vehicle
  if (state.vehicle.owned) {
    netWorth += state.vehicle.value;
  }

  // Debt (credit cards)
  for (const card of state.creditCards) {
    netWorth -= card.balance;
  }

  // Mortgage
  if (state.housing.mortgage) {
    netWorth -= state.housing.mortgage.remainingBalance;
  }

  // Auto and other loans
  if (state.loans) {
    for (const loan of state.loans) {
      netWorth -= loan.remainingBalance;
    }
  }

  // Startup equity (paper value of the founder's stake)
  if (state.startup && !state.startup.failed) {
    netWorth += Math.round(state.startup.valuation * state.startup.founderEquityPct);
  }

  return Math.round(netWorth * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
