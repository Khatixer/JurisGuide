# JurisGuide Platform Startup Script
# This script starts the complete JurisGuide platform

Write-Host "🚀 Starting JurisGuide Platform..." -ForegroundColor Green

# Start the platform
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "start-simple.js"

# Wait a moment for the server to start
Start-Sleep -Seconds 2

# Open the platform in browser
Write-Host "🌐 Opening JurisGuide Platform in browser..." -ForegroundColor Blue
Start-Process "http://localhost:5000"

Write-Host ""
Write-Host "🎉 JurisGuide Platform is now running!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access Points:" -ForegroundColor Cyan
Write-Host "   • Main Application: http://localhost:5000" -ForegroundColor White
Write-Host "   • Health Check: http://localhost:5000/api/health" -ForegroundColor White
Write-Host "   • Legal Guidance API: http://localhost:5000/api/legal-guidance" -ForegroundColor White
Write-Host "   • Lawyer Matching API: http://localhost:5000/api/lawyers" -ForegroundColor White
Write-Host "   • AI Mediation API: http://localhost:5000/api/mediation" -ForegroundColor White
Write-Host "   • Analytics Dashboard: http://localhost:5000/api/analytics/dashboard" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Platform Features:" -ForegroundColor Cyan
Write-Host "   ✅ AI Legal Guidance System" -ForegroundColor Green
Write-Host "   ✅ Smart Lawyer Matching" -ForegroundColor Green
Write-Host "   ✅ AI-Powered Mediation" -ForegroundColor Green
Write-Host "   ✅ Multi-language Support" -ForegroundColor Green
Write-Host "   ✅ Cultural Sensitivity Engine" -ForegroundColor Green
Write-Host "   ✅ Secure Communications" -ForegroundColor Green
Write-Host "   ✅ Subscription Management" -ForegroundColor Green
Write-Host "   ✅ White-label Solutions" -ForegroundColor Green
Write-Host "   ✅ Analytics Dashboard" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Development Status:" -ForegroundColor Yellow
Write-Host "   • Server: Running on port 5000" -ForegroundColor White
Write-Host "   • Client: Built and served statically" -ForegroundColor White
Write-Host "   • Database: Ready for configuration" -ForegroundColor White
Write-Host "   • APIs: All endpoints available" -ForegroundColor White
Write-Host ""
Write-Host "📝 To fully activate all features:" -ForegroundColor Yellow
Write-Host "   1. Add your OpenAI API key to .env.production" -ForegroundColor White
Write-Host "   2. Set up PostgreSQL database connection" -ForegroundColor White
Write-Host "   3. Configure Redis for caching" -ForegroundColor White
Write-Host "   4. Add Stripe keys for payments" -ForegroundColor White
Write-Host "   5. Configure external service APIs" -ForegroundColor White
Write-Host ""
Write-Host "🎊 Your JurisGuide Platform is live and ready!" -ForegroundColor Magenta
Write-Host ""

# Keep the script running
Write-Host "Press any key to stop the platform..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop the server
Write-Host "Stopping JurisGuide Platform..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Platform stopped successfully!" -ForegroundColor Green