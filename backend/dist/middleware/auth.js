"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret', async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.userId = decoded.userId;
        // Update last_seen_at for authenticated requests (throttled to avoid excessive DB writes)
        // Only update if last update was more than 30 seconds ago
        if (decoded.userId) {
            try {
                // Use a simple approach: update every time but let the database handle it efficiently
                // For production, consider using Redis or a more sophisticated throttling mechanism
                await User_1.UserModel.updateLastSeen(decoded.userId);
            }
            catch (error) {
                // Don't fail the request if last_seen update fails
                console.error('Failed to update last_seen_at:', error);
            }
        }
        next();
    });
};
exports.authenticateToken = authenticateToken;
// Optional authentication - sets userId if token is valid, but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        // No token - continue without user
        return next();
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret', async (err, decoded) => {
        if (err) {
            // Invalid token - continue without user (don't fail the request)
            return next();
        }
        req.userId = decoded.userId;
        // Update last_seen_at for authenticated requests
        if (decoded.userId) {
            try {
                await User_1.UserModel.updateLastSeen(decoded.userId);
            }
            catch (error) {
                console.error('Failed to update last_seen_at:', error);
            }
        }
        next();
    });
};
exports.optionalAuth = optionalAuth;
const requireAdmin = async (req, res, next) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const user = await User_1.UserModel.findById(req.userId);
        req.user = user;
        if (!user?.is_admin) {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        next();
    }
    catch (error) {
        console.error('Admin check failed:', error);
        res.status(500).json({ error: 'Failed to verify admin access' });
    }
};
exports.requireAdmin = requireAdmin;
