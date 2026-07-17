// Credit engine - credit score, credit cards, payment history
import { CreditCard, CreditScore, CreditScoreFactor, GameState } from './types';
import { CREDIT_CARD_OPTIONS } from './constants';

export function initializeCreditScore(): CreditScore {
  return {
    score: 300, // starts at minimum
    factors: {
      payment_history: 0,
      credit_utilization: 100,
      credit_age: 0,
      credit_mix: 0,
      hard_inquiries: 0,
    },
  };
}

export function openCreditCard(cardId: string, currentScore: number): CreditCard | null {
  const cardDef = CREDIT_CARD_OPTIONS.find(c => c.id === cardId);
  if (!cardDef) return null;

  // Check if player qualifies
  if ('minCreditScore' in cardDef && cardDef.minCreditScore && currentScore < cardDef.minCreditScore) {
    return null;
  }

  return {
    id: cardDef.id,
    name: cardDef.name,
    limit: cardDef.limit,
    balance: 0,
    apr: cardDef.apr,
    minimumPayment: 25,
    paymentHistory: [],
  };
}

export function makePurchaseOnCard(card: CreditCard, amount: number): CreditCard | null {
  if (card.balance + amount > card.limit) return null; // over limit
  return {
    ...card,
    balance: Math.round((card.balance + amount) * 100) / 100,
  };
}

export function makeCardPayment(card: CreditCard, amount: number, week: number): CreditCard {
  const payment = Math.min(amount, card.balance);
  return {
    ...card,
    balance: Math.round((card.balance - payment) * 100) / 100,
    paymentHistory: [
      ...card.paymentHistory.slice(-24), // keep last 24 payments
      { week, amount: payment, onTime: true },
    ],
  };
}

export function applyCardInterest(card: CreditCard): CreditCard {
  if (card.balance <= 0) return card;
  const monthlyRate = card.apr / 12;
  const interest = Math.round(card.balance * monthlyRate * 100) / 100;
  return {
    ...card,
    balance: Math.round((card.balance + interest) * 100) / 100,
  };
}

export function calculateCreditScore(state: GameState): CreditScore {
  if (state.creditCards.length === 0) {
    return { score: 300, factors: { payment_history: 0, credit_utilization: 100, credit_age: 0, credit_mix: 0, hard_inquiries: 0 } };
  }

  const factors: Record<CreditScoreFactor, number> = {
    payment_history: 0,
    credit_utilization: 0,
    credit_age: 0,
    credit_mix: 0,
    hard_inquiries: 0,
  };

  // Payment history (35% of score) - based on on-time payments
  let totalPayments = 0;
  let onTimePayments = 0;
  for (const card of state.creditCards) {
    for (const payment of card.paymentHistory) {
      totalPayments++;
      if (payment.onTime) onTimePayments++;
    }
  }
  factors.payment_history = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 50;

  // Credit utilization (30%) - lower is better
  let totalLimit = 0;
  let totalBalance = 0;
  for (const card of state.creditCards) {
    totalLimit += card.limit;
    totalBalance += card.balance;
  }
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  factors.credit_utilization = Math.max(0, 100 - utilization * 3); // 30% utilization = 10 score

  // Credit age (15%) - weeks since first card opened
  const creditWeeks = state.creditHistory.length;
  factors.credit_age = Math.min(100, creditWeeks * 2); // maxes out around 50 weeks

  // Credit mix (10%) - variety of credit types
  let mix = 0;
  if (state.creditCards.length > 0) mix += 40;
  if (state.vehicle.owned) mix += 30; // auto loan counts
  if (state.housing.type === 'house') mix += 30; // mortgage
  factors.credit_mix = mix;

  // Hard inquiries (10%) - each inquiry slightly reduces
  const recentInquiries = state.creditCards.length; // simplified
  factors.hard_inquiries = Math.max(0, 100 - recentInquiries * 15);

  // Calculate composite score (300-850 range)
  const weightedScore =
    factors.payment_history * 0.35 +
    factors.credit_utilization * 0.30 +
    factors.credit_age * 0.15 +
    factors.credit_mix * 0.10 +
    factors.hard_inquiries * 0.10;

  // Map 0-100 weighted score to 300-850 range
  const score = Math.round(300 + (weightedScore / 100) * 550);

  return { score: Math.min(850, Math.max(300, score)), factors };
}

export function getCreditScoreRating(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

export function getAvailableCards(creditScore: number): typeof CREDIT_CARD_OPTIONS[number][] {
  return CREDIT_CARD_OPTIONS.filter(card => {
    if ('minCreditScore' in card && card.minCreditScore) {
      return creditScore >= card.minCreditScore;
    }
    return true;
  });
}
