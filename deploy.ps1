# JurisGuide Platform Deployment Script for Windows
# This script starts the complete platform with all services

Write-Host "🚀 Deploying JurisGuide Platform..." -ForegroundColor Green

# Check if setup was run
if (-not (Test-Path "server/node_modules")) {
    Write-Host "❌ Dependencies not installed. Run setup.ps1 first." -ForegroundColor Red
    exit 1
}

# Start PostgreSQL (if Docker is available)
Write-Host "🐘 Starting PostgreSQL database..." -ForegroundColor Blue
try {
    docker run -d --name jurisguide-postgres `
        -e POSTGRES_DB=jurisguide_prod `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=jurisguide_secure_password_2024 `
        -p 5432:5432 `
        postgres:15-alpine
    Write-Host "✅ PostgreSQL started on port 5432" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not start PostgreSQL with Docker. Make sure you have a PostgreSQL instance running." -ForegroundColor Yellow
}

# Start Redis (if Docker is available)
Write-Host "🔴 Starting Redis cache..." -ForegroundColor Blue
try {
    docker run -d --name jurisguide-redis `
        -p 6379:6379 `
        redis:7-alpine redis-server --requirepass redis_secure_password_2024
    Write-Host "✅ Redis started on port 6379" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not start Redis with Docker. Some features may not work." -ForegroundColor Yellow
}

# Wait for databases to be ready
Write-Host "⏳ Waiting for databases to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 5

# Run database migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Blue
Set-Location server
try {
    npm run migrate
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Database migrations failed. Check your database connection." -ForegroundColor Yellow
}
Set-Location ..

# Start the server
Write-Host "🖥️ Starting JurisGuide server..." -ForegroundColor Blue
Set-Location server
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "start"
Set-Location ..

# Wait for server to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🎉 JurisGuide Platform is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access points:" -ForegroundColor Cyan
Write-Host "   • Main Application: http://localhost:5000" -ForegroundColor White
Write-Host "   • API Health Check: http://localhost:5000/api/health" -ForegroundColor White
Write-Host "   • API Documentation: http://localhost:5000/api" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Admin Features:" -ForegroundColor Cyan
Write-Host "   • Analytics Dashboard: http://localhost:5000/api/analytics/dashboard" -ForegroundColor White
Write-Host "   • Metrics: http://localhost:5000/metrics" -ForegroundColor White
Write-Host ""
Write-Host "🛠️ Development:" -ForegroundColor Cyan
Write-Host "   • Server logs: Check the terminal" -ForegroundColor White
Write-Host "   • Database: PostgreSQL on localhost:5432" -ForegroundColor White
Write-Host "   • Cache: Redis on localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Default credentials:" -ForegroundColor Yellow
Write-Host "   • Database: postgres/jurisguide_secure_password_2024" -ForegroundColor White
Write-Host "   • Redis: redis_secure_password_2024" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Red

# Keep the script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    docker stop jurisguide-postgres jurisguide-redis 2>$null
    docker rm jurisguide-postgres jurisguide-redis 2>$null
}