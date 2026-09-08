// Quick-time (random) life events engine.
// Each week, rollQuickEvents inspects the player's situation and may trigger at
// most one event. Events return structured effects the store applies so the
// weekly loop stays declarative.
import { GameState, Loan } from './types';

const WEEKS_PER_YEAR = 52;

// Per-week probabilities, tuned so scheduled events land near their target cadence.
export const EVENT_ODDS = {
  carTheftPerWeek: 1 / (18 * WEEKS_PER_YEAR),     // rare: ~once per 18 owning-years
  roofPerWeek: 1 / (25 * WEEKS_PER_YEAR),         // ~every 25 years
  paintPerWeek: 1 / (6 * WEEKS_PER_YEAR),         // ~every 6 years
  waterHeaterPerWeek: 1 / (12 * WEEKS_PER_YEAR),  // ~every 12 years
  furnacePerWeek: 1 / (20 * WEEKS_PER_YEAR),      // ~every 20 years
  carAccidentPerWeek: 1 / (12 * WEEKS_PER_YEAR),  // ~every 12 years
  carMaintenancePerWeek: 1 / (2.5 * WEEKS_PER_YEAR), // ~every 2.5 years
  muggingPerWeek: 1 / (30 * WEEKS_PER_YEAR),      // rare
  taxAuditPerWeek: 1 / (15 * WEEKS_PER_YEAR),     // ~every 15 years
  fridgePerWeek: 1 / (10 * WEEKS_PER_YEAR),       // ~every 10 years
  couchPerWeek: 1 / (9 * WEEKS_PER_YEAR),         // ~every 9 years
  bedroomSetPerWeek: 1 / (12 * WEEKS_PER_YEAR),   // ~every 12 years
  cityWaterPerWeek: 1 / (40 * WEEKS_PER_YEAR),    // rare, one big hit
} as const;

// Tax enforcement
export const TAX_ENFORCEMENT = {
  auditMinAssessment: 800,     // back taxes/penalties assessed by an audit (min)...
  auditMaxAssessment: 9000,    // ...and max
  arrestOverdueWeeks: 52,      // taxes behind more than a year -> risk of arrest
  arrestLoaWeeks: 6,           // weeks in custody (unpaid leave)
  arrestFineMin: 5000,         // fines/legal costs (min)...
  arrestFineMax: 20000,        // ...and max
} as const;

export const EVENT_COSTS = {
  roof: 20000,
  paint: 12000,
  waterHeater: 6000,
  furnace: 25000,
  carMaintenanceMin: 140,
  carMaintenanceMax: 3500,
  carAccidentInsuranceSurchargePct: 0.35,
  carAccidentInsuranceWeeks: 2 * WEEKS_PER_YEAR,
  muggingLoaWeeks: 5,
  muggingDebtMin: 10000,
  muggingDebtMax: 40000,
  fridgeMin: 600, fridgeMax: 2000,
  couchMin: 800, couchMax: 3200,
  bedroomSetMin: 2500, bedroomSetMax: 5000,
  cityWaterMin: 30000, cityWaterMax: 35000,
} as const;

// Parent housing thresholds
export const PARENT_RULES = {
  rentSavingsTrigger: 3000,      // start charging rent once savings exceed this...
  rentAgeTrigger: 20,            // ...or once you reach this age
  rentWeekly: 150,               // weekly rent the parents charge
  evictSavingsTrigger: 35000,    // parents evict once savings reach this...
  evictAgeTrigger: 21,           // ...or this age
  evictAgeTriggerInSchool: 24,   // ...but 24 if enrolled full-time in college
} as const;

// A minimum interval so scheduled home repairs don't double-fire right away.
const ROOF_MIN_INTERVAL = 20 * WEEKS_PER_YEAR;
const PAINT_MIN_INTERVAL = 4 * WEEKS_PER_YEAR;

export interface QuickEventEffects {
  id: string;                        // stable id (used to fire once-only events once)
  title: string;
  message: string;
  prompt?: string;                   // call-to-action shown on the reaction button
  reactable?: boolean;               // true = react fast to soften the outcome
  cashCost?: number;                 // charged from checking (then savings) — best effort
  loseVehicle?: boolean;             // total loss / theft
  loaWeeks?: number;                 // leave of absence
  addLoan?: Omit<Loan, 'startWeek' | 'nextDueWeek' | 'weeksPastDue'>;
  insuranceSurchargePct?: number;    // temporary auto-insurance hike
  insuranceSurchargeWeeks?: number;
  markRoofWeek?: boolean;            // record this week as last roof repair
  markPaintWeek?: boolean;           // record this week as last paint
  startChargingRent?: number;        // parents begin charging this weekly rent (basement)
  evict?: boolean;                   // parents evict — forced move-out
  enableAutoTaxFiling?: boolean;     // unlock: a tax service auto-files your taxes
  enableBankingApp?: boolean;        // unlock: auto-pay for bills, cards, loans, rent
}

function isHouse(state: GameState): boolean {
  return state.housing.type === 'house' || state.housing.type === 'nice_house';
}

function randBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/**
 * Roll for a single quick-time event this week. Returns null when nothing fires.
 * At most one event is returned per week to avoid piling misfortune on the player.
 */
export function rollQuickEvents(state: GameState, week: number): QuickEventEffects | null {
  const ownsCar = state.vehicle.owned;
  const hasCar = state.vehicle.owned || state.vehicle.leased;
  const house = isHouse(state);
  const roll = () => Math.random();
  const fired = state.firedEventIds || [];
  // settings live on the store (passed in via the full state object at runtime)
  const settings = (state as any).settings || { autoTaxFiling: false, autoBillPay: false, autoCreditCardPay: false };
  const savings = state.savings.balance + state.checking.balance;
  const inBasement = state.housing.type === 'parents_basement';
  const inFullTimeCollege = state.education.enrollment?.program === 'college'
    && state.education.enrollment?.pace === 'full_time';

  // ── Convenience unlocks (deterministic, fire once) ──
  // A tax service after you've filed taxes 3 times
  if (!fired.includes('tax_service') && state.taxReturns.length >= 3 && !settings.autoTaxFiling) {
    return {
      id: 'tax_service',
      title: '🧾 Hire a Tax Service?',
      message: `You've filed your own taxes three years running. A local tax service offers to handle it from now on — they'll automatically file on time every year so you never miss the deadline. (You can turn this off later in Settings.)`,
      prompt: 'Hire the tax service',
      enableAutoTaxFiling: true,
    };
  }

  // A banking app after 2 years that automates recurring payments
  if (!fired.includes('banking_app') && week >= 104 && (!settings.autoBillPay || !settings.autoCreditCardPay)) {
    return {
      id: 'banking_app',
      title: '📱 New Banking App',
      message: `Two years in, your bank launches an app that automates your finances — it can auto-pay your rent, utilities, bills, loans, and credit cards so you never miss a payment. (You can turn auto-pay off later in Settings.)`,
      prompt: 'Enable auto-pay',
      enableBankingApp: true,
    };
  }

  // ── Parent housing events (deterministic, fire once) ──
  // Parents start charging rent
  if (inBasement && !fired.includes('parent_rent')
      && (savings > PARENT_RULES.rentSavingsTrigger || state.age >= PARENT_RULES.rentAgeTrigger)) {
    return {
      id: 'parent_rent',
      title: '🏠 Your Parents Want Rent',
      message: `Your parents have noticed you're getting on your feet and have decided it's time you chip in. They'll start charging ${money(PARENT_RULES.rentWeekly)}/week to live in the basement.`,
      prompt: 'Have the conversation',
      reactable: true,
      startChargingRent: PARENT_RULES.rentWeekly,
    };
  }

  // ── Tax arrest (deterministic): taxes behind more than a year ──
  const weeksLate = state.pendingTaxReturn?.weeksLate || 0;
  const arrestId = `tax_arrest_${state.pendingTaxReturn?.year ?? 'x'}`;
  if (weeksLate > TAX_ENFORCEMENT.arrestOverdueWeeks && !fired.includes(arrestId)) {
    const fine = randBetween(TAX_ENFORCEMENT.arrestFineMin, TAX_ENFORCEMENT.arrestFineMax);
    return {
      id: arrestId,
      title: '🚔 Arrested for Tax Evasion',
      message: `Your taxes are more than a year overdue. The IRS referred your case and you've been arrested. Expect ${TAX_ENFORCEMENT.arrestLoaWeeks} weeks in custody (unpaid) plus fines and legal costs up to ${money(fine)}. File your back taxes immediately.`,
      prompt: 'Call a lawyer',
      reactable: true,
      loaWeeks: TAX_ENFORCEMENT.arrestLoaWeeks,
      cashCost: fine,
    };
  }

  // ── Tax audit (random) ──
  if (roll() < EVENT_ODDS.taxAuditPerWeek) {
    const assessment = randBetween(TAX_ENFORCEMENT.auditMinAssessment, TAX_ENFORCEMENT.auditMaxAssessment);
    return {
      id: `tax_audit_${week}`,
      title: '🧾 Tax Audit',
      message: `The IRS is auditing your return. Respond quickly and organized to keep it clean — a slow, messy response means more back taxes and penalties (up to ${money(assessment)}).`,
      prompt: 'Cooperate promptly',
      reactable: true,
      cashCost: assessment,
    };
  }

  // Parents evict you
  const evictAge = inFullTimeCollege ? PARENT_RULES.evictAgeTriggerInSchool : PARENT_RULES.evictAgeTrigger;
  if (inBasement && !fired.includes('parent_evict')
      && (savings >= PARENT_RULES.evictSavingsTrigger || state.age >= evictAge)) {
    return {
      id: 'parent_evict',
      title: '📦 Time to Move Out',
      message: `Your parents love you, but it's time to spread your wings. They're giving you the boot from the basement — you'll need your own place. ${inFullTimeCollege ? '(They gave you extra time while you finish college.)' : ''}`,
      prompt: 'Pack your bags',
      reactable: true,
      evict: true,
    };
  }

  // 1. Car theft (owned only)
  if (ownsCar && roll() < EVENT_ODDS.carTheftPerWeek) {
    return {
      id: `car_theft_${week}`,
      title: '🚗 Car Stolen',
      message: `Your ${state.vehicle.name} was stolen. It's gone, and you're back to figuring out transportation.`,
      loseVehicle: true,
    };
  }

  // 2a. Roof (house, respecting a minimum interval since the last roof)
  if (house && (state.lastRoofRepairWeek < 0 || week - state.lastRoofRepairWeek >= ROOF_MIN_INTERVAL)
      && roll() < EVENT_ODDS.roofPerWeek) {
    return {
      id: `roof_${week}`,
      title: '🏠 New Roof Needed',
      message: `Your roof has reached the end of its life. Act fast to line up an affordable contractor — a full replacement can run up to ${money(EVENT_COSTS.roof)}.`,
      prompt: 'Call a roofer now',
      reactable: true,
      cashCost: EVENT_COSTS.roof,
      markRoofWeek: true,
    };
  }

  // 2b. Exterior painting (house, ~every 6 years)
  if (house && (state.lastPaintWeek < 0 || week - state.lastPaintWeek >= PAINT_MIN_INTERVAL)
      && roll() < EVENT_ODDS.paintPerWeek) {
    return {
      id: `paint_${week}`,
      title: '🎨 Exterior Painting',
      message: `The house is due for a fresh coat of paint. Jump on a quote quickly to keep it cheap — up to ${money(EVENT_COSTS.paint)}.`,
      prompt: 'Get quotes now',
      reactable: true,
      cashCost: EVENT_COSTS.paint,
      markPaintWeek: true,
    };
  }

  // 2c. Water heater (house)
  if (house && roll() < EVENT_ODDS.waterHeaterPerWeek) {
    return {
      id: `water_heater_${week}`,
      title: '💧 Water Heater Failed',
      message: `Your water heater died. Move fast on a plumber to avoid emergency rates — up to ${money(EVENT_COSTS.waterHeater)}.`,
      prompt: 'Call a plumber now',
      reactable: true,
      cashCost: EVENT_COSTS.waterHeater,
    };
  }

  // 2d. Furnace (house)
  if (house && roll() < EVENT_ODDS.furnacePerWeek) {
    return {
      id: `furnace_${week}`,
      title: '🔥 Furnace Replacement',
      message: `The furnace gave out and must be replaced. Line up an HVAC tech quickly to keep costs down — up to ${money(EVENT_COSTS.furnace)}.`,
      prompt: 'Call HVAC now',
      reactable: true,
      cashCost: EVENT_COSTS.furnace,
    };
  }

  // 2e. Refrigerator (house)
  if (house && roll() < EVENT_ODDS.fridgePerWeek) {
    const cost = randBetween(EVENT_COSTS.fridgeMin, EVENT_COSTS.fridgeMax);
    return {
      id: `fridge_${week}`,
      title: '🧊 New Refrigerator Needed',
      message: `Your refrigerator died. Shop around quickly for a good deal — a replacement runs up to ${money(cost)}.`,
      prompt: 'Compare prices now',
      reactable: true,
      cashCost: cost,
    };
  }

  // 2f. Couch (house)
  if (house && roll() < EVENT_ODDS.couchPerWeek) {
    const cost = randBetween(EVENT_COSTS.couchMin, EVENT_COSTS.couchMax);
    return {
      id: `couch_${week}`,
      title: '🛋️ Time for a New Couch',
      message: `Your couch is worn out. Move fast on a sale to keep it affordable — up to ${money(cost)}.`,
      prompt: 'Find a deal now',
      reactable: true,
      cashCost: cost,
    };
  }

  // 2g. Bedroom set (house)
  if (house && roll() < EVENT_ODDS.bedroomSetPerWeek) {
    const cost = randBetween(EVENT_COSTS.bedroomSetMin, EVENT_COSTS.bedroomSetMax);
    return {
      id: `bedroom_set_${week}`,
      title: '🛏️ New Bedroom Set',
      message: `Your bedroom furniture needs replacing. React quickly to catch a sale — up to ${money(cost)}.`,
      prompt: 'Shop the sales now',
      reactable: true,
      cashCost: cost,
    };
  }

  // 2h. Connect to city water (house) — a big, rare project
  if (house && roll() < EVENT_ODDS.cityWaterPerWeek) {
    const cost = randBetween(EVENT_COSTS.cityWaterMin, EVENT_COSTS.cityWaterMax);
    return {
      id: `city_water_${week}`,
      title: '🚰 Connect to City Water',
      message: `Your well failed and the city is requiring you to connect to municipal water. Get competitive bids quickly to control the cost — up to ${money(cost)}.`,
      prompt: 'Get contractor bids',
      reactable: true,
      cashCost: cost,
    };
  }

  // 3. Car accident (owned or leased) — insurance surcharge for 2 years
  if (hasCar && roll() < EVENT_ODDS.carAccidentPerWeek) {
    return {
      id: `car_accident_${week}`,
      title: '💥 Car Accident',
      message: `You were in an accident! React quickly — staying calm and handling it well limits how much your insurance goes up (up to ${Math.round(EVENT_COSTS.carAccidentInsuranceSurchargePct * 100)}% for 2 years).`,
      prompt: 'Handle it calmly',
      reactable: true,
      insuranceSurchargePct: EVENT_COSTS.carAccidentInsuranceSurchargePct,
      insuranceSurchargeWeeks: EVENT_COSTS.carAccidentInsuranceWeeks,
    };
  }

  // 4. Car maintenance (owned) — variable cost
  if (ownsCar && roll() < EVENT_ODDS.carMaintenancePerWeek) {
    const cost = randBetween(EVENT_COSTS.carMaintenanceMin, EVENT_COSTS.carMaintenanceMax);
    return {
      id: `car_maint_${week}`,
      title: '🔧 Car Maintenance',
      message: `Your ${state.vehicle.name} needs repairs. Shop around quickly to keep the bill down — up to ${money(cost)}.`,
      prompt: 'Find a mechanic now',
      reactable: true,
      cashCost: cost,
    };
  }

  // 5. Mugging — 5-week LOA (unpaid if hourly), medical debt if uninsured
  if (roll() < EVENT_ODDS.muggingPerWeek) {
    const uninsured = !state.hasHealthInsurance;
    const debt = uninsured ? randBetween(EVENT_COSTS.muggingDebtMin, EVENT_COSTS.muggingDebtMax) : 0;
    const base: QuickEventEffects = {
      id: `mugging_${week}`,
      title: '🚨 You Were Mugged',
      message: `You were mugged! React fast — getting to safety and care quickly limits your injuries and time off work (up to a ${EVENT_COSTS.muggingLoaWeeks}-week leave)${uninsured ? `, and with no health insurance, medical debt of up to ${money(debt)}.` : '. Your health insurance covers the medical bills.'}`,
      prompt: 'Get to safety',
      reactable: true,
      loaWeeks: EVENT_COSTS.muggingLoaWeeks,
    };
    if (uninsured && debt > 0) {
      base.addLoan = {
        id: `medical_debt_${week}`,
        type: 'auto_bank', // reuse existing loan machinery
        name: 'Medical Debt',
        principal: debt,
        interestRate: 0.12,
        monthlyPayment: Math.round((debt * 0.02)),
        remainingBalance: debt,
        termMonths: 60,
      };
    }
    return base;
  }

  return null;
}

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}
