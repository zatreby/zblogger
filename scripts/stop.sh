#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine the project root (works whether script is run from root or scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [[ "$SCRIPT_DIR" == */scripts ]]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi

# Ensure we're in the project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Zlogg Blog - Stopping Servers               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# STOP SERVERS FROM .pids FILE
# ============================================================================

STOPPED_COUNT=0

# Check if .pids file exists
if [ -f .pids ]; then
    echo -e "${YELLOW}Stopping processes from .pids file...${NC}"
    
    # Read PIDs from .pids file
    readarray -t PIDS < .pids
    
    # Check if PIDs array is empty
    if [ ${#PIDS[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠ .pids file is empty${NC}"
    else
        # Attempt to stop each process
        for PID in "${PIDS[@]}"; do
            # Skip empty lines
            if [ -z "$PID" ]; then
                continue
            fi
            
            if ps -p "$PID" > /dev/null 2>&1; then
                # Get process name for better logging
                PNAME=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
                
                kill "$PID" 2>/dev/null
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✓ Stopped $PNAME (PID: $PID)${NC}"
                    ((STOPPED_COUNT++))
                    
                    # Wait for process to actually stop
                    sleep 1
                    if ps -p "$PID" > /dev/null 2>&1; then
                        echo -e "${YELLOW}  Process still running, force killing...${NC}"
                        kill -9 "$PID" 2>/dev/null
                    fi
                else
                    echo -e "${RED}✗ Failed to stop process (PID: $PID)${NC}"
                fi
            else
                echo -e "${YELLOW}⚠ Process $PID is not running${NC}"
            fi
        done
    fi
    
    # Clean up .pids file
    rm -f .pids
    echo -e "${GREEN}✓ Cleaned up .pids file${NC}"
else
    echo -e "${YELLOW}⚠ No .pids file found${NC}"
fi

echo ""

# ============================================================================
# CLEAN UP STRAY PROCESSES ON PORTS 3000 AND 8000
# ============================================================================

echo -e "${YELLOW}Checking for processes on ports 3000 and 8000...${NC}"

# Function to kill process on a specific port
kill_port() {
    local PORT=$1
    
    # Use lsof to find process on port
    if command -v lsof >/dev/null 2>&1; then
        local PID=$(lsof -ti:$PORT 2>/dev/null)
        
        if [ -n "$PID" ]; then
            local PNAME=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
            echo -e "${YELLOW}Found process on port $PORT: $PNAME (PID: $PID)${NC}"
            kill "$PID" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Stopped process on port $PORT${NC}"
                ((STOPPED_COUNT++))
                sleep 1
                # Force kill if still running
                if ps -p "$PID" > /dev/null 2>&1; then
                    kill -9 "$PID" 2>/dev/null
                    echo -e "${GREEN}✓ Force killed process on port $PORT${NC}"
                fi
            else
                echo -e "${RED}✗ Failed to stop process on port $PORT${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠ lsof not available, skipping port check${NC}"
        return
    fi
}

# Kill processes on ports 8000 (backend) and 3000 (frontend)
kill_port 8000
kill_port 3000

echo ""

# ============================================================================
# CLEAN UP ANY REMAINING PHP AND NODE PROCESSES
# ============================================================================

echo -e "${YELLOW}Checking for stray PHP and Node.js processes...${NC}"

FOUND_STRAY=false

# Kill PHP processes serving on port 8000
PHP_PIDS=$(ps aux | grep "[p]hp -S localhost:8000" | awk '{print $2}')
if [ -n "$PHP_PIDS" ]; then
    FOUND_STRAY=true
    echo -e "${YELLOW}Found PHP server processes${NC}"
    for PID in $PHP_PIDS; do
        kill "$PID" 2>/dev/null
        echo -e "${GREEN}✓ Stopped PHP process (PID: $PID)${NC}"
        ((STOPPED_COUNT++))
    done
fi

# Kill Next.js dev server processes
NODE_PIDS=$(ps aux | grep "[n]ext dev" | awk '{print $2}')
if [ -n "$NODE_PIDS" ]; then
    FOUND_STRAY=true
    echo -e "${YELLOW}Found Next.js dev server processes${NC}"
    for PID in $NODE_PIDS; do
        kill "$PID" 2>/dev/null
        echo -e "${GREEN}✓ Stopped Next.js process (PID: $PID)${NC}"
        ((STOPPED_COUNT++))
    done
fi

if [ "$FOUND_STRAY" = false ]; then
    echo -e "${GREEN}✓ No stray processes found${NC}"
fi

echo ""

# ============================================================================
# VERIFY PORTS ARE FREE
# ============================================================================

echo -e "${YELLOW}Verifying ports are free...${NC}"

sleep 2

PORT_8000_FREE=true
PORT_3000_FREE=true

if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}✗ Port 8000 is still in use${NC}"
        PORT_8000_FREE=false
    else
        echo -e "${GREEN}✓ Port 8000 is free${NC}"
    fi

    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}✗ Port 3000 is still in use${NC}"
        PORT_3000_FREE=false
    else
        echo -e "${GREEN}✓ Port 3000 is free${NC}"
    fi
else
    echo -e "${YELLOW}⚠ lsof not available, cannot verify ports${NC}"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
if [ $STOPPED_COUNT -eq 0 ]; then
    echo -e "${GREEN}║         No Running Processes Found                     ║${NC}"
else
    echo -e "${GREEN}║         Stopped $STOPPED_COUNT Process(es) Successfully            ║${NC}"
fi
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

if [ "$PORT_8000_FREE" = false ] || [ "$PORT_3000_FREE" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠ Warning: Some ports are still in use${NC}"
    echo -e "${YELLOW}  You may need to:${NC}"
    echo -e "  ${BLUE}1.${NC} Manually kill processes: ${GREEN}lsof -ti:8000 | xargs kill -9${NC}"
    echo -e "  ${BLUE}2.${NC} Check what's using the port: ${GREEN}lsof -i :8000${NC}"
    echo -e "  ${BLUE}3.${NC} Restart your system if issues persist${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}All servers stopped. Ready to restart with:${NC}"
echo -e "  ${GREEN}./scripts/start.sh${NC}"
echo ""