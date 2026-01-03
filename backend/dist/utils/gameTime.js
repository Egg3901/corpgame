"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameStartDate = getGameStartDate;
exports.setGameStartDate = setGameStartDate;
exports.calculateGameTimeFromStart = calculateGameTimeFromStart;
exports.resetGameTime = resetGameTime;
const GAME_START_YEAR = 1930;
const GAME_START_QUARTER = 1;
const QUARTERS_PER_YEAR = 4;
const MILLISECONDS_PER_QUARTER = 24 * 60 * 60 * 1000;
const DEFAULT_GAME_START_DATE = process.env.GAME_START_DATE
    ? new Date(process.env.GAME_START_DATE)
    : new Date('2024-01-01T00:00:00Z');
let gameStartDate = DEFAULT_GAME_START_DATE;
function getGameStartDate() {
    return gameStartDate;
}
function setGameStartDate(newDate) {
    gameStartDate = newDate;
}
function calculateGameTimeFromStart(startDate, currentDate = new Date()) {
    const millisecondsElapsed = currentDate.getTime() - startDate.getTime();
    const quartersElapsed = Math.floor(millisecondsElapsed / MILLISECONDS_PER_QUARTER);
    const yearsElapsed = Math.floor(quartersElapsed / QUARTERS_PER_YEAR);
    const remainingQuarters = quartersElapsed % QUARTERS_PER_YEAR;
    return {
        year: GAME_START_YEAR + yearsElapsed,
        quarter: GAME_START_QUARTER + remainingQuarters,
    };
}
function resetGameTime(year, quarter) {
    if (!Number.isFinite(year) || !Number.isFinite(quarter)) {
        throw new Error('Year and quarter are required');
    }
    if (quarter < 1 || quarter > 4) {
        throw new Error('Quarter must be between 1 and 4');
    }
    const now = new Date();
    const quartersFromStart = (year - GAME_START_YEAR) * QUARTERS_PER_YEAR + (quarter - GAME_START_QUARTER);
    const newStartDate = new Date(now.getTime() - quartersFromStart * MILLISECONDS_PER_QUARTER);
    setGameStartDate(newStartDate);
    return {
        gameTime: calculateGameTimeFromStart(newStartDate, now),
        gameStartDate: newStartDate,
        quartersFromStart,
        appliedAt: now,
    };
}
