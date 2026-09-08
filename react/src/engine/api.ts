// Lightweight backend client. All calls go through the same CloudFront
// distribution under /api/* (same-origin), so there are no CORS concerns.
// Every call is best-effort: the game is fully playable offline, so network
// failures are swallowed and never block gameplay.

const BASE = '/api';

async function post(path: string, body: unknown): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function put(path: string, body: unknown): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function get(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface GameStats {
  gamesStarted: number;
  retirements: number;
  retirementPct: number;
  youngestRetiree: { name: string; age: number; netWorth: number } | null;
  highestNetWorth: { name: string; age: number; netWorth: number } | null;
}

// Increment the games-started counter (called when a new game is initiated).
export function incrementGameCounter(): void {
  void put('/games/counter', {});
}

// Persist a startup idea when the company is founded.
export function saveStartupIdea(input: { startupId: string; name: string; idea: string; gameId?: string; week?: number }): void {
  void post('/startup', input);
}

// Update a startup's status (series raised, failed, sold, or IPO'd).
export function updateStartup(input: { startupId: string; status: string; event: string; week?: number; detail?: string }): void {
  void put('/startup', input);
}

// Record a retirement (age + net worth) when the player retires.
export function recordRetirement(input: { name: string; age: number; netWorth: number; gameId?: string }): void {
  void post('/retire', input);
}

// Fetch aggregate stats for the dashboard.
export async function fetchStats(): Promise<GameStats | null> {
  return (await get('/stats')) as GameStats | null;
}
