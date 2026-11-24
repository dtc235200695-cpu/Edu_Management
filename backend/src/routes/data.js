import { readFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { projectRoot } from "../config.js";
import { requireRole, requireSession } from "../middleware/session.js";
import { demoStudentIdForPathId } from "../../../cloudflare/worker/demo-data.js";
import {
  fetchWorkerHealth,
  jsonWorkerRequest,
  publicUser,
  requestStorage,
  requestWorker,
} from "../services/cloudflare.js";

const router = express.Router();
const staffOnly = [requireSession, requireRole(["admin", "lecturer"])];
const modelMetricsPath = path.join(projectRoot, "ml", "model_metrics.json");

const overview = {
  stats: [
    { label: "Khóa học đang học", value: "04", change: "+1 khóa học", icon: "book" },
    { label: "Giờ học tuần này", value: "18,5", change: "+12% so với tuần trước", icon: "clock" },
    { label: "Tiến độ trung bình", value: "76", change: "+8% tháng này", icon: "target" },
    { label: "Điểm trung bình", value: "8,4", change: "+0,6 điểm tháng này", icon: "trend" },
  ],
  weeklyActivity: [
    { day: "T2", hours: 2.2 }, { day: "T3", hours: 3.1 },
    { day: "T4", hours: 1.8 }, { day: "T5", hours: 4.2 },
    { day: "T6", hours: 2.7 }, { day: "T7", hours: 3.6 },
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

router.get("/api/overview", ...staffOnly, (_req, res) => {
  res.set("Cache-Control", "no-store").json({ ...overview, demo: true });
});

router.get("/api/dashboard/overview", requireSession, (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    success: true,
    total_students: 0,
    total_courses: 0,
    average_score: 0,
    pass_rate: 0,
    risk_distribution: [],
    score_distribution: {
      under_5: 0,
      range_5_7: 0,
      range_7_85: 0,
      range_85_10: 0,
    },
    students_needing_support: [],
    filter_options: { classes: [], courses: [] },
  });
});

router.get("/api/ml/model-info", ...staffOnly, async (_req, res) => {
  let metrics;
  try {
    metrics = JSON.parse(await readFile(modelMetricsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(503).json({
        success: false,
        error: "Chưa tìm thấy ml/model_metrics.json. Hãy chạy python ml/train_model.py.",
      });
    }
    console.error("Could not read model metrics:", error.name || "Error");
    return res.status(500).json({
      success: false,
      error: "Không thể đọc model metrics artifact.",
    });
  }

  if (
    !metrics ||
    typeof metrics !== "object" ||
    typeof metrics.model_name !== "string" ||
    typeof metrics.model_version !== "string" ||
    !metrics.regression_metrics ||
    !metrics.classification_metrics ||
    !metrics.feature_importances
  ) {
    return res.status(500).json({
      success: false,
      error: "Model metrics artifact không đúng định dạng.",
    });
  }
  return res.set("Cache-Control", "no-store").json({ ...metrics, success: true });
});

router.get(
  "/api/students/:studentId/learning-path",
  requireSession,
  requireRole(["student", "lecturer", "admin"]),
  async (req, res, next) => {
    if (req.user.role === "student" && req.user.studentId !== req.params.studentId) {
      return res.status(403).json({
        success: false,
        error: "Bạn chỉ được xem lộ trình của mình.",
      });
    }
    try {
      const result = await requestWorker(
        `/internal/learning-path/students/${encodeURIComponent(req.params.studentId)}`,
      );
      return res.set("Cache-Control", "no-store").json(result);
    } catch (error) {
      return next(error);
    }
  },
);
router.patch(
  "/api/learning-path/:pathId",
  requireSession,
  requireRole(["student", "lecturer", "admin"]),
  async (req, res, next) => {
    const pathId = Number(req.params.pathId);
    const studentId = demoStudentIdForPathId(pathId);
    if (!studentId) {
      return res.status(400).json({ success: false, error: "Mã lộ trình không hợp lệ." });
    }
    if (req.user.role === "student" && req.user.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        error: "Bạn chỉ được cập nhật lộ trình của mình.",
      });
    }
    try {
      const result = await requestWorker(
        `/internal/learning-path/${pathId}`,
        jsonWorkerRequest("PATCH", req.body),
      );
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  "/api/cloudflare/health",
  requireSession,
  requireRole(["admin"]),
  async (_req, res, next) => {
    try {
      const health = await fetchWorkerHealth();
      return res.set("Cache-Control", "no-store").json(health);
    } catch (error) {
      console.error("Cloudflare health check failed:", error.name || "Error");
      return res.status(error.status || 502).json({
        success: false,
        error: error.message || "Unable to connect to the Cloudflare Worker.",
      });
    }
  },
);

router.post(
  "/api/data/import",
  ...staffOnly,
  express.raw({ type: "text/csv", limit: "10mb" }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ success: false, error: "CSV file is required." });
    }
    try {
      const result = await requestStorage("/internal/storage/objects", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
          "Content-Length": String(req.body.length),
          "X-File-Name": req.get("X-File-Name") || "",
        },
        body: req.body,
      });
      return res.status(201).json({
        success: true,
        r2_key: result.key,
        filename: result.filename,
        size: result.size,
        uploaded_at: result.uploaded_at,
      });
    } catch (error) {
      console.error("Cloudflare R2 upload failed:", error.name || "Error");
      return res.status(error.status || 502).json({
        success: false,
        error: error.message || "Unable to upload CSV to Cloudflare R2.",
      });
    }
  },
);

router.get("/api/data/import-history", ...staffOnly, async (_req, res) => {
  try {
    const result = await requestStorage("/internal/storage/objects");
    return res.set("Cache-Control", "no-store").json({
      success: true,
      history: result.objects.map((object) => ({
        import_id: object.key,
        filename: object.filename,
        total_records: null,
        valid_records: null,
        invalid_records: null,
        r2_key: object.key,
        size: object.size,
        created_at: object.uploaded_at,
      })),
    });
  } catch (error) {
    console.error("Cloudflare R2 history request failed:", error.name || "Error");
    return res.status(error.status || 502).json({
      success: false,
      error: error.message || "Unable to load Cloudflare R2 history.",
    });
  }
});

router.get("/api/profile", requireSession, (req, res) => {
  res.set("Cache-Control", "no-store").json({ user: req.user });
});

router.patch("/api/profile", requireSession, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 120 ||
      /[\r\n]/.test(name.trim())
    ) {
      return res.status(400).json({
        success: false,
        error: "Họ tên phải có từ 1 đến 120 ký tự.",
      });
    }
    const result = await requestWorker(
      `/internal/users/${encodeURIComponent(req.user.id)}/profile`,
      jsonWorkerRequest("PATCH", { name: name.trim() }),
    );
    return res.set("Cache-Control", "no-store").json({
      success: true,
      user: publicUser(result.user),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
