# Quality Assurance - Master Index

**Comprehensive Verification System for GTSD Application**

Version: 1.0
Created: 2025-10-30
Purpose: Ensure fixes actually work this time

---

## The Problem We're Solving

**We've fixed critical issues 4+ times, yet they keep failing because:**

1. **Build cache issues**: Old code served despite changes
2. **Lack of verification**: No proof changes were deployed
3. **Incomplete testing**: Missing edge cases and regression tests
4. **No validation process**: No checklist to confirm deployment

**This cost us**: Days of debugging, multiple failed deployments, user frustration

---

## The Solution

**Multi-layer verification system:**

1. **Pre-Deployment Verification**: Prove code exists before building
2. **Build Verification**: Prove build contains new code
3. **Post-Deployment Testing**: Prove deployed app works correctly
4. **Regression Testing**: Prevent previously-fixed issues from breaking
5. **Command Reference**: Quick access to all verification commands

---

## Documentation Structure

### 1. Pre-Deployment Verification Checklist

**File**: `QA_PRE_DEPLOYMENT_CHECKLIST.md`

**Purpose**: Verify changes exist in source code and build artifacts BEFORE deployment

**Use When**: Before every build/deployment

**Time Required**: 30 minutes

**Key Sections**:

- Source code verification (git diff, file contents)
- Backend API verification (endpoint tests, curl commands)
- iOS build verification (cache clearing, build number)
- Database verification (migrations, schema checks)
- Environment variables verification (.env files)
- Pre-flight checklist (all items must pass)

**Success Criteria**:

- All checklist items checked
- No build cache detected
- Critical code found in source files
- Backend endpoints respond correctly
- Database migrations applied

**Start Here**: Always run this checklist first, before building

---

### 2. Post-Deployment Testing Protocol

**File**: `QA_POST_DEPLOYMENT_TESTING.md`

**Purpose**: Prove deployed code actually works in running application

**Use When**: After pre-deployment checklist passes and app is built

**Time Required**: 85 minutes (full suite) or 20 minutes (critical tests only)

**Key Sections**:

- **Priority 1**: Critical auth resilience tests (MOST IMPORTANT)
  - Backend down → Welcome screen appears in 5s
  - 5-second timeout verification
  - Navigation works when offline
- **Priority 2**: Backend up - full auth flow
  - Signup, login, logout, session persistence
  - Token management
- **Priority 3**: Onboarding flow tests
- **Priority 4**: Data persistence tests
- **Priority 5**: Edge cases and error scenarios

**Success Criteria**:

- All P1 tests pass (mandatory)
- Expected vs actual behavior matches
- Screenshots/videos documented
- Database state verified

**Critical**: If Test 1.1 (Backend Down) fails, STOP immediately. Build is not verified.

---

### 3. Build Verification System

**File**: `QA_BUILD_VERIFICATION_SYSTEM.md`

**Purpose**: Eliminate build cache issues and verify deployed code at runtime

**Use When**: During and after build process

**Time Required**: 17-22 minutes

**Key Sections**:

- **Version Stamping**: Embed unique build ID in each build
  - Timestamp, git commit, branch
  - Display in app (Settings screen)
  - Proves which version is running
- **Bundle Content Verification**: Verify JavaScript bundle contains changes
- **Native Build Verification**: Ensure Xcode compiles latest code
- **Runtime Verification**: Debug logs prove code executes
- **Feature Flags**: Enable/disable features at runtime

**Success Criteria**:

- Build version timestamp is within last 10 minutes
- All verification logs have current timestamp
- Bundle contains critical code strings
- Runtime checks all pass

**Scripts Provided**:

- `generate-build-version.sh` - Create unique build identifier
- `pre-build-verify.sh` - Run checks before building
- `post-build-verify.sh` - Verify build artifacts after compilation

---

### 4. Regression Test Suite

**File**: `QA_REGRESSION_TEST_SUITE.md`

**Purpose**: Prevent previously-fixed issues from breaking again

**Use When**: Before every deployment (automated + manual tests)

**Time Required**:

- Quick check: 20 minutes (P0 automated tests only)
- Full suite: 115 minutes (P0 + P1 + P2)

**Key Sections**:

- **P0 Automated Tests**:
  - API endpoint tests (Jest/Supertest)
  - Auth flow tests (React Native Testing Library)
  - Database integrity queries (SQL)
- **P1 Manual Tests**: Critical UI paths (10 tests)
- **P2 Edge Cases**: Network errors, invalid tokens, etc.

**Test Categories**:

- 13 API endpoint tests
- 6 mobile auth flow tests
- 8 database integrity checks
- 10 critical UI path tests
- 5 edge case tests

**Success Criteria**:

- All P0 tests pass (mandatory)
- All P1 manual tests pass (mandatory)
- No critical failures in P2
- Regression script exits with code 0

**Scripts Provided**:

- `regression.test.ts` - Automated API tests
- `auth-flow.test.ts` - Automated mobile tests
- `database-integrity.sql` - Database verification queries
- `regression-check.sh` - Run all regression tests

---

### 5. Verification Commands Reference

**File**: `QA_VERIFICATION_COMMANDS.md`

**Purpose**: Copy-paste commands for rapid verification

**Use When**: Throughout the entire verification process

**Key Sections**:

- Backend API verification (curl commands)
- Database verification (SQL queries)
- Mobile app verification (grep commands)
- Build verification (iOS/Xcode commands)
- Environment verification (.env checks)
- Cache clearing (nuclear options)
- Quick health checks (one-liners)
- Troubleshooting commands

**Most Useful Commands**:

- Health check: `curl http://localhost:3000/healthz | jq`
- Test auth: `curl -X POST http://localhost:3000/auth/login ...`
- Database query: `docker exec -it gtsd-postgres psql ...`
- Clear caches: `rm -rf $TMPDIR/metro-* && watchman watch-del-all`
- Verify code: `grep -n "setTimeout.*5000" src/stores/authStore.ts`

**Quick Reference Card**: Most common commands in one place

---

## Recommended Workflow

### For Every Deployment

**Phase 1: Pre-Deployment (30 min)**

1. Open `QA_PRE_DEPLOYMENT_CHECKLIST.md`
2. Execute all verification steps
3. Check all boxes in pre-flight checklist
4. Do NOT proceed until 100% complete

**Phase 2: Build (20 min)**

1. Open `QA_BUILD_VERIFICATION_SYSTEM.md`
2. Clear all caches (nuclear option)
3. Generate build version
4. Build app
5. Verify build artifacts
6. Check runtime logs

**Phase 3: Post-Deployment (85 min or 20 min)**

1. Open `QA_POST_DEPLOYMENT_TESTING.md`
2. Run all P1 tests (critical - mandatory)
3. If time allows, run P2-P5 tests
4. Document results with screenshots
5. Verify database state

**Phase 4: Regression (20 min)**

1. Open `QA_REGRESSION_TEST_SUITE.md`
2. Run automated regression tests
3. Verify all tests pass
4. If any fail, STOP and fix

**Phase 5: Sign-Off**

1. Review all checklists
2. Confirm all tests passed
3. Sign off on deployment
4. Deploy with confidence

**Total Time**: 2-3 hours for first deployment, 1-1.5 hours for subsequent

---

## For Quick Checks

**Before Starting Any Work** (5 min):

```bash
# Use QA_VERIFICATION_COMMANDS.md
curl http://localhost:3000/healthz
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT 1;"
```

**After Making Code Changes** (10 min):

```bash
# Verify changes in source
grep -n "your-change" src/path/to/file.ts

# Run pre-build verification
bash scripts/pre-build-verify.sh
```

**After Building** (10 min):

```bash
# Check build version
cat src/version.ts

# Verify bundle contents
curl -s "http://localhost:8081/index.bundle?platform=ios&dev=true" | grep "your-change"

# Run post-build verification
bash scripts/post-build-verify.sh
```

**Before Claiming "Done"** (20 min):

```bash
# Run regression tests
bash scripts/regression-check.sh

# Test critical path
# Backend down → Welcome screen in 5s

# Check database state
docker exec -it gtsd-postgres psql -U gtsd -d gtsd -c "SELECT COUNT(*) FROM users;"
```

---

## Critical Success Metrics

### Deployment is VERIFIED when:

**Pre-Deployment**:

- [ ] All critical files exist with changes
- [ ] Backend endpoints respond correctly
- [ ] Database migrations applied
- [ ] Build caches cleared
- [ ] Environment variables set

**Build**:

- [ ] Build version is current (today)
- [ ] Bundle contains critical code
- [ ] Build number incremented
- [ ] Runtime logs have current timestamp

**Post-Deployment**:

- [ ] Backend down test passes (< 6s to Welcome screen)
- [ ] Timeout triggered at 5 seconds
- [ ] All auth flows work
- [ ] Data persists correctly
- [ ] No crashes or errors

**Regression**:

- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] Database integrity verified
- [ ] No blocking issues

---

## What Success Looks Like

### Perfect Deployment

1. **Pre-Deployment Checklist**: 100% checked, no red flags
2. **Build Verification**: Current timestamp in app and logs
3. **Post-Deployment Testing**: All P1 tests pass
4. **Regression Tests**: All automated tests pass
5. **Sign-Off**: Documented, approved, deployed

**Timeline**:

- Pre-deployment: 30 min
- Build: 20 min
- Post-deployment: 20 min (critical tests)
- Regression: 20 min
- **Total**: 90 minutes

**Confidence Level**: 95%+ (know exactly what was deployed)

---

## Red Flags - STOP Immediately

**If you see any of these, DO NOT proceed:**

1. **Build cache detected**:
   - Build version timestamp is old (not today)
   - Verification logs have old timestamp
   - Build completes in < 10 seconds

2. **Critical code missing**:
   - Timeout code not in source files
   - Critical strings not in bundle
   - Expected logs don't appear

3. **Tests failing**:
   - Backend down test hangs > 10s
   - Timeout not at 5 seconds
   - Any P1 test fails
   - Regression tests fail

4. **Database issues**:
   - Migrations not applied
   - Duplicate records
   - Orphaned data

5. **Environment issues**:
   - .env files missing
   - Wrong API URL
   - Database connection fails

**Action**: Return to pre-deployment checklist, clear caches, rebuild, re-verify.

---

## Time Investment vs. ROI

### Time Investment

**Initial Setup** (one-time):

- Write verification scripts: 2-3 hours (DONE)
- Set up build version system: 1 hour
- Create test suites: 2-3 hours
- **Total**: 5-7 hours

**Per Deployment**:

- First deployment: 2-3 hours (learning curve)
- Subsequent deployments: 1-1.5 hours
- Quick fixes: 30 minutes (critical tests only)

### Return on Investment

**Previous Approach** (no verification):

- Failed deployments: 4+ times
- Debug time per failure: 2-4 hours
- User impact: High (app unusable)
- Developer frustration: Extreme
- **Total wasted time**: 8-16 hours

**New Approach** (with verification):

- Deployment time: 1.5 hours
- Failed deployments: 0 (or caught before release)
- User impact: None (working deployments)
- Developer confidence: High
- **Time saved**: 6.5-14.5 hours per deployment cycle

**ROI**: 400-900% time savings after initial setup

---

## Document Maintenance

### Updating Documentation

**When to update**:

- New critical features added
- Test cases change
- New endpoints added
- Build process changes

**How to update**:

1. Identify which document needs updating
2. Make changes with clear comments
3. Update version number and "Last Updated" date
4. Test changes before committing
5. Update this index if new sections added

**Responsible**: QA team, reviewed by senior developers

---

## Quick Links

| Document                                                   | Purpose                | Use When           | Time       |
| ---------------------------------------------------------- | ---------------------- | ------------------ | ---------- |
| [Pre-Deployment Checklist](QA_PRE_DEPLOYMENT_CHECKLIST.md) | Verify before building | Every deployment   | 30 min     |
| [Post-Deployment Testing](QA_POST_DEPLOYMENT_TESTING.md)   | Test deployed app      | After building     | 20-85 min  |
| [Build Verification](QA_BUILD_VERIFICATION_SYSTEM.md)      | Verify build artifacts | During/after build | 17-22 min  |
| [Regression Tests](QA_REGRESSION_TEST_SUITE.md)            | Prevent regressions    | Before deployment  | 20-115 min |
| [Verification Commands](QA_VERIFICATION_COMMANDS.md)       | Quick reference        | Throughout process | N/A        |

---

## Getting Started

### For Your Next Deployment

1. **Read this index** (you're here!)
2. **Open `QA_PRE_DEPLOYMENT_CHECKLIST.md`** in a browser/editor
3. **Execute each step** in the checklist
4. **Check every box** - no shortcuts!
5. **Only proceed** when 100% complete
6. **Move to next document** (Build Verification)
7. **Repeat** for all documents in order
8. **Sign off** when complete

### For Quick Verification

1. **Open `QA_VERIFICATION_COMMANDS.md`**
2. **Copy-paste commands** as needed
3. **Look for ✅ or ❌** in output
4. **Fix any ❌** before proceeding

### For Emergencies

1. **Run nuclear cache clear** (QA_BUILD_VERIFICATION_SYSTEM.md)
2. **Run pre-build verify** script
3. **Rebuild from scratch**
4. **Run critical tests only** (Test 1.1, 1.2 from Post-Deployment)
5. **Deploy if tests pass**

---

## Support and Questions

### Common Questions

**Q: Can I skip steps to save time?**
A: No. Skipping steps is why previous deployments failed. All steps are critical.

**Q: What if a test fails?**
A: Stop immediately. Do not proceed. Fix the issue, clear caches, rebuild, re-verify.

**Q: How often should I run regression tests?**
A: Before every deployment. Automated tests should run on every commit (CI/CD).

**Q: Can I automate more of this?**
A: Yes! Automate what you can (scripts provided), but critical tests require manual verification.

**Q: What's the minimum testing for a hotfix?**
A: Pre-deployment checklist (30 min) + Critical tests (20 min) + Regression (20 min) = 70 minutes minimum.

### Getting Help

**Issue**: Build cache detected
**Solution**: See `QA_BUILD_VERIFICATION_SYSTEM.md` → Cache Clearing section

**Issue**: Tests failing
**Solution**: See `QA_REGRESSION_TEST_SUITE.md` → Regression Fixes section

**Issue**: Database errors
**Solution**: See `QA_VERIFICATION_COMMANDS.md` → Database Verification section

**Issue**: Command not working
**Solution**: See `QA_VERIFICATION_COMMANDS.md` → Troubleshooting Commands section

---

## Conclusion

**This verification system ensures:**

1. **Code is actually deployed** (not cached)
2. **Deployed code actually works** (tested)
3. **Previous fixes don't break** (regression tests)
4. **Database state is correct** (verified)
5. **You have proof** (documentation, logs, screenshots)

**Bottom Line**: You will know with certainty that your fixes are deployed and working.

**No more guessing. No more failed deployments. No more wasted time.**

---

**Version**: 1.0
**Last Updated**: 2025-10-30
**Maintained By**: QA Team
**Next Review**: When deployment process changes

---

## Checklist for Using This System

Before claiming "deployment complete":

- [ ] Read QA_MASTER_INDEX.md (this document)
- [ ] Complete QA_PRE_DEPLOYMENT_CHECKLIST.md (100%)
- [ ] Complete QA_BUILD_VERIFICATION_SYSTEM.md (all checks pass)
- [ ] Complete QA_POST_DEPLOYMENT_TESTING.md (all P1 tests pass)
- [ ] Complete QA_REGRESSION_TEST_SUITE.md (all P0 tests pass)
- [ ] All verification commands executed successfully
- [ ] Screenshots/evidence collected
- [ ] Database state verified
- [ ] Sign-off documented
- [ ] Deployment approved

**Only then can you confidently say: "Fixes are deployed and verified."**
