# GTSD - Get Things Successfully Done

Production-grade monorepo with Node.js API and React Native mobile app.

## 🏗️ Architecture

- **apps/api** - Node.js + Express + TypeScript backend with Postgres, Redis, MinIO
- **apps/mobile** - React Native + TypeScript app with React Navigation and Zustand
- **Monorepo** - pnpm workspaces with unified tooling

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[SETUP.md](./SETUP.md)** - Detailed development setup guide
- **[DATABASE.md](./DATABASE.md)** - Database migrations and schema management
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment strategies

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure services (PostgreSQL, Redis, MinIO, Jaeger)
pnpm docker:up

# 3. Setup database (automated script)
pnpm db:setup

# 4. Start development
pnpm dev
```

For more detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md) or [SETUP.md](./SETUP.md).

## 📦 API Features

### Core Stack

- **Express** - Web framework
- **TypeScript** - Type safety with strict mode
- **Pino** - Structured JSON logging with request IDs
- **Drizzle ORM** - Type-safe database queries
- **BullMQ** - Background job processing with Redis
- **MinIO** - S3-compatible object storage

### Observability

- **OpenTelemetry** - Distributed tracing (Jaeger/Tempo)
- **Prometheus** - Metrics collection (`/metrics`)
- **Health Check** - `/healthz` endpoint with uptime and version

### Infrastructure

- **Postgres 16** - Primary database
- **Redis 7** - Queue backend and caching
- **MinIO** - S3-compatible storage with presigned URLs (10 min expiry)
- **Jaeger** - Trace visualization

### API Endpoints

- `GET /healthz` - Health check with version, git SHA, and uptime
- `GET /metrics` - Prometheus metrics

### Scripts

```bash
cd apps/api

pnpm dev          # Start development server
pnpm build        # Build for production
pnpm test         # Run tests
pnpm test:coverage # Run tests with coverage
pnpm typecheck    # Type check without emitting
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database (idempotent)
pnpm worker       # Start background worker process
```

## 📱 Mobile Features

### Core Stack

- **React Native** - Cross-platform mobile framework
- **TypeScript** - Strict type checking
- **React Navigation** - Native-like navigation
- **Zustand** - Lightweight state management with persistence

### Accessibility (WCAG AA Compliant)

- Minimum tap target: 44×44 points
- Color contrast ratio: 4.5:1
- Screen reader support with semantic labels
- Keyboard navigation ready

### Mobile Scripts

```bash
cd apps/mobile

pnpm start        # Start Metro bundler
pnpm test         # Run tests
pnpm test:coverage # Run tests with coverage
pnpm lint         # Lint code
```

## 🧪 Testing

All packages enforce 80%+ code coverage:

```bash
# Setup test database (first time only)
pnpm db:test-setup

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run API tests only
pnpm test:api

# Run mobile tests only
pnpm --filter @gtsd/mobile test
```

Tests use a separate `gtsd_test` database to avoid affecting development data.

## 🔍 Code Quality

### Linting & Formatting

```bash
# Lint all code
pnpm lint

# Format all code
pnpm format

# Type check all packages
pnpm typecheck
```

### Git Hooks (Husky)

Pre-commit hooks automatically run:

- `lint-staged` - Lint and format staged files
- `typecheck` - Type check all packages

## 🐳 Docker Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Reset everything
docker compose down -v
```

### Services

- **Postgres** - `localhost:5432`
- **Redis** - `localhost:6379`
- **MinIO Console** - `http://localhost:9001`
- **MinIO API** - `http://localhost:9000`
- **Jaeger UI** - `http://localhost:16686`

## 📊 Observability

### Logs

Structured JSON logs with Pino include:

- `requestId` - Unique request identifier (via cls-hooked)
- `level` - Log level (debug, info, warn, error)
- `timestamp` - ISO 8601 timestamp
- `err` - Error details with stack traces (development only)

### Metrics

Prometheus metrics at `http://localhost:3000/metrics`:

- HTTP request counter
- HTTP request duration histogram
- Database query duration
- Node.js default metrics (CPU, memory, etc.)

### Traces

OpenTelemetry traces sent to Jaeger:

- HTTP request spans
- Database query spans
- View in Jaeger UI: `http://localhost:16686`

## 🚢 CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Lint & Typecheck** - ESLint and TypeScript checks
2. **Test API** - Unit tests with 80% coverage gate
3. **Test Mobile** - Unit tests with 80% coverage gate
4. **Build** - Production build verification
5. **Security Scan** - Dependency vulnerability audit

## 📝 Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Database
DATABASE_URL=postgresql://gtsd:gtsd_dev_password@localhost:5432/gtsd

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=gtsd
S3_SECRET_ACCESS_KEY=gtsd_minio_password
S3_BUCKET=gtsd-uploads
S3_REGION=us-east-1

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=gtsd-api

# API
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# App Metadata
GIT_SHA=local
APP_VERSION=0.1.0
```

## 🗄️ Database Management

Drizzle ORM with type-safe migrations:

```bash
# Setup database (automated)
pnpm db:setup

# Run migrations manually
pnpm db:migrate

# Seed database (safe to run multiple times)
pnpm db:seed

# Reset database (WARNING: deletes all data)
pnpm db:reset

# Setup test database
pnpm db:test-setup
```

For detailed database management, migration strategies, and best practices, see [DATABASE.md](./DATABASE.md).

## 📚 Project Structure

```
gtsd/
├── apps/
│   ├── api/              # Node.js + Express API
│   │   ├── src/
│   │   │   ├── config/   # App configuration
│   │   │   ├── db/       # Database schema & migrations
│   │   │   ├── middleware/ # Express middleware
│   │   │   ├── routes/   # API routes
│   │   │   ├── utils/    # Utility functions
│   │   │   ├── workers/  # Background workers
│   │   │   └── app.ts    # Express app setup
│   │   └── package.json
│   └── mobile/           # React Native app
│       ├── src/
│       │   ├── components/ # Reusable components
│       │   ├── constants/  # App constants
│       │   ├── navigation/ # Navigation setup
│       │   ├── screens/    # App screens
│       │   ├── store/      # Zustand stores
│       │   └── types/      # TypeScript types
│       └── package.json
├── .github/
│   └── workflows/        # CI/CD pipelines
├── docker-compose.yml    # Infrastructure services
├── pnpm-workspace.yaml   # Workspace configuration
└── package.json          # Root package with dev scripts
```

## 🎯 Definition of Done

- ✅ CI green
- ✅ Lint & typecheck pass
- ✅ Coverage ≥80%
- ✅ All tests pass
- ✅ Docker services healthy
- ✅ Migrations and seeds idempotent

## 🔧 Troubleshooting

### Port already in use

```bash
# Kill process on port 3000 (API)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8081 (Metro)
lsof -ti:8081 | xargs kill -9
```

### Database connection refused

```bash
# Ensure Postgres is running
docker compose ps postgres

# Restart Postgres
docker compose restart postgres
```

### MinIO bucket doesn't exist

```bash
# Create bucket via MinIO console
open http://localhost:9001

# Or use AWS CLI
aws --endpoint-url http://localhost:9000 s3 mb s3://gtsd-uploads
```

## 📄 License

MIT

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

---

Built with ❤️ using TypeScript, Node.js, and React Native
