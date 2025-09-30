# GTSD Development Setup Guide

This guide will help you set up the GTSD project for local development.

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v20 or higher
- **pnpm**: v9 or higher
- **PostgreSQL**: v16 or higher
- **Docker & Docker Compose**: For running services (recommended)
- **Git**: For version control

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gtsd
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy the example environment file and update it with your configuration:

```bash
cp .env.example .env
```

The default values in `.env.example` are configured to work with Docker Compose. If you're running services locally, update the connection strings accordingly.

### 4. Start Infrastructure Services

Start PostgreSQL, Redis, MinIO, and Jaeger using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **MinIO** (S3-compatible storage) on ports 9000 (API) and 9001 (Console)
- **Jaeger** (OpenTelemetry) on multiple ports including 16686 (UI)

### 5. Database Setup

Run the automated database setup script:

```bash
./scripts/db-setup.sh
```

This script will:
- Check if PostgreSQL is running
- Create the database if it doesn't exist
- Run all migrations in order
- Optionally seed the database with demo data

Alternatively, you can run the steps manually:

```bash
# Run migrations
pnpm db:migrate

# Seed database (optional)
pnpm db:seed
```

### 6. Start the Development Server

```bash
pnpm dev
```

This will start:
- **API Server** on http://localhost:3000
- **Mobile App** using Expo

## Detailed Setup

### Environment Variables

The following environment variables are required:

#### Database
- `DATABASE_URL`: PostgreSQL connection string
  - Default: `postgresql://gtsd:gtsd_dev_password@localhost:5432/gtsd`

#### Redis
- `REDIS_URL`: Redis connection string
  - Default: `redis://localhost:6379`

#### MinIO (S3-compatible storage)
- `S3_ENDPOINT`: MinIO endpoint
  - Default: `http://localhost:9000`
- `S3_ACCESS_KEY_ID`: MinIO access key
  - Default: `gtsd`
- `S3_SECRET_ACCESS_KEY`: MinIO secret key
  - Default: `gtsd_minio_password`
- `S3_BUCKET`: S3 bucket name
  - Default: `gtsd-uploads`
- `S3_REGION`: AWS region
  - Default: `us-east-1`

#### OpenTelemetry
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry collector endpoint
  - Default: `http://localhost:4318`
- `OTEL_SERVICE_NAME`: Service name for tracing
  - Default: `gtsd-api`

#### API Configuration
- `PORT`: API server port
  - Default: `3000`
- `NODE_ENV`: Environment mode (`development`, `production`, `test`)
  - Default: `development`
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)
  - Default: `debug`

#### App Metadata
- `GIT_SHA`: Git commit SHA (for deployment tracking)
  - Default: `local`
- `APP_VERSION`: Application version
  - Default: `0.1.0`

### Database Management

#### Running Migrations

Migrations are located in `apps/api/src/db/migrations/` and run in numerical order.

```bash
pnpm db:migrate
```

#### Seeding Data

To populate the database with demo data:

```bash
pnpm db:seed
```

For onboarding-specific seed data:

```bash
pnpm --filter @gtsd/api db:seed:onboarding
```

#### Resetting the Database

To drop and recreate the database with migrations:

```bash
./scripts/db-reset.sh
```

**WARNING**: This will delete all data in your development database.

### Running Tests

#### Setup Test Database

Before running tests, set up the test database:

```bash
./scripts/db-test-setup.sh
```

This creates a separate test database and runs migrations.

#### Run Tests

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm --filter @gtsd/api test

# Run tests in watch mode
pnpm --filter @gtsd/api test:watch

# Run tests with coverage
pnpm --filter @gtsd/api test:coverage
```

#### Test Database Configuration

Tests use a separate database to avoid affecting development data:
- **Database**: `gtsd_test`
- **Connection**: `postgresql://gtsd:gtsd_test_password@localhost:5432/gtsd_test`

The test database is automatically set up and torn down by Jest using global setup/teardown hooks.

### Available Scripts

From the project root:

```bash
# Development
pnpm dev                # Start all apps in development mode
pnpm build              # Build all packages
pnpm test               # Run all tests

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier
pnpm typecheck          # Run TypeScript type checking

# Database
pnpm db:migrate         # Run database migrations
pnpm db:seed            # Seed database with demo data
```

From the API directory (`apps/api`):

```bash
# Development
pnpm dev                # Start API in development mode with hot reload
pnpm build              # Build API for production
pnpm start              # Start production build

# Testing
pnpm test               # Run tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage report

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed database
pnpm db:seed:onboarding # Seed onboarding data

# Workers
pnpm worker             # Start background workers
```

## Service URLs

When running with Docker Compose:

- **API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health
- **API Metrics**: http://localhost:3000/metrics
- **MinIO Console**: http://localhost:9001
- **Jaeger UI**: http://localhost:16686
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Troubleshooting

### PostgreSQL Connection Issues

If you can't connect to PostgreSQL:

1. Check if Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify PostgreSQL is ready:
   ```bash
   docker-compose exec postgres pg_isready -U gtsd
   ```

### Migration Errors

If migrations fail:

1. Check database connection:
   ```bash
   psql $DATABASE_URL -c '\conninfo'
   ```

2. Reset the database:
   ```bash
   ./scripts/db-reset.sh
   ```

### Port Already in Use

If you get a "port already in use" error:

1. Check what's using the port:
   ```bash
   lsof -i :3000  # Replace with the port number
   ```

2. Stop the conflicting process or change the port in your `.env` file

### Test Database Issues

If tests fail due to database errors:

1. Ensure test database exists:
   ```bash
   ./scripts/db-test-setup.sh
   ```

2. Check test database connection:
   ```bash
   psql postgresql://gtsd:gtsd_test_password@localhost:5432/gtsd_test -c '\conninfo'
   ```

## Docker-Free Setup

If you prefer not to use Docker:

### Install PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql-16
sudo systemctl start postgresql
```

### Install Redis

**macOS (Homebrew)**:
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian**:
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### Create PostgreSQL User and Database

```bash
# Create user
sudo -u postgres createuser -P gtsd

# Create development database
sudo -u postgres createdb -O gtsd gtsd

# Create test database
sudo -u postgres createdb -O gtsd gtsd_test
```

Update your `.env` file with the appropriate connection strings, then continue with the database setup steps above.

## Next Steps

- Read [DATABASE.md](./DATABASE.md) for database migration guidelines
- Review the API documentation at `/docs` endpoint (when implemented)
- Check the [Contributing Guide](./CONTRIBUTING.md) for development workflow

## Getting Help

If you encounter issues:
1. Check this guide and [DATABASE.md](./DATABASE.md)
2. Search existing GitHub issues
3. Create a new issue with detailed error messages and steps to reproduce