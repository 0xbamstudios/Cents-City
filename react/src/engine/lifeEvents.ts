// Life Events engine - random events that impact the player financially
import { GameState } from './types';

export type LifeEventCategory = 'vehicle' | 'financial' | 'social' | 'health' | 'legal' | 'opportunity';

export interface LifeEventDef {
  id: string;
  title: string;
  description: string;
  category: LifeEventCategory;
  minWeek: number;           // earliest week this can trigger
  probability: number;       // chance per week (0-1)
  requiresCar: boolean;
  requiresJob: boolean;
  requiresApartment: boolean;
  choices: LifeEventChoice[];
}

export interface LifeEventChoice {
  label: string;
  description: string;
  financialImpact: number;   // negative = cost, positive = gain
  creditImpact: number;      // impact on credit score
  skillImpact?: Partial<Record<string, number>>;
  followUp?: string;         // advisor message after choosing
}

export interface ActiveLifeEvent {
  event: LifeEventDef;
  week: number;
  resolved: boolean;
  choiceIndex: number | null;
}

export const LIFE_EVENTS: LifeEventDef[] = [
  // Vehicle events
  {
    id: 'parking_ticket',
    title: 'Parking Ticket!',
    description: 'You forgot to feed the meter downtown. A parking enforcement officer left a $75 ticket on your windshield.',
    category: 'vehicle',
    minWeek: 4,
    probability: 0.03,
    requiresCar: true,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Pay the ticket',
        description: 'Pay $75 now and move on.',
        financialImpact: -75,
        creditImpact: 0,
        followUp: 'Ticket paid. Set a phone reminder next time!',
      },
      {
        label: 'Ignore it',
        description: 'Maybe it will go away... (it won\'t)',
        financialImpact: -150,
        creditImpact: -10,
        followUp: 'The fine doubled to $150 and went to collections. That hurt your credit.',
      },
    ],
  },
  {
    id: 'fender_bender',
    title: 'Fender Bender',
    description: 'Someone rear-ended you at a stoplight. Minor damage to your bumper. The other driver wants to handle it "off the books" to avoid insurance.',
    category: 'vehicle',
    minWeek: 8,
    probability: 0.02,
    requiresCar: true,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'File insurance claim',
        description: 'Go through insurance. Your rates may increase slightly.',
        financialImpact: -100,
        creditImpact: 0,
        followUp: 'Claim filed. Deductible cost $100 but damage is covered. Rates go up $15/month.',
      },
      {
        label: 'Accept their cash offer',
        description: 'They offer $400 cash. Repair might cost more.',
        financialImpact: -200,
        creditImpact: 0,
        followUp: 'The repair actually cost $600. You\'re out $200 net. Next time, file the claim.',
      },
      {
        label: 'Get a proper repair estimate first',
        description: 'Get a quote before deciding. Smart move.',
        financialImpact: -50,
        creditImpact: 0,
        skillImpact: { problem_solving: 3 },
        followUp: 'Good thinking! You got a $500 estimate, filed the claim, and only paid your $50 deductible.',
      },
    ],
  },
  {
    id: 'car_breakdown',
    title: 'Car Trouble',
    description: 'Your car won\'t start this morning. The mechanic says it needs a new alternator.',
    category: 'vehicle',
    minWeek: 12,
    probability: 0.025,
    requiresCar: true,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Fix it at the mechanic',
        description: 'Professional repair: $450',
        financialImpact: -450,
        creditImpact: 0,
        followUp: 'Car fixed. An emergency fund would have made this less stressful.',
      },
      {
        label: 'Try to fix it yourself (YouTube)',
        description: 'Parts cost $180. Might take all weekend.',
        financialImpact: -180,
        creditImpact: 0,
        skillImpact: { problem_solving: 5 },
        followUp: 'After 6 hours and many tutorials, you fixed it! Saved $270 and learned a skill.',
      },
      {
        label: 'Put it on a credit card',
        description: 'Charge the $450 repair. Pay later.',
        financialImpact: 0,
        creditImpact: -5,
        followUp: 'Repair done. But now you have $450 on your card accruing interest...',
      },
    ],
  },
  {
    id: 'flat_tire',
    title: 'Flat Tire',
    description: 'You ran over a nail on your way to work. The tire is shredded.',
    category: 'vehicle',
    minWeek: 6,
    probability: 0.02,
    requiresCar: true,
    requiresJob: true,
    requiresApartment: false,
    choices: [
      {
        label: 'Buy a new tire',
        description: 'Replace with a new tire: $120',
        financialImpact: -120,
        creditImpact: 0,
        followUp: 'New tire installed. Back on the road.',
      },
      {
        label: 'Get a used tire',
        description: 'Used tire from the junkyard: $40',
        financialImpact: -40,
        creditImpact: 0,
        followUp: 'Used tire holds up for now. It may not last as long though.',
      },
    ],
  },
  // Financial events
  {
    id: 'identity_theft',
    title: 'Identity Theft Alert!',
    description: 'You received an alert that someone opened a credit card in your name. Your credit score has been impacted.',
    category: 'financial',
    minWeek: 20,
    probability: 0.01,
    requiresCar: false,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Freeze credit & file dispute',
        description: 'Freeze your credit reports and dispute the fraud. Takes time but free.',
        financialImpact: 0,
        creditImpact: -30,
        skillImpact: { financial_acumen: 5 },
        followUp: 'Credit frozen. The fraudulent account will be removed in 4-6 weeks. Your score will recover.',
      },
      {
        label: 'Pay for identity theft protection',
        description: 'Sign up for a monitoring service: $25/month',
        financialImpact: -100,
        creditImpact: -20,
        followUp: 'Protection service helped resolve it faster. Score recovering.',
      },
      {
        label: 'Ignore it and hope it goes away',
        description: 'Maybe it\'s a false alarm...',
        financialImpact: -500,
        creditImpact: -80,
        followUp: 'It wasn\'t a false alarm. The fraudster racked up $500 in charges and your credit took a major hit.',
      },
    ],
  },
  {
    id: 'friend_loan',
    title: 'Friend Needs Money',
    description: 'Your close friend asks to borrow $300. They promise to pay you back in two weeks. They seem genuinely stressed.',
    category: 'social',
    minWeek: 10,
    probability: 0.02,
    requiresCar: false,
    requiresJob: true,
    requiresApartment: false,
    choices: [
      {
        label: 'Lend them the money',
        description: 'Be a good friend. Hope they pay you back.',
        financialImpact: -300,
        creditImpact: 0,
        skillImpact: { communication: 2 },
        followUp: 'You lent them $300. There\'s a 50/50 chance you\'ll see that money again...',
      },
      {
        label: 'Offer $100 as a gift instead',
        description: 'Give what you can without expecting it back.',
        financialImpact: -100,
        creditImpact: 0,
        skillImpact: { communication: 3 },
        followUp: 'Your friend appreciated the honesty. No resentment either way.',
      },
      {
        label: 'Say no, you can\'t afford it',
        description: 'Protect your own finances first.',
        financialImpact: 0,
        creditImpact: 0,
        followUp: 'It was awkward, but you stayed on budget. Setting boundaries is a skill.',
      },
    ],
  },
  {
    id: 'friend_repays',
    title: 'Friend Pays You Back!',
    description: 'Remember that $300 you lent? Your friend came through! (Well, most of it.)',
    category: 'social',
    minWeek: 14,
    probability: 0.015,
    requiresCar: false,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Accept the $250',
        description: 'They could only manage $250 of the $300. Close enough.',
        financialImpact: 250,
        creditImpact: 0,
        followUp: 'Got most of it back. Not bad! Many people never see loaned money again.',
      },
    ],
  },
  // Health events
  {
    id: 'medical_bill',
    title: 'Unexpected Medical Bill',
    description: 'You went to urgent care for a bad flu. Even with basic coverage, your copay and out-of-pocket costs add up.',
    category: 'health',
    minWeek: 8,
    probability: 0.015,
    requiresCar: false,
    requiresJob: true,
    requiresApartment: false,
    choices: [
      {
        label: 'Pay the $250 bill now',
        description: 'Clear it immediately from checking.',
        financialImpact: -250,
        creditImpact: 0,
        followUp: 'Bill paid. Consider building an emergency fund for situations like this.',
      },
      {
        label: 'Set up a payment plan',
        description: 'Pay $50/month over 5 months. No interest.',
        financialImpact: -50,
        creditImpact: 0,
        followUp: 'Payment plan set up. You\'ll pay $50/month for the next 5 months.',
      },
      {
        label: 'Put it on your credit card',
        description: 'Charge the full amount. Deal with it later.',
        financialImpact: 0,
        creditImpact: -5,
        followUp: 'Charged to card. Interest will start accruing if you don\'t pay it off quickly.',
      },
    ],
  },
  // Opportunity events
  {
    id: 'overtime_offer',
    title: 'Overtime Available',
    description: 'Your boss is offering overtime shifts this week. Time-and-a-half pay!',
    category: 'opportunity',
    minWeek: 6,
    probability: 0.04,
    requiresCar: false,
    requiresJob: true,
    requiresApartment: false,
    choices: [
      {
        label: 'Take the extra shifts',
        description: 'Work 10 extra hours at 1.5x pay.',
        financialImpact: 200,
        creditImpact: 0,
        skillImpact: { time_management: 2, responsibility: 2 },
        followUp: 'Extra cash earned! But remember to balance work and rest.',
      },
      {
        label: 'Pass on it',
        description: 'You value your free time.',
        financialImpact: 0,
        creditImpact: 0,
        followUp: 'Sometimes rest is more valuable than money. Burnout is real.',
      },
    ],
  },
  {
    id: 'found_money',
    title: 'Lucky Day!',
    description: 'You found $20 on the sidewalk. No one around to claim it.',
    category: 'opportunity',
    minWeek: 2,
    probability: 0.02,
    requiresCar: false,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Pocket it',
        description: 'Finders keepers!',
        financialImpact: 20,
        creditImpact: 0,
        followUp: 'Nice! $20 added to your wallet.',
      },
    ],
  },
  {
    id: 'side_gig',
    title: 'Side Gig Opportunity',
    description: 'A neighbor asks if you can help them move this weekend. They\'ll pay $150 cash.',
    category: 'opportunity',
    minWeek: 4,
    probability: 0.025,
    requiresCar: false,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Help them move',
        description: 'Hard work for a day, but $150 cash.',
        financialImpact: 150,
        creditImpact: 0,
        skillImpact: { physical_endurance: 2, communication: 1 },
        followUp: 'Good hustle! Extra income outside your job is always nice.',
      },
      {
        label: 'Decline',
        description: 'You have other plans.',
        financialImpact: 0,
        creditImpact: 0,
        followUp: 'No worries. There will be other opportunities.',
      },
    ],
  },
  // Legal events
  {
    id: 'jury_duty',
    title: 'Jury Duty',
    description: 'You\'ve been summoned for jury duty. It pays $40/day but you\'ll miss 3 days of work.',
    category: 'legal',
    minWeek: 15,
    probability: 0.01,
    requiresCar: false,
    requiresJob: true,
    requiresApartment: false,
    choices: [
      {
        label: 'Serve on the jury',
        description: 'It\'s your civic duty. $40/day for 3 days, but lose regular wages.',
        financialImpact: -200,
        creditImpact: 0,
        skillImpact: { responsibility: 3 },
        followUp: 'You served. It was an interesting experience and you earned some responsibility points.',
      },
      {
        label: 'Request postponement',
        description: 'Ask to defer to a less busy time.',
        financialImpact: 0,
        creditImpact: 0,
        followUp: 'Postponed. You\'ll be called again later.',
      },
    ],
  },
  {
    id: 'speeding_ticket',
    title: 'Speeding Ticket',
    description: 'You were doing 52 in a 35 zone. The officer isn\'t feeling generous today.',
    category: 'legal',
    minWeek: 8,
    probability: 0.02,
    requiresCar: true,
    requiresJob: false,
    requiresApartment: false,
    choices: [
      {
        label: 'Pay the $180 fine',
        description: 'Accept it and move on. Points on your license may raise insurance.',
        financialImpact: -180,
        creditImpact: 0,
        followUp: 'Ticket paid. Your insurance may go up at renewal. Slow down!',
      },
      {
        label: 'Take traffic school ($50)',
        description: 'Pay for traffic school to keep it off your record.',
        financialImpact: -230,
        creditImpact: 0,
        skillImpact: { responsibility: 2 },
        followUp: 'Fine + traffic school cost $230, but no points on your record. Insurance stays the same.',
      },
    ],
  },
  // Apartment events
  {
    id: 'rent_increase',
    title: 'Rent Increase Notice',
    description: 'Your landlord is raising rent by $75/month starting next month. The market is hot.',
    category: 'financial',
    minWeek: 30,
    probability: 0.015,
    requiresCar: false,
    requiresJob: false,
    requiresApartment: true,
    choices: [
      {
        label: 'Accept the increase',
        description: 'Stay put. Moving is expensive and stressful.',
        financialImpact: -75,
        creditImpact: 0,
        followUp: 'Rent increased. Your monthly housing cost just went up $75. Budget accordingly.',
      },
      {
        label: 'Negotiate with landlord',
        description: 'Try to talk them down. You\'ve been a good tenant.',
        financialImpact: -35,
        creditImpact: 0,
        skillImpact: { communication: 4 },
        followUp: 'You negotiated it down to $35/month increase. Good communication skills pay off!',
      },
    ],
  },
  {
    id: 'appliance_breaks',
    title: 'Washer/Dryer Broke',
    description: 'The washing machine in your apartment flooded. Landlord says the lease makes you responsible for the first $200 of appliance repairs.',
    category: 'financial',
    minWeek: 16,
    probability: 0.015,
    requiresCar: false,
    requiresJob: false,
    requiresApartment: true,
    choices: [
      {
        label: 'Pay the $200 repair fee',
        description: 'Cover your share as per the lease.',
        financialImpact: -200,
        creditImpact: 0,
        followUp: 'Paid. Always read your lease carefully before signing!',
      },
      {
        label: 'Use the laundromat instead',
        description: 'Skip the repair, do laundry elsewhere. ~$15/week',
        financialImpact: -60,
        creditImpact: 0,
        followUp: 'Laundromat it is. Costs about $15/week until it gets fixed.',
      },
    ],
  },
];

// Determine which events can fire this week
export function getEligibleEvents(state: GameState): LifeEventDef[] {
  return LIFE_EVENTS.filter((event) => {
    if (state.currentWeek < event.minWeek) return false;
    if (event.requiresCar && !state.vehicle.owned) return false;
    if (event.requiresJob && !state.currentJob) return false;
    if (event.requiresApartment && state.housing.type === 'parents_basement') return false;
    return true;
  });
}

// Roll for a random event this week
export function rollForEvent(state: GameState): LifeEventDef | null {
  const eligible = getEligibleEvents(state);
  if (eligible.length === 0) return null;

  // Each eligible event rolls independently
  for (const event of eligible) {
    if (Math.random() < event.probability) {
      return event;
    }
  }
  return null;
}
