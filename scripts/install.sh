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

# Function to generate secure random password
generate_password() {
    if command_exists openssl; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Zlogg Blog - Installation Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS=$(uname -s)
case "$OS" in
    Linux*)     OS_TYPE=Linux;;
    Darwin*)    OS_TYPE=Mac;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*) OS_TYPE=Windows;;
    *)          echo -e "${RED}Unsupported OS: $OS${NC}"; exit 1;;
esac
echo -e "${GREEN}✓ Detected OS: $OS_TYPE${NC}"

# Determine project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [[ "$SCRIPT_DIR" == */scripts ]]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi
cd "$PROJECT_ROOT"
echo -e "${GREEN}✓ Project root: $PROJECT_ROOT${NC}"
echo ""

# ============================================================================
# DEPENDENCIES INSTALLATION
# ============================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Installing Dependencies${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check and install Node.js
NODE_VERSION=18
if ! command_exists node; then
    echo -e "${YELLOW}Installing Node.js v$NODE_VERSION...${NC}"
    if [ "$OS_TYPE" = "Mac" ]; then
        brew install node@$NODE_VERSION
        echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
    elif [ "$OS_TYPE" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS_TYPE" = "Windows" ]; then
        echo -e "${RED}Please install Node.js v$NODE_VERSION manually from https://nodejs.org/${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Node.js already installed: $(node -v)${NC}"
fi

# Check and install pnpm
if ! command_exists pnpm; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
else
    echo -e "${GREEN}✓ pnpm already installed: $(pnpm -v)${NC}"
fi

# Check and install PHP
if ! command_exists php; then
    echo -e "${YELLOW}Installing PHP...${NC}"
    if [ "$OS_TYPE" = "Mac" ]; then
        brew install php
    elif [ "$OS_TYPE" = "Linux" ]; then
        sudo apt-get update
        sudo apt-get install -y php php-sqlite3 php-mbstring
    elif [ "$OS_TYPE" = "Windows" ]; then
        echo -e "${RED}Please install PHP from https://www.php.net/downloads.php${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ PHP already installed: $(php -v | head -n 1)${NC}"
fi

# Check and install SQLite
if ! command_exists sqlite3; then
    echo -e "${YELLOW}Installing SQLite...${NC}"
    if [ "$OS_TYPE" = "Mac" ]; then
        brew install sqlite
    elif [ "$OS_TYPE" = "Linux" ]; then
        sudo apt-get install -y sqlite3
    elif [ "$OS_TYPE" = "Windows" ]; then
        echo -e "${RED}Please install SQLite from https://www.sqlite.org/download.html${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ SQLite already installed: $(sqlite3 --version)${NC}"
fi

# Check and install Cloudflared (optional but recommended)
if ! command_exists cloudflared; then
    echo -e "${YELLOW}Cloudflared not found (optional for public access)${NC}"
    read -p "Do you want to install cloudflared? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$OS_TYPE" = "Mac" ]; then
            brew install cloudflare/cloudflare/cloudflared
        elif [ "$OS_TYPE" = "Linux" ]; then
            wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            sudo dpkg -i cloudflared-linux-amd64.deb
            rm cloudflared-linux-amd64.deb
        fi
        echo -e "${GREEN}✓ Cloudflared installed${NC}"
    fi
else
    echo -e "${GREEN}✓ Cloudflared already installed: $(cloudflared --version | head -n 1)${NC}"
fi

echo ""

# ============================================================================
# PROJECT SETUP
# ============================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Setting Up Project${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Install frontend dependencies
if [ -d "frontend" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend
    pnpm install
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}Error: frontend/ directory not found${NC}"
    exit 1
fi

# Create backend directory if it doesn't exist
if [ ! -d "backend" ]; then
    mkdir -p backend
    echo -e "${GREEN}✓ Created backend/ directory${NC}"
fi

# Create SQLite database if it doesn't exist
if [ ! -f "backend/blog.db" ]; then
    echo -e "${YELLOW}Creating SQLite database...${NC}"
    sqlite3 backend/blog.db <<EOF
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_tokens (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);
EOF
    chmod 600 backend/blog.db
    echo -e "${GREEN}✓ Database created with secure permissions${NC}"
else
    echo -e "${GREEN}✓ Database already exists${NC}"
    # Ensure admin_tokens table exists in existing database
    sqlite3 backend/blog.db <<EOF
CREATE TABLE IF NOT EXISTS admin_tokens (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);
EOF
fi

echo ""

# ============================================================================
# ADMIN PASSWORD SETUP
# ============================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Admin Password Configuration${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if .env already exists
if [ -f "backend/.env" ]; then
    echo -e "${YELLOW}Found existing backend/.env file${NC}"
    read -p "Do you want to change the admin password? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ Keeping existing password${NC}"
    else
        CHANGE_PASSWORD=true
    fi
else
    CHANGE_PASSWORD=true
fi

if [ "$CHANGE_PASSWORD" = true ]; then
    echo ""
    echo -e "${BLUE}Choose password option:${NC}"
    echo -e "  1) Generate secure random password (recommended)"
    echo -e "  2) Enter custom password"
    read -p "Enter choice (1 or 2): " -n 1 -r
    echo ""
    
    if [[ $REPLY == "1" ]]; then
        ADMIN_PASSWORD=$(generate_password)
        echo -e "${GREEN}✓ Generated secure password${NC}"
    else
        echo -e "${YELLOW}Enter your admin password:${NC}"
        read -s ADMIN_PASSWORD
        echo ""
        if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
            echo -e "${RED}Error: Password must be at least 8 characters${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Password set${NC}"
    fi
    
    # Save to backend/.env
    echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" > backend/.env
    chmod 600 backend/.env
    echo -e "${GREEN}✓ Password saved to backend/.env${NC}"
    
    # Display password (only when newly generated)
    if [[ $REPLY == "1" ]]; then
        echo ""
        echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║  IMPORTANT: Save this admin password!                 ║${NC}"
        echo -e "${BLUE}╠════════════════════════════════════════════════════════╣${NC}"
        echo -e "${BLUE}║  ${GREEN}$ADMIN_PASSWORD${BLUE}  ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}This password is saved in: backend/.env${NC}"
        echo ""
        read -p "Press Enter once you've saved the password..." -r
    fi
fi

echo ""

# ============================================================================
# ENVIRONMENT FILES
# ============================================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Environment Configuration${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create frontend .env.local if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}Creating frontend/.env.local...${NC}"
    cat > frontend/.env.local <<EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# For production with Cloudflare Tunnel, update to:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
EOF
    echo -e "${GREEN}✓ Created frontend/.env.local${NC}"
else
    echo -e "${GREEN}✓ frontend/.env.local already exists${NC}"
fi

# Make backend.php executable
if [ -f "backend/backend.php" ]; then
    chmod +x backend/backend.php
    echo -e "${GREEN}✓ Made backend.php executable${NC}"
fi

echo ""

# ============================================================================
# COMPLETION
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Installation Complete! 🎉                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Start the development servers:"
echo -e "     ${GREEN}./scripts/start.sh${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Access your blog:"
echo -e "     ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "     ${GREEN}Backend API:${NC} http://localhost:8000/api"
echo -e "     ${GREEN}Admin Panel:${NC} http://localhost:3000/admin"
echo ""
echo -e "  ${YELLOW}3.${NC} To expose publicly (optional):"
echo -e "     ${GREEN}./scripts/tunnel.sh${NC}"
echo ""
echo -e "  ${YELLOW}4.${NC} To stop servers:"
echo -e "     ${GREEN}./scripts/stop.sh${NC}"
echo ""
echo -e "${BLUE}Admin Login:${NC}"
echo -e "  Navigate to http://localhost:3000/admin and use the"
echo -e "  password saved in ${GREEN}backend/.env${NC}"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo -e "  Check the README.md for detailed usage instructions"
echo ""