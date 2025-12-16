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
        PORT: 3001,
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
