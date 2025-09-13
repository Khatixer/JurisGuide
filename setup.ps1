# JurisGuide Platform Setup Script for Windows
# This script sets up the development environment and starts the platform

Write-Host "🚀 Setting up JurisGuide Platform..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Docker not found. Some features may not work." -ForegroundColor Yellow
}

# Create necessary directories
Write-Host "📁 Creating directories..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "logs"
New-Item -ItemType Directory -Force -Path "uploads"
New-Item -ItemType Directory -Force -Path "nginx/ssl"
New-Item -ItemType Directory -Force -Path "postgres"
New-Item -ItemType Directory -Force -Path "redis"

# Install server dependencies
Write-Host "📦 Installing server dependencies..." -ForegroundColor Blue
Set-Location server
npm install
Set-Location ..

# Install client dependencies
Write-Host "📦 Installing client dependencies..." -ForegroundColor Blue
Set-Location client
npm install
Set-Location ..

# Build client for production
Write-Host "🔨 Building client application..." -ForegroundColor Blue
Set-Location client
npm run build
Set-Location ..

# Build server TypeScript
Write-Host "🔨 Building server application..." -ForegroundColor Blue
Set-Location server
npm run build
Set-Location ..

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "🎯 Run 'deploy.ps1' to start the platform" -ForegroundColor Cyan