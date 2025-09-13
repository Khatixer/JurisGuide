#!/bin/bash
# JurisGuide Platform Vercel Deployment Script

set -e

echo "🚀 Deploying JurisGuide Platform to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Environment selection
read -p "Deploy to which environment? (development/staging/production): " ENVIRONMENT

case $ENVIRONMENT in
    "development")
        echo "🔧 Deploying to development environment..."
        vercel --env .env.local
        ;;
    "staging")
        echo "🧪 Deploying to staging environment..."
        vercel --prod --env .env.staging
        ;;
    "production")
        echo "🏭 Deploying to production environment..."
        
        # Confirm production deployment
        read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            echo "❌ Production deployment cancelled."
            exit 1
        fi
        
        # Run pre-deployment checks
        echo "🔍 Running pre-deployment checks..."
        
        # Type checking
        echo "  - Type checking..."
        npm run type-check
        
        # Linting
        echo "  - Linting..."
        npm run lint
        
        # Format checking
        echo "  - Format checking..."
        npm run format:check
        
        echo "✅ Pre-deployment checks passed!"
        
        # Deploy to production
        vercel --prod --env .env.production
        ;;
    *)
        echo "❌ Invalid environment. Please choose development, staging, or production."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Verify the deployment at the provided URL"
echo "  2. Test critical functionality (auth, AI features)"
echo "  3. Monitor error tracking and performance"
echo "  4. Update DNS records if needed (production only)"
echo ""
echo "🔗 Useful commands:"
echo "  vercel logs - View deployment logs"
echo "  vercel domains - Manage custom domains"
echo "  vercel env - Manage environment variables"