import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().default(isTest ? 'postgresql://test:test@localhost:5432/test' : ''),
  REDIS_URL: z.string().default(isTest ? 'redis://localhost:6379' : ''),
  // S3/MinIO Configuration
  S3_ENDPOINT: z.string().url().default(isTest ? 'http://localhost:9000' : 'http://localhost:9000'),
  S3_ACCESS_KEY_ID: z.string().min(1).default(isTest ? 'test' : 'minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default(isTest ? 'test' : 'minioadmin'),
  S3_BUCKET: z.string().default(isTest ? 'test-bucket' : 'gtsd-progress-photos'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(isTest ? 'http://localhost:4318' : ''),
  OTEL_SERVICE_NAME: z.string().default('gtsd-api'),
  GIT_SHA: z.string().default('unknown'),
  APP_VERSION: z.string().default('0.0.0'),
  // Twilio SMS configuration
  TWILIO_ACCOUNT_SID: z.string().default(isTest ? 'test_account_sid' : ''),
  TWILIO_AUTH_TOKEN: z.string().default(isTest ? 'test_auth_token' : ''),
  TWILIO_PHONE_NUMBER: z.string().default(isTest ? '+15551234567' : ''),
  // JWT Authentication
  JWT_SECRET: z.string().min(32).default(isTest ? 'test-secret-key-at-least-32-characters-long-for-testing' : ''),
  JWT_REFRESH_SECRET: z.string().min(32).default(isTest ? 'test-refresh-secret-key-at-least-32-chars-long' : ''),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;