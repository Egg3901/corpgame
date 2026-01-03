"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const imageUrl_1 = require("../utils/imageUrl");
const BoardProposal_1 = require("../models/BoardProposal");
const router = express_1.default.Router();
// GET /api/profile/:userId/history - Get user's corporate history
router.get('/:userId/history', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        // Verify user exists
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get corporate history
        const history = await BoardProposal_1.BoardProposalModel.getUserCorporateHistory(userId);
        res.json({
            user_id: userId,
            history,
        });
    }
    catch (error) {
        console.error('Get user history error:', error);
        res.status(500).json({ error: 'Failed to get user history' });
    }
});
router.get('/:idOrSlug', async (req, res) => {
    try {
        const idOrSlug = req.params.idOrSlug;
        const isNumericId = /^\d+$/.test(idOrSlug);
        const user = isNumericId
            ? await User_1.UserModel.findByProfileId(Number(idOrSlug))
            : await User_1.UserModel.findBySlug(idOrSlug.toLowerCase());
        if (!user) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Determine if user is online (active within last 5 minutes)
        const isOnline = user.last_seen_at
            ? (Date.now() - new Date(user.last_seen_at).getTime()) < 5 * 60 * 1000
            : false;
        res.json({
            id: user.id,
            profile_id: user.profile_id,
            username: user.username,
            player_name: user.player_name,
            starting_state: user.starting_state,
            gender: user.gender,
            age: user.age,
            profile_slug: user.profile_slug,
            profile_image_url: (0, imageUrl_1.normalizeImageUrl)(user.profile_image_url),
            bio: user.bio,
            cash: user.cash || 0,
            actions: user.actions || 0,
            is_admin: user.is_admin,
            last_seen_at: user.last_seen_at,
            is_online: isOnline,
            created_at: user.created_at,
        });
    }
    catch (error) {
        console.error('Profile lookup error:', error);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});
router.patch('/update', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { bio } = req.body;
        if (bio !== undefined) {
            // Validate bio length
            if (typeof bio !== 'string' || bio.length > 500) {
                return res.status(400).json({ error: 'Bio must be a string with maximum 500 characters' });
            }
            await User_1.UserModel.updateBio(userId, bio);
        }
        // Return updated user data
        const updatedUser = await User_1.UserModel.findById(userId);
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Determine if user is online (active within last 5 minutes)
        const isOnline = updatedUser.last_seen_at
            ? (Date.now() - new Date(updatedUser.last_seen_at).getTime()) < 5 * 60 * 1000
            : false;
        res.json({
            id: updatedUser.id,
            profile_id: updatedUser.profile_id,
            username: updatedUser.username,
            player_name: updatedUser.player_name,
            starting_state: updatedUser.starting_state,
            gender: updatedUser.gender,
            age: updatedUser.age,
            profile_slug: updatedUser.profile_slug,
            profile_image_url: (0, imageUrl_1.normalizeImageUrl)(updatedUser.profile_image_url),
            bio: updatedUser.bio,
            cash: updatedUser.cash || 0,
            actions: updatedUser.actions || 0,
            is_admin: updatedUser.is_admin,
            last_seen_at: updatedUser.last_seen_at,
            is_online: isOnline,
            created_at: updatedUser.created_at,
        });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
exports.default = router;
