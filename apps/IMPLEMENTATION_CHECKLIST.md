# Implementation Checklist: Metrics Display Flow

**Status:** ✅ Core fixes implemented - Ready for testing
**Date:** 2025-10-29

---

## Completed Items ✅

### Backend

- [x] Added on-demand metrics computation fallback in `getTodayMetrics()`
- [x] Enhanced error logging in onboarding service
- [x] Force recompute flag properly used
- [x] Production alerts for critical metrics failures

### iOS

- [x] Implemented automatic retry logic (3 attempts, 2s delays)
- [x] Improved sheet presentation and dismissal flow
- [x] Added loading state during retries
- [x] Prevented accidental sheet dismissal

---

## Testing Checklist (Before Production)

### Unit Tests

#### Backend

- [ ] Test `getTodayMetrics()` with missing metrics (triggers on-demand)
- [ ] Test `getTodayMetrics()` with existing metrics (cached path)
- [ ] Test `computeAndStoreMetrics()` with forceRecompute
- [ ] Test error handling in onboarding when metrics fail
- [ ] Test acknowledgement flow

#### iOS

- [ ] Test `fetchMetrics()` retry logic (mock 404 errors)
- [ ] Test successful first attempt (no retries)
- [ ] Test max retries reached (error state)
- [ ] Test acknowledgement flow
- [ ] Test sheet dismissal after acknowledgement

---

### Integration Tests

#### End-to-End Flow

- [ ] Complete onboarding → Metrics appear immediately
  - **Pass Criteria:** Metrics load within 3 seconds, no errors

- [ ] Complete onboarding → Backend slow → Retry succeeds
  - **Pass Criteria:** First attempt fails, retry succeeds, total time <7s

- [ ] Complete onboarding → Network interruption → Manual retry
  - **Pass Criteria:** Error state shown, retry button works

- [ ] Complete onboarding → Acknowledge metrics → Continue to app
  - **Pass Criteria:** Smooth transition, no UI glitches

#### Edge Cases

- [ ] User completes onboarding at 11:59:59 PM (day boundary)
  - **Pass Criteria:** Metrics still load correctly

- [ ] Multiple concurrent users complete onboarding
  - **Pass Criteria:** No race conditions, all metrics computed

- [ ] User in different timezone (e.g., Hawaii UTC-10)
  - **Pass Criteria:** Metrics load regardless of timezone

- [ ] Slow database query (simulate with delay)
  - **Pass Criteria:** Retry logic handles it gracefully

---

### Performance Tests

#### Latency

- [ ] Measure p50 latency for GET `/v1/profile/metrics/today`
  - **Target:** <200ms
  - **Measurement:** Run 100 requests, calculate percentiles

- [ ] Measure p95 latency for GET `/v1/profile/metrics/today`
  - **Target:** <500ms
  - **Measurement:** Include on-demand computation scenarios

- [ ] Measure p99 latency for GET `/v1/profile/metrics/today`
  - **Target:** <2000ms
  - **Measurement:** Include retry scenarios

#### Load Testing

- [ ] Test 100 concurrent onboarding completions
  - **Pass Criteria:** All users get metrics, no errors

- [ ] Test 1000 metrics queries per minute
  - **Pass Criteria:** Latency within targets, no timeouts

- [ ] Test sustained load (10 min, 100 req/min)
  - **Pass Criteria:** Performance stable, no degradation

---

### Manual Testing

#### iOS App Testing

- [ ] Clean install → Sign up → Complete onboarding → See metrics
- [ ] Airplane mode during metrics fetch → Error state → Manual retry
- [ ] Background app during metrics load → Resume → Metrics appear
- [ ] Force quit app after onboarding → Reopen → Metrics still work
- [ ] Low memory scenario → No crashes, proper error handling

#### User Experience

- [ ] Loading indicators display properly during retries
- [ ] Error messages are clear and actionable
- [ ] Metrics explanations are readable and educational
- [ ] "I Understand" button enables after viewing all metrics
- [ ] Sheet dismissal animation is smooth
- [ ] No UI glitches or flash of wrong content

---

## Monitoring Setup (Before Production)

### Backend Metrics

- [ ] Set up metric: `metrics.fetch.on_demand_computation_rate`
  - **Description:** % of fetches that trigger on-demand computation
  - **Alert:** Warning if >20% (means async computation often fails)

- [ ] Set up metric: `metrics.fetch.latency_p95`
  - **Description:** 95th percentile response time
  - **Alert:** Warning if >500ms

- [ ] Set up metric: `metrics.fetch.success_rate`
  - **Description:** % of successful metrics fetches
  - **Alert:** Critical if <95%

- [ ] Set up metric: `onboarding.metrics_computation_failures`
  - **Description:** Count of failed metrics computations after onboarding
  - **Alert:** Critical if >0 (in production, should be rare)

### iOS Metrics

- [ ] Track retry count distribution
  - **Expected:** 90%+ succeed on first attempt, <5% need 2+ retries

- [ ] Track time to metrics display
  - **Expected:** p95 <3 seconds from onboarding complete

- [ ] Track error rate
  - **Expected:** <1% of users see error screen

- [ ] Track acknowledgement rate
  - **Expected:** >95% of users acknowledge before continuing

### Logs

- [ ] Verify logs contain structured data (userId, timing, retry count)
- [ ] Verify production logs don't contain sensitive data
- [ ] Verify error logs include stack traces
- [ ] Set up log aggregation for "CRITICAL: Metrics computation failed"

---

## Database Optimization (Recommended)

### Index Creation

```sql
-- Improves query performance for metrics lookup
CREATE INDEX CONCURRENTLY idx_profile_metrics_user_computed
ON profile_metrics(user_id, computed_at DESC);

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM profile_metrics
WHERE user_id = 1
ORDER BY computed_at DESC
LIMIT 1;
```

- [ ] Create index in staging environment
- [ ] Verify query plan uses index (Index Scan, not Seq Scan)
- [ ] Measure performance improvement (should see 2-5x speedup)
- [ ] Create index in production (use CONCURRENTLY to avoid locks)

---

## Documentation Updates

### API Documentation

- [ ] Update `/v1/profile/metrics/today` docs
  - Document on-demand computation behavior
  - Document expected latency (200-500ms)
  - Document retry recommendations for clients

- [ ] Update error response docs
  - Document 404 scenarios and recovery
  - Document 500 scenarios and retry logic

### Code Comments

- [ ] Add comment explaining on-demand computation fallback
- [ ] Add comment explaining retry logic and timing
- [ ] Document performance targets in service layer

### User-Facing

- [ ] Update onboarding flow documentation
- [ ] Add troubleshooting guide for metrics not loading
- [ ] Document what to do if metrics fetch fails

---

## Deployment Plan

### Stage 1: Staging Deployment

- [ ] Deploy backend changes to staging
- [ ] Deploy iOS build to TestFlight
- [ ] Run full test suite
- [ ] Manual testing by QA team
- [ ] Load testing on staging environment
- [ ] Verify logs and monitoring

**Sign-off Required:** QA Lead, Backend Lead, iOS Lead

---

### Stage 2: Production Backend

- [ ] Create database backup before deployment
- [ ] Deploy backend changes during low-traffic window
- [ ] Create database index (CONCURRENTLY)
- [ ] Monitor error rates for 30 minutes
- [ ] Check logs for any unexpected errors
- [ ] Verify metrics dashboards show healthy state

**Rollback Plan:** If error rate >5%, revert backend deployment immediately

**Sign-off Required:** DevOps Lead, Backend Lead

---

### Stage 3: Production iOS

- [ ] Submit iOS build to App Store
- [ ] Release to 10% of users (phased release)
- [ ] Monitor crash rates and metrics fetch success
- [ ] Increase to 50% after 24 hours if stable
- [ ] Increase to 100% after 48 hours if stable

**Rollback Plan:** If crash rate increases >1%, halt rollout and investigate

**Sign-off Required:** iOS Lead, Product Manager

---

## Post-Deployment Monitoring (First Week)

### Day 1: Heavy Monitoring

- [ ] Monitor every hour for first 8 hours
- [ ] Check error rates, latency, success rates
- [ ] Review logs for any unexpected patterns
- [ ] Respond to any alerts immediately

### Day 2-3: Regular Monitoring

- [ ] Check metrics twice per day
- [ ] Review daily summary reports
- [ ] Address any issues within 4 hours

### Day 4-7: Baseline Establishment

- [ ] Calculate actual success rate (target: >99%)
- [ ] Calculate actual retry rate (target: <5%)
- [ ] Calculate actual p95 latency (target: <500ms)
- [ ] Calculate actual on-demand computation rate (target: <20%)

### Week 1 Review Meeting

- [ ] Review all metrics against targets
- [ ] Identify any unexpected patterns
- [ ] Decide on optimizations if needed
- [ ] Update alerts thresholds based on actual data

---

## Success Criteria Validation

After 1 week in production, verify:

- [ ] **Metrics Availability:** >99% of users see metrics after onboarding
- [ ] **No Errors:** <1% of users encounter error screen
- [ ] **Performance:** p95 latency <500ms
- [ ] **User Experience:** No user complaints about metrics loading
- [ ] **System Stability:** No crashes or system issues related to metrics
- [ ] **Support Tickets:** Zero tickets about "metrics not loading"

**If all criteria met:** Mark project as complete ✅

**If any criteria not met:** Investigate and implement additional optimizations

---

## Future Optimizations (Optional)

### High Priority

- [ ] Move metrics computation into onboarding transaction
  - **Benefit:** Eliminates need for on-demand computation
  - **Effort:** 1 day backend work
  - **Risk:** Low (can revert if issues)

- [ ] Add metrics caching layer (Redis)
  - **Benefit:** Faster queries, reduced DB load
  - **Effort:** 2-3 days backend work
  - **Risk:** Low (cache invalidation is simple)

### Medium Priority

- [ ] Return metrics in onboarding response
  - **Benefit:** Zero-latency metrics display
  - **Effort:** 2 days (backend + iOS)
  - **Risk:** Medium (breaking API change)

- [ ] Add metrics history view
  - **Benefit:** Better user engagement
  - **Effort:** 3-5 days iOS work
  - **Risk:** Low (new feature)

### Low Priority

- [ ] WebSocket updates for real-time metrics
  - **Benefit:** Live updates when metrics recomputed
  - **Effort:** 1-2 weeks (significant infrastructure)
  - **Risk:** High (complex system)

- [ ] Client-side metrics estimation
  - **Benefit:** Offline support
  - **Effort:** 2-3 days iOS work
  - **Risk:** Medium (accuracy concerns)

---

## Sign-Off

### Backend Team

- [ ] **Backend Lead:** Changes reviewed and approved
- [ ] **Database Admin:** Index strategy approved
- [ ] **DevOps:** Deployment plan approved

### iOS Team

- [ ] **iOS Lead:** Changes reviewed and approved
- [ ] **QA Lead:** Test plan approved
- [ ] **UX Designer:** User experience reviewed

### Product/Business

- [ ] **Product Manager:** Feature meets requirements
- [ ] **Support Lead:** Documentation updated
- [ ] **Analytics:** Tracking properly implemented

### Architecture

- [x] **Senior Architect:** Architecture reviewed and approved
  - **Date:** 2025-10-29
  - **Recommendation:** Approve for production with testing requirements

---

## Emergency Contacts

**If production issues arise:**

**Backend Issues:**

- Backend On-Call: [Contact Info]
- Database On-Call: [Contact Info]

**iOS Issues:**

- iOS On-Call: [Contact Info]
- App Store Contact: [Contact Info]

**Monitoring:**

- Monitoring Platform: [Link]
- Alert Dashboard: [Link]
- Log Aggregation: [Link]

---

**END OF CHECKLIST**

**Next Action:** Begin Stage 1 testing in staging environment
