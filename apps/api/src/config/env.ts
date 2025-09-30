import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  S3_ENDPOINT: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string(),
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