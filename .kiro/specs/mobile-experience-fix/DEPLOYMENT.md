# Mobile Experience Fix - Deployment Guide

## Overview

This deployment introduces a dual-path architecture for mobile and desktop users, optimizing the mobile experience while preserving desktop functionality.

## Feature Flag

The mobile optimization can be controlled via the `NEXT_PUBLIC_MOBILE_OPT` environment variable:

- **Enabled (default)**: `NEXT_PUBLIC_MOBILE_OPT=true` or not set
- **Disabled**: `NEXT_PUBLIC_MOBILE_OPT=false`

## Pre-Deployment Checklist

- [ ] All code changes reviewed and approved
- [ ] No TypeScript/ESLint errors
- [ ] Environment variables configured
- [ ] Staging environment tested

## Deployment Steps

### 1. Deploy to Staging

```bash
# Build the application
npm run build

# Deploy to staging environment
# (Your deployment command here)
```

### 2. Staging Validation

Test on staging with real devices:

**iPhone 12 Mini (Primary Target)**:
- [ ] Type rapidly without lag
- [ ] Send messages successfully
- [ ] Receive messages in real-time
- [ ] Keyboard doesn't hide input
- [ ] Emoji picker works
- [ ] Reply functionality works
- [ ] Reactions work
- [ ] Network switch handling
- [ ] App backgrounding/foregrounding

**Android Device**:
- [ ] Same checklist as iOS

**Desktop (Regression)**:
- [ ] All existing features work
- [ ] Quill editor unchanged
- [ ] Keyboard shortcuts work
- [ ] Rich text formatting preserved

### 3. Gradual Production Rollout

**Phase 1: Canary (5% of traffic)**
- Deploy with feature flag enabled
- Monitor for 24 hours
- Check metrics:
  - Input lag < 50ms
  - Message delivery < 2s
  - Pusher connection uptime > 95%
  - Error rates

**Phase 2: Partial (25% of traffic)**
- If Phase 1 successful, increase to 25%
- Monitor for 24 hours

**Phase 3: Majority (50% of traffic)**
- If Phase 2 successful, increase to 50%
- Monitor for 24 hours

**Phase 4: Full Rollout (100% of traffic)**
- If Phase 3 successful, deploy to all users
- Continue monitoring

## Rollback Procedure

If critical issues arise:

### Quick Rollback (2 minutes)

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_MOBILE_OPT=false
   ```

2. Redeploy:
   ```bash
   npm run build
   # Deploy command
   ```

3. Verify:
   - Mobile users see desktop experience
   - All functionality works

### Full Rollback (5 minutes)

If environment variable rollback doesn't work:

1. Revert to previous Git commit:
   ```bash
   git revert HEAD
   git push
   ```

2. Redeploy previous version

## Monitoring

### Key Metrics

1. **Input Lag** (Target: <50ms)
   - Measure: Chrome DevTools Performance tab
   - Alert if: >100ms average

2. **Message Delivery Time** (Target: <2s)
   - Measure: Server logs + client timestamps
   - Alert if: >5s average

3. **Pusher Connection Uptime** (Target: >95%)
   - Measure: Connection state logs
   - Alert if: <90%

4. **Fallback Polling Activation Rate** (Target: <5%)
   - Measure: Polling hook activation
   - Alert if: >10%

5. **Error Rates**
   - Monitor: Browser console errors
   - Alert if: >1% increase

### Logging

**Development Mode**:
- All connection state changes logged
- Performance metrics logged
- Detailed error information

**Production Mode**:
- Only errors and critical events logged
- Structured logging for parsing
- Device type included in logs

## Troubleshooting

### Issue: Mobile users report typing lag

**Diagnosis**:
1. Check if feature flag is enabled
2. Verify device detection working (check console logs)
3. Check for JavaScript errors in console

**Solution**:
- If feature flag disabled, enable it
- If device detection failing, check user agent parsing
- If errors present, fix and redeploy

### Issue: Messages not updating on mobile

**Diagnosis**:
1. Check Pusher connection state (visible in header)
2. Check if fallback polling activated
3. Check network connectivity

**Solution**:
- If Pusher disconnected, check WebSocket configuration
- If polling not activating, check 10-second threshold
- If network issues, verify online/offline detection

### Issue: Desktop experience broken

**Diagnosis**:
1. Check if ChatInputDesktop rendering correctly
2. Verify Quill editor loading
3. Check for TypeScript errors

**Solution**:
- Rollback immediately using feature flag
- Fix issues in development
- Redeploy after validation

## Post-Deployment

### Week 1
- Monitor metrics daily
- Collect user feedback
- Address any issues promptly

### Week 2-4
- Continue monitoring
- Analyze performance data
- Plan Phase 2 enhancements

## Success Criteria

Deployment is successful if:
- [ ] Input lag < 50ms on mobile
- [ ] Message delivery < 2s
- [ ] Pusher uptime > 95%
- [ ] No increase in error rates
- [ ] Positive user feedback
- [ ] Desktop experience unchanged

## Contact

For deployment issues:
- Check logs in monitoring dashboard
- Review error tracking (Sentry/similar)
- Contact development team

## Notes

- Mobile optimization is opt-in by default
- Desktop users unaffected
- Backward compatible with existing messages
- No database schema changes required
