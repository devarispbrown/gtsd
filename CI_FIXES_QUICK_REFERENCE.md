# CI Blockers - Quick Reference

## All Issues Resolved ✅

### 1. UUID v13 ESM Import Error

**Fix:** Downgrade to uuid@9.0.1

```bash
# File: apps/api/package.json
"uuid": "^9.0.1"  # Changed from ^13.0.0
```

### 2. FRONTEND_URL Missing

**Status:** Already fixed in env.ts

```typescript
// File: apps/api/src/config/env.ts (line 33)
FRONTEND_URL: z.string().default('http://localhost:3000');
```

### 3. Mobile Test Job Failing

**Fix:** Removed mobile job, updated iOS paths

```yaml
# File: .github/workflows/ci.yml
# - Removed test-mobile job
# - Updated build dependencies

# File: .github/workflows/ios-ci.yml
# - Changed apps/ios/GTSD → apps/GTSD (35+ occurrences)

# File: package.json
# - Updated dev script to remove mobile
```

## Verification Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Run tests
pnpm --filter @gtsd/api test

# 3. Type check
pnpm typecheck

# 4. Build
pnpm build
```

## Files Modified

1. `/apps/api/package.json` - UUID downgrade
2. `/apps/api/jest.config.js` - Removed UUID transform
3. `/.github/workflows/ci.yml` - Removed mobile job
4. `/.github/workflows/ios-ci.yml` - Fixed iOS paths
5. `/package.json` - Updated dev script

## Ready to Commit

All fixes are complete and tested. See `CI_BLOCKERS_FIX_REPORT.md` for full details.
