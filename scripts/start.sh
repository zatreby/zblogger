#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to load environment variables from .env file
load_env() {
    if [ -f "$1" ]; then
        export $(cat "$1" | grep -v '^#' | xargs)
        return 0
    fi
    return 1
}

# Determine the project root (works whether script is run from root or scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [[ "$SCRIPT_DIR" == */scripts ]]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi

# Ensure we're in the project root for consistent paths
cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Zlogg Blog - Starting Servers               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

echo -e "${YELLOW}Running pre-flight checks...${NC}"

# Check if required commands exist
if ! command_exists php; then
    echo -e "${RED}✗ PHP is not installed. Please run ./scripts/install.sh first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PHP found: $(php -v | head -n 1 | cut -d' ' -f2)${NC}"

if ! command_exists pnpm; then
    echo -e "${RED}✗ pnpm is not installed. Please run ./scripts/install.sh first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pnpm found: $(pnpm -v)${NC}"

# Check if backend and frontend directories exist
if [ ! -d "backend" ]; then
    echo -e "${RED}✗ backend/ directory not found in $PROJECT_ROOT${NC}"
    exit 1
fi
echo -e "${GREEN}✓ backend/ directory found${NC}"

if [ ! -d "frontend" ]; then
    echo -e "${RED}✗ frontend/ directory not found in $PROJECT_ROOT${NC}"
    exit 1
fi
echo -e "${GREEN}✓ frontend/ directory found${NC}"

# Check if backend.php exists
if [ ! -f "backend/backend.php" ]; then
    echo -e "${RED}✗ backend/backend.php not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ backend.php found${NC}"

# Check if database exists
if [ ! -f "backend/blog.db" ]; then
    echo -e "${YELLOW}⚠ Database not found. Run ./scripts/install.sh first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database found${NC}"

# Check if ports are already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}✗ Port 8000 is already in use${NC}"
    echo -e "${YELLOW}  Kill the process or use ./scripts/stop.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Port 8000 is available${NC}"

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}✗ Port 3000 is already in use${NC}"
    echo -e "${YELLOW}  Kill the process or use ./scripts/stop.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Port 3000 is available${NC}"

echo ""

# ============================================================================
# ADMIN PASSWORD INPUT
# ============================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Admin Authentication${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Try to load password from .env file first
ADMIN_PASSWORD=""
if load_env "backend/.env" && [ -n "$ADMIN_PASSWORD" ]; then
    echo -e "${GREEN}✓ Found admin password in backend/.env${NC}"
    echo -e "${BLUE}Using saved password from configuration${NC}"
else
    echo -e "${YELLOW}⚠ No password found in backend/.env${NC}"
    echo ""
    echo -e "${BLUE}Please enter the admin password:${NC}"
    echo -e "${YELLOW}(This will be used for /admin login)${NC}"
    read -s -p "Password: " ADMIN_PASSWORD
    echo ""
    
    if [ -z "$ADMIN_PASSWORD" ]; then
        echo -e "${RED}✗ Password cannot be empty${NC}"
        exit 1
    fi
    
    if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
        echo -e "${RED}✗ Password must be at least 6 characters${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Password accepted${NC}"
    
    # Ask if user wants to save the password
    echo ""
    read -p "Save this password to backend/.env? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" > backend/.env
        chmod 600 backend/.env
        echo -e "${GREEN}✓ Password saved to backend/.env${NC}"
        echo -e "${YELLOW}  (Next time, it will load automatically)${NC}"
    else
        echo -e "${YELLOW}⚠ Password not saved (will prompt again next time)${NC}"
    fi
fi

# Export the password for PHP to use
export ADMIN_PASSWORD

echo ""

# ============================================================================
# CREATE LOGS DIRECTORY
# ============================================================================

mkdir -p logs

# ============================================================================
# START SERVERS
# ============================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Starting Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Clear any existing .pids file
if [ -f ".pids" ]; then
    rm .pids
fi

# Start PHP server in the background
echo -e "${YELLOW}Starting PHP backend server...${NC}"
cd backend

php -S localhost:8000 backend.php > ../logs/backend.log 2>&1 &
PHP_PID=$!

# Wait a moment and check if PHP started successfully
sleep 2
if ! ps -p $PHP_PID > /dev/null; then
    echo -e "${RED}✗ Failed to start PHP server${NC}"
    echo -e "${YELLOW}Check logs/backend.log for details${NC}"
    cat ../logs/backend.log
    exit 1
fi

echo $PHP_PID > ../.pids
echo -e "${GREEN}✓ Backend server started (PID: $PHP_PID)${NC}"
echo -e "${GREEN}  → http://localhost:8000${NC}"
cd "$PROJECT_ROOT"

# Start Next.js dev server in the background
echo -e "${YELLOW}Starting Next.js frontend server...${NC}"
cd frontend
pnpm run dev > ../logs/frontend.log 2>&1 &
DEV_PID=$!

# Wait a moment and check if Next.js started successfully
sleep 3
if ! ps -p $DEV_PID > /dev/null; then
    echo -e "${RED}✗ Failed to start Next.js server${NC}"
    echo -e "${YELLOW}Check logs/frontend.log for details${NC}"
    # Clean up PHP process
    kill $PHP_PID 2>/dev/null
    exit 1
fi

echo $DEV_PID >> ../.pids
echo -e "${GREEN}✓ Frontend server started (PID: $DEV_PID)${NC}"
echo -e "${GREEN}  → http://localhost:3000${NC}"
cd "$PROJECT_ROOT"

echo ""

# ============================================================================
# SUCCESS MESSAGE
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Servers Started Successfully! 🚀             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access your application:${NC}"
echo ""
echo -e "  ${GREEN}Blog (Public):${NC}        http://localhost:3000"
echo -e "  ${GREEN}Admin Panel:${NC}          http://localhost:3000/admin"
echo -e "  ${GREEN}Backend API:${NC}          http://localhost:8000/api"
echo ""
echo -e "${BLUE}Admin Login:${NC}"
echo -e "  Use the password you just entered"
echo ""
echo -e "${BLUE}Management:${NC}"
echo ""
echo -e "  ${YELLOW}View Logs:${NC}            tail -f logs/backend.log"
echo -e "                        tail -f logs/frontend.log"
echo -e "  ${YELLOW}Stop Servers:${NC}         ./scripts/stop.sh"
echo -e "  ${YELLOW}Public Access:${NC}        ./scripts/tunnel.sh"
echo ""
echo -e "${BLUE}PIDs saved to .pids file${NC}"
echo ""

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ -f .pids ]; then
        while read pid; do
            if ps -p $pid > /dev/null 2>&1; then
                kill $pid 2>/dev/null
            fi
        done < .pids
        rm .pids
    fi
    echo -e "${GREEN}Servers stopped${NC}"
}

# Set trap to cleanup on script termination
trap cleanup EXIT INT TERM

# Keep script running and monitor processes
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for both processes
wait $PHP_PID $DEV_PID