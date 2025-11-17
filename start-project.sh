#!/bin/bash

# Drug Verification System - Startup Script
# This script starts both backend and frontend servers for development

echo "🚀 Starting Drug Verification System..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        echo "   You may need to stop other processes or use different ports"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check required ports
echo "🔍 Checking ports..."
check_port 3001
check_port 3000
echo ""

# Navigate to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Project directory: $PWD"
echo ""

# Install backend dependencies if needed
echo "🔧 Setting up backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
else
    echo "   Backend dependencies already installed"
fi

# Check if simple-server.js exists
if [ ! -f "simple-server.js" ]; then
    echo "❌ simple-server.js not found in backend directory"
    exit 1
fi

echo "   ✅ Backend setup complete"
cd ..

# Install frontend dependencies if needed
echo "🔧 Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
else
    echo "   Frontend dependencies already installed"
fi
echo "   ✅ Frontend setup complete"
cd ..

echo ""
echo "🎉 Setup complete! Starting servers..."
echo "======================================"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start backend server
echo "🚀 Starting backend server on http://localhost:3001..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🚀 Starting frontend server on http://localhost:3000..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both servers are starting up..."
echo "======================================"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo "======================================"
echo ""
echo "🔐 Demo Login Credentials:"
echo "   Admin:      admin@drugverify.com / admin123"
echo "   Pharmacist: pharmacist@example.com / pharm123"
echo "   User:       user@example.com / user123"
echo ""
echo "💡 Your browser should automatically open to http://localhost:3000"
echo "   If not, click the link above or copy-paste it into your browser"
echo ""
echo "🛑 To stop the servers, press Ctrl+C"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
