import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  // Seconds, not a duration string — keeps the type a plain `number`, which
  // jsonwebtoken's SignOptions.expiresIn accepts directly with no extra
  // parsing/casting needed.
  JWT_EXPIRES_IN_SECONDS: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? DEFAULT_JWT_EXPIRES_IN_SECONDS),
  PORT: Number(process.env.PORT ?? 4000),
  WEB_BASE_URL: process.env.WEB_BASE_URL ?? "http://localhost:3000",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
