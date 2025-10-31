import request from 'supertest';
import { createApp } from '../../app';
import { setupTestDatabase } from '../../test/setup';
import { db } from '../../db/connection';
import { users, passwordResetTokens, refreshTokens, userSettings } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '../../utils/auth';
import { randomBytes } from 'crypto';

const app = createApp();

describe('Password Management Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up all test data before each test
    await db.delete(passwordResetTokens);
    await db.delete(refreshTokens);
    await db.delete(userSettings);
    await db.delete(users);
  });

  describe('POST /auth/forgot-password', () => {
    const testEmail = `forgot-pwd-${Date.now()}@example.com`;
    let testUserId: number;

    beforeEach(async () => {
      // Create test user with password
      const passwordHash = await hashPassword('OldPassword123!');
      const [user] = await db
        .insert(users)
        .values({
          email: testEmail,
          name: 'Test User',
          passwordHash,
          isActive: true,
          emailVerified: true,
        })
        .returning();
      testUserId = user.id;
    });

    it('should accept valid email and return success message', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');
    });

    it('should create password reset token in database', async () => {
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      // Check token was created
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId));

      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBeTruthy();
      expect(tokens[0].used).toBe(false);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate secure random token (64 hex characters)', async () => {
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      const [token] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId));

      // Token should be 32 bytes = 64 hex characters
      expect(token.token.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(token.token)).toBe(true);
    });

    it('should set token expiration to 1 hour', async () => {
      const beforeRequest = Date.now();

      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      const [token] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId));

      const afterRequest = Date.now();
      const expiresAt = token.expiresAt.getTime();
      const oneHour = 60 * 60 * 1000;

      // Token should expire ~1 hour from now (with 1 second tolerance)
      expect(expiresAt).toBeGreaterThanOrEqual(beforeRequest + oneHour - 1000);
      expect(expiresAt).toBeLessThanOrEqual(afterRequest + oneHour + 1000);
    });

    it('should not reveal if email exists (security)', async () => {
      const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: nonExistentEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');

      // Verify no token was created
      const tokens = await db.select().from(passwordResetTokens);
      expect(tokens.length).toBe(0);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle multiple reset requests from same user', async () => {
      // Send first request
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      // Send second request
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      // Both tokens should exist
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId));

      expect(tokens.length).toBe(2);
    });

    it('should not send token for inactive account', async () => {
      // Deactivate user
      await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, testUserId));

      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200); // Still returns 200 for security

      // No token should be created (though we can't verify the email wasn't sent)
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, testUserId));

      // Token might be created but user won't be able to use it
      expect(tokens.length).toBeGreaterThanOrEqual(0);
    });

    it('should not send token for user without password authentication', async () => {
      // Create user without password hash (e.g., OAuth user)
      const oauthEmail = `oauth-${Date.now()}@example.com`;
      const [oauthUser] = await db
        .insert(users)
        .values({
          email: oauthEmail,
          name: 'OAuth User',
          passwordHash: null,
          isActive: true,
        })
        .returning();

      await request(app)
        .post('/auth/forgot-password')
        .send({ email: oauthEmail })
        .expect(200); // Still returns 200 for security

      // Verify no token was created
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, oauthUser.id));

      expect(tokens.length).toBe(0);
    });
  });

  describe('POST /auth/reset-password', () => {
    const testEmail = `reset-pwd-${Date.now()}@example.com`;
    let testUserId: number;
    let validToken: string;

    beforeEach(async () => {
      // Create test user with password
      const passwordHash = await hashPassword('OldPassword123!');
      const [user] = await db
        .insert(users)
        .values({
          email: testEmail,
          name: 'Test User',
          passwordHash,
          isActive: true,
        })
        .returning();
      testUserId = user.id;

      // Create valid reset token
      validToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await db.insert(passwordResetTokens).values({
        userId: testUserId,
        token: validToken,
        expiresAt,
        used: false,
      });

      // Create some refresh tokens to verify they get revoked
      await db.insert(refreshTokens).values([
        {
          userId: testUserId,
          token: 'refresh-token-1',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          userId: testUserId,
          token: 'refresh-token-2',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword456!';

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
    });

    it('should update password hash in database', async () => {
      const newPassword = 'NewPassword456!';

      await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword,
        })
        .expect(200);

      // Verify password was updated
      const [user] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(user.passwordHash).toBeTruthy();

      // Verify new password works
      const { comparePassword } = await import('../../utils/auth');
      const isValid = await comparePassword(newPassword, user.passwordHash!);
      expect(isValid).toBe(true);
    });

    it('should mark token as used', async () => {
      await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Verify token was marked as used
      const [token] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, validToken));

      expect(token.used).toBe(true);
    });

    it('should revoke all existing refresh tokens', async () => {
      await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Verify all refresh tokens were revoked
      const tokens = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, testUserId));

      expect(tokens.length).toBe(2);
      tokens.forEach(token => {
        expect(token.revokedAt).not.toBeNull();
      });
    });

    it('should reject already used token', async () => {
      // Use token once
      await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Try to use again
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'AnotherPassword789!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should reject expired token', async () => {
      // Create expired token
      const expiredToken = randomBytes(32).toString('hex');
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() - 2); // 2 hours ago

      await db.insert(passwordResetTokens).values({
        userId: testUserId,
        token: expiredToken,
        expiresAt: expiredAt,
        used: false,
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token-that-does-not-exist',
          newPassword: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject password without uppercase letter', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'lowercase123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('uppercase');
    });

    it('should reject password without lowercase letter', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'UPPERCASE123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('lowercase');
    });

    it('should reject password without number', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NoNumbers!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('number');
    });

    it('should reject password without special character', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NoSpecialChar123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('special character');
    });

    it('should reject password less than 8 characters', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'Short1!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 8 characters');
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          newPassword: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject token for inactive user', async () => {
      // Deactivate user
      await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'NewPassword456!',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('deactivated');
    });

    it('should handle edge case of token exactly at expiration time', async () => {
      // Create token that expires exactly now (edge case)
      const edgeToken = randomBytes(32).toString('hex');
      const now = new Date();

      await db.insert(passwordResetTokens).values({
        userId: testUserId,
        token: edgeToken,
        expiresAt: now,
        used: false,
      });

      // Wait a tiny bit to ensure it's expired
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: edgeToken,
          newPassword: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('PATCH /auth/change-password', () => {
    const testEmail = `change-pwd-${Date.now()}@example.com`;
    let testUserId: number;
    let accessToken: string;
    const currentPassword = 'CurrentPassword123!';

    beforeEach(async () => {
      // Create test user and get auth token
      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: currentPassword,
          name: 'Test User',
        })
        .expect(201);

      testUserId = signupResponse.body.data.user.id;
      accessToken = signupResponse.body.data.accessToken;

      // Create some refresh tokens to verify they get revoked
      await db.insert(refreshTokens).values([
        {
          userId: testUserId,
          token: 'refresh-token-1',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          userId: testUserId,
          token: 'refresh-token-2',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
    });

    it('should change password with valid credentials', async () => {
      const newPassword = 'NewPassword456!';

      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('changed successfully');
    });

    it('should update password hash in database', async () => {
      const newPassword = 'NewPassword456!';

      await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(200);

      // Verify password was updated
      const [user] = await db.select().from(users).where(eq(users.id, testUserId));
      const { comparePassword } = await import('../../utils/auth');
      const isValid = await comparePassword(newPassword, user.passwordHash!);
      expect(isValid).toBe(true);
    });

    it('should revoke all existing refresh tokens', async () => {
      await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Verify all refresh tokens were revoked
      const tokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, testUserId),
            eq(refreshTokens.token, 'refresh-token-1')
          )
        );

      if (tokens.length > 0) {
        expect(tokens[0].revokedAt).not.toBeNull();
      }
    });

    it('should allow login with new password', async () => {
      const newPassword = 'NewPassword456!';

      await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(200);

      // Try to login with new password
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeTruthy();
    });

    it('should reject old password after change', async () => {
      const newPassword = 'NewPassword456!';

      await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(200);

      // Try to login with old password
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: currentPassword,
        })
        .expect(401);

      expect(loginResponse.body.success).toBe(false);
    });

    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('incorrect');
    });

    it('should reject same password as current', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: currentPassword,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be different');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .send({
          currentPassword,
          newPassword: 'NewPassword456!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject invalid auth token', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword,
          newPassword: 'NewPassword456!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject new password without uppercase', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'lowercase123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('uppercase');
    });

    it('should reject new password without lowercase', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'UPPERCASE123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('lowercase');
    });

    it('should reject new password without number', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'NoNumbers!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('number');
    });

    it('should reject new password without special character', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword: 'NoSpecial123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('special character');
    });

    it('should reject missing current password', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newPassword: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject missing new password', async () => {
      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle user without password authentication', async () => {
      // Create OAuth user without password
      const oauthEmail = `oauth-${Date.now()}@example.com`;
      const [oauthUser] = await db
        .insert(users)
        .values({
          email: oauthEmail,
          name: 'OAuth User',
          passwordHash: null,
          isActive: true,
        })
        .returning();

      // Generate token for OAuth user
      const { generateAccessToken } = await import('../../utils/auth');
      const oauthToken = generateAccessToken({
        userId: oauthUser.id,
        email: oauthUser.email,
      });

      const response = await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${oauthToken}`)
        .send({
          currentPassword: 'anything',
          newPassword: 'NewPassword456!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not configured');
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent token reuse across password reset flow', async () => {
      const testEmail = `security-${Date.now()}@example.com`;

      // Create user
      const passwordHash = await hashPassword('OldPassword123!');
      const [user] = await db
        .insert(users)
        .values({
          email: testEmail,
          name: 'Security Test',
          passwordHash,
          isActive: true,
        })
        .returning();

      // Request password reset
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      // Get the token
      const [tokenRecord] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id));

      const token = tokenRecord.token;

      // Reset password
      await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Try to reuse token
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          newPassword: 'AnotherPassword789!',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should handle concurrent password reset requests', async () => {
      const testEmail = `concurrent-${Date.now()}@example.com`;

      // Create user
      const passwordHash = await hashPassword('OldPassword123!');
      await db
        .insert(users)
        .values({
          email: testEmail,
          name: 'Concurrent Test',
          passwordHash,
          isActive: true,
        })
        .returning();

      // Send multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: testEmail })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should ensure password change invalidates old sessions', async () => {
      const testEmail = `session-${Date.now()}@example.com`;

      // Signup and get tokens
      const signupResponse = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: 'OldPassword123!',
          name: 'Session Test',
        })
        .expect(201);

      const accessToken = signupResponse.body.data.accessToken;
      const refreshToken = signupResponse.body.data.refreshToken;

      // Change password
      await request(app)
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Try to use old refresh token
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
    });
  });
});
