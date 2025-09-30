#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}================================================${NC}"
echo -e "${RED}GTSD Database Reset Script${NC}"
echo -e "${RED}WARNING: This will delete all data!${NC}"
echo -e "${RED}================================================${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}No .env file found. Using default values from .env.example${NC}"
    export $(cat .env.example | grep -v '^#' | xargs)
fi

# Extract database connection details
DB_NAME=${DATABASE_URL##*/}
DB_NAME=${DB_NAME%%\?*}
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Host: ${DB_HOST}:${DB_PORT}${NC}"
echo ""
echo -e "${RED}Are you sure you want to reset this database? (yes/no)${NC}"
read -r response

if [[ ! "$response" =~ ^([yY][eE][sS])$ ]]; then
    echo -e "${GREEN}Database reset cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${RED}Dropping database...${NC}"
PGPASSWORD=$DB_PASS dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true

echo -e "${GREEN}Creating database...${NC}"
PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

echo ""
echo -e "${GREEN}Running migrations...${NC}"
cd apps/api
pnpm db:migrate
echo -e "${GREEN}✅ Migrations completed${NC}"

echo ""
echo -e "${YELLOW}Would you like to seed the database with demo data? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${GREEN}Seeding database...${NC}"
    pnpm db:seed
    echo -e "${GREEN}✅ Database seeded${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo -e "${GREEN}================================================${NC}"