import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  getRefreshTokenExpiry,
  validatePasswordStrength,
  extractTokenFromHeader,
} from './auth';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses salt, so hashes differ
    });

    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword('WrongPass123!', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken({
        userId: 1,
        email: 'test@example.com',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user data in token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
      };

      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should include expiration in token', () => {
      const token = generateAccessToken({
        userId: 1,
        email: 'test@example.com',
      });

      const decoded = verifyAccessToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken({
        userId: 1,
        email: 'test@example.com',
      });

      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    it('should reject invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid.token.here');
      }).toThrow('Invalid token');
    });

    it('should reject malformed token', () => {
      expect(() => {
        verifyAccessToken('not-a-jwt');
      }).toThrow();
    });
  });

  describe('Refresh Token Generation', () => {
    it('should generate a refresh token', () => {
      const token = generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('Refresh Token Expiry', () => {
    it('should return a future date', () => {
      const expiry = getRefreshTokenExpiry();
      const now = new Date();

      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should be approximately 7 days in the future', () => {
      const expiry = getRefreshTokenExpiry();
      const now = new Date();
      const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeCloseTo(7, 0);
    });
  });

  describe('Password Validation', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('SecurePass123!');

      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject password too short', () => {
      const result = validatePasswordStrength('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('nocaps123!');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('NOLOWER123!');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject password without numbers', () => {
      const result = validatePasswordStrength('NoNumbers!');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should reject password without special characters', () => {
      const result = validatePasswordStrength('NoSpecial123');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('special character');
    });
  });

  describe('Token Extraction from Header', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid format', () => {
      const extracted = extractTokenFromHeader('InvalidFormat');

      expect(extracted).toBeNull();
    });

    it('should return null for wrong auth scheme', () => {
      const extracted = extractTokenFromHeader('Basic dXNlcjpwYXNz');

      expect(extracted).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const extracted = extractTokenFromHeader('Bearer');

      expect(extracted).toBeNull();
    });
  });
});
