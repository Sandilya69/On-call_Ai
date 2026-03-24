import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  OPENAI_API_KEY: z.string().optional().default(""),
  DISCORD_BOT_TOKEN: z.string().optional().default(""),
  DISCORD_CLIENT_ID: z.string().optional().default(""),
  DISCORD_GUILD_ID: z.string().optional().default(""),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_FROM_NUMBER: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRY: z.string().default("8h"),
  WEBHOOK_HMAC_SECRET: z.string().min(8),
  STORAGE_BUCKET_URL: z.string().optional().default(""),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_REGION: z.string().optional().default("us-east-1"),
  S3_BUCKET_NAME: z.string().optional().default("oncall-maestro-audio"),
  GOOGLE_REDIRECT_URI: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PRO_PRICE_ID: z.string().optional().default(""),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().optional().default(""),
  APP_BASE_URL: z.string().optional().default(""),
  SENTRY_DSN: z.string().optional().default(""),
  DEDUP_TTL_SECONDS: z.coerce.number().default(30),
  GRACE_PERIOD_SECONDS: z.coerce.number().default(45),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
