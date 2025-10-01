#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${YELLOW}Starting installation for JAMstack Headless CMS...${NC}"

# Detect OS
OS=$(uname -s)
case "$OS" in
    Linux*)     OS_TYPE=Linux;;
    Darwin*)    OS_TYPE=Mac;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*) OS_TYPE=Windows;;
    *)          echo -e "${RED}Unsupported OS: $OS${NC}"; exit 1;;
esac
echo -e "${GREEN}Detected OS: $OS_TYPE${NC}"

# Check and install Node.js
NODE_VERSION=18
if ! command_exists node; then
    echo -e "${YELLOW}Installing Node.js v$NODE_VERSION...${NC}"
    if [ "$OS_TYPE" = "Mac" ]; then
        brew install node@$NODE_VERSION
        echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
        source ~/.zshrc
    elif [ "$OS_TYPE" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS_TYPE" = "Windows" ]; then
        echo -e "${RED}Please install Node.js v$NODE_VERSION manually from https://nodejs.org/ and rerun this script.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Node.js already installed: $(node -v)${NC}"
fi

# Check and install pnpm
if ! command_exists pnpm; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    source ~/.bashrc || true
else
    echo -e "${GREEN}pnpm already installed: $(pnpm -v)${NC}"
fi

# Check and install PHP
# PHP_VERSION=8.0
if ! command_exists php; then
    echo -e "${YELLOW}Installing PHP ...${NC}"
    if [ "$OS_TYPE" = "Mac" ]; then
        brew install php
        echo 'export PATH="/usr/local/opt/php@8.0/bin:$PATH"' >> ~/.zshrc
        source ~/.zshrc
    elif [ "$OS_TYPE" = "Linux" ]; then
        sudo apt-get update
        sudo apt-get install -y php php-sqlite3
    elif [ "$OS_TYPE" = "Windows" ]; then
        echo -e "${RED}Please install PHP manually from https://www.php.net/downloads.php and ensure php-sqlite3 is enabled, then rerun this script.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}PHP already installed: $(php -v | head -n 1)${NC}"
fi

# Check and install SQLite
if ! command_exists sqlite3; then
    echo -e "${YELLOW}Installing SQLite...${NC}"
    if [ "$OS_TYPE" = "Mac" ]; then
        brew install sqlite
    elif [ "$OS_TYPE" = "Linux" ]; then
        sudo apt-get install -y sqlite3
    elif [ "$OS_TYPE" = "Windows" ]; then
        echo -e "${RED}Please install SQLite manually from https://www.sqlite.org/download.html and rerun this script.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}SQLite already installed: $(sqlite3 --version)${NC}"
fi

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies with pnpm...${NC}"
cd frontend
pnpm install
cd ..

# Create SQLite database if it doesn't exist
if [ ! -f backend/blog.db ]; then
    echo -e "${YELLOW}Creating SQLite database...${NC}"
    sqlite3 backend/blog.db <<EOF
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_modified TEXT NOT NULL
);
EOF
fi

# Ensure backend.php is executable
chmod +x backend/backend.php

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Start the app with: ./devops/start.sh"
echo -e "2. Access frontend at: http://localhost:3000"
echo -e "3. Access backend API at: http://localhost:8000/api/posts"
