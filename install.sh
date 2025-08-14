#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Installing Ani Code is Coding...${NC}"
echo -e "──────────────────────────────────────────────"

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js (>=16) first.${NC}"
    echo -e "${YELLOW}💡 You can install it from: https://nodejs.org/${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Please install Node.js >= 16.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $NODE_VERSION detected${NC}"

# 2. Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --no-audit

# 3. Build project
echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build

# 4. Link globally
echo -e "${YELLOW}🔗 Setting up global command...${NC}"
npm link --force

# 5. Success message
echo -e "${GREEN}✅ Installation complete!${NC}"
echo -e "──────────────────────────────────────────────"
echo -e "${BLUE}🎉 Ani Code is Coding is now available globally!${NC}"
echo -e "${YELLOW}💡 Type 'ani' in any directory to start using it.${NC}"
echo ""
echo -e "${BLUE}📖 Need help? Run 'ani --help' or type '/help' in the CLI.${NC}"

# 6. Launch CLI if requested
if [ "$1" = "--launch" ]; then
    echo -e "${YELLOW}🚀 Launching Ani Code is Coding...${NC}"
    ani
fi
  