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
const urlObj = new URL(frontendUrl);
const baseOrigin = `${urlObj.protocol}//${urlObj.hostname}`;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow if origin matches base (any port is acceptable)
    const originUrl = new URL(origin);
    const originBase = `${originUrl.protocol}//${originUrl.hostname}`;
    
    if (originBase === baseOrigin || origin === frontendUrl) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      // In development, allow localhost
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
console.log(`CORS enabled for origin base: ${baseOrigin} (any port)`);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible at http://localhost:${PORT} and from external IPs`);
});

