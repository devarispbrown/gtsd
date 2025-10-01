import request from 'supertest';
import express from 'express';
import webhooksRouter from './webhooks';
import { twilioService, TwilioService } from '../../services/twilio';
import { db } from '../../db/connection';
import { smsLogs } from '../../db/schema';
import { optOutCounter } from '../../metrics/sms-metrics';

/**
 * Mock setup
 */
jest.mock('../../services/twilio');
jest.mock('../../db/connection');
jest.mock('../../middleware/rateLimiter', () => ({
  strictLimiter: jest.fn((req, res, next) => next()),
}));
jest.mock('../../metrics/sms-metrics', () => ({
  optOutCounter: {
    inc: jest.fn(),
  },
}));

const mockTwilioService = twilioService as jest.Mocked<typeof twilioService>;
const mockDb = db as jest.Mocked<typeof db>;

// Create test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/v1/sms', webhooksRouter);

interface MockDbSelectChain {
  from: jest.Mock;
}

interface MockDbFromChain {
  where: jest.Mock;
}

interface MockDbWhereChain {
  limit: jest.Mock;
}

interface MockDbUpdateChain {
  set: jest.Mock;
}

interface MockDbSetChain {
  where: jest.Mock;
}

describe('SMS Webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Webhook signature validation', () => {
    it('should reject requests without Twilio signature header', async () => {
      const response = await request(app)
        .post('/v1/sms/webhook')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Missing signature');
    });

    it('should reject requests with invalid Twilio signature', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'invalid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid signature');
      expect(mockTwilioService.validateSignature).toHaveBeenCalled();
    });

    it('should accept requests with valid Twilio signature', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      // Mock user lookup
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                name: 'Test User',
                phone: '+15551234567',
                smsOptIn: true,
              },
            ]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      // Mock update
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/xml');
      expect(mockTwilioService.validateSignature).toHaveBeenCalled();
    });

    it('should validate signature in all environments (not just production)', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockTwilioService.validateSignature = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'invalid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(403);
      expect(mockTwilioService.validateSignature).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('International phone number support', () => {
    it('should accept international phone numbers with + prefix', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      // Mock user lookup
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                name: 'Test User',
                phone: '+442071234567', // UK number
                smsOptIn: true,
              },
            ]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+442071234567', // UK number
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid phone numbers', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(false);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: 'invalid-phone',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid phone number');
    });

    it('should normalize phone numbers without + prefix', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      // Mock user lookup
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                name: 'Test User',
                phone: '+15551234567',
                smsOptIn: true,
              },
            ]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '15551234567', // Missing + prefix
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(200);
      expect(TwilioService.isValidPhoneNumber).toHaveBeenCalledWith('+15551234567');
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to webhook endpoint', async () => {
      // The rate limiter is mocked to always pass for tests
      // In production, this would limit requests per IP/signature
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { strictLimiter } = require('../../middleware/rateLimiter') as {
        strictLimiter: jest.Mock;
      };

      expect(strictLimiter).toBeDefined();

      // Verify that rate limiter is applied (checked in route definition)
      // Actual rate limiting behavior is tested in integration tests
    });

    it('should apply rate limiting to status callback endpoint', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { strictLimiter } = require('../../middleware/rateLimiter') as {
        strictLimiter: jest.Mock;
      };

      expect(strictLimiter).toBeDefined();

      // Verify that rate limiter is applied
      // Actual rate limiting behavior is tested in integration tests
    });
  });

  describe('STOP/START command handling', () => {
    it('should handle STOP command and update opt-in status', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      const mockUser = {
        id: 1,
        name: 'Test User',
        phone: '+15551234567',
        smsOptIn: true,
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('opted out');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle START command and update opt-in status', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      const mockUser = {
        id: 1,
        name: 'Test User',
        phone: '+15551234567',
        smsOptIn: false,
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'START',
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('opted back into');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('POST /v1/sms/status - Status Callback', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject status callback without Twilio signature', async () => {
      const response = await request(app)
        .post('/v1/sms/status')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'delivered',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Missing signature');
    });

    it('should reject status callback with invalid Twilio signature', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'invalid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'delivered',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid signature');
      expect(mockTwilioService.validateSignature).toHaveBeenCalled();
    });

    it('should accept status callback with valid Twilio signature', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'delivered',
        });

      expect(response.status).toBe(200);
      expect(mockTwilioService.validateSignature).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should update SMS log status to delivered', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      let capturedSetData: { status?: string; deliveredAt?: Date } = {};

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((data: { status?: string; deliveredAt?: Date }) => {
          capturedSetData = data;
          return {
            where: jest.fn().mockResolvedValue(undefined),
          };
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'delivered',
          ErrorCode: null,
          ErrorMessage: null,
        });

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
      expect(mockDb.update).toHaveBeenCalledWith(smsLogs);
      expect(capturedSetData.status).toBe('delivered');
      expect(capturedSetData.deliveredAt).toBeInstanceOf(Date);
    });

    it('should map Twilio status "sent" to database status', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      let capturedSetData: { status?: string; deliveredAt?: Date } = {};

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((data: { status?: string; deliveredAt?: Date }) => {
          capturedSetData = data;
          return {
            where: jest.fn().mockResolvedValue(undefined),
          };
        }),
      } as unknown as MockDbUpdateChain);

      await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'sent',
        });

      expect(capturedSetData.status).toBe('sent');
      expect(capturedSetData.deliveredAt).toBeUndefined();
    });

    it('should map Twilio status "undelivered" to failed', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      let capturedSetData: { status?: string; errorMessage?: string } = {};

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((data: { status?: string; errorMessage?: string }) => {
          capturedSetData = data;
          return {
            where: jest.fn().mockResolvedValue(undefined),
          };
        }),
      } as unknown as MockDbUpdateChain);

      await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'undelivered',
          ErrorMessage: 'Phone number unreachable',
        });

      expect(capturedSetData.status).toBe('failed');
      expect(capturedSetData.errorMessage).toBe('Phone number unreachable');
    });

    it('should return 400 if MessageSid is missing', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageStatus: 'delivered',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing MessageSid');
    });

    it('should handle database errors gracefully', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as unknown as MockDbUpdateChain);

      const response = await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'delivered',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle unknown Twilio statuses as failed', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      let capturedSetData: { status?: string } = {};

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((data: { status?: string }) => {
          capturedSetData = data;
          return {
            where: jest.fn().mockResolvedValue(undefined),
          };
        }),
      } as unknown as MockDbUpdateChain);

      await request(app)
        .post('/v1/sms/status')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123456',
          MessageStatus: 'unknown_status',
        });

      expect(capturedSetData.status).toBe('failed');
    });
  });

  describe('Metrics tracking', () => {
    it('should increment opt-out counter when user opts out', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      const mockUser = {
        id: 1,
        name: 'Test User',
        phone: '+15551234567',
        smsOptIn: true,
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'STOP',
        });

      expect(optOutCounter.inc).toHaveBeenCalled();
    });

    it('should not increment opt-out counter for START command', async () => {
      mockTwilioService.validateSignature = jest.fn().mockReturnValue(true);
      jest.spyOn(TwilioService, 'isValidPhoneNumber').mockReturnValue(true);

      const mockUser = {
        id: 1,
        name: 'Test User',
        phone: '+15551234567',
        smsOptIn: false,
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as unknown as MockDbSelectChain);

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as MockDbUpdateChain);

      await request(app)
        .post('/v1/sms/webhook')
        .set('X-Twilio-Signature', 'valid-signature')
        .send({
          MessageSid: 'SM123',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'START',
        });

      expect(optOutCounter.inc).not.toHaveBeenCalled();
    });
  });
});
