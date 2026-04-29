import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: required('MONGODB_URI'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  CLICKUP_CLIENT_ID: process.env.CLICKUP_CLIENT_ID || '',
  CLICKUP_CLIENT_SECRET: process.env.CLICKUP_CLIENT_SECRET || '',
  CLICKUP_REDIRECT_URI: process.env.CLICKUP_REDIRECT_URI || '',
  CLICKUP_TOKEN_ENC_KEY: process.env.CLICKUP_TOKEN_ENC_KEY || '',

  WEB_URL: process.env.WEB_URL || 'http://localhost:3000',
  CLICKUP_API_BASE:
    process.env.CLICKUP_API_BASE || 'https://api.clickup.com/api/v2',
  CLICKUP_AUTHORIZE_URL:
    process.env.CLICKUP_AUTHORIZE_URL || 'https://app.clickup.com/api',
};

export const isProd = env.NODE_ENV === 'production';

export function clickupConfigured(): boolean {
  return Boolean(
    env.CLICKUP_CLIENT_ID &&
      env.CLICKUP_CLIENT_SECRET &&
      env.CLICKUP_REDIRECT_URI &&
      env.CLICKUP_TOKEN_ENC_KEY,
  );
}
