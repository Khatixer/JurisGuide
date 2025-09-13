# JurisGuide Platform Deployment Guide

This guide covers deployment options and configurations for the JurisGuide Platform.

## Environment Configuration

### Development Environment
- File: `.env.local`
- Purpose: Local development with relaxed security and debugging enabled
- Features: Debug mode, relaxed rate limiting, detailed logging

### Staging Environment
- File: `.env.staging`
- Purpose: Pre-production testing with production-like settings
- Features: Production security, performance monitoring, staging analytics

### Production Environment
- File: `.env.production`
- Purpose: Live production deployment
- Features: Strict security, optimized performance, comprehensive monitoring

## Deployment Options

### 1. Vercel Deployment (Recommended)

#### Prerequisites
```bash
npm install -g vercel
```

#### Quick Deployment
```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Production (with pre-deployment checks)
npm run deploy:prod
```

#### Manual Deployment
```bash
# Using PowerShell (Windows)
.\deploy-vercel.ps1 -Environment production

# Using Bash (Linux/macOS)
./deploy-vercel.sh
```

#### Environment Variables Setup
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add the following variables for each environment:

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

**Optional Variables:**
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
- `RATE_LIMIT_REQUESTS_PER_MINUTE`

### 2. Docker Deployment

#### Build and Run
```bash
# Build the Docker image
docker build -t jurisguide-platform .

# Run the container
docker run -p 3000:3000 --env-file .env.production jurisguide-platform
```

#### Docker Compose (with services)
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### 3. Traditional Server Deployment

#### Prerequisites
- Node.js 18+
- PM2 (for process management)

#### Setup
```bash
# Install PM2 globally
npm install -g pm2

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## Security Configuration

### Environment Variables Security
- Never commit `.env` files to version control
- Use different keys for each environment
- Rotate secrets regularly
- Use strong, randomly generated secrets (minimum 32 characters)

### Security Headers
The application automatically applies security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`
- `Strict-Transport-Security` (production only)
- Content Security Policy (CSP)

### Rate Limiting
- API endpoints: 60 requests/minute (configurable)
- Auth endpoints: 5 requests/minute
- AI endpoints: 10 requests/minute

## Monitoring and Logging

### Health Checks
- Endpoint: `/api/health`
- Monitors: Application status, Supabase connectivity, Gemini API status
- Response includes: uptime, memory usage, service status

### Performance Monitoring
- Automatic API response time tracking
- Slow operation detection (>5 seconds)
- Memory usage monitoring
- Error rate tracking

### Logging Levels
- **Development**: `debug` - Detailed logging for debugging
- **Staging**: `info` - Standard operational logging
- **Production**: `warn` - Only warnings and errors

### Error Tracking
Configure Sentry for production error tracking:
1. Set `NEXT_PUBLIC_SENTRY_DSN` environment variable
2. Errors are automatically captured and sent to Sentry
3. Performance monitoring included

## Database Setup

### Supabase Configuration
1. Create a new Supabase project
2. Run the database schema from `supabase-schema-updated.sql`
3. Enable Realtime on the `messages` table
4. Configure Row Level Security (RLS) policies
5. Set up authentication providers as needed

### Environment-Specific Databases
- **Development**: Use Supabase development project
- **Staging**: Use separate Supabase staging project
- **Production**: Use dedicated Supabase production project

## Performance Optimization

### Build Optimization
- Turbopack enabled for faster builds
- Bundle splitting for vendor libraries
- Image optimization with WebP/AVIF support
- Compression enabled

### Runtime Optimization
- Standalone output for Docker deployments
- Memory usage monitoring
- Response time tracking
- Automatic performance alerts

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear Next.js cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

#### Environment Variable Issues
```bash
# Verify environment variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Check for missing variables
npm run pre-deploy
```

#### Performance Issues
```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Monitor logs
tail -f logs/application.log

# Check memory usage
node -e "console.log(process.memoryUsage())"
```

### Deployment Checklist

#### Pre-Deployment
- [ ] Run `npm run pre-deploy` successfully
- [ ] Verify all environment variables are set
- [ ] Test critical functionality locally
- [ ] Check database migrations are applied
- [ ] Verify external API keys are valid

#### Post-Deployment
- [ ] Verify health check endpoint responds
- [ ] Test user authentication flow
- [ ] Test AI guidance functionality
- [ ] Test mediation system
- [ ] Check error tracking is working
- [ ] Verify performance monitoring
- [ ] Test rate limiting

#### Production-Specific
- [ ] SSL certificate is valid
- [ ] Custom domain is configured
- [ ] CDN is properly configured (if applicable)
- [ ] Backup systems are in place
- [ ] Monitoring alerts are configured
- [ ] Security headers are applied

## Support

For deployment issues:
1. Check the health endpoint: `/api/health`
2. Review application logs
3. Verify environment configuration
4. Check external service status (Supabase, Gemini API)
5. Monitor performance metrics

## Scaling Considerations

### Horizontal Scaling
- Stateless application design allows multiple instances
- Use load balancer for traffic distribution
- Configure session affinity if needed

### Database Scaling
- Supabase handles database scaling automatically
- Consider read replicas for high-traffic scenarios
- Monitor connection pool usage

### CDN Integration
- Configure CDN for static assets
- Set appropriate cache headers
- Use edge functions for global performance