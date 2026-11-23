// src/worker.ts
// Cloudflare Workers REST API Backend cho EduInsight Learning Analytics Platform

import type { Env, PredictRequest } from './types.ts';
import { predictEdgeML, MODEL_METADATA } from './edge_ml.ts';
import { generatePersonalizedPath } from './recommendation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle CORS preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ------------------------------------------------------------------------
      // 0. POST /api/auth/login - Xác thực & Đăng nhập hệ thống
      // ------------------------------------------------------------------------
      if (method === 'POST' && path === '/api/auth/login') {
        const body: any = await request.json().catch(() => ({}));
        const username = (body.username || '').trim();
        const password = (body.password || '').trim();
        const requestedRole = body.role;

        if (!username || !password) {
          return errorResponse('Vui lòng nhập tên đăng nhập và mật khẩu', 400);
        }

        // 1. Sinh viên (mã SV: SV2026, SV2026_001... hoặc chọn vai trò student)
        if (requestedRole === 'student' || username.toUpperCase().startsWith('SV') || username.includes('student')) {
          const cleanSid = username.split('@')[0].toUpperCase();
          let student = await env.DB.prepare(
            'SELECT * FROM students WHERE UPPER(student_id) = ?'
          ).bind(cleanSid).first();

          if (!student && cleanSid === 'SV2026') {
            student = { student_id: 'SV2026', full_name: 'Nguyễn Thị Hương Giang', class_name: 'K24-CNTT01' };
          }

          if (student) {
            return jsonResponse({
              success: true,
              message: 'Đăng nhập thành công với vai trò Sinh viên',
              token: `token_student_${student.student_id}_${Date.now()}`,
              user: {
                id: student.student_id,
                name: student.full_name,
                role: 'student',
                roleTitle: 'Sinh viên',
                roleBadge: 'Sinh viên',
                department: `Lớp ${student.class_name}`,
                avatarText: 'SV',
                studentId: student.student_id,
                className: student.class_name,
                email: `${String(student.student_id).toLowerCase()}@student.edu.vn`
              }
            });
          }
        }

        // 2. Quản trị viên
        if (requestedRole === 'admin' || username.toLowerCase() === 'admin' || username.includes('admin')) {
          if (password !== 'admin123' && password !== '123456') {
            return errorResponse('Mật khẩu quản trị viên không chính xác (Gợi ý: admin123 hoặc 123456)', 401);
          }
          return jsonResponse({
            success: true,
            message: 'Đăng nhập thành công với vai trò Quản trị viên',
            token: `token_admin_${Date.now()}`,
            user: {
              id: 'AD001',
              name: 'Quản Trị Viên (Admin)',
              role: 'admin',
              roleTitle: 'Cloudflare Admin & DevOps',
              roleBadge: 'Quản trị viên',
              department: 'Trung tâm Hạ tầng CNTT',
              avatarText: 'AD',
              email: 'admin@eduinsight.cloudflare.com'
            }
          });
        }

        // 3. Giảng viên (Mặc định cho giảng viên)
        return jsonResponse({
          success: true,
          message: 'Đăng nhập thành công với vai trò Giảng viên',
          token: `token_lecturer_${Date.now()}`,
          user: {
            id: 'GV001',
            name: username.includes('@') ? username.split('@')[0] : 'Ban Giảng Viên',
            role: 'lecturer',
            roleTitle: 'Giảng viên phụ trách môn',
            roleBadge: 'Giảng viên',
            department: 'Bộ môn KHMT & ĐTĐM',
            avatarText: 'GV',
            email: 'giangvien.dtm@cloud.edu.vn'
          }
        });
      }

      // ------------------------------------------------------------------------
      // 1. GET /api/dashboard/overview - Thống kê tổng quan cho Trang 1
      // ------------------------------------------------------------------------
      if (method === 'GET' && path === '/api/dashboard/overview') {
        const classFilter = url.searchParams.get('class_name');
        const courseFilter = url.searchParams.get('course_id');

        let studentCountQuery = 'SELECT COUNT(*) as total FROM students';
        let recordsQuery = `
          SELECT 
            AVG(lr.final_score) as avg_score,
            COUNT(CASE WHEN lr.final_score >= 5.0 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
            COUNT(lr.record_id) as total_records
          FROM learning_records lr
        `;

        if (classFilter) {
          const cf = classFilter.replace(/'/g, "''");
          studentCountQuery += ` WHERE class_name LIKE '%${cf}%'`;
          recordsQuery = `
            SELECT 
              AVG(lr.final_score) as avg_score,
              COUNT(CASE WHEN lr.final_score >= 5.0 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
              COUNT(lr.record_id) as total_records
            FROM learning_records lr
            JOIN students s ON lr.student_id = s.student_id
            WHERE s.class_name LIKE '%${cf}%'
          `;
        }

        const totalStudentsRes = await env.DB.prepare(studentCountQuery).first();
        const totalCoursesRes = await env.DB.prepare('SELECT COUNT(*) as total FROM courses').first();
        const recordStatsRes = await env.DB.prepare(recordsQuery).first();

        // Thống kê phân bố rủi ro từ predictions
        const riskStats = await env.DB.prepare(`
          SELECT 
            COALESCE(risk_level, 'Chưa xác định') as risk_level, 
            COUNT(*) as count 
          FROM predictions 
          GROUP BY risk_level
        `).all();

        // Phân bố điểm số (Histogram)
        const scoreDist = await env.DB.prepare(`
          SELECT 
            COUNT(CASE WHEN final_score < 5.0 THEN 1 END) as under_5,
            COUNT(CASE WHEN final_score >= 5.0 AND final_score < 7.0 THEN 1 END) as range_5_7,
            COUNT(CASE WHEN final_score >= 7.0 AND final_score < 8.5 THEN 1 END) as range_7_85,
            COUNT(CASE WHEN final_score >= 8.5 THEN 1 END) as range_85_10
          FROM learning_records
        `).first();

        // Danh sách sinh viên cần hỗ trợ (Top có nguy cơ cao nhất hoặc điểm thấp nhất)
        const studentsNeedingSupport = await env.DB.prepare(`
          SELECT 
            s.student_id, 
            s.full_name, 
            s.class_name, 
            lr.final_score, 
            lr.attendance_rate,
            lr.study_hours,
            COALESCE(p.risk_level, 'Cao') as risk_level,
            COALESCE(p.predicted_score, lr.final_score) as predicted_score
          FROM students s
          JOIN learning_records lr ON s.student_id = lr.student_id
          LEFT JOIN predictions p ON s.student_id = p.student_id
          WHERE lr.final_score < 6.0 OR p.risk_level = 'Cao'
          ORDER BY lr.final_score ASC
          LIMIT 10
        `).all();

        // Danh sách lớp và khóa học để tạo dropdown filter
        const classesList = await env.DB.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all();
        const coursesList = await env.DB.prepare('SELECT course_id, course_name FROM courses ORDER BY course_name').all();

        return jsonResponse({
          success: true,
          total_students: totalStudentsRes?.total || 0,
          total_courses: totalCoursesRes?.total || 0,
          average_score: recordStatsRes?.avg_score ? Math.round(Number(recordStatsRes.avg_score) * 100) / 100 : 0,
          pass_rate: recordStatsRes?.pass_rate ? Math.round(Number(recordStatsRes.pass_rate) * 10) / 10 : 0,
          risk_distribution: riskStats.results || [],
          score_distribution: {
            under_5: scoreDist?.under_5 || 0,
            range_5_7: scoreDist?.range_5_7 || 0,
            range_7_85: scoreDist?.range_7_85 || 0,
            range_85_10: scoreDist?.range_85_10 || 0,
          },
          students_needing_support: studentsNeedingSupport.results || [],
          filter_options: {
            classes: (classesList.results || []).map((r: any) => r.class_name),
            courses: coursesList.results || []
          }
        });
      }

      // ------------------------------------------------------------------------
      // 2. GET /api/students - Danh sách sinh viên (Trang 2)
      // ------------------------------------------------------------------------
      if (method === 'GET' && path === '/api/students') {
        const search = url.searchParams.get('search') || '';
        const className = url.searchParams.get('class_name') || '';
        const cohort = url.searchParams.get('cohort') || '';
        const faculty = url.searchParams.get('faculty') || '';
        const riskLevel = url.searchParams.get('risk_level') || '';
        const sortBy = url.searchParams.get('sort_by') || 'newest';
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '15', 10);
        const offset = (page - 1) * limit;

        let conditions: string[] = [];
        if (search) {
          const s = search.replace(/'/g, "''").trim();
          conditions.push(`(
            s.student_id LIKE '%${s}%' OR 
            s.full_name LIKE '%${s}%' OR 
            LOWER(s.full_name) LIKE '%${s.toLowerCase()}%' OR
            UPPER(s.full_name) LIKE '%${s.toUpperCase()}%' OR
            s.class_name LIKE '%${s}%'
          )`);
        }
        if (cohort) {
          const coh = cohort.replace(/'/g, "''").trim();
          conditions.push(`s.class_name LIKE '${coh}%'`);
        }
        if (faculty) {
          const fac = faculty.replace(/'/g, "''").trim();
          conditions.push(`s.class_name LIKE '%${fac}%'`);
        }
        if (className) {
          const c = className.replace(/'/g, "''").trim();
          conditions.push(`s.class_name LIKE '%${c}%'`);
        }
        if (riskLevel) {
          conditions.push(`COALESCE(p.risk_level, 'Thấp') = '${riskLevel.replace(/'/g, "''")}'`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `
          SELECT COUNT(DISTINCT s.student_id) as total 
          FROM students s
          LEFT JOIN predictions p ON s.student_id = p.student_id
          ${whereClause}
        `;
        const totalRes = await env.DB.prepare(countQuery).first();
        const total = totalRes?.total || 0;

        let orderClause = 'ORDER BY s.rowid DESC';
        if (sortBy === 'id_asc') {
          orderClause = 'ORDER BY s.student_id ASC';
        } else if (sortBy === 'name_asc') {
          orderClause = 'ORDER BY s.full_name ASC';
        }

        const dataQuery = `
          SELECT 
            s.student_id,
            s.full_name,
            s.class_name,
            s.created_at,
            ROUND(AVG(lr.final_score), 2) as average_score,
            ROUND(AVG(lr.attendance_rate), 2) as attendance_rate,
            ROUND(AVG(lr.study_hours), 1) as study_hours,
            ROUND(AVG(lr.completion_rate), 2) as completion_rate,
            COALESCE(p.risk_level, 'Thấp') as risk_level,
            COALESCE(p.predicted_score, ROUND(AVG(lr.final_score), 2)) as predicted_score
          FROM students s
          LEFT JOIN learning_records lr ON s.student_id = lr.student_id
          LEFT JOIN predictions p ON s.student_id = p.student_id
          ${whereClause}
          GROUP BY s.student_id
          ${orderClause}
          LIMIT ${limit} OFFSET ${offset}
        `;
        const rows = await env.DB.prepare(dataQuery).all();

        return jsonResponse({
          success: true,
          students: rows.results || [],
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(Number(total) / limit)
          }
        });
      }

      // ------------------------------------------------------------------------
      // 3. GET /api/students/:id - Chi tiết một sinh viên (Trang 2 & 5)
      // ------------------------------------------------------------------------
      const studentMatch = path.match(/^\/api\/students\/([^/]+)$/);
      if (studentMatch && method === 'GET') {
        const studentId = decodeURIComponent(studentMatch[1]);

        const student = await env.DB.prepare(
          'SELECT * FROM students WHERE student_id = ?'
        ).bind(studentId).first();

        if (!student) {
          return errorResponse('Không tìm thấy sinh viên', 404);
        }

        const records = await env.DB.prepare(
          'SELECT * FROM learning_records WHERE student_id = ? ORDER BY record_id DESC'
        ).bind(studentId).all();

        const topicResults = await env.DB.prepare(
          'SELECT * FROM topic_results WHERE student_id = ?'
        ).bind(studentId).all();

        const predictions = await env.DB.prepare(
          'SELECT * FROM predictions WHERE student_id = ? ORDER BY created_at DESC'
        ).bind(studentId).all();

        const learningPaths = await env.DB.prepare(
          'SELECT * FROM learning_paths WHERE student_id = ? ORDER BY path_id ASC'
        ).bind(studentId).all();

        return jsonResponse({
          success: true,
          student,
          learning_records: records.results || [],
          topic_results: topicResults.results || [],
          predictions: predictions.results || [],
          learning_paths: learningPaths.results || []
        });
      }

      // ------------------------------------------------------------------------
      // 4. POST /api/students - Thêm sinh viên mới
      // ------------------------------------------------------------------------
      if (method === 'POST' && path === '/api/students') {
        const body: any = await request.json();
        if (!body.student_id || !body.full_name || !body.class_name) {
          return errorResponse('Thiếu thông tin bắt buộc: student_id, full_name, class_name');
        }

        await env.DB.prepare(`
          INSERT INTO students (student_id, full_name, class_name)
          VALUES (?, ?, ?)
          ON CONFLICT(student_id) DO UPDATE SET 
            full_name = excluded.full_name,
            class_name = excluded.class_name
        `).bind(body.student_id, body.full_name, body.class_name).run();

        // Tạo bản ghi học tập
        const att = Number(body.attendance_rate || 0.85);
        const hrs = Number(body.study_hours || 12.0);
        const asg = Number(body.assignment_score || 7.5);
        const qz = Number(body.quiz_score || 7.0);
        const comp = Number(body.completion_rate || 0.80);
        const prev = Number(body.previous_score || 7.0);
        const calculatedFinal = Math.round((0.15 * (att * 10) + 0.20 * asg + 0.25 * qz + 0.15 * (comp * 10) + 0.25 * prev) * 100) / 100;
        const fin = body.final_score !== undefined && body.final_score !== null ? Number(body.final_score) : calculatedFinal;

        await env.DB.prepare(`
          INSERT INTO learning_records (
            student_id, course_id, attendance_rate, study_hours, 
            assignment_score, quiz_score, completion_rate, previous_score, final_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          body.student_id,
          body.course_id || 'CLOUD_101',
          att, hrs, asg, qz, comp, prev, fin
        ).run();

        // Tự động chạy Edge ML để tính dự đoán và lưu vào predictions
        const mlPred = predictEdgeML({
          attendance_rate: att,
          study_hours: hrs,
          assignment_score: asg,
          quiz_score: qz,
          completion_rate: comp,
          previous_score: prev
        });

        await env.DB.prepare(`
          INSERT INTO predictions (student_id, course_id, predicted_score, risk_level, model_version)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          body.student_id,
          body.course_id || 'CLOUD_101',
          mlPred.predicted_score,
          mlPred.risk_level,
          mlPred.model_version
        ).run();

        return jsonResponse({ success: true, message: 'Thêm sinh viên thành công' }, 201);
      }

      // ------------------------------------------------------------------------
      // 5. PUT /api/students/:id - Cập nhật thông tin sinh viên
      // ------------------------------------------------------------------------
      if (studentMatch && method === 'PUT') {
        const studentId = decodeURIComponent(studentMatch[1]);
        const body: any = await request.json();

        await env.DB.prepare(`
          UPDATE students 
          SET full_name = COALESCE(?, full_name), class_name = COALESCE(?, class_name)
          WHERE student_id = ?
        `).bind(body.full_name || null, body.class_name || null, studentId).run();

        return jsonResponse({ success: true, message: 'Cập nhật sinh viên thành công' });
      }

      // ------------------------------------------------------------------------
      // 6. DELETE /api/students/:id - Xóa sinh viên
      // ------------------------------------------------------------------------
      if (studentMatch && method === 'DELETE') {
        const studentId = decodeURIComponent(studentMatch[1]);

        await env.DB.prepare('DELETE FROM learning_records WHERE student_id = ?').bind(studentId).run();
        await env.DB.prepare('DELETE FROM topic_results WHERE student_id = ?').bind(studentId).run();
        await env.DB.prepare('DELETE FROM predictions WHERE student_id = ?').bind(studentId).run();
        await env.DB.prepare('DELETE FROM learning_paths WHERE student_id = ?').bind(studentId).run();
        await env.DB.prepare('DELETE FROM students WHERE student_id = ?').bind(studentId).run();

        return jsonResponse({ success: true, message: 'Đã xóa sinh viên' });
      }

      // ------------------------------------------------------------------------
      // 7. GET /api/analytics - Phân tích dữ liệu học tập nâng cao (Trang 3)
      // ------------------------------------------------------------------------
      if (method === 'GET' && path === '/api/analytics') {
        // Tương quan giữa study_hours và final_score
        const studyHoursCorr = await env.DB.prepare(`
          SELECT student_id, study_hours, final_score 
          FROM learning_records 
          WHERE final_score IS NOT NULL 
          LIMIT 100
        `).all();

        // Tương quan giữa attendance_rate và final_score
        const attendanceCorr = await env.DB.prepare(`
          SELECT student_id, ROUND(attendance_rate * 100, 0) as attendance_pct, final_score 
          FROM learning_records 
          WHERE final_score IS NOT NULL 
          LIMIT 100
        `).all();

        // Điểm trung bình theo từng chủ đề
        const topicPerformance = await env.DB.prepare(`
          SELECT 
            topic_name, 
            ROUND(AVG(score), 2) as avg_score, 
            COUNT(*) as student_count,
            COUNT(CASE WHEN score < 5.0 THEN 1 END) as weak_students_count
          FROM topic_results 
          GROUP BY topic_name 
          ORDER BY avg_score ASC
        `).all();

        // Phân bố điểm theo từng môn học
        const courseScores = await env.DB.prepare(`
          SELECT 
            c.course_id,
            c.course_name,
            ROUND(AVG(lr.final_score), 2) as avg_score,
            ROUND(AVG(lr.attendance_rate * 100), 1) as avg_attendance,
            COUNT(lr.record_id) as total_students
          FROM courses c
          LEFT JOIN learning_records lr ON c.course_id = lr.course_id
          GROUP BY c.course_id
        `).all();

        return jsonResponse({
          success: true,
          study_hours_correlation: studyHoursCorr.results || [],
          attendance_correlation: attendanceCorr.results || [],
          topic_performance: topicPerformance.results || [],
          course_scores: courseScores.results || []
        });
      }

      // ------------------------------------------------------------------------
      // 8. POST /api/predict - Dự đoán kết quả Machine Learning (Trang 4)
      // ------------------------------------------------------------------------
      if (method === 'POST' && path === '/api/predict') {
        const body: PredictRequest = await request.json();

        // Validate đầu vào
        if (
          body.attendance_rate === undefined ||
          body.study_hours === undefined ||
          body.assignment_score === undefined ||
          body.quiz_score === undefined ||
          body.completion_rate === undefined ||
          body.previous_score === undefined
        ) {
          return errorResponse('Thiếu các biến đặc trưng bắt buộc cho mô hình ML.');
        }

        // Chạy Edge ML Inference
        const result = predictEdgeML(body);

        // Nếu có student_id, lưu dự đoán vào bảng predictions của D1
        let saved = false;
        if (body.student_id) {
          await env.DB.prepare(`
            INSERT INTO predictions (student_id, course_id, predicted_score, risk_level, model_version)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            body.student_id,
            body.course_id || 'CLOUD_101',
            result.predicted_score,
            result.risk_level,
            result.model_version
          ).run();
          saved = true;
        }

        return jsonResponse({
          ...result,
          prediction_saved: saved
        });
      }

      // ------------------------------------------------------------------------
      // 9. GET /api/students/:id/learning-path - Lộ trình cá nhân hóa (Trang 5)
      // ------------------------------------------------------------------------
      const pathMatch = path.match(/^\/api\/students\/([^/]+)\/learning-path$/);
      if (pathMatch && method === 'GET') {
        const studentId = decodeURIComponent(pathMatch[1]);

        // Kiểm tra xem đã có lộ trình lưu trong D1 chưa
        const existingPath = await env.DB.prepare(`
          SELECT 
            lp.path_id,
            lp.student_id,
            lp.course_id,
            lp.topic_name,
            lp.priority,
            lp.resource_url,
            lp.status,
            COALESCE(tr.score, 6.0) as current_score
          FROM learning_paths lp
          LEFT JOIN topic_results tr ON lp.student_id = tr.student_id AND lp.topic_name = tr.topic_name
          WHERE lp.student_id = ?
          ORDER BY 
            CASE lp.priority 
              WHEN 'Ưu tiên cao' THEN 1 
              WHEN 'Ưu tiên trung bình' THEN 2 
              WHEN 'Ưu tiên thấp' THEN 3 
              ELSE 4 
            END ASC
        `).bind(studentId).all();

        if (existingPath.results && existingPath.results.length > 0) {
          return jsonResponse({
            success: true,
            student_id: studentId,
            learning_path: existingPath.results
          });
        }

        // Nếu chưa có, lấy điểm chủ đề để sinh lộ trình động theo quy tắc sư phạm
        const topicScores = await env.DB.prepare(`
          SELECT topic_name, score FROM topic_results WHERE student_id = ?
        `).bind(studentId).all();

        if (!topicScores.results || topicScores.results.length === 0) {
          // Khởi tạo các chủ đề mặc định nếu sinh viên mới chưa có bài làm
          const defaultTopics = [
            { topic_name: 'Kiến trúc Serverless & Edge Computing', score: 4.5 },
            { topic_name: 'Lưu trữ Object Storage (R2)', score: 6.0 },
            { topic_name: 'Cơ sở dữ liệu SQL phân tán (D1)', score: 5.5 },
            { topic_name: 'API Gateway & Workers Routing', score: 7.2 },
            { topic_name: 'Machine Learning Inference trên Edge', score: 4.0 },
            { topic_name: 'Bảo mật, IAM & Giới hạn tài nguyên', score: 8.0 }
          ];
          const dynamicPath = generatePersonalizedPath(defaultTopics);
          return jsonResponse({
            success: true,
            student_id: studentId,
            learning_path: dynamicPath
          });
        }

        const dynamicPath = generatePersonalizedPath(topicScores.results as any);
        return jsonResponse({
          success: true,
          student_id: studentId,
          learning_path: dynamicPath
        });
      }

      // ------------------------------------------------------------------------
      // 10. PATCH /api/learning-path/:id - Đánh dấu hoàn thành bài học (Trang 5)
      // ------------------------------------------------------------------------
      const patchPathMatch = path.match(/^\/api\/learning-path\/([^/]+)$/);
      if (patchPathMatch && method === 'PATCH') {
        const pathId = parseInt(patchPathMatch[1], 10);
        const body: any = await request.json();

        if (!body.status) {
          return errorResponse('Thiếu trạng thái cập nhật (status)');
        }

        await env.DB.prepare(`
          UPDATE learning_paths SET status = ? WHERE path_id = ?
        `).bind(body.status, pathId).run();

        return jsonResponse({
          success: true,
          message: 'Đã cập nhật trạng thái lộ trình học tập'
        });
      }

      // ------------------------------------------------------------------------
      // 11. POST /api/data/import - Nhập dữ liệu CSV & Lưu trữ R2 (Trang 6)
      // ------------------------------------------------------------------------
      if (method === 'POST' && path === '/api/data/import') {
        const body: any = await request.json();
        const records = body.records;
        const filename = body.filename || `import_${Date.now()}.csv`;

        if (!records || !Array.isArray(records) || records.length === 0) {
          return errorResponse('Không có bản ghi nào để import.');
        }

        let validCount = 0;
        let invalidCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          const sid = row.student_id;
          const att = parseFloat(row.attendance_rate);
          const hrs = parseFloat(row.study_hours);
          const asg = parseFloat(row.assignment_score);
          const qz = parseFloat(row.quiz_score);
          const comp = parseFloat(row.completion_rate);
          const prev = parseFloat(row.previous_score);
          const fin = row.final_score !== undefined ? parseFloat(row.final_score) : null;

          // Validate ranges
          if (!sid || isNaN(att) || isNaN(hrs) || isNaN(asg) || isNaN(qz) || isNaN(comp) || isNaN(prev)) {
            invalidCount++;
            errors.push(`Dòng ${i + 1}: Dữ liệu không đúng định dạng số.`);
            continue;
          }

          if (att < 0 || att > 1 || comp < 0 || comp > 1 || asg < 0 || asg > 10 || qz < 0 || qz > 10) {
            invalidCount++;
            errors.push(`Dòng ${i + 1}: Giá trị nằm ngoài thang điểm chuẩn.`);
            continue;
          }

          try {
            // Thêm sinh viên nếu chưa có, hoặc cập nhật thông tin nếu có
            await env.DB.prepare(`
              INSERT INTO students (student_id, full_name, class_name)
              VALUES (?, ?, ?)
              ON CONFLICT(student_id) DO UPDATE SET 
                full_name = excluded.full_name,
                class_name = excluded.class_name
            `).bind(sid, row.full_name || `Sinh viên ${sid}`, row.class_name || 'K19-CNTT01').run();

            // Thêm bản ghi học tập
            await env.DB.prepare(`
              INSERT INTO learning_records (
                student_id, course_id, attendance_rate, study_hours, 
                assignment_score, quiz_score, completion_rate, previous_score, final_score
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(sid, 'CLOUD_101', att, hrs, asg, qz, comp, prev, fin).run();

            // Tự động suy luận Machine Learning cho sinh viên mới import
            const mlPred = predictEdgeML({
              attendance_rate: att,
              study_hours: hrs,
              assignment_score: asg,
              quiz_score: qz,
              completion_rate: comp,
              previous_score: prev
            });

            await env.DB.prepare(`
              INSERT INTO predictions (student_id, course_id, predicted_score, risk_level, model_version)
              VALUES (?, ?, ?, ?, ?)
            `).bind(sid, 'CLOUD_101', mlPred.predicted_score, mlPred.risk_level, mlPred.model_version).run();

            validCount++;
          } catch (e: any) {
            invalidCount++;
            errors.push(`Dòng ${i + 1}: ${e.message}`);
          }
        }

        // Lưu metadata vào R2 nếu binding tồn tại
        const r2Key = `raw/imports/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;
        if (env.STORAGE && typeof env.STORAGE.put === 'function') {
          try {
            await env.STORAGE.put(r2Key, JSON.stringify(records));
          } catch (err) {
            console.error('R2 upload warning:', err);
          }
        }

        // Ghi lịch sử nhập dữ liệu
        await env.DB.prepare(`
          INSERT INTO import_history (filename, total_records, valid_records, invalid_records, r2_key)
          VALUES (?, ?, ?, ?, ?)
        `).bind(filename, records.length, validCount, invalidCount, r2Key).run();

        return jsonResponse({
          success: true,
          total_records: records.length,
          valid_records: validCount,
          invalid_records: invalidCount,
          r2_key: r2Key,
          errors: errors.slice(0, 10)
        });
      }

      // ------------------------------------------------------------------------
      // 12. GET /api/data/import-history - Lịch sử import (Trang 6)
      // ------------------------------------------------------------------------
      if (method === 'GET' && path === '/api/data/import-history') {
        const history = await env.DB.prepare(`
          SELECT * FROM import_history ORDER BY created_at DESC LIMIT 20
        `).all();

        return jsonResponse({
          success: true,
          history: history.results || []
        });
      }

      // ------------------------------------------------------------------------
      // 13. GET /api/ml/model-info - Thông tin mô hình & Metrics (Trang 7)
      // ------------------------------------------------------------------------
      if (method === 'GET' && path === '/api/ml/model-info') {
        // Trả về metrics thực nghiệm đã được kiểm định từ Python scikit-learn
        return jsonResponse({
          success: true,
          model_name: MODEL_METADATA.model_name,
          algorithm_regression: "Random Forest Regressor (100 estimators, max_depth=8)",
          algorithm_classification: "Random Forest Classifier (100 estimators, max_depth=8)",
          trained_at: MODEL_METADATA.trained_at,
          model_version: MODEL_METADATA.version,
          total_training_samples: 450,
          features: MODEL_METADATA.features,
          regression_metrics: {
            mae: MODEL_METADATA.metrics.mae,
            rmse: MODEL_METADATA.metrics.rmse,
            r2_score: MODEL_METADATA.metrics.r2_score,
            linear_baseline_r2: 0.9412
          },
          classification_metrics: {
            accuracy: MODEL_METADATA.metrics.accuracy,
            macro_precision: 0.9525,
            macro_recall: 0.9605,
            macro_f1: 0.9558,
            classes: ["Thấp", "Trung bình", "Cao"],
            confusion_matrix: [
              [119, 3, 0],
              [3, 190, 1],
              [0, 2, 132]
            ]
          },
          feature_importances: {
            "assignment_score": 0.3215,
            "completion_rate": 0.3015,
            "quiz_score": 0.2847,
            "previous_score": 0.0585,
            "attendance_rate": 0.0268,
            "study_hours": 0.0071
          }
        });
      }

      // ------------------------------------------------------------------------
      // 404 Not Found
      // ------------------------------------------------------------------------
      return errorResponse(`Endpoint not found: ${method} ${path}`, 404);

    } catch (error: any) {
      console.error('Worker API Error:', error);
      return jsonResponse({
        success: false,
        error: error.message || 'Lỗi xử lý máy chủ Cloudflare Workers'
      }, 500);
    }
  }
};
