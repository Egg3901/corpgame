const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const logsDir = path.join(__dirname, 'logs');

const commonWatchIgnore = ['node_modules', 'dist', '.next', logsDir];

module.exports = {
  apps: [
    {
      name: 'corpgame-backend',
      cwd: './backend',
      script: isProduction ? 'node' : 'npm',
      args: isProduction ? 'dist/server.js' : 'run dev',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3001,
        // Load from .env file or system environment
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        REGISTRATION_SECRET: process.env.REGISTRATION_SECRET,
        ADMIN_SECRET: process.env.ADMIN_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        PGSSLROOTCERT: process.env.PGSSLROOTCERT,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GITHUB_USER: process.env.GITHUB_USER,
        GITHUB_REPO: process.env.GITHUB_REPO,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      ignore_watch: commonWatchIgnore,
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'corpgame-frontend',
      cwd: './frontend',
      script: 'npm',
      args: isProduction ? 'start' : 'run dev',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
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


