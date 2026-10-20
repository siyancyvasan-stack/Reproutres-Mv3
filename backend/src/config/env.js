import 'dotenv/config';
import fs from 'fs';
import { z } from 'zod';
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(4000),
    MANAGER_PORT: z.coerce.number().int().positive().default(4001),
    SALES_PORT: z.coerce.number().int().positive().default(4002),
    FACTORY_PORT: z.coerce.number().int().positive().default(4003),
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(32).optional(),
    JWT_EXPIRES_IN: z.string().min(1).optional(),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
    JWT_ISSUER: z.string().min(3).default('reproutes-api'),
    JWT_AUDIENCE: z.string().min(3).default('reproutes-clients'),
    CORS_ORIGINS: z.string().default('https://reproutes.com,https://manager.reproutes.com,https://factory.reproutes.com,https://api.reproutes.com'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
    REDIS_URL: z.string().default(''),
    REDIS_KEY_PREFIX: z.string().regex(/^[a-zA-Z0-9:_-]+$/).default('reproutes:'),
    REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
    SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
    SOCKET_PRESENCE_TTL_SECONDS: z.coerce.number().int().min(30).max(300).default(60),
    ENFORCE_HTTPS: z.string().default('true').transform((value) => value === 'true'),
    HSTS_MAX_AGE_SECONDS: z.coerce.number().int().min(0).default(31_536_000),
    COOKIE_DOMAIN: z.string().default(''),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    SUPABASE_URL: z.string().url().or(z.literal('')).default(''),
    SUPABASE_PUBLISHABLE_KEY: z.string().default(''),
    SUPABASE_SECRET_KEY: z.string().default(''),
    SUPABASE_JWKS_URL: z.string().url().or(z.literal('')).default(''),
    SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('sales-images'),
    LOG_LEVEL: z.string().default('info'),
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.string().default('false').transform((value) => value === 'true'),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().default('Reproutes <no-reply@reproutes.com>'),
    OTP_TTL_MINUTES: z.coerce.number().int().min(5).max(30).default(10),
    WEBAUTHN_RP_ID: z.string().default('reproutes.com'),
    WEBAUTHN_ORIGIN: z.string().url().default('https://reproutes.com'),
    WEBAUTHN_RP_NAME: z.string().default('Reproutes'),
    GOOGLE_GENAI_API_KEY: z.string().default(''),
    GPS_HISTORY_RETENTION_DAYS: z.coerce.number().int().min(30).max(730).default(90),
    SMS_WEBHOOK_URL: z.string().url().or(z.literal('')).default(''),
    SMS_WEBHOOK_TOKEN: z.string().default(''),
    APP_VERSION: z.string().default(process.env.APP_VERSION || '2.0.0'),
    MIN_APP_VERSION_ANDROID: z.string().default(process.env.APP_VERSION || '2.0.0'),
    LATEST_APP_VERSION_ANDROID: z.string().default(process.env.APP_VERSION || '2.0.0'),
    UPDATE_URL_ANDROID: z.string().default(''),
    MIN_APP_VERSION_IOS: z.string().default(process.env.APP_VERSION || '2.0.0'),
    LATEST_APP_VERSION_IOS: z.string().default(process.env.APP_VERSION || '2.0.0'),
    UPDATE_URL_IOS: z.string().default(''),
    MIN_APP_VERSION_WEB: z.string().default(process.env.APP_VERSION || '2.0.0'),
    LATEST_APP_VERSION_WEB: z.string().default(process.env.APP_VERSION || '2.0.0'),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid server environment: ${z.prettifyError(parsed.error)}`);
}

// Sync backend package.json version with APP_VERSION from backend .env
try {
    const pkgPath = new URL('../../package.json', import.meta.url);
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version !== parsed.data.APP_VERSION) {
            pkg.version = parsed.data.APP_VERSION;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        }
    }
} catch {
    // Non-fatal if package.json cannot be synced
}
const normalized = {
    ...parsed.data,
    JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET ?? parsed.data.JWT_SECRET ?? '',
    JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET ?? '',
    JWT_ACCESS_TTL: parsed.data.JWT_EXPIRES_IN ?? parsed.data.JWT_ACCESS_TTL,
    SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY || parsed.data.SUPABASE_SECRET_KEY,
};
if (!normalized.JWT_ACCESS_SECRET || Buffer.byteLength(normalized.JWT_ACCESS_SECRET, 'utf8') < 32) {
    throw new Error('JWT_SECRET (or legacy JWT_ACCESS_SECRET) must contain at least 32 bytes (256 bits)');
}
if (normalized.NODE_ENV === 'production' &&
    !normalized.WEBAUTHN_ORIGIN.startsWith('https://')) {
    throw new Error('WEBAUTHN_ORIGIN must use HTTPS in production');
}
const webAuthnOrigin = new URL(normalized.WEBAUTHN_ORIGIN);
if (webAuthnOrigin.pathname !== '/' || webAuthnOrigin.search || webAuthnOrigin.hash) {
    throw new Error('WEBAUTHN_ORIGIN must be an origin without a path, query, or fragment');
}
if (normalized.WEBAUTHN_RP_ID !== 'localhost' &&
    webAuthnOrigin.hostname !== normalized.WEBAUTHN_RP_ID &&
    !webAuthnOrigin.hostname.endsWith(`.${normalized.WEBAUTHN_RP_ID}`)) {
    throw new Error('WEBAUTHN_ORIGIN hostname must equal or be a subdomain of WEBAUTHN_RP_ID');
}
if (normalized.NODE_ENV === 'production') {
    const anySupabaseVariable = Boolean(normalized.SUPABASE_URL ||
        normalized.SUPABASE_PUBLISHABLE_KEY ||
        normalized.SUPABASE_SERVICE_ROLE_KEY ||
        normalized.SUPABASE_JWKS_URL);
    const completeSupabaseConfiguration = Boolean(normalized.SUPABASE_URL &&
        normalized.SUPABASE_PUBLISHABLE_KEY &&
        normalized.SUPABASE_SERVICE_ROLE_KEY &&
        normalized.SUPABASE_JWKS_URL);
    if (anySupabaseVariable && !completeSupabaseConfiguration) {
        throw new Error('Supabase configuration is incomplete; set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, and SUPABASE_JWKS_URL together');
    }
    const placeholders = ['replace-with', 'changeme', 'change-me', 'secret'];
    const accessSecret = normalized.JWT_ACCESS_SECRET.toLowerCase();
    const refreshSecret = normalized.JWT_REFRESH_SECRET.toLowerCase();
    if (placeholders.some((value) => accessSecret.includes(value) || (refreshSecret && refreshSecret.includes(value)))) {
        throw new Error('JWT secrets must not contain placeholder values in production');
    }
    if (normalized.JWT_REFRESH_SECRET && normalized.JWT_ACCESS_SECRET === normalized.JWT_REFRESH_SECRET) {
        throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be independent values');
    }
    if (normalized.JWT_REFRESH_SECRET && Buffer.byteLength(normalized.JWT_REFRESH_SECRET, 'utf8') < 32) {
        throw new Error('JWT_REFRESH_SECRET must contain at least 32 bytes (256 bits)');
    }
    if (parsed.data.COOKIE_SAME_SITE === 'none' && !parsed.data.ENFORCE_HTTPS) {
        throw new Error('SameSite=None cookies require HTTPS enforcement in production');
    }
    if (!parsed.data.ENFORCE_HTTPS) {
        throw new Error('ENFORCE_HTTPS must be true in production');
    }
    if (!parsed.data.CORS_ORIGINS.split(',').every((origin) => origin.trim().startsWith('https://'))) {
        throw new Error('Every CORS_ORIGINS value must use HTTPS in production');
    }
    if (parsed.data.CORS_ORIGINS.includes('*')) {
        throw new Error('Wildcard CORS origins are not allowed in production');
    }
    if (parsed.data.WEBAUTHN_RP_ID === 'localhost' || parsed.data.WEBAUTHN_RP_ID.includes('://')) {
        throw new Error('WEBAUTHN_RP_ID must be the production hostname without a scheme');
    }
    const productionUrls = [normalized.DATABASE_URL, normalized.DIRECT_DATABASE_URL, normalized.REDIS_URL, normalized.SUPABASE_URL, normalized.SUPABASE_JWKS_URL]
        .filter((value) => Boolean(value));
    if (productionUrls.some((value) => /(?:localhost|127\.0\.0\.1|10\.0\.2\.2)/i.test(value))) {
        throw new Error('Production dependency URLs must not reference localhost or emulator loopback addresses');
    }
}
export const env = {
    ...normalized,
    DIRECT_DATABASE_URL: normalized.DIRECT_DATABASE_URL ?? normalized.DATABASE_URL,
    CORS_ORIGINS: normalized.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
};
