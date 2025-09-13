#!/usr/bin/env pwsh

# JurisGuide Platform Startup Script
Write-Host "🚀 Starting JurisGuide Platform..." -ForegroundColor Green
Write-Host ""

# Kill any existing node processes
Write-Host "🛑 Stopping any existing servers..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe 2>$null
    Start-Sleep -Seconds 2
} catch {
    # No existing processes to kill
}

# Build the client
Write-Host "🔨 Building client application..." -ForegroundColor Blue
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Client build failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Start the server
Write-Host "🌟 Starting JurisGuide server..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "start-simple.js" -WindowStyle Hidden

# Wait a moment for server to start
Start-Sleep -Seconds 3

# Check if server is running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
    }
} catch {
    # Server not responding
}

if ($serverRunning) {
    Write-Host ""
    Write-Host "✅ JurisGuide Platform is now running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Application URL: http://localhost:5000" -ForegroundColor Cyan
    Write-Host "🔍 Health Check: http://localhost:5000/api/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 Available Features:" -ForegroundColor White
    Write-Host "   • AI Legal Guidance System" -ForegroundColor Gray
    Write-Host "   • Smart Lawyer Matching" -ForegroundColor Gray
    Write-Host "   • AI-Powered Mediation" -ForegroundColor Gray
    Write-Host "   • Multi-language Support" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    # Open browser
    try {
        Start-Process "http://localhost:5000"
    } catch {
        Write-Host "Could not open browser automatically. Please visit http://localhost:5000" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to start JurisGuide Platform!" -ForegroundColor Red
    Write-Host "Please check the console for errors." -ForegroundColor Yellow
}