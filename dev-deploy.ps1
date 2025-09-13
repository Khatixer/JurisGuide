# JurisGuide Platform Development Deployment (without Docker)

Write-Host "Starting JurisGuide Platform in Development Mode..." -ForegroundColor Blue

# Check Node.js
try {
    node --version | Out-Null
    Write-Host "Node.js is available" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not available" -ForegroundColor Red
    exit 1
}

# Create directories
Write-Host "Creating directories..." -ForegroundColor Yellow
$directories = @("logs", "uploads")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Set development environment
$env:NODE_ENV = "development"
$env:PORT = "5000"

# Build client
Write-Host "Building React client..." -ForegroundColor Yellow
Set-Location client
npm run build
Set-Location ..

# Start server
Write-Host "Starting Node.js server..." -ForegroundColor Yellow
Set-Location server

# Start the server in background
Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow

Write-Host ""
Write-Host "JurisGuide Platform Development Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Main Application: http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "  API Base: http://localhost:5000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features Available:" -ForegroundColor Yellow
Write-Host "  Legal Guidance System" -ForegroundColor White
Write-Host "  Lawyer Matching Platform" -ForegroundColor White
Write-Host "  AI-Powered Mediation" -ForegroundColor White
Write-Host "  Multi-language Support" -ForegroundColor White
Write-Host "  User Authentication" -ForegroundColor White
Write-Host "  Real-time Notifications" -ForegroundColor White
Write-Host ""
Write-Host "Note: This is running in development mode without Docker." -ForegroundColor Yellow
Write-Host "For full production deployment, install Docker Desktop and use docker-compose." -ForegroundColor Yellow