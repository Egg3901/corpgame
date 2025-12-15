import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
// CORS: Allow requests from frontend URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
// Extract base URL (protocol + hostname, without port)
let baseOrigin: string;
try {
  const urlObj = new URL(frontendUrl);
  baseOrigin = `${urlObj.protocol}//${urlObj.hostname}`;
} catch (error) {
  console.error('Invalid FRONTEND_URL in environment:', frontendUrl);
  baseOrigin = 'http://localhost';
}

// Log CORS configuration for debugging
console.log(`CORS Configuration:`);
console.log(`  FRONTEND_URL: ${frontendUrl}`);
console.log(`  Base Origin (any port): ${baseOrigin}`);
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
      
      if (originBase === baseOrigin || origin === frontendUrl) {
        console.log(`CORS: Allowed - origin matches base`);
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        // In development, allow localhost
        console.log(`CORS: Allowed - localhost in development`);
        callback(null, true);
      } else {
        console.log(`CORS: Blocked - origin does not match allowed origins`);
        callback(new Error(`Not allowed by CORS. Origin: ${origin}, Allowed base: ${baseOrigin}`));
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
});

