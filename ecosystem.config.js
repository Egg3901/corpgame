const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const logsDir = path.join(__dirname, 'logs');

const commonWatchIgnore = ['node_modules', '.next', logsDir];

module.exports = {
  apps: [
    {
      name: 'corpgame',
      cwd: '.',
      script: 'npm',
      args: isProduction ? 'start' : 'run dev',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      ignore_watch: commonWatchIgnore,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
