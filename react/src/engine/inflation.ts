// Inflation and fuel cost engine
import { INFLATION, FUEL } from './constants';

export interface EconomyState {
  inflationMultiplier: number;  // starts at 1.0, grows over time
  currentGasPrice: number;      // fluctuates around base * inflation
  weeklyFuelCost: number;       // calculated based on vehicle MPG and miles driven
}

export function createInitialEconomy(): EconomyState {
  return {
    inflationMultiplier: 1.0,
    currentGasPrice: FUEL.basePricePerGallon,
    weeklyFuelCost: 0,
  };
}

/**
 * Update economy each week. Inflation adjusts quarterly,
 * gas prices fluctuate every week with extra volatility.
 */
export function updateEconomy(economy: EconomyState, currentWeek: number): EconomyState {
  let { inflationMultiplier, currentGasPrice } = economy;

  // Quarterly inflation adjustment
  if (currentWeek > 0 && currentWeek % INFLATION.weeksPerAdjustment === 0) {
    const quarterlyRate = INFLATION.annualRate / 4;
    inflationMultiplier *= (1 + quarterlyRate);
  }

  // Weekly gas price fluctuation
  const baseGasPrice = FUEL.basePricePerGallon * inflationMultiplier;
  const volatility = (Math.random() - 0.5) * 2 * INFLATION.fuelVolatility;
  currentGasPrice = Math.max(2.0, baseGasPrice * (1 + volatility));
  currentGasPrice = Math.round(currentGasPrice * 100) / 100;

  return { ...economy, inflationMultiplier, currentGasPrice };
}

/**
 * Calculate weekly fuel cost based on vehicle MPG, miles driven,
 * and current gas price. EVs use electricity instead.
 */
export function calculateWeeklyFuelCost(
  mpg: number,
  gasPrice: number,
  isCarJob: boolean
): number {
  const miles = isCarJob ? FUEL.weeklyMilesWithCarJob : FUEL.weeklyMiles;

  // EVs have very high "MPG equivalent" (130+), their cost is electricity
  if (mpg >= 100) {
    // ~$0.04/mile for electricity vs gas
    return Math.round(miles * 0.04 * 100) / 100;
  }

  const gallonsUsed = miles / mpg;
  return Math.round(gallonsUsed * gasPrice * 100) / 100;
}

/**
 * Apply inflation to a base cost. Use for rent increases,
 * expense adjustments, etc.
 */
export function inflationAdjust(baseCost: number, inflationMultiplier: number): number {
  return Math.round(baseCost * inflationMultiplier * 100) / 100;
}

/**
 * Get a human-readable inflation percentage
 */
export function getInflationPercent(multiplier: number): string {
  const pct = (multiplier - 1) * 100;
  return `${pct.toFixed(1)}%`;
}
