# Deployment Guide

This guide covers deployment strategies, CI/CD pipeline, and production readiness for the GTSD project.

## Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass locally and in CI
- [ ] Database migrations are reviewed and tested
- [ ] Environment variables are configured in production
- [ ] SSL/TLS certificates are configured
- [ ] Database backups are enabled
- [ ] Monitoring and alerting are set up
- [ ] Health check endpoints are working
- [ ] Security scans pass
- [ ] Performance testing is complete
- [ ] Rollback plan is documented

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment.

### Pipeline Stages

1. **Lint & Typecheck**: Code quality checks
2. **Test API**: Run API tests with PostgreSQL and Redis
3. **Test Mobile**: Run mobile app tests
4. **Build**: Build all packages for production
5. **Security Scan**: Check for vulnerabilities

### Running CI Locally

Test the CI pipeline locally before pushing:

```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build
pnpm build
```

## Environment Configuration

### Development

See [SETUP.md](./SETUP.md) for local development setup.

### Staging

Staging should mirror production as closely as possible:

- Same database version and configuration
- Same environment variables (with staging-specific values)
- Same deployment process

### Production

#### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
# Enable SSL for production
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Redis
REDIS_URL=redis://user:password@host:6379
# Use TLS for production
REDIS_URL=rediss://user:password@host:6379

# S3 Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=gtsd-production
S3_REGION=us-east-1

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector:4318
OTEL_SERVICE_NAME=gtsd-api-production

# API
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Metadata
GIT_SHA=${GITHUB_SHA}
APP_VERSION=${APP_VERSION}
```

#### Connection Pooling

For production, configure connection pooling based on your infrastructure:

**Single Instance**:
```typescript
max: 20  // connections per instance
```

**Multiple Instances** (e.g., 5 instances, 100 max DB connections):
```typescript
max: 20  // 100 / 5
```

**Serverless** (use external pooler):
- AWS RDS Proxy
- PgBouncer
- Supabase Pooler

## Database Migrations

### Pre-Deployment Migration Strategy

**Option 1: Automated Migration** (recommended for small teams)

Run migrations automatically before deploying new code:

```yaml
- name: Run database migrations
  run: pnpm --filter @gtsd/api db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Option 2: Manual Migration** (recommended for large teams)

1. Review migration SQL
2. Run migration manually during maintenance window
3. Deploy new code after migration completes

### Zero-Downtime Migrations

For zero-downtime deployments:

1. **Adding Columns**: Add as nullable first, populate, then make NOT NULL
   ```sql
   -- Migration 1: Add nullable column
   ALTER TABLE users ADD COLUMN status TEXT;

   -- Code deployment with default handling

   -- Migration 2: Populate existing rows
   UPDATE users SET status = 'active' WHERE status IS NULL;

   -- Migration 3: Make NOT NULL
   ALTER TABLE users ALTER COLUMN status SET NOT NULL;
   ```

2. **Removing Columns**: Deploy code that doesn't use column, then drop
   ```sql
   -- Code deployment removing column usage
   -- Then drop column
   ALTER TABLE users DROP COLUMN old_column;
   ```

3. **Renaming Tables**: Use views or aliases temporarily

### Migration Rollback Plan

Document how to rollback each migration:

```sql
-- Forward migration (0005_add_user_preferences.sql)
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ...
);

-- Rollback migration (0006_rollback_user_preferences.sql)
DROP TABLE IF EXISTS user_preferences CASCADE;
```

## Deployment Platforms

### Docker

Build and run the API in Docker:

```bash
# Build
docker build -t gtsd-api:latest -f apps/api/Dockerfile .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  gtsd-api:latest
```

### Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes

Example Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gtsd-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gtsd-api
  template:
    metadata:
      labels:
        app: gtsd-api
    spec:
      containers:
      - name: api
        image: gtsd-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: gtsd-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: gtsd-secrets
              key: redis-url
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### AWS ECS

For AWS ECS deployment:

1. **Build and push Docker image to ECR**:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URL
   docker build -t gtsd-api:latest .
   docker tag gtsd-api:latest $ECR_URL/gtsd-api:latest
   docker push $ECR_URL/gtsd-api:latest
   ```

2. **Create task definition** with environment variables from Secrets Manager

3. **Configure ECS service** with health checks and auto-scaling

### Serverless (AWS Lambda)

For serverless deployment, consider:
- Use AWS Lambda with API Gateway
- Use Aurora Serverless for database
- Configure RDS Proxy for connection pooling

### Platform-as-a-Service

#### Heroku

```bash
# Create app
heroku create gtsd-api-production

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Add Redis
heroku addons:create heroku-redis:premium-0

# Configure
heroku config:set NODE_ENV=production
heroku config:set LOG_LEVEL=info

# Deploy
git push heroku main

# Run migrations
heroku run pnpm --filter @gtsd/api db:migrate
```

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL
railway add

# Deploy
railway up
```

## Health Checks

The API includes health check endpoints:

### Endpoint: GET /health

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Load Balancer Health Check

Configure your load balancer to use `/health`:
- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Healthy threshold**: 2
- **Unhealthy threshold**: 3

## Monitoring

### Metrics Endpoint

Prometheus-compatible metrics at `/metrics`:

```bash
curl http://localhost:3000/metrics
```

Metrics include:
- HTTP request duration
- HTTP request count by status code
- Database connection pool size
- Node.js memory usage
- Custom application metrics

### Logging

The API uses structured JSON logging with Pino:

```json
{
  "level": 30,
  "time": 1642252800000,
  "pid": 1234,
  "hostname": "api-1",
  "req": {
    "id": "req-123",
    "method": "GET",
    "url": "/v1/tasks/today"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 42,
  "msg": "request completed"
}
```

Configure log aggregation:
- **AWS**: CloudWatch Logs
- **Google Cloud**: Cloud Logging
- **Self-hosted**: ELK Stack, Loki

### Distributed Tracing

OpenTelemetry integration with Jaeger:

- Trace ID propagation across services
- Database query tracing
- HTTP request tracing
- Custom span instrumentation

Export traces to:
- Jaeger
- AWS X-Ray
- Google Cloud Trace
- Datadog APM

### Alerting

Set up alerts for:

**Critical**:
- API downtime (health check fails)
- Database connection failures
- High error rate (>5% of requests)
- Memory usage >90%

**Warning**:
- High response time (p95 >1s)
- Connection pool near capacity
- Failed background jobs

## Performance Optimization

### Database

- Create indexes for frequently queried columns
- Use connection pooling
- Enable query result caching
- Monitor slow queries

### API

- Enable response compression
- Implement request rate limiting
- Use CDN for static assets
- Cache frequently accessed data

### Horizontal Scaling

The API is stateless and can be horizontally scaled:

1. **Add more instances** behind a load balancer
2. **Distribute load** using round-robin or least-connections
3. **Use sticky sessions** if needed (not recommended)
4. **Share state** via Redis for sessions/caching

## Security

### SSL/TLS

Always use HTTPS in production:

- Obtain SSL certificate (Let's Encrypt, AWS ACM)
- Configure TLS 1.2 or higher
- Enable HSTS headers

### Environment Variables

Never commit secrets to version control:

- Use secret management (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials regularly
- Use least-privilege access

### Database Security

- Use SSL/TLS for database connections
- Whitelist IP addresses
- Use strong passwords
- Enable audit logging

### API Security

- Implement rate limiting
- Use API authentication (JWT, OAuth)
- Validate all input
- Enable CORS appropriately

## Rollback Strategy

### Code Rollback

**Docker/Kubernetes**:
```bash
# Rollback to previous image
kubectl rollout undo deployment/gtsd-api
```

**Heroku**:
```bash
# Rollback to previous release
heroku rollback
```

### Database Rollback

See [DATABASE.md](./DATABASE.md) for migration rollback procedures.

## Post-Deployment

After deployment:

1. **Verify health checks** are passing
2. **Check logs** for errors
3. **Monitor metrics** for anomalies
4. **Test critical user flows**
5. **Verify database migrations** completed successfully

## Troubleshooting

### High Memory Usage

- Check for memory leaks with heap snapshots
- Reduce connection pool size
- Implement request timeouts
- Add more instances or increase memory limits

### Database Connection Errors

- Check connection pool settings
- Verify database credentials
- Check network connectivity
- Review database logs

### Slow Response Times

- Analyze slow query logs
- Check database indexes
- Review N+1 query problems
- Enable caching

## Support

For deployment issues:
1. Check application logs
2. Review [SETUP.md](./SETUP.md) and [DATABASE.md](./DATABASE.md)
3. Search existing issues on GitHub
4. Create a new issue with deployment details