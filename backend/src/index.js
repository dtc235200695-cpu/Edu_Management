import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import { errors, jwtVerify, SignJWT } from "jose";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const app = express();
const port = Number(process.env.PORT || 8787);
const appUrl = process.env.APP_URL || "http://localhost:5173";
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  `http://localhost:${port}/auth/google/callback`;
const cookieSecure =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const cookieBase = `Path=/; HttpOnly; SameSite=Lax${cookieSecure ? "; Secure" : ""}`;
const cookieName = cookieSecure ? "__Host-learnwise_session" : "learnwise_session";
const stateCookieName = cookieSecure
  ? "__Host-learnwise_oauth"
  : "learnwise_oauth";
const sessionSecret = process.env.SESSION_SECRET || "";
const jwtKey = new TextEncoder().encode(sessionSecret);
const jwtIssuer = "learnwise-api";
const sessionAudience = "learnwise-session";
const oauthStateAudience = "learnwise-oauth-state";
const sessionLifetimeSeconds = 60 * 60;
const appOrigin = new URL(appUrl).origin;
const requiredOAuthSettings = [
  ["GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID],
  ["GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET],
  ["SESSION_SECRET", Buffer.byteLength(sessionSecret) >= 32 ? sessionSecret : ""],
];
const missingOAuthSettings = requiredOAuthSettings
  .filter(([, value]) => !value)
  .map(([name]) => name);
const oauthClient =
  missingOAuthSettings.length === 0
    ? new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri,
      )
    : null;

const overview = {
  stats: [
    { label: "Khóa học đang học", value: "04", change: "+1 khóa học", icon: "book" },
    { label: "Giờ học tuần này", value: "18,5", change: "+12% so với tuần trước", icon: "clock" },
    { label: "Tiến độ trung bình", value: "76", change: "+8% tháng này", icon: "target" },
    { label: "Điểm trung bình", value: "8,4", change: "+0,6 điểm", icon: "trend" },
  ],
  weeklyActivity: [
    { day: "T2", hours: 2.2 },
    { day: "T3", hours: 3.1 },
    { day: "T4", hours: 1.8 },
    { day: "T5", hours: 4.2 },
    { day: "T6", hours: 2.7 },
    { day: "T7", hours: 3.6 },
    { day: "CN", hours: 0.9 },
  ],
  courses: [
    { id: 1, title: "Phân tích dữ liệu với Python", category: "Khoa học dữ liệu", progress: 82, lessons: "18/22 bài học", color: "mint", icon: "chart" },
    { id: 2, title: "Machine Learning cơ bản", category: "Trí tuệ nhân tạo", progress: 64, lessons: "14/22 bài học", color: "violet", icon: "brain" },
    { id: 3, title: "SQL và thiết kế cơ sở dữ liệu", category: "Phát triển phần mềm", progress: 91, lessons: "20/22 bài học", color: "peach", icon: "database" },
    { id: 4, title: "Thống kê ứng dụng", category: "Toán học", progress: 48, lessons: "10/21 bài học", color: "blue", icon: "sigma" },
  ],
  activities: [
    { title: "Hoàn thành bài kiểm tra: Hồi quy tuyến tính", detail: "Machine Learning cơ bản", time: "Hôm nay, 10:42", result: "9,0 điểm", type: "quiz" },
    { title: "Hoàn thành bài học: Làm sạch dữ liệu", detail: "Phân tích dữ liệu với Python", time: "Hôm nay, 09:18", result: "12 phút", type: "lesson" },
    { title: "Bắt đầu khóa học mới", detail: "Thống kê ứng dụng", time: "Hôm qua, 16:30", result: "Đã đăng ký", type: "start" },
    { title: "Hoàn thành bài kiểm tra: Truy vấn JOIN", detail: "SQL và thiết kế cơ sở dữ liệu", time: "Hôm qua, 14:05", result: "8,5 điểm", type: "quiz" },
  ],
  recommendations: [
    { title: "Ôn tập ma trận và vector", reason: "Nền tảng quan trọng cho bài học tiếp theo về PCA.", duration: "15 phút", color: "mint" },
    { title: "Thực hành xử lý giá trị thiếu", reason: "Giúp củng cố kỹ năng làm sạch dữ liệu của bạn.", duration: "20 phút", color: "peach" },
    { title: "Khám phá cây quyết định", reason: "Chủ đề phù hợp để tiếp nối phần hồi quy tuyến tính.", duration: "25 phút", color: "violet" },
  ],
};

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' https: data:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self'",
    ].join("; "),
  });
  if (cookieSecure) {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

async function createJwt(payload, audience, lifetimeSeconds, subject) {
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

async function verifyJwt(token, audience) {
  if (!token || Buffer.byteLength(sessionSecret) < 32) return null;
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

function readCookies(header = "") {
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

function setCookie(res, name, value, maxAge) {
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  res.append(
    "Set-Cookie",
    `${name}=${value}; ${cookieBase}; Max-Age=${maxAge}; Expires=${expires}`,
  );
}

function clearCookie(res, name) {
  res.append(
    "Set-Cookie",
    `${name}=; ${cookieBase}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
}

async function getSession(req) {
  const cookies = readCookies(req.headers.cookie);
  const payload = await verifyJwt(cookies[cookieName], sessionAudience);
  if (
    !payload ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string"
  ) {
    return null;
  }
  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: typeof payload.picture === "string" ? payload.picture : "",
    },
  };
}

async function requireSession(req, res, next) {
  try {
    const session = await getSession(req);
    if (!session?.user) {
      if (readCookies(req.headers.cookie)[cookieName]) clearCookie(res, cookieName);
      return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
    }
    req.user = session.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

app.get("/api/app-config", (_req, res) => {
  res.json({
    googleEnabled: Boolean(oauthClient),
    missingSettings: missingOAuthSettings,
  });
});

app.get("/api/me", async (req, res, next) => {
  try {
    const session = await getSession(req);
    if (!session && readCookies(req.headers.cookie)[cookieName]) {
      clearCookie(res, cookieName);
    }
    res.set("Cache-Control", "no-store").json({ user: session?.user || null });
  } catch (error) {
    next(error);
  }
});

app.get("/api/overview", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ...overview, demo: true });
});

app.get("/api/profile", requireSession, (req, res) => {
  res.set("Cache-Control", "no-store").json({ user: req.user });
});

app.get("/auth/google", async (req, res, next) => {
  if (!oauthClient) {
    return res.status(503).json({
      error: "Đăng nhập Google chưa được cấu hình.",
      missingSettings: missingOAuthSettings,
    });
  }
  try {
    const state = crypto.randomBytes(32).toString("base64url");
    const nonce = crypto.randomBytes(32).toString("base64url");
    const stateToken = await createJwt(
      { state, nonce },
      oauthStateAudience,
      10 * 60,
    );
    setCookie(res, stateCookieName, stateToken, 10 * 60);
    res.set("Cache-Control", "no-store");
    const authorizationUrl = oauthClient.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
      nonce,
    });
    res.redirect(authorizationUrl);
  } catch (error) {
    next(error);
  }
});

app.get("/auth/google/callback", async (req, res, next) => {
  const cookies = readCookies(req.headers.cookie);
  let oauthState;
  try {
    oauthState = await verifyJwt(cookies[stateCookieName], oauthStateAudience);
  } catch (error) {
    clearCookie(res, stateCookieName);
    return next(error);
  }
  clearCookie(res, stateCookieName);

  if (req.query.error) {
    return res.redirect(`${appUrl}/?authError=cancelled`);
  }
  if (
    !oauthClient ||
    typeof req.query.code !== "string" ||
    typeof req.query.state !== "string" ||
    typeof oauthState?.state !== "string" ||
    typeof oauthState.nonce !== "string" ||
    oauthState.state !== req.query.state
  ) {
    return res.redirect(`${appUrl}/?authError=invalid_state`);
  }

  try {
    const { tokens } = await oauthClient.getToken(req.query.code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const claims = ticket.getPayload();
    if (
      !claims ||
      claims.nonce !== oauthState.nonce ||
      !claims.email ||
      claims.email_verified !== true
    ) {
      throw new Error("Google identity claims failed validation.");
    }

    const user = {
      id: claims.sub,
      name: claims.name || claims.email,
      email: claims.email,
      picture: claims.picture || "",
    };
    const sessionToken = await createJwt(
      {
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      sessionAudience,
      sessionLifetimeSeconds,
      user.id,
    );
    setCookie(res, cookieName, sessionToken, sessionLifetimeSeconds);
    res.set("Cache-Control", "no-store");
    res.redirect(appUrl);
  } catch (error) {
    console.error("Google OAuth callback failed:", error.name);
    res.redirect(`${appUrl}/?authError=oauth_failed`);
  }
});

app.post("/auth/logout", (req, res) => {
  if (req.get("Origin") !== appOrigin) {
    return res.status(403).json({ error: "Nguồn yêu cầu không hợp lệ." });
  }
  clearCookie(res, cookieName);
  clearCookie(res, stateCookieName);
  res.status(204).end();
});

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.name || "Error");
  res.status(500).json({ error: "Đã xảy ra lỗi máy chủ." });
});

const distDir = path.join(projectRoot, "frontend", "dist");
app.use(express.static(distDir));
app.get("*", (_req, res, next) => {
  res.sendFile(path.join(distDir, "index.html"), (error) => {
    if (error) next();
  });
});

app.listen(port, () => {
  console.log(`Learnwise API listening on http://localhost:${port}`);
  if (missingOAuthSettings.length > 0) {
    console.warn(
      `Google sign-in is disabled. Configure: ${missingOAuthSettings.join(", ")}`,
    );
  }
});
