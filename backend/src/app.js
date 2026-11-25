import express from "express";
import path from "node:path";
import { projectRoot, config } from "./config.js";
import { verifyRequestOrigin } from "./middleware/session.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";
import oauthRoutes from "./routes/oauth.js";
import studentRoutes from "./routes/students.js";

const app = express();
const distDir = path.join(projectRoot, "frontend", "dist");

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
  if (config.cookieSecure) {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use("/api", verifyRequestOrigin);
app.use("/auth/logout", verifyRequestOrigin);

app.use(authRoutes);
app.use(oauthRoutes);
app.use(adminRoutes);
app.use(studentRoutes);
app.use(dataRoutes);
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "API endpoint not found." });
});

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.name || "Error");
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  const message =
    status === 413
      ? "CSV file exceeds the 10 MB limit."
      : status >= 500
        ? "Đã xảy ra lỗi máy chủ."
        : error.message || "Yêu cầu không hợp lệ.";
  res.status(status).json({ success: false, error: message });
});

app.use(express.static(distDir));
app.get("*", (_req, res, next) => {
  res.sendFile(path.join(distDir, "index.html"), (error) => {
    if (error) next();
  });
});

export default app;
