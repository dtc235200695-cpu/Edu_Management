import crypto from "node:crypto";
import express from "express";
import { requireRole, requireSession } from "../middleware/session.js";
import {
  jsonWorkerRequest,
  requestWorker,
  toAdminUser,
} from "../services/cloudflare.js";
import { deliverTemporaryPassword } from "../services/account-email.js";
import { createTemporaryPassword, hashPassword } from "../services/password.js";

const router = express.Router();
const adminOnly = [requireSession, requireRole(["admin"])];

function validEmail(email) {
  return typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validName(name) {
  return typeof name === "string" &&
    name.trim().length > 0 &&
    name.trim().length <= 120 &&
    !/[\r\n]/.test(name);
}

function validStudentId(studentId) {
  return typeof studentId === "string" && /^[A-Za-z0-9._-]{3,30}$/.test(studentId);
}

router.get("/api/admin/users", adminOnly, async (_req, res, next) => {
  try {
    const result = await requestWorker("/internal/users");
    res.set("Cache-Control", "no-store").json({
      success: true,
      users: result.users.map(toAdminUser),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/api/admin/users", adminOnly, async (req, res, next) => {
  try {
    const { email, name, role, studentId } = req.body || {};
    if (
      !validEmail(email) ||
      !validName(name) ||
      !["student", "lecturer"].includes(role) ||
      (role === "student" && !validStudentId(studentId))
    ) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập email, họ tên, vai trò và mã sinh viên hợp lệ.",
      });
    }

    const temporaryPassword = createTemporaryPassword();
    const result = await requestWorker(
      "/internal/users",
      jsonWorkerRequest("POST", {
        id: crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        student_id: role === "student" ? studentId.trim() : null,
        password_hash: await hashPassword(temporaryPassword),
      }),
    );

    let emailSent = false;
    let emailWarning;
    try {
      emailSent = await deliverTemporaryPassword(result.user, temporaryPassword);
      if (!emailSent) {
        emailWarning = "Không thể gửi mật khẩu lần này. Tài khoản đã tạo; hãy cấu hình SMTP và dùng chức năng đặt lại mật khẩu.";
      }
    } catch (error) {
      console.error("Temporary password email failed:", error.name || "Error");
      emailWarning = "Tài khoản đã tạo nhưng email mật khẩu chưa gửi được. Hãy cấu hình SMTP và dùng chức năng đặt lại mật khẩu.";
    }
    return res.status(201).json({
      success: true,
      user: toAdminUser(result.user),
      emailSent,
      warning: emailWarning,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/admin/users/:id", adminOnly, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Không thể tự thay đổi quyền hoặc trạng thái tài khoản đang đăng nhập.",
      });
    }
    const { role, status, studentId } = req.body || {};
    if (
      !["student", "lecturer", "admin", "pending"].includes(role) ||
      !["active", "pending", "suspended"].includes(status) ||
      (role === "student" && !validStudentId(studentId)) ||
      (role !== "student" && studentId) ||
      (studentId && !validStudentId(studentId))
    ) {
      return res.status(400).json({
        success: false,
        error: "Vai trò, trạng thái hoặc mã sinh viên không hợp lệ.",
      });
    }
    const result = await requestWorker(
      `/internal/users/${encodeURIComponent(req.params.id)}`,
      jsonWorkerRequest("PATCH", {
        role,
        status,
        student_id: role === "student" ? studentId || null : null,
      }),
    );
    return res.json({ success: true, user: toAdminUser(result.user) });
  } catch (error) {
    next(error);
  }
});

export default router;
