// tests/test_e2e.js
// Automated End-to-End Test Suite cho EduInsight Learning Analytics Platform

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import workerModule from '../src/worker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'storage', 'eduinsight_local.db');
const R2_DIR = path.join(__dirname, '..', 'storage', 'r2');

// Đảm bảo thư mục lưu trữ tồn tại
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(R2_DIR, { recursive: true });

// Khởi tạo D1 giả lập
const sqlite = new DatabaseSync(DB_PATH);

// Tự động nạp schema và seed nếu chưa có
const schemaSqlPath = path.join(__dirname, '..', 'migrations', '0001_initial_schema.sql');
const seedSqlPath = path.join(__dirname, '..', 'migrations', '0002_seed_data.sql');

if (fs.existsSync(schemaSqlPath)) {
  sqlite.exec(fs.readFileSync(schemaSqlPath, 'utf-8'));
}
const countRes = sqlite.prepare('SELECT COUNT(*) as count FROM students').get();
if (Number(countRes.count) === 0 && fs.existsSync(seedSqlPath)) {
  sqlite.exec(fs.readFileSync(seedSqlPath, 'utf-8'));
}

function createD1Binding(sqliteDb) {
  return {
    prepare(query) {
      let boundParams = [];
      return {
        bind(...args) {
          boundParams = args.map(arg => arg === undefined ? null : arg);
          return this;
        },
        async all() {
          const stmt = sqliteDb.prepare(query);
          return { results: stmt.all(...boundParams) };
        },
        async first() {
          const stmt = sqliteDb.prepare(query);
          return stmt.get(...boundParams) || null;
        },
        async run() {
          const stmt = sqliteDb.prepare(query);
          stmt.run(...boundParams);
          return { success: true };
        }
      };
    }
  };
}

function createR2Binding(storageDir) {
  fs.mkdirSync(storageDir, { recursive: true });
  return {
    async put(key, content) {
      const fullPath = path.join(storageDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content));
      return { key };
    },
    async get(key) {
      const fullPath = path.join(storageDir, key);
      if (!fs.existsSync(fullPath)) return null;
      const data = fs.readFileSync(fullPath);
      return {
        async text() { return data.toString('utf-8'); },
        async json() { return JSON.parse(data.toString('utf-8')); }
      };
    }
  };
}

const env = {
  DB: createD1Binding(sqlite),
  STORAGE: createR2Binding(R2_DIR),
  ENVIRONMENT: 'test'
};

async function callAPI(method, path, body = null) {
  const url = `http://localhost:8787${path}`;
  const req = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const res = await workerModule.fetch(req, env);
  const data = await res.json();
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG (END-TO-END TEST SUITE)');
  console.log('======================================================\n');

  // Test 1: GET /api/dashboard/overview
  console.log('1. Kiểm thử GET /api/dashboard/overview...');
  const t1 = await callAPI('GET', '/api/dashboard/overview');
  assert(t1.status === 200, 'HTTP Status 200');
  assert(t1.data.success === true, 'Data success = true');
  assert(t1.data.total_students >= 50, `Có ít nhất 50 sinh viên trong D1 (thực tế: ${t1.data.total_students})`);
  assert(t1.data.average_score > 0, `Điểm trung bình hợp lệ (${t1.data.average_score})`);
  assert(t1.data.score_distribution !== undefined, 'Có phân bố điểm số');

  // Test 2: GET /api/students
  console.log('\n2. Kiểm thử GET /api/students...');
  const t2 = await callAPI('GET', '/api/students?limit=5');
  assert(t2.status === 200, 'HTTP Status 200');
  assert(t2.data.students.length === 5, 'Phân trang lấy đúng 5 sinh viên');
  assert(t2.data.pagination.total_pages > 1, 'Tính toán tổng số trang đúng');

  // Test 3: POST /api/students (Thêm sinh viên mới)
  console.log('\n3. Kiểm thử POST /api/students (Thêm sinh viên)...');
  const testStudentId = `SV_TEST_${Date.now()}`;
  const t3 = await callAPI('POST', '/api/students', {
    student_id: testStudentId,
    full_name: 'Nguyễn Văn Kiểm Thử',
    class_name: 'K19-CNTT01',
    attendance_rate: 0.9,
    study_hours: 15.0,
    assignment_score: 8.5,
    quiz_score: 8.0,
    completion_rate: 0.85,
    previous_score: 8.0,
    final_score: 8.3
  });
  assert(t3.status === 201, 'Tạo sinh viên trả về 201');
  assert(t3.data.success === true, 'Tạo sinh viên thành công');

  // Test 4: GET /api/students/:id
  console.log('\n4. Kiểm thử GET /api/students/:id...');
  const t4 = await callAPI('GET', `/api/students/${testStudentId}`);
  assert(t4.status === 200, 'Lấy chi tiết sinh viên thành công');
  assert(t4.data.student.student_id === testStudentId, 'Đúng mã sinh viên');
  assert(t4.data.learning_records.length > 0, 'Đã tạo bản ghi học tập tương ứng');

  // Test 5: PUT /api/students/:id
  console.log('\n5. Kiểm thử PUT /api/students/:id (Cập nhật)...');
  const t5 = await callAPI('PUT', `/api/students/${testStudentId}`, {
    full_name: 'Nguyễn Văn Đã Cập Nhật'
  });
  assert(t5.status === 200, 'Cập nhật sinh viên thành công');
  const checkUpdated = await callAPI('GET', `/api/students/${testStudentId}`);
  assert(checkUpdated.data.student.full_name === 'Nguyễn Văn Đã Cập Nhật', 'Dữ liệu được cập nhật trong D1');

  // Test 6: POST /api/predict (Edge ML Inference với trường hợp nguy cơ cao)
  console.log('\n6. Kiểm thử POST /api/predict (Edge ML - Nguy cơ cao)...');
  const t6 = await callAPI('POST', '/api/predict', {
    attendance_rate: 0.45,
    study_hours: 3.0,
    assignment_score: 3.5,
    quiz_score: 3.0,
    completion_rate: 0.35,
    previous_score: 4.0
  });
  assert(t6.status === 200, 'API predict trả về 200');
  assert(t6.data.risk_level === 'Cao', `Xếp loại Nguy cơ Cao đúng (thực tế: ${t6.data.risk_level})`);
  assert(t6.data.predicted_score < 5.0, `Điểm dự đoán < 5.0 (thực tế: ${t6.data.predicted_score})`);
  assert(t6.data.factors_to_improve.length >= 3, 'Chỉ ra ít nhất 3 yếu tố học tập cần cải thiện');

  // Test 7: POST /api/predict (Edge ML Inference với trường hợp an toàn)
  console.log('\n7. Kiểm thử POST /api/predict (Edge ML - Kết quả tốt)...');
  const t7 = await callAPI('POST', '/api/predict', {
    attendance_rate: 0.95,
    study_hours: 18.0,
    assignment_score: 8.8,
    quiz_score: 8.5,
    completion_rate: 0.92,
    previous_score: 8.5
  });
  assert(t7.data.risk_level === 'Thấp', `Xếp loại An toàn/Thấp đúng (thực tế: ${t7.data.risk_level})`);
  assert(t7.data.predicted_score >= 8.0, `Điểm dự đoán xuất sắc (thực tế: ${t7.data.predicted_score})`);
  assert(t7.data.pass_probability >= 90.0, `Xác suất qua môn cao (${t7.data.pass_probability}%)`);

  // Test 8: GET /api/students/:id/learning-path
  console.log('\n8. Kiểm thử GET /api/students/:id/learning-path (Lộ trình học tập)...');
  const t8 = await callAPI('GET', '/api/students/SV2026_001/learning-path');
  assert(t8.status === 200, 'Lấy lộ trình cá nhân hóa thành công');
  assert(t8.data.learning_path.length > 0, `Có ${t8.data.learning_path.length} chủ đề trong lộ trình`);
  const firstPath = t8.data.learning_path[0];
  assert(['Ưu tiên cao', 'Ưu tiên trung bình', 'Ưu tiên thấp', 'Mở rộng'].includes(firstPath.priority), 'Độ ưu tiên đúng chuẩn sư phạm');

  // Test 9: POST /api/data/import (Upload CSV & R2)
  console.log('\n9. Kiểm thử POST /api/data/import (Nhập dữ liệu & R2)...');
  const sampleImport = [
    { student_id: 'SV2026_901', attendance_rate: 0.9, study_hours: 14, assignment_score: 8, quiz_score: 8, completion_rate: 0.85, previous_score: 8 },
    { student_id: 'SV2026_902', attendance_rate: 0.8, study_hours: 10, assignment_score: 7, quiz_score: 7, completion_rate: 0.75, previous_score: 7 }
  ];
  const t9 = await callAPI('POST', '/api/data/import', {
    records: sampleImport,
    filename: 'unit_test_batch.csv'
  });
  assert(t9.status === 200, 'Import trả về 200');
  assert(t9.data.valid_records === 2, '2/2 bản ghi hợp lệ');
  assert(t9.data.r2_key.includes('unit_test_batch.csv'), 'Có sinh R2 storage key');

  // Test 10: GET /api/ml/model-info
  console.log('\n10. Kiểm thử GET /api/ml/model-info (Model Registry)...');
  const t10 = await callAPI('GET', '/api/ml/model-info');
  assert(t10.status === 200, 'Lấy thông tin mô hình thành công');
  assert(t10.data.regression_metrics.r2_score >= 0.90, `R2 score đạt chuẩn (thực tế: ${t10.data.regression_metrics.r2_score})`);
  assert(t10.data.regression_metrics.mae <= 0.40, `MAE đạt chuẩn (thực tế: ${t10.data.regression_metrics.mae})`);
  assert(t10.data.classification_metrics.confusion_matrix.length === 3, 'Có đủ ma trận nhầm lẫn 3x3');

  // Test 11: DELETE /api/students/:id (Dọn dẹp)
  console.log('\n11. Kiểm thử DELETE /api/students/:id (Dọn dẹp)...');
  const t11 = await callAPI('DELETE', `/api/students/${testStudentId}`);
  assert(t11.status === 200, 'Xóa sinh viên kiểm thử thành công');
  await callAPI('DELETE', '/api/students/SV2026_901');
  await callAPI('DELETE', '/api/students/SV2026_902');

  console.log('\n======================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ ĐẠT 100%!');
  } else {
    console.error(`⚠️ CÓ ${failed} BÀI KIỂM THỬ KHÔNG ĐẠT!`);
    process.exit(1);
  }
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Lỗi khi chạy test suite:', err);
  process.exit(1);
});
