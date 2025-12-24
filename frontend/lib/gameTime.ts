// Game Time Calculation Utilities
// Game started Q1 1930
// 1 real day = 1 quarter
// 4 real days = 1 year

const GAME_START_YEAR = 1930;
const GAME_START_QUARTER = 1;
const REAL_DAYS_PER_YEAR = 4;
const QUARTERS_PER_YEAR = 4;

export interface GameTime {
  year: number;
  quarter: number;
  display: string; // e.g., "Q2 1935"
}

/**
 * Calculate game time based on days elapsed since game start
 * @param gameStartDate - The real-world date when the game started
 * @param currentDate - The current real-world date (defaults to now)
 * @returns GameTime object with year, quarter, and formatted display
 */
export function calculateGameTime(
  gameStartDate: Date | string,
  currentDate: Date | string = new Date()
): GameTime {
  const startDate = new Date(gameStartDate);
  const now = new Date(currentDate);
  
  // Calculate days elapsed
  const millisecondsElapsed = now.getTime() - startDate.getTime();
  const daysElapsed = Math.floor(millisecondsElapsed / (1000 * 60 * 60 * 24));
  
  // Calculate quarters elapsed (1 day = 1 quarter)
  const quartersElapsed = daysElapsed;
  
  // Calculate years and remaining quarters
  const yearsElapsed = Math.floor(quartersElapsed / QUARTERS_PER_YEAR);
  const remainingQuarters = quartersElapsed % QUARTERS_PER_YEAR;
  
  // Calculate final year and quarter
  const year = GAME_START_YEAR + yearsElapsed;
  const quarter = GAME_START_QUARTER + remainingQuarters;
  
  // Handle edge case where we start at Q1 (not Q0)
  const adjustedQuarter = quarter;
  const adjustedYear = year;
  
  const display = `Q${adjustedQuarter} ${adjustedYear}`;
  
  return {
    year: adjustedYear,
    quarter: adjustedQuarter,
    display,
  };
}

/**
 * Format game time for display
 * @param gameTime - GameTime object
 * @returns Formatted string like "Q2 1935"
 */
export function formatGameTime(gameTime: GameTime): string {
  return gameTime.display;
}

/**
 * Get the quarter name
 * @param quarter - Quarter number (1-4)
 * @returns Quarter name like "Q1" or "Q4"
 */
export function getQuarterName(quarter: number): string {
  return `Q${quarter}`;
}

/**
 * Calculate how many real hours until the next quarter
 * @param gameStartDate - The real-world date when the game started
 * @param currentDate - The current real-world date (defaults to now)
 * @returns Hours and minutes until next quarter
 */
export function timeUntilNextQuarter(
  gameStartDate: Date | string,
  currentDate: Date | string = new Date()
): { hours: number; minutes: number; totalMinutes: number } {
  const startDate = new Date(gameStartDate);
  const now = new Date(currentDate);
  
  // Calculate milliseconds since start
  const millisecondsElapsed = now.getTime() - startDate.getTime();
  
  // Calculate milliseconds into current day
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const millisecondsIntoCurrentDay = millisecondsElapsed % millisecondsPerDay;
  
  // Calculate milliseconds until next day (next quarter)
  const millisecondsUntilNextQuarter = millisecondsPerDay - millisecondsIntoCurrentDay;
  
  // Convert to hours and minutes
  const totalMinutes = Math.floor(millisecondsUntilNextQuarter / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    hours,
    minutes,
    totalMinutes,
  };
}


