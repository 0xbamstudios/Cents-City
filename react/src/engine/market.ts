// Stock market + macroeconomy engine.
// Prices drift with their own volatility, are dragged by high interest rates and
// inflation (per-stock sensitivity), and jump on stock-specific news.
import { Stock, NewsItem } from './types';

// Neutral macro reference points — rates/inflation above these drag stocks.
export const MACRO = {
  neutralInterestRate: 3.0,   // %
  neutralInflationRate: 2.5,  // %
  interestStart: 4.5,
  inflationStart: 3.0,
  // mean-reversion + noise for the weekly random walk
  reversion: 0.02,
  interestNoise: 0.06,
  inflationNoise: 0.05,
  interestMin: 0.25,
  interestMax: 12,
  inflationMin: -1,
  inflationMax: 15,
} as const;

export function createInitialStocks(): Stock[] {
  // id, name, price, volatility, rateSensitivity, inflationSensitivity
  const defs: [string, string, number, number, number, number][] = [
    // Existing five (ids preserved so old references keep working)
    ['CNTC', 'Cents City Corp', 42.5, 0.04, 0.4, 0.4],
    ['SVNG', 'SaveMore Inc', 128.0, 0.03, 0.5, 0.3],
    ['GRWT', 'GrowthTech', 85.75, 0.07, 0.8, 0.5],
    ['STDY', 'SteadyDiv Fund', 55.2, 0.02, 0.3, 0.2],
    ['INDX', 'Cents City Index', 210.0, 0.03, 0.4, 0.4],
    // Ten new
    ['CCIN', 'CC Industries', 64.0, 0.045, 0.5, 0.6],
    ['CCLC', 'CCLC Lumber Industries', 38.25, 0.06, 0.6, 0.7],
    ['BCNC', 'Big City News Corp', 27.8, 0.05, 0.4, 0.4],
    ['HDWL', 'Hardware Limited', 73.4, 0.05, 0.55, 0.6],
    ['BREW', 'Downtown Brew Co', 19.5, 0.06, 0.35, 0.5],
    ['MDBP', 'MedBridge Pharma', 142.0, 0.06, 0.7, 0.4],
    ['SOLR', 'Sunbelt Solar', 31.6, 0.09, 0.85, 0.5],
    ['RVRB', 'Riverbend Bank', 58.9, 0.035, 0.75, 0.35],
    ['AERO', 'Aerobyte Systems', 96.3, 0.08, 0.8, 0.45],
    ['FRMF', 'Family Farms Foods', 44.7, 0.03, 0.3, 0.55],
  ];
  return defs.map(([id, name, price, volatility, rateSensitivity, inflationSensitivity]) => ({
    id, name, price, prevPrice: price, volatility, rateSensitivity, inflationSensitivity,
  }));
}

// Step the macro rates as a mean-reverting random walk.
export function stepMacro(interestRate: number, inflationRate: number): { interestRate: number; inflationRate: number } {
  const nextInterest = clamp(
    interestRate + (MACRO.neutralInterestRate - interestRate) * MACRO.reversion + (Math.random() - 0.5) * MACRO.interestNoise * 2,
    MACRO.interestMin, MACRO.interestMax,
  );
  const nextInflation = clamp(
    inflationRate + (MACRO.neutralInflationRate - inflationRate) * MACRO.reversion + (Math.random() - 0.5) * MACRO.inflationNoise * 2,
    MACRO.inflationMin, MACRO.inflationMax,
  );
  return {
    interestRate: Math.round(nextInterest * 100) / 100,
    inflationRate: Math.round(nextInflation * 100) / 100,
  };
}

// Step all stock prices one week, applying drift, macro drag, and any news impact.
export function stepMarket(
  stocks: Stock[],
  interestRate: number,
  inflationRate: number,
  newsImpactByStock: Record<string, number>,
): Stock[] {
  // Macro drag: how far rates/inflation sit above their neutral levels (as fractions).
  const rateGap = (interestRate - MACRO.neutralInterestRate) / 100;
  const inflGap = (inflationRate - MACRO.neutralInflationRate) / 100;

  return stocks.map((s) => {
    const noise = (Math.random() - 0.5) * 2 * s.volatility;      // ±volatility
    const macroDrag = -(rateGap * s.rateSensitivity + inflGap * s.inflationSensitivity);
    const baseDrift = 0.0015; // slight long-run upward bias
    const news = newsImpactByStock[s.id] || 0;
    const pct = baseDrift + noise + macroDrag + news;
    const nextPrice = Math.max(1, Math.round(s.price * (1 + pct) * 100) / 100);
    return { ...s, prevPrice: s.price, price: nextPrice };
  });
}

// ── News generation ─────────────────────────────────────────────────────────
const STOCK_NEWS: { up: string[]; down: string[] } = {
  up: [
    '{name} beats earnings expectations, shares climb',
    '{name} lands a major new contract',
    'Analysts upgrade {name} to a strong buy',
    '{name} announces a popular new product line',
    '{name} raises its dividend, investors cheer',
  ],
  down: [
    '{name} misses earnings, stock slides',
    '{name} faces a product recall',
    'Regulators open an inquiry into {name}',
    '{name} warns of weaker demand ahead',
    'A key executive departs {name} unexpectedly',
  ],
};

const MACRO_NEWS: string[] = [
  'Central bank signals it may adjust short-term interest rates',
  'Consumer prices tick higher this month',
  'Jobs report comes in stronger than expected',
  'Markets steady as investors weigh inflation data',
  'Housing starts cool as borrowing costs bite',
];

let newsCounter = 0;

// Maybe generate a news item this week. Returns null most weeks.
export function maybeGenerateNews(stocks: Stock[], week: number): NewsItem | null {
  if (Math.random() > 0.28) return null; // ~28% of weeks have news

  const stockSpecific = Math.random() < 0.6 && stocks.length > 0;
  newsCounter += 1;

  if (stockSpecific) {
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const positive = Math.random() < 0.5;
    const pool = positive ? STOCK_NEWS.up : STOCK_NEWS.down;
    const headline = pool[Math.floor(Math.random() * pool.length)].replace('{name}', stock.name);
    // Impact between 4% and 14%, signed
    const magnitude = 0.04 + Math.random() * 0.10;
    return {
      id: `news_${week}_${newsCounter}`,
      week,
      headline,
      stockId: stock.id,
      impactPct: positive ? magnitude : -magnitude,
    };
  }

  const headline = MACRO_NEWS[Math.floor(Math.random() * MACRO_NEWS.length)];
  return { id: `news_${week}_${newsCounter}`, week, headline, impactPct: 0 };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
