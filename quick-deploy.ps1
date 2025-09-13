# Quick JurisGuide Platform Deployment

Write-Host "Starting JurisGuide Platform Deployment..." -ForegroundColor Blue

# Check Docker
try {
    docker --version | Out-Null
    Write-Host "Docker is available" -ForegroundColor Green
} catch {
    Write-Host "Docker is not available. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build client
Write-Host "Building client..." -ForegroundColor Yellow
Set-Location client
npm run build
Set-Location ..

# Build server
Write-Host "Building server..." -ForegroundColor Yellow
Set-Location server
npm run build
Set-Location ..

# Start with Docker Compose
Write-Host "Starting services with Docker Compose..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d --build

Write-Host "Deployment started! Services are starting up..." -ForegroundColor Green
Write-Host "Main Application will be available at: http://localhost" -ForegroundColor Cyan
Write-Host "Health Check: http://localhost/health" -ForegroundColor Cyan
Write-Host "Grafana Dashboard: http://localhost:3001" -ForegroundColor Cyan