// dev_server.js
// Máy chủ phát triển tích hợp (Local Dev Server) cho EduInsight Learning Analytics Platform
// Chạy đồng thời: Backend API Cloudflare Workers (giả lập D1 và R2) + Frontend React Pages
// Sử dụng Node 24 native SQLite (DatabaseSync) và HTTP Server tiêu chuẩn

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import workerModule from './src/worker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8787;
const DB_PATH = path.join(__dirname, 'storage', 'eduinsight_local.db');
const R2_DIR = path.join(__dirname, 'storage', 'r2');
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');

// Đảm bảo thư mục lưu trữ tồn tại
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(R2_DIR, { recursive: true });

// 1. Khởi tạo Cơ sở dữ liệu SQLite giả lập Cloudflare D1
console.log('🔄 Đang khởi tạo cơ sở dữ liệu Cloudflare D1 (Local SQLite)...');
const sqlite = new DatabaseSync(DB_PATH);

// Chạy migrations nếu chưa có bảng
const schemaSqlPath = path.join(__dirname, 'migrations', '0001_initial_schema.sql');
const seedSqlPath = path.join(__dirname, 'migrations', '0002_seed_data.sql');

if (fs.existsSync(schemaSqlPath)) {
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');
  sqlite.exec(schemaSql);
}

// Kiểm tra xem bảng students đã có dữ liệu chưa
const studentCheck = sqlite.prepare('SELECT COUNT(*) as count FROM students').get();
if (Number(studentCheck.count) === 0 && fs.existsSync(seedSqlPath)) {
  console.log('🌱 Đang nạp dữ liệu mẫu ban đầu (Seed Data) vào D1...');
  const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');
  sqlite.exec(seedSql);
  const afterSeed = sqlite.prepare('SELECT COUNT(*) as count FROM students').get();
  console.log(`✅ Đã nạp thành công ${afterSeed.count} sinh viên vào D1.`);
} else {
  console.log(`✅ Cơ sở dữ liệu D1 đã sẵn sàng (${studentCheck.count} sinh viên).`);
}

// 2. D1 API Wrapper chuẩn Cloudflare
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
          try {
            const stmt = sqliteDb.prepare(query);
            const rows = stmt.all(...boundParams);
            return { results: rows };
          } catch (err) {
            console.error('[D1 Error all()]', query, boundParams, err.message);
            throw err;
          }
        },
        async first() {
          try {
            const stmt = sqliteDb.prepare(query);
            const row = stmt.get(...boundParams);
            return row || null;
          } catch (err) {
            console.error('[D1 Error first()]', query, boundParams, err.message);
            throw err;
          }
        },
        async run() {
          try {
            const stmt = sqliteDb.prepare(query);
            stmt.run(...boundParams);
            return { success: true };
          } catch (err) {
            console.error('[D1 Error run()]', query, boundParams, err.message);
            throw err;
          }
        }
      };
    }
  };
}

// 3. R2 API Wrapper chuẩn Cloudflare
function createR2Binding(storageDir) {
  return {
    async put(key, content) {
      const fullPath = path.join(storageDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content));
      console.log(`[R2] Đã lưu object: ${key} -> ${fullPath}`);
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

// Cloudflare Environment Bindings
const env = {
  DB: createD1Binding(sqlite),
  STORAGE: createR2Binding(R2_DIR),
  AI: {
    async run(model, input) {
      return { response: 'Workers AI inference simulator' };
    }
  },
  ENVIRONMENT: 'development'
};

// 4. MIME Types map cho static frontend assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// 5. Khởi tạo HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost:8787'}`);
  const pathname = url.pathname;

  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // A. Xử lý Backend API (/api/*)
  if (pathname.startsWith('/api/')) {
    try {
      // Đọc toàn bộ body nếu có
      let bodyBuffer = [];
      for await (const chunk of req) {
        bodyBuffer.push(chunk);
      }
      const rawBody = Buffer.concat(bodyBuffer);

      // Clean headers for WHATWG Request
      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (val && !['host', 'connection'].includes(key.toLowerCase())) {
          headers.set(key, Array.isArray(val) ? val.join(', ') : val);
        }
      }

      // Chuyển đổi thành standard Fetch Request
      const workerRequest = new Request(url.toString(), {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : rawBody
      });

      // Gọi logic Cloudflare Worker
      const workerResponse = await workerModule.fetch(workerRequest, env);

      // Chuyển trả response về client
      const respHeaders = Object.fromEntries(workerResponse.headers.entries());
      respHeaders['access-control-allow-origin'] = '*';
      res.writeHead(workerResponse.status, respHeaders);
      const responseArrayBuffer = await workerResponse.arrayBuffer();
      res.end(Buffer.from(responseArrayBuffer));
      return;
    } catch (err) {
      console.error('[API Error]', pathname, err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // B. Xử lý Static Frontend Assets (Cloudflare Pages)
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Fallback về index.html cho SPA Routing
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy tài nguyên. Vui lòng chạy npm run build:frontend trước.');
  }
});

server.listen(PORT, () => {
  console.log('\n================================================================');
  console.log('🚀 EduInsight - Learning Analytics Platform (Cloudflare Stack)');
  console.log('================================================================');
  console.log(`🌐 Website Dashboard: http://localhost:${PORT}`);
  console.log(`📡 Backend API:      http://localhost:${PORT}/api/dashboard/overview`);
  console.log(`🗄️  Cơ sở dữ liệu D1:  SQLite emulated (${DB_PATH})`);
  console.log(`📦 Lưu trữ R2:       Local file storage (${R2_DIR})`);
  console.log(`🧠 Machine Learning: Random Forest (v1.2.0-rf, MAE=0.3016, R2=0.9545)`);
  console.log('================================================================\n');
});
