"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = __importDefault(require("./routes/auth"));
const game_1 = __importDefault(require("./routes/game"));
const profile_1 = __importDefault(require("./routes/profile"));
const admin_1 = __importDefault(require("./routes/admin"));
const avatar_1 = __importDefault(require("./routes/avatar"));
const corporation_1 = __importDefault(require("./routes/corporation"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const shares_1 = __importDefault(require("./routes/shares"));
const issues_1 = __importDefault(require("./routes/issues"));
const messages_1 = __importDefault(require("./routes/messages"));
const cash_1 = __importDefault(require("./routes/cash"));
const board_1 = __importDefault(require("./routes/board"));
const markets_1 = __importDefault(require("./routes/markets"));
const corporateActions_1 = __importDefault(require("./routes/corporateActions"));
const sectorConfig_1 = __importDefault(require("./routes/sectorConfig"));
const actions_1 = require("./cron/actions");
// Load .env from multiple possible locations
const possibleEnvPaths = [
    path_1.default.join(__dirname, '..', '.env'), // backend/.env (when running from dist/)
    path_1.default.join(process.cwd(), '.env'), // Current working directory
    path_1.default.join(process.cwd(), 'backend', '.env'), // backend/.env from project root
];
let envLoaded = false;
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        console.log('Loading .env from:', envPath);
        const envResult = dotenv_1.default.config({ path: envPath, override: false });
        if (envResult.error) {
            console.error('Error loading .env file from', envPath, ':', envResult.error);
        }
        else {
            console.log('.env file loaded successfully from:', envPath);
            envLoaded = true;
            break;
        }
    }
}
if (!envLoaded) {
    console.warn('No .env file found in any of the expected locations:', possibleEnvPaths);
    console.warn('Using environment variables from system/PM2 only');
}
// Log environment variables (without sensitive values)
console.log('Environment variables:');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('  ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || 'NOT SET');
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
const corporationsDir = path_1.default.join(uploadsDir, 'corporations');
console.log('Uploads directory path:', uploadsDir);
fs_1.default.mkdirSync(uploadsDir, { recursive: true });
fs_1.default.mkdirSync(corporationsDir, { recursive: true });
// Middleware
// CORS: Allow requests from frontend URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
// Extract base URL (protocol + hostname, without port)
let baseOrigin;
let allowedOrigins = [];
try {
    const urlObj = new URL(frontendUrl);
    baseOrigin = `${urlObj.protocol}//${urlObj.hostname}`;
    // Also parse ALLOWED_ORIGINS if set (comma-separated list)
    if (process.env.ALLOWED_ORIGINS) {
        const parsedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => {
            const trimmed = o.trim();
            try {
                const u = new URL(trimmed);
                // Return both the full origin and the base (protocol + hostname)
                return {
                    full: trimmed,
                    base: `${u.protocol}//${u.hostname}`
                };
            }
            catch {
                // If it's not a valid URL, treat it as a base origin
                return {
                    full: trimmed,
                    base: trimmed
                };
            }
        });
        // Add both full and base origins to the allowed list
        parsedOrigins.forEach(origin => {
            allowedOrigins.push(origin.full);
            allowedOrigins.push(origin.base);
        });
    }
    allowedOrigins.push(baseOrigin); // Always include FRONTEND_URL
    allowedOrigins.push(frontendUrl); // Also include full FRONTEND_URL
}
catch (error) {
    console.error('Invalid FRONTEND_URL in environment:', frontendUrl);
    baseOrigin = 'http://localhost';
    allowedOrigins = ['http://localhost'];
}
// Log CORS configuration for debugging
console.log(`CORS Configuration:`);
console.log(`  FRONTEND_URL: ${frontendUrl}`);
console.log(`  ALLOWED_ORIGINS env: ${process.env.ALLOWED_ORIGINS || 'not set'}`);
console.log(`  Base Origin (any port): ${baseOrigin}`);
console.log(`  Allowed Origins: ${allowedOrigins.join(', ')}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
// CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('CORS: Allowing request with no origin');
            return callback(null, true);
        }
        try {
            // Allow if origin matches base (any port is acceptable)
            const originUrl = new URL(origin);
            const originBase = `${originUrl.protocol}//${originUrl.hostname}`;
            // Log all CORS requests for debugging
            console.log(`CORS request from origin: ${origin} (base: ${originBase})`);
            // Check if origin matches any allowed origin (exact match or base match)
            const isAllowed = allowedOrigins.some(allowed => {
                // Exact match
                if (origin === allowed)
                    return true;
                // Base match (protocol + hostname)
                if (originBase === allowed)
                    return true;
                // Allow if origin starts with allowed base (for ports)
                if (origin.startsWith(allowed + ':'))
                    return true;
                // Allow if allowed starts with origin base (for subdomains)
                if (allowed.startsWith(originBase))
                    return true;
                return false;
            });
            if (isAllowed) {
                console.log(`CORS: Allowed - origin matches allowed origins`);
                callback(null, true);
            }
            else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
                // In development, allow localhost
                console.log(`CORS: Allowed - localhost in development`);
                callback(null, true);
            }
            else {
                console.log(`CORS: Blocked - origin does not match allowed origins`);
                console.log(`  Requested: ${originBase}`);
                console.log(`  Allowed: ${allowedOrigins.join(', ')}`);
                callback(new Error(`Not allowed by CORS. Origin: ${origin}, Allowed bases: ${allowedOrigins.join(', ')}`));
            }
        }
        catch (error) {
            console.error('CORS: Error parsing origin:', origin, error);
            callback(new Error('Invalid origin'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use((0, cors_1.default)(corsOptions));
// Explicit OPTIONS handler as fallback (though cors middleware should handle this)
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Static file serving
const commonAssetsDir = path_1.default.join(__dirname, '..', '..', '..', 'commonassets');
const commonAssetsDirAlt = path_1.default.join(__dirname, '..', '..', '..', '..', 'commonassets'); // Alternative path for production
let finalCommonAssetsDir = commonAssetsDir;
if (!require('fs').existsSync(commonAssetsDir) && require('fs').existsSync(commonAssetsDirAlt)) {
    finalCommonAssetsDir = commonAssetsDirAlt;
}
console.log('Static file directories:');
console.log('  Common assets (primary):', commonAssetsDir, '- exists:', require('fs').existsSync(commonAssetsDir));
console.log('  Common assets (fallback):', commonAssetsDirAlt, '- exists:', require('fs').existsSync(commonAssetsDirAlt));
console.log('  Using common assets dir:', finalCommonAssetsDir);
console.log('  Uploads:', uploadsDir, '- exists:', require('fs').existsSync(uploadsDir));
app.use('/commonassets', (req, res, next) => {
    console.log('Request for commonassets:', req.path);
    next();
}, express_1.default.static(finalCommonAssetsDir));
app.use('/uploads', (req, res, next) => {
    console.log('Request for uploads:', req.path);
    next();
}, express_1.default.static(uploadsDir));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/game', game_1.default);
app.use('/api/profile', avatar_1.default); // Mount avatar routes first to avoid conflict with profile catch-all
app.use('/api/profile', profile_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/corporation', corporation_1.default);
app.use('/api/portfolio', portfolio_1.default);
app.use('/api/shares', shares_1.default);
app.use('/api/issues', issues_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/cash', cash_1.default);
app.use('/api/board', board_1.default);
app.use('/api/markets', markets_1.default);
app.use('/api/corporate-actions', corporateActions_1.default);
app.use('/api/sector-config', sectorConfig_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Debug endpoint for static files
app.get('/debug/static', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const commonAssetsDir = path.join(__dirname, '..', '..', '..', 'commonassets');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const avatarsDir = path.join(uploadsDir, 'avatars');
    const corporationsDir = path.join(uploadsDir, 'corporations');
    const debug = {
        directories: {
            commonassets: {
                path: commonAssetsDir,
                exists: fs.existsSync(commonAssetsDir),
                files: fs.existsSync(commonAssetsDir) ? fs.readdirSync(commonAssetsDir) : []
            },
            uploads: {
                path: uploadsDir,
                exists: fs.existsSync(uploadsDir),
                files: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
            },
            avatars: {
                path: avatarsDir,
                exists: fs.existsSync(avatarsDir),
                files: fs.existsSync(avatarsDir) ? fs.readdirSync(avatarsDir) : []
            },
            corporations: {
                path: corporationsDir,
                exists: fs.existsSync(corporationsDir),
                files: fs.existsSync(corporationsDir) ? fs.readdirSync(corporationsDir) : []
            }
        },
        routes: {
            commonassets: '/commonassets',
            uploads: '/uploads'
        }
    };
    res.json(debug);
});
// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
    res.json({
        status: 'ok',
        message: 'CORS is working',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Accessible at http://localhost:${PORT} and from external IPs`);
    // Start cron jobs
    (0, actions_1.startActionsCron)();
});
