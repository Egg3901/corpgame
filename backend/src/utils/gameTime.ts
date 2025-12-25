const GAME_START_YEAR = 1930;
const GAME_START_QUARTER = 1;
const QUARTERS_PER_YEAR = 4;
const MILLISECONDS_PER_QUARTER = 24 * 60 * 60 * 1000;

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
