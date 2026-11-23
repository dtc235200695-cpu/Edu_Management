import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OAuth2Client } from "google-auth-library";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(currentDir, "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 8787);
const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
const defaultRedirectUri = `http://localhost:${port}/auth/google/callback`;

function getGoogleRedirectUri() {
  if (!configuredRedirectUri) return isProduction ? "" : defaultRedirectUri;

  try {
    const url = new URL(configuredRedirectUri);
    const localHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (
      url.pathname !== "/auth/google/callback" ||
      url.search ||
      url.hash ||
      (isProduction && url.protocol !== "https:") ||
      (!isProduction && url.protocol !== "https:" && !localHttp)
    ) {
      return "";
    }
    return configuredRedirectUri;
  } catch {
    return "";
  }
}

export const config = {
  port,
  appUrl: process.env.APP_URL || "http://localhost:5173",
  appOrigin: new URL(process.env.APP_URL || "http://localhost:5173").origin,
  workerUrl: process.env.CLOUDFLARE_WORKER_URL || "",
  workerSecret: process.env.LEARNWISE_API_SECRET || "",
  adminEmail: (process.env.ADMIN_EMAIL || "hoanghai69205@gmail.com").trim().toLowerCase(),
  redirectUri: getGoogleRedirectUri(),
  cookieSecure:
    process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  sessionSecret: process.env.SESSION_SECRET || "",
  mailHost: process.env.MAIL_HOST || "",
  mailPort: Number(process.env.MAIL_PORT || 587),
  mailUser: process.env.MAIL_USER || "",
  mailPassword: process.env.MAIL_PASSWORD || "",
  mailFrom: process.env.MAIL_FROM || process.env.MAIL_USER || "",
};

export const cookieName = config.cookieSecure
  ? "__Host-learnwise_session"
  : "learnwise_session";
export const oauthCookieName = config.cookieSecure
  ? "__Host-learnwise_oauth"
  : "learnwise_oauth";
export const cookieBase =
  `Path=/; HttpOnly; SameSite=Lax${config.cookieSecure ? "; Secure" : ""}`;
export const sessionLifetimeSeconds = 60 * 60;
export const sessionAudience = "learnwise-session";
export const oauthStateAudience = "learnwise-oauth-state";
export const jwtIssuer = "learnwise-api";
export const jwtKey = new TextEncoder().encode(config.sessionSecret);

const requiredOAuthSettings = [
  ["GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID],
  ["GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET],
  ["SESSION_SECRET", Buffer.byteLength(config.sessionSecret) >= 32 ? config.sessionSecret : ""],
  ["GOOGLE_REDIRECT_URI", config.redirectUri],
];

export const missingOAuthSettings = requiredOAuthSettings
  .filter(([, value]) => !value)
  .map(([name]) => name);

export const oauthClient =
  missingOAuthSettings.length === 0
    ? new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        config.redirectUri,
      )
    : null;

export const mailConfigured = Boolean(
  config.mailHost && config.mailUser && config.mailPassword && config.mailFrom,
);
export const sessionsEnabled = Buffer.byteLength(config.sessionSecret) >= 32;
