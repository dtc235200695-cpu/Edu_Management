import crypto from "node:crypto";
import { errors, jwtVerify, SignJWT } from "jose";
import {
  config,
  cookieBase,
  cookieName,
  jwtIssuer,
  jwtKey,
  sessionAudience,
  sessionLifetimeSeconds,
} from "../config.js";
import { findUserById, publicUser } from "../services/cloudflare.js";

export async function createJwt(payload, audience, lifetimeSeconds, subject) {
  const token = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(jwtIssuer)
    .setAudience(audience)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${lifetimeSeconds}s`);
  if (subject) token.setSubject(subject);
  return token.sign(jwtKey);
}

export async function verifyJwt(token, audience) {
  if (!token || Buffer.byteLength(config.sessionSecret) < 32) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey, {
      algorithms: ["HS256"],
      audience,
      issuer: jwtIssuer,
    });
    if (
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.jti !== "string"
    ) {
      return null;
    }
    return payload;
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
}

export function readCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    if (name && cookies[name] === undefined) {
      cookies[name] = part.slice(separator + 1).trim();
    }
  }
  return cookies;
}

export function setCookie(res, name, value, maxAge) {
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  res.append(
    "Set-Cookie",
    `${name}=${value}; ${cookieBase}; Max-Age=${maxAge}; Expires=${expires}`,
  );
}

export function clearCookie(res, name) {
  res.append(
    "Set-Cookie",
    `${name}=; ${cookieBase}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
}

export async function issueSession(res, record, mustChangePassword = false) {
  const token = await createJwt(
    {
      email: record.email,
      name: record.name,
      picture: record.picture || "",
      authVersion: record.auth_version,
      mustChangePassword,
    },
    sessionAudience,
    sessionLifetimeSeconds,
    record.id,
  );
  setCookie(res, cookieName, token, sessionLifetimeSeconds);
}

export async function getSession(req) {
  const cookies = readCookies(req.headers.cookie);
  const payload = await verifyJwt(cookies[cookieName], sessionAudience);
  if (
    !payload ||
    typeof payload.sub !== "string" ||
    typeof payload.authVersion !== "number"
  ) {
    return null;
  }
  const record = await findUserById(payload.sub);
  if (
    !record ||
    record.status !== "active" ||
    record.auth_version !== payload.authVersion
  ) {
    return null;
  }
  const user = publicUser(record, payload.mustChangePassword === true);
  return user ? { user, record } : null;
}

export async function requireSession(req, res, next) {
  try {
    const session = await getSession(req);
    if (!session) {
      if (readCookies(req.headers.cookie)[cookieName]) clearCookie(res, cookieName);
      return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
    }
    if (
      session.user.mustChangePassword &&
      req.path !== "/api/auth/change-password"
    ) {
      return res.status(403).json({
        error: "Bạn cần đổi mật khẩu tạm thời trước khi tiếp tục.",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }
    req.user = session.user;
    req.userRecord = session.record;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này." });
    }
    return next();
  };
}

export function verifyRequestOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (origin !== config.appOrigin) {
    return res.status(403).json({ error: "Nguồn yêu cầu không hợp lệ." });
  }
  return next();
}
