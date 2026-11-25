import express from "express";
import {
  cookieName,
  mailConfigured,
  missingOAuthSettings,
  oauthClient,
  oauthCookieName,
  sessionsEnabled,
} from "../config.js";
import {
  clearCookie,
  getSession,
  issueSession,
  readCookies,
  requireSession,
} from "../middleware/session.js";
import { loginRateLimit, passwordResetRateLimit } from "../middleware/rate-limit.js";
import {
  findUser,
  findUserById,
  jsonWorkerRequest,
  publicUser,
  requestWorker,
} from "../services/cloudflare.js";
import { sendPasswordResetCode } from "../services/email.js";
import {
  createResetCode,
  hashPassword,
  hashResetCode,
  validPassword,
  validResetCode,
  verifyPassword,
} from "../services/password.js";

const router = express.Router();
const genericResetResponse = {
  success: true,
  message: "Nếu tài khoản tồn tại và đang hoạt động, mã xác nhận sẽ được gửi qua email.",
};

function requireSessionSecret(_req, res, next) {
  if (!sessionsEnabled) {
    return res.status(503).json({
      success: false,
      error: "Đăng nhập chưa được cấu hình SESSION_SECRET đủ mạnh.",
    });
  }
  return next();
}

function validateIdentifier(identifier) {
  return typeof identifier === "string" &&
    identifier.trim().length > 0 &&
    identifier.trim().length <= 254;
}

router.use("/api/auth", requireSessionSecret);

router.get("/api/app-config", (_req, res) => {
  res.json({
    googleEnabled: Boolean(oauthClient),
    missingSettings: missingOAuthSettings,
    mailEnabled: mailConfigured,
  });
});

router.get("/api/me", async (req, res, next) => {
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

router.post("/api/auth/login", loginRateLimit, async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (
      !validateIdentifier(identifier) ||
      typeof password !== "string" ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        error: "Thông tin đăng nhập không hợp lệ.",
      });
    }

    const record = await findUser(identifier.trim());
    const hash = record?.password_hash ||
      await hashPassword("invalid-account-password");
    const matches = await verifyPassword(password, hash);
    if (!record || !record.password_hash || !matches) {
      return res.status(401).json({
        success: false,
        error: "Mã sinh viên/email hoặc mật khẩu không chính xác.",
      });
    }
    if (record.status === "pending" || record.role === "pending") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_PENDING",
        error: "Tài khoản đang chờ quản trị viên duyệt và cấp vai trò.",
      });
    }
    if (record.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
      });
    }

    const mustChangePassword = Boolean(record.must_change_password);
    await issueSession(res, record, mustChangePassword);
    res.set("Cache-Control", "no-store").json({
      success: true,
      user: publicUser(record, mustChangePassword),
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/api/auth/forgot-password",
  passwordResetRateLimit,
  async (req, res, next) => {
    try {
      const { identifier } = req.body || {};
      if (!validateIdentifier(identifier)) {
        return res.status(400).json({
          success: false,
          error: "Vui lòng nhập email hoặc mã sinh viên hợp lệ.",
        });
      }

      const record = await findUser(identifier.trim());
      if (!record || record.status === "suspended") {
        return res.json(genericResetResponse);
      }

      const code = createResetCode();
      const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
      const codeHash = hashResetCode(record.id, code);
      await requestWorker(
        "/internal/password-reset/request",
        jsonWorkerRequest("POST", {
          user_id: record.id,
          code_hash: codeHash,
          expires_at: expiresAt,
        }),
      );
      try {
        await sendPasswordResetCode(record.email, record.name, code);
      } catch (error) {
        try {
          await requestWorker(
            "/internal/password-reset/cancel",
            jsonWorkerRequest("POST", {
              user_id: record.id,
              code_hash: codeHash,
            }),
          );
        } catch (cancelError) {
          console.error("Password reset code could not be invalidated:", cancelError.name || "Error");
        }
        throw error;
      }
      return res.json(genericResetResponse);
    } catch (error) {
      if (error.status === 429) return res.json(genericResetResponse);
      next(error);
    }
  },
);

router.post("/api/auth/reset-password", async (req, res, next) => {
  try {
    const { identifier, code, newPassword } = req.body || {};
    if (
      !validateIdentifier(identifier) ||
      !validResetCode(code) ||
      !validPassword(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng kiểm tra mã xác nhận và mật khẩu (tối thiểu 8 ký tự).",
      });
    }
    const record = await findUser(identifier.trim());
    if (!record || record.status === "suspended") {
      return res.status(400).json({
        success: false,
        error: "Mã xác nhận không hợp lệ hoặc đã hết hạn.",
      });
    }
    await requestWorker(
      `/internal/users/${encodeURIComponent(record.id)}/password-reset`,
      jsonWorkerRequest("POST", {
        code_hash: hashResetCode(record.id, code),
        password_hash: await hashPassword(newPassword),
      }),
    );
    clearCookie(res, cookieName);
    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        error: "Mã xác nhận không hợp lệ hoặc đã hết hạn.",
      });
    }
    next(error);
  }
});

router.post("/api/auth/change-password", requireSession, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== "string" ||
      currentPassword.length > 128 ||
      !validPassword(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        error: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      });
    }
    const record = req.userRecord;
    if (
      !record.password_hash ||
      !(await verifyPassword(currentPassword, record.password_hash))
    ) {
      return res.status(400).json({
        success: false,
        error: "Mật khẩu hiện tại không chính xác.",
      });
    }
    const result = await requestWorker(
      "/internal/users/password",
      jsonWorkerRequest("POST", {
        user_id: record.id,
        current_password_hash: record.password_hash,
        password_hash: await hashPassword(newPassword),
      }),
    );
    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: "Mật khẩu tài khoản đã thay đổi. Vui lòng đăng nhập lại.",
      });
    }
    const updatedRecord = await findUserById(record.id);
    await issueSession(res, updatedRecord, false);
    return res.json({ success: true, user: publicUser(updatedRecord) });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (_req, res) => {
  clearCookie(res, cookieName);
  clearCookie(res, oauthCookieName);
  res.status(204).end();
});

export default router;
