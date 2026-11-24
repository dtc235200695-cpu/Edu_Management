import { createDemoLearningPath, demoStudentIdForPathId } from "./demo-data.js";
import { isAuthorized, readJson, unauthorized } from "./security.js";

function json(body, status = 200, headers = {}) {
    return Response.json(body, { status, headers });
}

async function getDemoLearningPath(env, studentId) {
    if (!/^DEMO-\d{4,}$/.test(studentId)) {
        return json({
            success: false,
            error: "Chỉ có lộ trình minh họa cho mã sinh viên DEMO; dữ liệu sinh viên thật chưa được tích hợp.",
        }, 503);
    }

    const studentsResult = await env.DB.prepare(`
        SELECT student_id, full_name, class_name, attendance_rate, study_hours,
               assignment_score, quiz_score, completion_rate, previous_score,
               created_at
        FROM demo_students
        ORDER BY created_at DESC
        LIMIT 500
    `).all();
    const statusResult = await env.DB.prepare(`
        SELECT path_id, status
        FROM demo_learning_path_status
        WHERE student_id = ?
    `).bind(studentId).all();
    const result = createDemoLearningPath(
        studentId,
        studentsResult.results || [],
        statusResult.results || [],
    );

    return result
        ? json(result, 200, { "Cache-Control": "no-store" })
        : json({ success: false, error: "Không tìm thấy sinh viên DEMO." }, 404);
}

export async function handleLearningPathRequest(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/internal/learning-path")) return null;
    if (!isAuthorized(request, env)) return unauthorized();

    try {
        const getRoute = url.pathname.match(
            /^\/internal\/learning-path\/students\/([^/]+)$/,
        );
        if (request.method === "GET" && getRoute) {
            return await getDemoLearningPath(env, decodeURIComponent(getRoute[1]));
        }

        const updateRoute = url.pathname.match(/^\/internal\/learning-path\/(\d+)$/);
        if (request.method === "PATCH" && updateRoute) {
            const pathId = Number(updateRoute[1]);
            const studentId = demoStudentIdForPathId(pathId);
            if (!studentId) {
                return json({ success: false, error: "Mã lộ trình không hợp lệ." }, 400);
            }

            const body = await readJson(request);
            const validStatuses = ["Chưa hoàn thành", "Đang học", "Đã hoàn thành"];
            if (!body || !validStatuses.includes(body.status)) {
                return json({ success: false, error: "Trạng thái lộ trình không hợp lệ." }, 400);
            }

            const pathResult = await getDemoLearningPath(env, studentId);
            if (!pathResult.ok) return pathResult;
            const path = await pathResult.json();
            if (!path.learning_path.some((item) => item.path_id === pathId)) {
                return json({ success: false, error: "Không tìm thấy chủ đề trong lộ trình DEMO." }, 404);
            }

            const result = await env.DB.prepare(`
                INSERT INTO demo_learning_path_status (student_id, path_id, status)
                VALUES (?, ?, ?)
                ON CONFLICT(student_id, path_id) DO UPDATE SET
                    status = excluded.status,
                    updated_at = CURRENT_TIMESTAMP
            `).bind(studentId, pathId, body.status).run();
            if (!result.meta?.changes) {
                return json({ success: false, error: "Không lưu được trạng thái lộ trình." }, 500);
            }

            return json({ success: true, data_mode: "synthetic_demo" });
        }

        return json({ success: false, error: "Learning-path endpoint not found." }, 404);
    } catch (error) {
        console.error("Demo learning path request failed:", error.name || "Error");
        if (
            error instanceof Error &&
            error.message.includes("demo_learning_path_status")
        ) {
            return json({
                success: false,
                error: "D1 chưa có bảng trạng thái lộ trình. Hãy áp dụng migration 0005_create_demo_learning_path_status.sql.",
            }, 503);
        }
        return json({
            success: false,
            error: "Không thể tải hoặc cập nhật lộ trình DEMO.",
        }, 500);
    }
}
