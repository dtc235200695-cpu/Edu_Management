import express from "express";
import { requireRole, requireSession } from "../middleware/session.js";
import { requestWorker } from "../services/cloudflare.js";

const router = express.Router();
const staffOnly = [requireSession, requireRole(["admin", "lecturer"])];

function positiveInteger(value, fallback, maximum) {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

router.get("/api/students", ...staffOnly, async (req, res, next) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search.length > 120) {
    return res.status(400).json({
      success: false,
      error: "Từ khóa tìm kiếm không được vượt quá 120 ký tự.",
    });
  }

  try {
    const result = await requestWorker("/internal/users");
    if (!Array.isArray(result.users)) {
      const error = new Error("Cloudflare Worker returned an invalid student list.");
      error.status = 502;
      throw error;
    }

    const normalizedSearch = search.toLocaleLowerCase();
    const students = result.users
      .filter((user) =>
        user &&
        user.role === "student" &&
        user.status === "active" &&
        typeof user.student_id === "string" &&
        user.student_id.length > 0 &&
        typeof user.name === "string" &&
        (!normalizedSearch ||
          user.student_id.toLocaleLowerCase().includes(normalizedSearch) ||
          user.name.toLocaleLowerCase().includes(normalizedSearch)),
      );
    const sortBy =
      typeof req.query.sort_by === "string" ? req.query.sort_by : "newest";
    if (!["newest", "id_asc", "name_asc"].includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error: "Kiểu sắp xếp sinh viên không hợp lệ.",
      });
    }
    students.sort((left, right) => {
      if (sortBy === "id_asc") {
        return left.student_id.localeCompare(right.student_id);
      }
      if (sortBy === "name_asc") {
        return left.name.localeCompare(right.name, "vi");
      }
      return String(right.created_at || "").localeCompare(
        String(left.created_at || ""),
      );
    });

    const page = positiveInteger(req.query.page, 1, 10000);
    const limit = positiveInteger(req.query.limit, 50, 100);
    const total = students.length;
    const pageStudents = students
      .slice((page - 1) * limit, page * limit)
      .map((user) => ({
        student_id: user.student_id,
        full_name: user.name,
        class_name: "",
        created_at: user.created_at,
      }));

    return res.set("Cache-Control", "no-store").json({
      success: true,
      students: pageStudents,
      pagination: {
        total_pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
