import { Twilio } from 'twilio';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('twilio-service');

/**
 * Result of sending an SMS
 */
export interface SendSmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  errorMessage?: string;
  errorCode?: string;
}

/**
 * Twilio service for sending SMS messages
 * Handles A2P compliance and error tracking
 */
export class TwilioService {
  private client: Twilio;
  private fromNumber: string;

  constructor() {
    // Validate required credentials
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      const missing = [];
      if (!env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
      if (!env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
      if (!env.TWILIO_PHONE_NUMBER) missing.push('TWILIO_PHONE_NUMBER');

      throw new Error(
        `Missing required Twilio configuration: ${missing.join(', ')}. ` +
        `Please set these environment variables.`
      );
    }

    try {
      this.client = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      this.fromNumber = env.TWILIO_PHONE_NUMBER;

      // Validate phone number format
      if (!TwilioService.isValidPhoneNumber(this.fromNumber)) {
        throw new Error(
          `Invalid TWILIO_PHONE_NUMBER format: ${this.fromNumber}. ` +
          `Must be in E.164 format (e.g., +15551234567)`
        );
      }

      logger.info(
        { fromNumber: this.maskPhoneNumber(this.fromNumber) },
        'Twilio client initialized'
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Twilio client');
      throw error;
    }
  }

  /**
   * Send an SMS message via Twilio
   * Automatically includes opt-out footer for A2P compliance
   *
   * @param to - Recipient phone number (E.164 format recommended)
   * @param body - Message body
   * @returns Result with Twilio SID or error details
   */
  async sendSMS(to: string, body: string): Promise<SendSmsResult> {
    const span = tracer.startSpan('twilio.send_sms');

    try {
      // Add A2P compliance footer
      const messageWithFooter = `${body}\n\nReply STOP to opt out`;

      logger.info(
        {
          to: this.maskPhoneNumber(to),
          messageLength: messageWithFooter.length
        },
        'Sending SMS via Twilio'
      );

      const message = await this.client.messages.create({
        body: messageWithFooter,
        from: this.fromNumber,
        to: to,
      });

      logger.info(
        {
          sid: message.sid,
          status: message.status,
          to: this.maskPhoneNumber(to)
        },
        'SMS sent successfully'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('twilio.sid', message.sid);
      span.setAttribute('twilio.status', message.status);

      return {
        success: true,
        sid: message.sid,
        status: message.status,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string }).code || 'UNKNOWN';

      logger.error(
        {
          err: error,
          to: this.maskPhoneNumber(to),
          errorCode,
          errorMessage,
        },
        'Failed to send SMS'
      );

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage
      });
      span.recordException(error);

      return {
        success: false,
        errorMessage,
        errorCode,
      };
    } finally {
      span.end();
    }
  }

  /**
   * Validate a Twilio webhook signature
   * Used to verify that incoming webhooks are from Twilio
   *
   * @param signature - X-Twilio-Signature header value
   * @param url - Full webhook URL
   * @param params - Webhook parameters
   * @returns True if signature is valid
   */
  validateSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    try {
      // Twilio signature validation
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio') as {
        validateRequest: (
          authToken: string,
          signature: string,
          url: string,
          params: Record<string, string>
        ) => boolean;
      };
      return twilio.validateRequest(
        env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        params
      );
    } catch (error) {
      logger.error({ err: error }, 'Error validating Twilio signature');
      return false;
    }
  }

  /**
   * Mask phone number for logging (PII protection)
   * Example: +15551234567 -> +1555***4567
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 8) return '***';

    const lastFour = phone.slice(-4);
    const prefix = phone.slice(0, phone.length - 7);
    return `${prefix}***${lastFour}`;
  }

  /**
   * Format phone number to E.164 format
   * Ensures consistent phone number format for Twilio
   *
   * @param phone - Phone number in various formats
   * @returns E.164 formatted phone number or null if invalid
   */
  static formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If starts with 1 and has 11 digits, already E.164 format
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // If 10 digits, assume US/Canada and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If already has + prefix, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Invalid format
    return null;
  }

  /**
   * Check if a phone number is valid for SMS
   * Basic validation - checks format only
   */
  static isValidPhoneNumber(phone: string | null): boolean {
    if (!phone) return false;

    const formatted = this.formatPhoneNumber(phone);
    if (!formatted) return false;

    // Basic E.164 validation: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(formatted);
  }
}

/**
 * Singleton instance of TwilioService
 */
export const twilioService = new TwilioService();
