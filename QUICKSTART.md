# Quick Start Guide

Get GTSD running in 5 minutes!

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (recommended) or PostgreSQL 16+

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd gtsd
pnpm install
```

### 2. Start Services

```bash
# Start PostgreSQL, Redis, MinIO, and Jaeger
pnpm docker:up
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

The default values work with Docker Compose. No changes needed!

### 4. Setup Database

```bash
# Run the automated setup script
pnpm db:setup
```

This will:
- Create the database
- Run all migrations
- Optionally seed with demo data

### 5. Start Development

```bash
# Start API and Mobile app
pnpm dev

# Or start API only
pnpm dev:api
```

## Verify Installation

### Check API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

### Access Services

- API: http://localhost:3000
- MinIO Console: http://localhost:9001 (gtsd / gtsd_minio_password)
- Jaeger UI: http://localhost:16686

## Running Tests

### Setup Test Database

```bash
pnpm db:test-setup
```

### Run Tests

```bash
# All tests
pnpm test

# API tests only
pnpm test:api

# With coverage
pnpm test:coverage
```

## Common Commands

```bash
# Development
pnpm dev              # Start all apps
pnpm dev:api          # Start API only

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed data
pnpm db:reset         # Reset database

# Docker
pnpm docker:up        # Start services
pnpm docker:down      # Stop services
pnpm docker:logs      # View logs

# Code Quality
pnpm lint             # Run linter
pnpm typecheck        # Check types
pnpm format           # Format code

# Build
pnpm build            # Build all packages
```

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
```

### Migration Failed

```bash
# Reset and try again
pnpm db:reset
```

## Next Steps

- Read [SETUP.md](./SETUP.md) for detailed setup instructions
- Read [DATABASE.md](./DATABASE.md) for database management
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guides

## Need Help?

- Check the troubleshooting sections in documentation
- Search existing GitHub issues
- Create a new issue with error details