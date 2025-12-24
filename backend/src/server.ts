import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';
import avatarRoutes from './routes/avatar';
import corporationRoutes from './routes/corporation';
import portfolioRoutes from './routes/portfolio';
import sharesRoutes from './routes/shares';
import issuesRoutes from './routes/issues';
import messagesRoutes from './routes/messages';
import cashRoutes from './routes/cash';
import boardRoutes from './routes/board';
import marketsRoutes from './routes/markets';
import { startActionsCron } from './cron/actions';

// Load .env from the backend directory explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const uploadsDir = path.join(__dirname, '..', 'uploads');
const corporationsDir = path.join(uploadsDir, 'corporations');
console.log('Uploads directory path:', uploadsDir);
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(corporationsDir, { recursive: true });

// Middleware
// CORS: Allow requests from frontend URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
// Extract base URL (protocol + hostname, without port)
let baseOrigin: string;
let allowedOrigins: string[] = [];
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
      } catch {
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
} catch (error) {
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
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
        if (origin === allowed) return true;
        // Base match (protocol + hostname)
        if (originBase === allowed) return true;
        // Allow if origin starts with allowed base (for ports)
        if (origin.startsWith(allowed + ':')) return true;
        // Allow if allowed starts with origin base (for subdomains)
        if (allowed.startsWith(originBase)) return true;
        return false;
      });
      
      if (isAllowed) {
        console.log(`CORS: Allowed - origin matches allowed origins`);
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        // In development, allow localhost
        console.log(`CORS: Allowed - localhost in development`);
        callback(null, true);
      } else {
        console.log(`CORS: Blocked - origin does not match allowed origins`);
        console.log(`  Requested: ${originBase}`);
        console.log(`  Allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error(`Not allowed by CORS. Origin: ${origin}, Allowed bases: ${allowedOrigins.join(', ')}`));
      }
    } catch (error) {
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

app.use(cors(corsOptions));

// Explicit OPTIONS handler as fallback (though cors middleware should handle this)
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
const commonAssetsDir = path.join(__dirname, '..', '..', '..', 'commonassets');
const commonAssetsDirAlt = path.join(__dirname, '..', '..', '..', '..', 'commonassets'); // Alternative path for production

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
}, express.static(finalCommonAssetsDir));

app.use('/uploads', (req, res, next) => {
  console.log('Request for uploads:', req.path);
  next();
}, express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/profile', avatarRoutes); // Mount avatar routes first to avoid conflict with profile catch-all
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/corporation', corporationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/markets', marketsRoutes);

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
  startActionsCron();
});
