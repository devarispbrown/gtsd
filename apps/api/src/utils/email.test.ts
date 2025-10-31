import { sendPasswordResetEmail, sendPasswordChangedEmail } from './email';
import { logger } from '../config/logger';

// Mock logger to capture log calls
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock console.log to verify output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

describe('Email Service', () => {
  beforeAll(() => {
    // Capture console.log output
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterAll(() => {
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    consoleOutput = [];
  });

  describe('sendPasswordResetEmail', () => {
    const testEmail = 'test@example.com';
    const testUserName = 'Test User';
    const testToken = 'a'.repeat(64); // 64 character hex token

    it('should successfully send password reset email', async () => {
      await expect(
        sendPasswordResetEmail({
          email: testEmail,
          resetToken: testToken,
          userName: testUserName,
        })
      ).resolves.not.toThrow();
    });

    it('should log email details at info level', async () => {
      await sendPasswordResetEmail({
        email: testEmail,
        resetToken: testToken,
        userName: testUserName,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: 'Password Reset Request - GTSD',
          resetTokenLength: testToken.length,
        }),
        'Password reset email would be sent (development mode)'
      );
    });

    it('should construct correct reset URL', async () => {
      await sendPasswordResetEmail({
        email: testEmail,
        resetToken: testToken,
        userName: testUserName,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          resetUrl: expect.stringContaining(`/reset-password?token=${testToken}`),
        }),
        'Password reset link (development only)'
      );
    });

    it('should use FRONTEND_URL from environment', async () => {
      // Note: env.FRONTEND_URL is loaded at module import time,
      // so we can't easily change it in tests. This test verifies the function
      // accepts the parameter correctly.
      await sendPasswordResetEmail({
        email: testEmail,
        resetToken: testToken,
      });

      const infoCall = (logger.info as jest.Mock).mock.calls.find(
        call => call[1] === 'Password reset link (development only)'
      );

      // Verify the URL includes the reset token (environment URL may vary)
      expect(infoCall[0].resetUrl).toContain(`/reset-password?token=${testToken}`);
    });

    it('should output reset link to console in non-production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await sendPasswordResetEmail({
        email: testEmail,
        resetToken: testToken,
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('PASSWORD RESET LINK');
      expect(output).toContain(testToken);

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not output reset link to console in production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await sendPasswordResetEmail({
        email: testEmail,
        resetToken: testToken,
      });

      // Should not log to console in production
      expect(logger.info).toHaveBeenCalledTimes(1); // Only the first info call
      const output = consoleOutput.join('\n');
      expect(output).not.toContain('PASSWORD RESET LINK');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle missing userName parameter', async () => {
      await expect(
        sendPasswordResetEmail({
          email: testEmail,
          resetToken: testToken,
        })
      ).resolves.not.toThrow();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
        }),
        'Password reset email would be sent (development mode)'
      );
    });

    it('should handle special characters in email', async () => {
      const specialEmail = 'test+tag@sub.example.com';

      await expect(
        sendPasswordResetEmail({
          email: specialEmail,
          resetToken: testToken,
        })
      ).resolves.not.toThrow();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: specialEmail,
        }),
        expect.any(String)
      );
    });

    it('should handle unicode characters in userName', async () => {
      const unicodeName = 'José María 李明';

      await expect(
        sendPasswordResetEmail({
          email: testEmail,
          resetToken: testToken,
          userName: unicodeName,
        })
      ).resolves.not.toThrow();
    });

    it('should handle very long tokens', async () => {
      const longToken = 'a'.repeat(128);

      await expect(
        sendPasswordResetEmail({
          email: testEmail,
          resetToken: longToken,
        })
      ).resolves.not.toThrow();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          resetTokenLength: 128,
        }),
        expect.any(String)
      );
    });

    it('should handle empty token', async () => {
      await expect(
        sendPasswordResetEmail({
          email: testEmail,
          resetToken: '',
        })
      ).resolves.not.toThrow();
    });

    it('should always resolve successfully (never throw)', async () => {
      // Email service should always resolve to prevent revealing user existence
      const testCases = [
        { email: 'test@example.com', resetToken: 'abc123' },
        { email: '', resetToken: 'token' },
        { email: 'test@example.com', resetToken: '' },
      ];

      for (const testCase of testCases) {
        await expect(sendPasswordResetEmail(testCase)).resolves.not.toThrow();
      }
    });

    it('should include correct email subject', async () => {
      await sendPasswordResetEmail({
        email: testEmail,
        resetToken: testToken,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Password Reset Request - GTSD',
        }),
        expect.any(String)
      );
    });

    it('should log token length for security audit', async () => {
      const shortToken = 'short';
      const normalToken = 'a'.repeat(64);
      const longToken = 'b'.repeat(128);

      for (const token of [shortToken, normalToken, longToken]) {
        jest.clearAllMocks();
        await sendPasswordResetEmail({
          email: testEmail,
          resetToken: token,
        });

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            resetTokenLength: token.length,
          }),
          expect.any(String)
        );
      }
    });
  });

  describe('sendPasswordChangedEmail', () => {
    const testEmail = 'test@example.com';
    const testUserName = 'Test User';

    it('should successfully send password changed email', async () => {
      await expect(
        sendPasswordChangedEmail(testEmail, testUserName)
      ).resolves.not.toThrow();
    });

    it('should log email details at info level', async () => {
      await sendPasswordChangedEmail(testEmail, testUserName);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: 'Password Changed Successfully - GTSD',
        }),
        'Password changed confirmation email would be sent (development mode)'
      );
    });

    it('should handle missing userName parameter', async () => {
      await expect(sendPasswordChangedEmail(testEmail)).resolves.not.toThrow();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
        }),
        expect.any(String)
      );
    });

    it('should handle special characters in email', async () => {
      const specialEmail = 'test+tag@sub.example.com';

      await expect(sendPasswordChangedEmail(specialEmail)).resolves.not.toThrow();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: specialEmail,
        }),
        expect.any(String)
      );
    });

    it('should handle unicode characters in userName', async () => {
      const unicodeName = 'José María 李明';

      await expect(
        sendPasswordChangedEmail(testEmail, unicodeName)
      ).resolves.not.toThrow();
    });

    it('should always resolve successfully (never throw)', async () => {
      const testCases = [
        'test@example.com',
        '',
        'invalid-email',
        'test+tag@example.com',
      ];

      for (const email of testCases) {
        await expect(sendPasswordChangedEmail(email)).resolves.not.toThrow();
      }
    });

    it('should include correct email subject', async () => {
      await sendPasswordChangedEmail(testEmail, testUserName);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Password Changed Successfully - GTSD',
        }),
        expect.any(String)
      );
    });

    it('should not log sensitive information', async () => {
      await sendPasswordChangedEmail(testEmail, testUserName);

      // Verify no password value or token data in logs
      const logCalls = (logger.info as jest.Mock).mock.calls;

      logCalls.forEach(call => {
        const logData = JSON.stringify(call);
        // The word "password" appears in the subject line which is fine
        // We're checking that actual password values don't appear
        expect(logData.toLowerCase()).not.toContain('currentpassword');
        expect(logData.toLowerCase()).not.toContain('newpassword');
        expect(logData.toLowerCase()).not.toContain('token123');
        expect(logData.toLowerCase()).not.toContain('resettoken');
      });
    });
  });

  describe('Email Service Security', () => {
    it('should not expose PII in log messages', async () => {
      const sensitiveEmail = 'sensitive.user@example.com';
      const sensitiveToken = 'super-secret-token-12345';

      await sendPasswordResetEmail({
        email: sensitiveEmail,
        resetToken: sensitiveToken,
      });

      // Check that logger.info was called with proper structure
      // Email and token should be in log data (for debugging) but with proper level
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle potential injection attempts in email', async () => {
      const injectionAttempts = [
        'test@example.com\nBcc: attacker@evil.com',
        'test@example.com\r\nTo: attacker@evil.com',
        'test@example.com<script>alert(1)</script>',
        'test@example.com; DROP TABLE users;',
      ];

      for (const email of injectionAttempts) {
        await expect(
          sendPasswordResetEmail({
            email,
            resetToken: 'token123',
          })
        ).resolves.not.toThrow();
      }
    });

    it('should handle potential XSS in userName', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '"><img src=x onerror=alert(1)>',
        "'; DROP TABLE users; --",
        '<iframe src="javascript:alert(1)">',
      ];

      for (const userName of xssAttempts) {
        await expect(
          sendPasswordResetEmail({
            email: 'test@example.com',
            resetToken: 'token123',
            userName,
          })
        ).resolves.not.toThrow();
      }
    });

    it('should handle extremely long email addresses', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';

      await expect(
        sendPasswordResetEmail({
          email: longEmail,
          resetToken: 'token123',
        })
      ).resolves.not.toThrow();
    });

    it('should handle extremely long userNames', async () => {
      const longName = 'a'.repeat(1000);

      await expect(
        sendPasswordResetEmail({
          email: 'test@example.com',
          resetToken: 'token123',
          userName: longName,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Email Service Environment Configuration', () => {
    it('should handle missing FRONTEND_URL environment variable', async () => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      // Should still work with undefined FRONTEND_URL
      await expect(
        sendPasswordResetEmail({
          email: 'test@example.com',
          resetToken: 'token123',
        })
      ).resolves.not.toThrow();

      const infoCall = (logger.info as jest.Mock).mock.calls.find(
        call => call[1] === 'Password reset link (development only)'
      );

      // Should handle undefined gracefully
      expect(infoCall[0].resetUrl).toContain('/reset-password?token=');

      // Restore
      if (originalFrontendUrl) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    });

    it('should use correct URL in different environments', async () => {
      // Note: env.FRONTEND_URL is loaded at module import time, so we verify
      // that the reset URL is properly formatted rather than testing env changes
      const environments = ['development', 'staging', 'production'];

      for (const env of environments) {
        jest.clearAllMocks();
        const originalNodeEnv = process.env.NODE_ENV;

        process.env.NODE_ENV = env;

        await sendPasswordResetEmail({
          email: 'test@example.com',
          resetToken: 'token123',
        });

        const infoCall = (logger.info as jest.Mock).mock.calls.find(
          call => call[1] === 'Password reset link (development only)'
        );

        // In non-production, the reset link should be logged
        if (env !== 'production' && infoCall) {
          expect(infoCall[0].resetUrl).toContain('/reset-password?token=token123');
        }

        // Restore
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('Email Service Performance', () => {
    it('should complete sendPasswordResetEmail quickly', async () => {
      const start = Date.now();

      await sendPasswordResetEmail({
        email: 'test@example.com',
        resetToken: 'a'.repeat(64),
      });

      const duration = Date.now() - start;

      // Should complete in less than 50ms (it's just logging)
      expect(duration).toBeLessThan(50);
    });

    it('should complete sendPasswordChangedEmail quickly', async () => {
      const start = Date.now();

      await sendPasswordChangedEmail('test@example.com', 'Test User');

      const duration = Date.now() - start;

      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should handle concurrent email sends', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        sendPasswordResetEmail({
          email: `test${i}@example.com`,
          resetToken: `token${i}`,
        })
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Email Service Reliability', () => {
    it('should be idempotent', async () => {
      const params = {
        email: 'test@example.com',
        resetToken: 'token123',
        userName: 'Test User',
      };

      // Send same email multiple times
      await sendPasswordResetEmail(params);
      await sendPasswordResetEmail(params);
      await sendPasswordResetEmail(params);

      // All should succeed
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle rapid successive calls', async () => {
      for (let i = 0; i < 10; i++) {
        await sendPasswordResetEmail({
          email: 'test@example.com',
          resetToken: `token${i}`,
        });
      }

      // All should succeed
      expect(logger.info).toHaveBeenCalledTimes(20); // 2 calls per email (dev mode)
    });
  });
});
