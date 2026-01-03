"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const actions_1 = require("../cron/actions");
const gameTime_1 = require("../utils/gameTime");
const router = express_1.default.Router();
// Placeholder for future game routes
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    res.json({ message: 'Game API - Coming soon' });
});
// GET /api/game/time - Get server time and next cron update times
router.get('/time', async (req, res) => {
    try {
        const now = new Date();
        const { nextActionUpdate, nextProposalCheck } = (0, actions_1.getNextCronTimes)();
        const gameStartDate = (0, gameTime_1.getGameStartDate)();
        const secondsUntilActionUpdate = Math.max(0, Math.floor((nextActionUpdate.getTime() - now.getTime()) / 1000));
        const secondsUntilProposalCheck = Math.max(0, Math.floor((nextProposalCheck.getTime() - now.getTime()) / 1000));
        res.json({
            server_time: now.toISOString(),
            game_start_date: gameStartDate.toISOString(),
            next_action_update: nextActionUpdate.toISOString(),
            next_proposal_check: nextProposalCheck.toISOString(),
            seconds_until_action_update: secondsUntilActionUpdate,
            seconds_until_proposal_check: secondsUntilProposalCheck,
        });
    }
    catch (error) {
        console.error('Get server time error:', error);
        res.status(500).json({ error: 'Failed to get server time' });
    }
});
exports.default = router;
