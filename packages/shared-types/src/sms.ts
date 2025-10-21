/**
 * SMS/notification types for Twilio integration
 * Shared between API scheduling and mobile deep linking
 */

/**
 * SMS message type
 */
export enum SmsMessageType {
  MorningNudge = 'morning_nudge',
  EveningReminder = 'evening_reminder',
}

/**
 * SMS delivery status
 */
export enum SmsStatus {
  Queued = 'queued',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
}

/**
 * SMS log entity from database
 */
export interface SmsLog {
  id: number;
  userId: number;
  messageType: SmsMessageType;
  messageBody: string;
  twilioSid?: string | null;
  status: SmsStatus;
  sentAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  errorMessage?: string | null;
  createdAt: Date | string;
}

/**
 * SMS scheduling configuration
 */
export interface SmsScheduleConfig {
  userId: number;
  messageType: SmsMessageType;
  scheduledTime: string; // HH:MM format in user's timezone
  timezone: string;
  enabled: boolean;
}

/**
 * Deep link data embedded in SMS
 */
export interface SmsDeepLink {
  type: 'today_tasks' | 'task_detail' | 'onboarding';
  taskId?: number;
  date?: string; // YYYY-MM-DD
}

/**
 * SMS message template data
 */
export interface SmsMessageData {
  userName: string;
  tasksRemaining?: number;
  tasksCompleted?: number;
  streak?: number;
  deepLink?: string; // Full deep link URL
}

/**
 * Request to send SMS
 */
export interface SendSmsRequest {
  userId: number;
  messageType: SmsMessageType;
  messageData: SmsMessageData;
}

/**
 * Response from sending SMS
 */
export interface SendSmsResponse {
  success: boolean;
  messageId?: string; // Twilio SID
  error?: string;
}

/**
 * Twilio webhook payload
 */
export interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}
