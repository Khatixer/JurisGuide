module.exports = {
  apps: [
    {
      name: 'jurisguide-platform',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Environment-specific overrides
      ...(process.env.NODE_ENV === 'production' && {
        node_args: '--max-old-space-size=2048',
        merge_logs: true,
        combine_logs: true,
      }),
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/jurisguide-platform.git',
      path: '/var/www/jurisguide-platform',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/jurisguide-platform.git',
      path: '/var/www/jurisguide-platform-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
}