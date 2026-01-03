const GAME_START_YEAR = 1930;
const GAME_START_QUARTER = 1;
const QUARTERS_PER_YEAR = 4;
export const MILLISECONDS_PER_QUARTER = 24 * 60 * 60 * 1000;
export const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

const DEFAULT_GAME_START_DATE = process.env.GAME_START_DATE
  ? new Date(process.env.GAME_START_DATE)
  : new Date('2024-01-01T00:00:00Z');

let gameStartDate = DEFAULT_GAME_START_DATE;

export interface GameTime {
  year: number;
  quarter: number;
}

export function getGameStartDate(): Date {
  return gameStartDate;
}

export function setGameStartDate(newDate: Date): void {
  gameStartDate = newDate;
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
  // Actions happen every real hour on the hour relative to game start?
  // Or just every hour from start?
  // Let's assume standard "on the hour" from game start.
  
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

export function resetGameTime(
  year: number,
  quarter: number
): {
  gameTime: GameTime;
  gameStartDate: Date;
  quartersFromStart: number;
  appliedAt: Date;
} {
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
  setGameStartDate(newStartDate);

  return {
    gameTime: calculateGameTimeFromStart(newStartDate, now),
    gameStartDate: newStartDate,
    quartersFromStart,
    appliedAt: now,
  };
}
