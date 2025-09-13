#!/bin/bash
# JurisGuide Platform Deployment Script for Linux/macOS
# This script starts the complete platform with all services

echo "🚀 Deploying JurisGuide Platform..."

# Check if setup was run
if [ ! -d "server/node_modules" ]; then
    echo "❌ Dependencies not installed. Run setup first:"
    echo "   npm install (in both server and client directories)"
    exit 1
fi

# Start PostgreSQL (if Docker is available)
echo "🐘 Starting PostgreSQL database..."
if command -v docker &> /dev/null; then
    docker run -d --name jurisguide-postgres \
        -e POSTGRES_DB=jurisguide_prod \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=jurisguide_secure_password_2024 \
        -p 5432:5432 \
        postgres:15-alpine
    echo "✅ PostgreSQL started on port 5432"
else
    echo "⚠️ Docker not found. Make sure you have a PostgreSQL instance running."
fi

# Start Redis (if Docker is available)
echo "🔴 Starting Redis cache..."
if command -v docker &> /dev/null; then
    docker run -d --name jurisguide-redis \
        -p 6379:6379 \
        redis:7-alpine redis-server --requirepass redis_secure_password_2024
    echo "✅ Redis started on port 6379"
else
    echo "⚠️ Docker not found. Some features may not work."
fi

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 5

# Run database migrations
echo "🔄 Running database migrations..."
cd server
npm run migrate || echo "⚠️ Database migrations failed. Check your database connection."
cd ..

# Start the server
echo "🖥️ Starting JurisGuide server..."
cd server
npm start &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 3

echo ""
echo "🎉 JurisGuide Platform is running!"
echo ""
echo "📊 Access points:"
echo "   • Main Application: http://localhost:5000"
echo "   • API Health Check: http://localhost:5000/api/health"
echo "   • API Documentation: http://localhost:5000/api"
echo ""
echo "🔧 Admin Features:"
echo "   • Analytics Dashboard: http://localhost:5000/api/analytics/dashboard"
echo "   • Metrics: http://localhost:5000/metrics"
echo ""
echo "🛠️ Development:"
echo "   • Server logs: Check the terminal"
echo "   • Database: PostgreSQL on localhost:5432"
echo "   • Cache: Redis on localhost:6379"
echo ""
echo "🔑 Default credentials:"
echo "   • Database: postgres/jurisguide_secure_password_2024"
echo "   • Redis: redis_secure_password_2024"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo "🛑 Stopping services..."
    kill $SERVER_PID 2>/dev/null
    docker stop jurisguide-postgres jurisguide-redis 2>/dev/null
    docker rm jurisguide-postgres jurisguide-redis 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
while true; do
    sleep 1
done