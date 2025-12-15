module.exports = {
  apps: [
    {
      name: 'corpgame-backend',
      cwd: './backend',
      script: process.env.NODE_ENV === 'production' ? 'npm' : 'npm',
      args: process.env.NODE_ENV === 'production' ? 'start' : 'run dev',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: 3001,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: process.env.NODE_ENV !== 'production',
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'corpgame-frontend',
      cwd: './frontend',
      script: 'npm',
      args: process.env.NODE_ENV === 'production' ? 'start' : 'run dev',
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
      watch: process.env.NODE_ENV !== 'production',
      max_memory_restart: '1G',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};

