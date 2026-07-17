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

  // Food
  breakdown['Food'] = WEEKLY_EXPENSES.food;

  // Transport
  if (state.vehicle.owned) {
    breakdown['Gas & Transport'] = WEEKLY_EXPENSES.transport_car;
  } else {
    breakdown['Transport'] = WEEKLY_EXPENSES.transport_no_car;
  }

  // Entertainment
  breakdown['Entertainment'] = WEEKLY_EXPENSES.entertainment;

  // Phone
  breakdown['Phone'] = WEEKLY_EXPENSES.phone;

  // Housing (monthly costs converted to weekly)
  if (state.housing.type === 'apartment') {
    breakdown['Rent'] = Math.round(HOUSING_COSTS.apartment.rent / 4.33);
    breakdown['Utilities'] = Math.round(HOUSING_COSTS.apartment.utilities / 4.33);
  } else if (state.housing.type === 'house') {
    if (state.housing.mortgage) {
      breakdown['Mortgage'] = Math.round(state.housing.mortgage.monthlyPayment / 4.33);
    }
    breakdown['Utilities'] = Math.round(HOUSING_COSTS.house.utilities / 4.33);
    breakdown['Home Insurance'] = Math.round(HOUSING_COSTS.house.insurance / 52);
    breakdown['Property Tax'] = Math.round((HOUSING_COSTS.house.homePrice * HOUSING_COSTS.house.propertyTaxRate) / 52);
  }

  // Vehicle costs (annual to weekly)
  if (state.vehicle.owned) {
    breakdown['Auto Insurance'] = Math.round(VEHICLE_COSTS.insurance / 52);
    breakdown['Registration'] = Math.round(VEHICLE_COSTS.registration / 52);
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { total, breakdown };
}

export function calculateWeeklyIncome(state: GameState): { gross: number; net: number; tax: number; tips: number } {
  if (!state.currentJob) return { gross: 0, net: 0, tax: 0, tips: 0 };

  const job = state.currentJob;
  const gross = job.perHourWage * job.hoursPerWeek;
  const tips = job.maxTips > 0 ? Math.round(Math.random() * job.maxTips * job.hoursPerWeek * 0.3) : 0;
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
