import { GameSettingsModel } from '../models/GameSettings';

const GAME_START_YEAR = 1930;
const GAME_START_QUARTER = 1;
const QUARTERS_PER_YEAR = 4;
export const MILLISECONDS_PER_QUARTER = 24 * 60 * 60 * 1000;
export const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

const DEFAULT_GAME_START_DATE = process.env.GAME_START_DATE
  ? new Date(process.env.GAME_START_DATE)
  : new Date('2024-01-01T00:00:00Z');

// In-memory cache to reduce DB reads (with short TTL)
let cachedGameStartDate: Date | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // 5 second cache

export interface GameTime {
  year: number;
  quarter: number;
}

export async function getGameStartDate(): Promise<Date> {
  // Check cache first
  const now = Date.now();
  if (cachedGameStartDate && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedGameStartDate;
  }

  try {
    const storedDate = await GameSettingsModel.get<string>('game_start_date');
    if (storedDate) {
      cachedGameStartDate = new Date(storedDate);
      cacheTimestamp = now;
      return cachedGameStartDate;
    }
  } catch (error) {
    console.error('Failed to get game start date from DB, using default:', error);
  }

  return DEFAULT_GAME_START_DATE;
}

export async function setGameStartDate(newDate: Date): Promise<void> {
  try {
    await GameSettingsModel.set('game_start_date', newDate.toISOString());
    // Update cache immediately
    cachedGameStartDate = newDate;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error('Failed to persist game start date:', error);
    throw error;
  }
}

export function calculateGameTimeFromStart(
  startDate: Date,
  currentDate: Date = new Date()
): GameTime {
  const millisecondsElapsed = currentDate.getTime() - startDate.getTime();
  const quartersElapsed = Math.floor(millisecondsElapsed / MILLISECONDS_PER_QUARTER);
  const yearsElapsed = Math.floor(quartersElapsed / QUARTERS_PER_YEAR);
  const remainingQuarters = quartersElapsed % QUARTERS_PER_YEAR;

  return {
    year: GAME_START_YEAR + yearsElapsed,
    quarter: GAME_START_QUARTER + remainingQuarters,
  };
}

export function calculateTimeUntilNextQuarter(
  startDate: Date,
  currentDate: Date = new Date()
): { seconds: number; nextUpdate: Date } {
  const millisecondsElapsed = currentDate.getTime() - startDate.getTime();
  const quartersElapsed = Math.floor(millisecondsElapsed / MILLISECONDS_PER_QUARTER);

  // The start of the next quarter
  const nextQuarterStartParams = (quartersElapsed + 1) * MILLISECONDS_PER_QUARTER;
  const nextQuarterDate = new Date(startDate.getTime() + nextQuarterStartParams);

  const diff = nextQuarterDate.getTime() - currentDate.getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));

  return {
    seconds,
    nextUpdate: nextQuarterDate
  };
}

export function calculateTimeUntilNextAction(
  startDate: Date,
  currentDate: Date = new Date()
): { seconds: number; nextUpdate: Date } {
  const millisecondsElapsed = currentDate.getTime() - startDate.getTime();
  const hoursElapsed = Math.floor(millisecondsElapsed / MILLISECONDS_PER_HOUR);

  // The start of the next hour
  const nextHourStartParams = (hoursElapsed + 1) * MILLISECONDS_PER_HOUR;
  const nextHourDate = new Date(startDate.getTime() + nextHourStartParams);

  const diff = nextHourDate.getTime() - currentDate.getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));

  return {
    seconds,
    nextUpdate: nextHourDate
  };
}

export async function resetGameTime(
  year: number,
  quarter: number
): Promise<{
  gameTime: GameTime;
  gameStartDate: Date;
  quartersFromStart: number;
  appliedAt: Date;
}> {
  if (!Number.isFinite(year) || !Number.isFinite(quarter)) {
    throw new Error('Year and quarter are required');
  }

  if (quarter < 1 || quarter > 4) {
    throw new Error('Quarter must be between 1 and 4');
  }

  const now = new Date();
  const quartersFromStart =
    (year - GAME_START_YEAR) * QUARTERS_PER_YEAR + (quarter - GAME_START_QUARTER);

  const newStartDate = new Date(now.getTime() - quartersFromStart * MILLISECONDS_PER_QUARTER);

  // Persist to database
  await setGameStartDate(newStartDate);

  return {
    gameTime: calculateGameTimeFromStart(newStartDate, now),
    gameStartDate: newStartDate,
    quartersFromStart,
    appliedAt: now,
  };
}
