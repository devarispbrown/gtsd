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
  S3_ENDPOINT: z.string().default(isTest ? 'http://localhost:9000' : ''),
  S3_ACCESS_KEY_ID: z.string().default(isTest ? 'test' : ''),
  S3_SECRET_ACCESS_KEY: z.string().default(isTest ? 'test' : ''),
  S3_BUCKET: z.string().default(isTest ? 'test-bucket' : ''),
  S3_REGION: z.string().default('us-east-1'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(isTest ? 'http://localhost:4318' : ''),
  OTEL_SERVICE_NAME: z.string().default('gtsd-api'),
  GIT_SHA: z.string().default('unknown'),
  APP_VERSION: z.string().default('0.0.0'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;