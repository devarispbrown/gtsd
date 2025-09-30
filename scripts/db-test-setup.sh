#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}GTSD Test Database Setup Script${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Default test database configuration
TEST_DB_USER=${TEST_DB_USER:-gtsd}
TEST_DB_PASS=${TEST_DB_PASS:-gtsd_test_password}
TEST_DB_HOST=${TEST_DB_HOST:-localhost}
TEST_DB_PORT=${TEST_DB_PORT:-5432}
TEST_DB_NAME=${TEST_DB_NAME:-gtsd_test}

TEST_DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASS}@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"

# Check if PostgreSQL is running
if ! pg_isready -h $TEST_DB_HOST -p $TEST_DB_PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}PostgreSQL is not running on ${TEST_DB_HOST}:${TEST_DB_PORT}${NC}"
    echo -e "${YELLOW}Starting PostgreSQL with Docker Compose...${NC}"
    docker-compose up -d postgres
    echo -e "${GREEN}Waiting for PostgreSQL to be ready...${NC}"
    sleep 5
fi

echo -e "${GREEN}Test Database: ${TEST_DB_NAME}${NC}"
echo ""

# Drop and recreate test database for clean state
echo -e "${YELLOW}Dropping existing test database (if exists)...${NC}"
PGPASSWORD=$TEST_DB_PASS dropdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME 2>/dev/null || true

echo -e "${GREEN}Creating test database...${NC}"
PGPASSWORD=$TEST_DB_PASS createdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME

echo ""
echo -e "${GREEN}Running migrations on test database...${NC}"
cd apps/api
DATABASE_URL=$TEST_DATABASE_URL pnpm db:migrate
echo -e "${GREEN}✅ Test database migrations completed${NC}"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Test database setup complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "You can now run tests with: ${YELLOW}pnpm test${NC}"