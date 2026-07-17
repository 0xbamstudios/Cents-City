// Advisor engine - contextual tips, opinions, and game commentary
import { GameState, AdvisorMessage } from './types';
import { THRESHOLDS } from './constants';

let msgIdCounter = 0;

function createMessage(
  message: string,
  type: AdvisorMessage['type'],
  week: number
): AdvisorMessage {
  return {
    id: `msg_${++msgIdCounter}`,
    message,
    type,
    week,
    dismissed: false,
  };
}

export function generateAdvisorMessages(state: GameState, prevState: GameState | null): AdvisorMessage[] {
  const messages: AdvisorMessage[] = [];
  const week = state.currentWeek;
  const totalCash = state.checking.balance + state.savings.balance;

  // First week tips
  if (week === 1) {
    messages.push(createMessage(
      'Welcome to Cents City! Start by getting a job. Check the Jobs panel to apply.',
      'tip', week
    ));
  }

  // Got first job
  if (state.currentJob && (!prevState || !prevState.currentJob)) {
    messages.push(createMessage(
      `Nice! You landed the ${state.currentJob.title} gig. Your paycheck will arrive weekly via direct deposit.`,
      'celebration', week
    ));
  }

  // Approaching independence threshold
  if (totalCash >= THRESHOLDS.INDEPENDENCE * 0.8 && totalCash < THRESHOLDS.INDEPENDENCE) {
    if (!prevState || (prevState.checking.balance + prevState.savings.balance) < THRESHOLDS.INDEPENDENCE * 0.8) {
      messages.push(createMessage(
        `You're close to $${THRESHOLDS.INDEPENDENCE.toLocaleString()}! Once you hit that, you can move into your own apartment.`,
        'tip', week
      ));
    }
  }

  // Reached independence
  if (state.stage === 'INDEPENDENCE' && prevState?.stage === 'GETTING_STARTED') {
    messages.push(createMessage(
      'Time to spread your wings! You can now move into an apartment. Check Housing.',
      'celebration', week
    ));
  }

  // Credit building unlocked
  if (state.stage === 'CREDIT_BUILDING' && prevState?.stage === 'INDEPENDENCE') {
    messages.push(createMessage(
      'You\'ve saved enough to start building credit. Open a credit card — but be careful with it!',
      'tip', week
    ));
  }

  // Car unlocked
  if (state.stage === 'MOBILITY' && prevState?.stage === 'CREDIT_BUILDING') {
    messages.push(createMessage(
      'Ready to buy a car? Remember: insurance, registration, and license fees add up!',
      'tip', week
    ));
  }

  // Spending more than earning
  if (state.currentJob) {
    const weeklyPay = state.currentJob.perHourWage * state.currentJob.hoursPerWeek;
    if (prevState && state.checking.balance < prevState.checking.balance - weeklyPay * 0.5) {
      messages.push(createMessage(
        'Careful — you\'re spending more than you\'re earning. Check your budget!',
        'warning', week
      ));
    }
  }

  // Credit card balance growing
  const totalCreditDebt = state.creditCards.reduce((sum, c) => sum + c.balance, 0);
  if (totalCreditDebt > 0 && prevState) {
    const prevDebt = prevState.creditCards.reduce((sum, c) => sum + c.balance, 0);
    if (totalCreditDebt > prevDebt * 1.5 && totalCreditDebt > 200) {
      messages.push(createMessage(
        'Your credit card balance is growing. Pay it off to avoid interest charges and protect your credit score.',
        'warning', week
      ));
    }
  }

  // No savings
  if (week > 8 && state.savings.balance === 0 && state.currentJob) {
    messages.push(createMessage(
      'You haven\'t put anything in savings yet. Even $20/week adds up!',
      'opinion', week
    ));
  }

  // Periodic wisdom
  if (week % 12 === 0 && week > 0) {
    const tips = getPeriodicTip(state);
    if (tips) {
      messages.push(createMessage(tips, 'tip', week));
    }
  }

  return messages;
}

function getPeriodicTip(state: GameState): string | null {
  const tips: string[] = [];

  if (state.savings.balance > 0 && state.savings.interestRate > 0) {
    tips.push('Your savings are earning interest. The earlier you save, the more compound interest works for you.');
  }

  if (state.creditCards.length > 0) {
    const utilization = state.creditCards.reduce((sum, c) => sum + c.balance, 0) /
      state.creditCards.reduce((sum, c) => sum + c.limit, 0) * 100;
    if (utilization > 30) {
      tips.push(`Your credit utilization is ${Math.round(utilization)}%. Keeping it under 30% helps your score.`);
    }
  }

  if (state.stage === 'CAREER_GROWTH' && state.retirementAccounts.length === 0) {
    tips.push('Your employer offers a 401k with matching! Free money — consider signing up.');
  }

  if (state.vehicle.owned && !state.currentJob?.carNeeded) {
    tips.push('Having a car opens up delivery and driving jobs with higher earning potential.');
  }

  return tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;
}

export function getOpinion(action: string, state: GameState): string {
  switch (action) {
    case 'skip_savings':
      return 'Living without savings is risky. One emergency could set you way back.';
    case 'max_credit':
      return 'Maxing out your credit cards hurts your score and costs you interest.';
    case 'buy_car_early':
      return 'A car is expensive to maintain. Make sure you can afford the ongoing costs.';
    case 'no_401k':
      return 'Not using your 401k match is like leaving free money on the table.';
    case 'risky_investment':
      return 'Putting all your money in one stock is gambling, not investing. Diversify!';
    default:
      return 'Every financial choice has trade-offs. Think about your long-term goals.';
  }
}
