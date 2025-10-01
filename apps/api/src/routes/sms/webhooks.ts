import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../config/logger';
import { db } from '../../db/connection';
import { users, smsLogs } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { twilioService, TwilioService } from '../../services/twilio';
import { env } from '../../config/env';
import { strictLimiter } from '../../middleware/rateLimiter';
import { optOutCounter } from '../../metrics/sms-metrics';

const router = Router();

/**
 * Twilio webhook request body schema
 */
const twilioWebhookSchema = z.object({
  MessageSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  AccountSid: z.string().optional(),
  MessagingServiceSid: z.string().optional(),
  NumMedia: z.string().optional(),
  NumSegments: z.string().optional(),
  SmsMessageSid: z.string().optional(),
  SmsStatus: z.string().optional(),
  SmsSid: z.string().optional(),
});

/**
 * Generate TwiML response
 */
function generateTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;
}

/**
 * Handle STOP/START commands for SMS opt-out
 */
async function handleOptCommand(
  phoneNumber: string,
  command: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find user by phone number
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phoneNumber))
      .limit(1);

    if (!user) {
      logger.warn({ phoneNumber }, 'User not found for opt-out request');
      return {
        success: false,
        message:
          'Phone number not found in our system. If you need help, please contact support.',
      };
    }

    const isStop = command === 'STOP';
    const newOptInStatus = !isStop;

    // Update user's SMS opt-in status
    await db
      .update(users)
      .set({ smsOptIn: newOptInStatus })
      .where(eq(users.id, user.id));

    // Track opt-out in metrics
    if (isStop) {
      optOutCounter.inc();
    }

    logger.info(
      {
        userId: user.id,
        phoneNumber,
        command,
        newOptInStatus,
      },
      `User ${isStop ? 'opted out of' : 'opted into'} SMS notifications`
    );

    if (isStop) {
      return {
        success: true,
        message:
          'You have successfully opted out of SMS notifications. Reply START to opt back in.',
      };
    } else {
      return {
        success: true,
        message:
          'You have successfully opted back into SMS notifications. Reply STOP to opt out.',
      };
    }
  } catch (error) {
    logger.error({ err: error, phoneNumber, command }, 'Error handling opt command');
    return {
      success: false,
      message: 'An error occurred processing your request. Please try again later.',
    };
  }
}

/**
 * POST /v1/sms/webhook
 * Twilio webhook endpoint for incoming SMS messages
 * Handles STOP/START commands for opt-out management
 */
router.post('/webhook', strictLimiter, async (req: Request, res: Response) => {
  try {
    logger.info({ body: req.body }, 'Received Twilio webhook');

    // ALWAYS validate Twilio signature (use test credentials in non-prod)
    const signature = req.headers['x-twilio-signature'] as string;

    if (!signature) {
      logger.warn({ env: env.NODE_ENV }, 'Missing Twilio signature header');
      return res.status(403).json({ error: 'Missing signature' });
    }

    // Construct full URL
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    const isValid = twilioService.validateSignature(signature, url, req.body);

    if (!isValid) {
      logger.warn({ signature, url, env: env.NODE_ENV }, 'Invalid Twilio signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Parse and validate webhook data
    const parseResult = twilioWebhookSchema.safeParse(req.body);

    if (!parseResult.success) {
      logger.warn({ errors: parseResult.error.errors }, 'Invalid webhook payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { From, Body } = parseResult.data;

    // Support international numbers with proper E.164 format
    const phoneNumber = From.startsWith('+') ? From : `+${From.replace(/\D/g, '')}`;

    // Validate it's a proper E.164 number
    if (!TwilioService.isValidPhoneNumber(phoneNumber)) {
      logger.warn({ from: From, normalized: phoneNumber }, 'Invalid phone number format');
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Extract command from body (case-insensitive)
    const body = Body.trim().toUpperCase();

    let response: { success: boolean; message: string };

    if (body === 'STOP' || body.includes('UNSUBSCRIBE') || body.includes('CANCEL')) {
      response = await handleOptCommand(phoneNumber, 'STOP');
    } else if (body === 'START' || body.includes('SUBSCRIBE') || body.includes('RESUME')) {
      response = await handleOptCommand(phoneNumber, 'START');
    } else if (body === 'HELP' || body.includes('INFO')) {
      response = {
        success: true,
        message:
          'GTSD SMS Notifications. Reply STOP to opt out, START to opt in. For support, visit our website.',
      };
    } else {
      // Unknown command
      logger.info({ phoneNumber, body }, 'Received unknown SMS command');
      response = {
        success: true,
        message:
          'Command not recognized. Reply STOP to opt out, START to opt in, or HELP for info.',
      };
    }

    // Return TwiML response
    res.set('Content-Type', 'text/xml');
    return res.send(generateTwiML(response.message));
  } catch (error) {
    logger.error({ err: error }, 'Error processing Twilio webhook');

    // Return generic error TwiML
    res.set('Content-Type', 'text/xml');
    return res.send(
      generateTwiML('An error occurred processing your request. Please try again later.')
    );
  }
});

/**
 * POST /v1/sms/status
 * Twilio status callback endpoint
 * Receives delivery status updates for sent messages
 */
router.post('/status', strictLimiter, async (req: Request, res: Response) => {
  try {
    logger.info({ body: req.body }, 'Received Twilio status callback');

    // Validate Twilio signature (same as webhook endpoint)
    const signature = req.headers['x-twilio-signature'] as string;

    if (!signature) {
      logger.warn({ env: env.NODE_ENV }, 'Missing Twilio signature header on status callback');
      return res.status(403).json({ error: 'Missing signature' });
    }

    // Construct full URL
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    const isValid = twilioService.validateSignature(signature, url, req.body);

    if (!isValid) {
      logger.warn({ signature, url, env: env.NODE_ENV }, 'Invalid Twilio signature on status callback');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Now process status update
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    if (!MessageSid) {
      logger.warn('Missing MessageSid in status callback');
      return res.status(400).json({ error: 'Missing MessageSid' });
    }

    // Map Twilio statuses to our enum
    const statusMap: Record<string, 'queued' | 'sent' | 'delivered' | 'failed'> = {
      queued: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      undelivered: 'failed',
    };

    const dbStatus = statusMap[MessageStatus] || 'failed';

    // Update sms_logs with delivery status
    await db
      .update(smsLogs)
      .set({
        status: dbStatus,
        deliveredAt: dbStatus === 'delivered' ? new Date() : undefined,
        errorMessage: ErrorMessage || null,
      })
      .where(eq(smsLogs.twilioSid, MessageSid));

    logger.info(
      {
        messageSid: MessageSid,
        status: dbStatus,
        errorCode: ErrorCode,
      },
      'SMS status updated in database'
    );

    return res.status(200).send('OK');
  } catch (error) {
    logger.error({ err: error }, 'Error processing status callback');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /v1/sms/webhook
 * Health check endpoint for webhook
 */
router.get('/webhook', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    message: 'Twilio webhook endpoint is active',
  });
});

export default router;
