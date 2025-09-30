#!/bin/bash

set -e

echo "🔍 Verifying GTSD Monorepo Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"
else
    echo -e "${RED}✗${NC} Node.js version $(node -v) is less than 20"
    exit 1
fi

# Check pnpm
echo ""
echo "📦 Checking pnpm..."
if command -v pnpm &> /dev/null; then
    echo -e "${GREEN}✓${NC} pnpm installed: $(pnpm -v)"
else
    echo -e "${RED}✗${NC} pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi

# Check Docker
echo ""
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker installed: $(docker -v)"
else
    echo -e "${YELLOW}⚠${NC} Docker not found. Required for running services."
fi

# Check Docker Compose
if command -v docker compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose available"
else
    echo -e "${YELLOW}⚠${NC} Docker Compose not found. Required for running services."
fi

# Check if dependencies are installed
echo ""
echo "📚 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Root node_modules exists"
else
    echo -e "${RED}✗${NC} Root node_modules missing. Run: pnpm install"
    exit 1
fi

if [ -d "apps/api/node_modules" ]; then
    echo -e "${GREEN}✓${NC} API node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} API node_modules missing"
fi

if [ -d "apps/mobile/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Mobile node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Mobile node_modules missing"
fi

# Check if migrations exist
echo ""
echo "🗄️  Checking database..."
if [ -d "apps/api/src/db/migrations" ] && [ "$(ls -A apps/api/src/db/migrations)" ]; then
    echo -e "${GREEN}✓${NC} Database migrations generated"
else
    echo -e "${YELLOW}⚠${NC} No migrations found. Run: pnpm --filter @gtsd/api drizzle-kit generate"
fi

# Run typecheck
echo ""
echo "🔧 Running TypeScript check..."
if pnpm typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} TypeScript check passed"
else
    echo -e "${RED}✗${NC} TypeScript check failed"
    exit 1
fi

# Final summary
echo ""
echo "════════════════════════════════════════"
echo -e "${GREEN}✅ Setup verification complete!${NC}"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Start services:  docker compose up -d"
echo "  2. Run migrations:  pnpm db:migrate"
echo "  3. Seed database:   pnpm db:seed"
echo "  4. Start dev mode:  pnpm run dev"
echo ""