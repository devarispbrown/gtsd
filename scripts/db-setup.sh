#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}GTSD Database Setup Script${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${YELLOW}PostgreSQL is not running on localhost:5432${NC}"
    echo -e "${YELLOW}Starting PostgreSQL with Docker Compose...${NC}"
    docker-compose up -d postgres
    echo -e "${GREEN}Waiting for PostgreSQL to be ready...${NC}"
    sleep 5
fi

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

echo -e "${GREEN}Database: ${DB_NAME}${NC}"
echo ""

# Check if database exists
if psql "${DATABASE_URL}" -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✅ Database '${DB_NAME}' exists${NC}"
else
    echo -e "${YELLOW}Database '${DB_NAME}' does not exist${NC}"
    echo -e "${YELLOW}Creating database...${NC}"

    # Extract credentials from DATABASE_URL
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

    PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true
    echo -e "${GREEN}✅ Database created${NC}"
fi

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
else
    echo -e "${YELLOW}Skipping seed data${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "You can now run the application with: ${YELLOW}pnpm dev${NC}"