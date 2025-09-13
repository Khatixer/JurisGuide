# JurisGuide Platform Vercel Deployment Script for Windows

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = ""
)

Write-Host "🚀 Deploying JurisGuide Platform to Vercel..." -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Environment selection if not provided
if (-not $Environment) {
    Write-Host ""
    Write-Host "Available environments:" -ForegroundColor Cyan
    Write-Host "  1. development" -ForegroundColor White
    Write-Host "  2. staging" -ForegroundColor White
    Write-Host "  3. production" -ForegroundColor White
    Write-Host ""
    
    do {
        $choice = Read-Host "Select environment (1-3)"
        switch ($choice) {
            "1" { $Environment = "development"; break }
            "2" { $Environment = "staging"; break }
            "3" { $Environment = "production"; break }
            default { Write-Host "Invalid choice. Please select 1, 2, or 3." -ForegroundColor Red }
        }
    } while (-not $Environment)
}

switch ($Environment) {
    "development" {
        Write-Host "🔧 Deploying to development environment..." -ForegroundColor Blue
        vercel --env .env.local
    }
    "staging" {
        Write-Host "🧪 Deploying to staging environment..." -ForegroundColor Yellow
        vercel --prod --env .env.staging
    }
    "production" {
        Write-Host "🏭 Deploying to production environment..." -ForegroundColor Red
        
        # Confirm production deployment
        $confirm = Read-Host "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "❌ Production deployment cancelled." -ForegroundColor Red
            exit 1
        }
        
        # Run pre-deployment checks
        Write-Host "🔍 Running pre-deployment checks..." -ForegroundColor Blue
        
        try {
            # Type checking
            Write-Host "  - Type checking..." -ForegroundColor Gray
            npm run type-check
            
            # Linting
            Write-Host "  - Linting..." -ForegroundColor Gray
            npm run lint
            
            # Format checking
            Write-Host "  - Format checking..." -ForegroundColor Gray
            npm run format:check
            
            Write-Host "✅ Pre-deployment checks passed!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Pre-deployment checks failed. Please fix issues before deploying." -ForegroundColor Red
            exit 1
        }
        
        # Deploy to production
        vercel --prod --env .env.production
    }
}

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify the deployment at the provided URL" -ForegroundColor White
Write-Host "  2. Test critical functionality (auth, AI features)" -ForegroundColor White
Write-Host "  3. Monitor error tracking and performance" -ForegroundColor White
Write-Host "  4. Update DNS records if needed (production only)" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "  vercel logs - View deployment logs" -ForegroundColor White
Write-Host "  vercel domains - Manage custom domains" -ForegroundColor White
Write-Host "  vercel env - Manage environment variables" -ForegroundColor White