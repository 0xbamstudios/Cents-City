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
} as const;

// A minimum interval so scheduled home repairs don't double-fire right away.
const ROOF_MIN_INTERVAL = 20 * WEEKS_PER_YEAR;
const PAINT_MIN_INTERVAL = 4 * WEEKS_PER_YEAR;

export interface QuickEventEffects {
  title: string;
  message: string;
  cashCost?: number;                 // charged from checking (then savings) — best effort
  loseVehicle?: boolean;             // total loss / theft
  loaWeeks?: number;                 // leave of absence
  addLoan?: Omit<Loan, 'startWeek' | 'nextDueWeek' | 'weeksPastDue'>;
  insuranceSurchargePct?: number;    // temporary auto-insurance hike
  insuranceSurchargeWeeks?: number;
  markRoofWeek?: boolean;            // record this week as last roof repair
  markPaintWeek?: boolean;           // record this week as last paint
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

  // 1. Car theft (owned only)
  if (ownsCar && roll() < EVENT_ODDS.carTheftPerWeek) {
    return {
      title: '🚗 Car Stolen',
      message: `Your ${state.vehicle.name} was stolen. It's gone, and you're back to figuring out transportation.`,
      loseVehicle: true,
    };
  }

  // 2a. Roof (house, respecting a minimum interval since the last roof)
  if (house && (state.lastRoofRepairWeek < 0 || week - state.lastRoofRepairWeek >= ROOF_MIN_INTERVAL)
      && roll() < EVENT_ODDS.roofPerWeek) {
    return {
      title: '🏠 New Roof Needed',
      message: `Your roof has reached the end of its life. A full replacement runs ${money(EVENT_COSTS.roof)}.`,
      cashCost: EVENT_COSTS.roof,
      markRoofWeek: true,
    };
  }

  // 2b. Exterior painting (house, ~every 6 years)
  if (house && (state.lastPaintWeek < 0 || week - state.lastPaintWeek >= PAINT_MIN_INTERVAL)
      && roll() < EVENT_ODDS.paintPerWeek) {
    return {
      title: '🎨 Exterior Painting',
      message: `The house is due for a fresh coat of paint — ${money(EVENT_COSTS.paint)}.`,
      cashCost: EVENT_COSTS.paint,
      markPaintWeek: true,
    };
  }

  // 2c. Water heater (house)
  if (house && roll() < EVENT_ODDS.waterHeaterPerWeek) {
    return {
      title: '💧 Water Heater Failed',
      message: `Your water heater died. A replacement costs ${money(EVENT_COSTS.waterHeater)}.`,
      cashCost: EVENT_COSTS.waterHeater,
    };
  }

  // 2d. Furnace (house)
  if (house && roll() < EVENT_ODDS.furnacePerWeek) {
    return {
      title: '🔥 Furnace Replacement',
      message: `The furnace gave out and must be replaced — ${money(EVENT_COSTS.furnace)}.`,
      cashCost: EVENT_COSTS.furnace,
    };
  }

  // 3. Car accident (owned or leased) — insurance surcharge for 2 years
  if (hasCar && roll() < EVENT_ODDS.carAccidentPerWeek) {
    return {
      title: '💥 Car Accident',
      message: `You were in an accident. Your auto insurance jumps ${Math.round(EVENT_COSTS.carAccidentInsuranceSurchargePct * 100)}% for the next 2 years.`,
      insuranceSurchargePct: EVENT_COSTS.carAccidentInsuranceSurchargePct,
      insuranceSurchargeWeeks: EVENT_COSTS.carAccidentInsuranceWeeks,
    };
  }

  // 4. Car maintenance (owned) — variable cost
  if (ownsCar && roll() < EVENT_ODDS.carMaintenancePerWeek) {
    const cost = randBetween(EVENT_COSTS.carMaintenanceMin, EVENT_COSTS.carMaintenanceMax);
    return {
      title: '🔧 Car Maintenance',
      message: `Your ${state.vehicle.name} needs repairs — ${money(cost)}.`,
      cashCost: cost,
    };
  }

  // 5. Mugging — 5-week LOA (unpaid if hourly), medical debt if uninsured
  if (roll() < EVENT_ODDS.muggingPerWeek) {
    const uninsured = !state.hasHealthInsurance;
    const debt = uninsured ? randBetween(EVENT_COSTS.muggingDebtMin, EVENT_COSTS.muggingDebtMax) : 0;
    const base: QuickEventEffects = {
      title: '🚨 You Were Mugged',
      message: `You were mugged and injured. You need a ${EVENT_COSTS.muggingLoaWeeks}-week leave of absence to recover${uninsured ? `, and with no health insurance you're stuck with ${money(debt)} in medical debt.` : '. Your health insurance covers the medical bills.'}`,
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
