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

    const storedPathsResult = await env.DB.prepare(`
        SELECT paths.path_id, paths.student_id, paths.course_id, paths.topic_name,
               paths.priority, paths.resource_url, paths.current_score,
               paths.target_goal, paths.learning_materials, paths.practice_exercises,
               COALESCE(status.status, 'Chưa hoàn thành') AS status
        FROM demo_learning_paths AS paths
        LEFT JOIN demo_learning_path_status AS status
            ON status.student_id = paths.student_id
           AND status.path_id = paths.path_id
        WHERE paths.student_id = ?
        ORDER BY paths.path_id
    `).bind(studentId).all();
    if (storedPathsResult.results?.length) {
        return json({
            success: true,
            data_mode: "synthetic_demo",
            learning_path: storedPathsResult.results,
        }, 200, { "Cache-Control": "no-store" });
    }

    const studentsResult = await env.DB.prepare(`
        SELECT student_id, full_name, class_name, attendance_rate, study_hours,
               assignment_score, quiz_score, completion_rate, previous_score,
               created_at
        FROM demo_students
        WHERE student_id = ?
        LIMIT 1
    `).bind(studentId).all();
    const recordsResult = await env.DB.prepare(`
        SELECT student_id, full_name, class_name, course_id, course_name,
               attendance_rate, study_hours, assignment_score, quiz_score,
               completion_rate, previous_score, final_score, predicted_score,
               risk_level, is_seed_data, created_at
        FROM demo_course_records
        WHERE student_id = ?
        ORDER BY course_id
    `).bind(studentId).all();
    const statusResult = await env.DB.prepare(`
        SELECT path_id, status
        FROM demo_learning_path_status
        WHERE student_id = ?
    `).bind(studentId).all();
    const result = createDemoLearningPath(
        studentId,
        studentsResult.results || [],
        statusResult.results || [],
        recordsResult.results || [],
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
        if (
            error instanceof Error &&
            (
                error.message.includes("demo_learning_paths") ||
                error.message.includes("demo_course_records")
            )
        ) {
            return json({
                success: false,
                error: "D1 chưa có bảng lộ trình/điểm DEMO. Hãy áp dụng migration 0006_seed_demo_scores_and_learning_paths.sql.",
            }, 503);
        }
        return json({
            success: false,
            error: "Không thể tải hoặc cập nhật lộ trình DEMO.",
        }, 500);
    }
}
