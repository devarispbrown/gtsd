import { Counter, Histogram, Gauge } from 'prom-client';
import { register } from '../config/metrics';

/**
 * SMS sent counter
 * Tracks total SMS messages sent by type and status
 */
export const smsCounter = new Counter({
  name: 'sms_sent_total',
  help: 'Total SMS messages sent',
  labelNames: ['type', 'status'],
  registers: [register],
});

/**
 * SMS processing duration
 * Tracks time taken to process SMS jobs
 */
export const smsDuration = new Histogram({
  name: 'sms_processing_duration_seconds',
  help: 'SMS job processing duration in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * SMS queue size
 * Tracks current number of SMS jobs in queue
 */
export const smsQueueSize = new Gauge({
  name: 'sms_queue_size',
  help: 'Current size of SMS queue',
  registers: [register],
});

/**
 * Quiet hours skip counter
 * Tracks SMS skipped due to quiet hours
 */
export const quietHoursSkipped = new Counter({
  name: 'sms_quiet_hours_skipped_total',
  help: 'Total SMS skipped due to quiet hours',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Opt-out counter
 * Tracks total SMS opt-outs
 */
export const optOutCounter = new Counter({
  name: 'sms_opt_out_total',
  help: 'Total SMS opt-outs',
  registers: [register],
});
