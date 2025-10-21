import { eq, and, gt, lt } from 'drizzle-orm';
import { db } from '../../db/connection';
import { users, refreshTokens, SelectUser } from '../../db/schema';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  validatePasswordStrength,
} from '../../utils/auth';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async signup(input: SignupInput): Promise<AuthResponse> {
    logger.info({ email: input.email }, 'User signup attempt');

    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.isValid) {
      throw new AppError(400, passwordValidation.message || 'Invalid password');
    }

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, input.email));

    if (existingUsers.length > 0) {
      throw new AppError(409, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
        phone: input.phone,
        isActive: true,
        emailVerified: false,
      })
      .returning();

    logger.info({ userId: newUser.id, email: newUser.email }, 'User created successfully');

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
    });

    const refreshTokenValue = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    // Store refresh token
    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: refreshTokenValue,
      expiresAt,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        emailVerified: newUser.emailVerified,
      },
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  /**
   * Login an existing user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    logger.info({ email: input.email }, 'User login attempt');

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, input.email));

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new AppError(401, 'Password authentication not configured for this account');
    }

    // Verify password
    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated');
    }

    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshTokenValue = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    // Store refresh token
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshTokenValue: string): Promise<{ accessToken: string; refreshToken: string }> {
    logger.debug('Token refresh attempt');

    // Find refresh token
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshTokenValue),
          gt(refreshTokens.expiresAt, new Date())
        )
      );

    if (!tokenRecord) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Check if token has been revoked
    if (tokenRecord.revokedAt) {
      throw new AppError(401, 'Refresh token has been revoked');
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, tokenRecord.userId));

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is deactivated');
    }

    // Generate new tokens (refresh token rotation)
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const newRefreshToken = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    // Revoke old refresh token and store the replacement
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedBy: newRefreshToken,
      })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // Store new refresh token
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt,
    });

    logger.info({ userId: user.id }, 'Token refreshed successfully');

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshTokenValue: string): Promise<void> {
    logger.debug('User logout attempt');

    // Revoke refresh token
    const result = await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, refreshTokenValue))
      .returning();

    if (result.length === 0) {
      throw new AppError(404, 'Refresh token not found');
    }

    logger.info({ userId: result[0].userId }, 'User logged out successfully');
  }

  /**
   * Get user by ID (for profile endpoints)
   */
  async getUserById(userId: number): Promise<SelectUser> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  /**
   * Revoke all refresh tokens for a user (useful for security scenarios)
   */
  async revokeAllTokens(userId: number): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revokedAt, null as any) // Not already revoked
        )
      );

    logger.info({ userId }, 'All refresh tokens revoked for user');
  }

  /**
   * Clean up expired refresh tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now))
      .returning();

    logger.info({ count: result.length }, 'Expired refresh tokens cleaned up');

    return result.length;
  }
}
