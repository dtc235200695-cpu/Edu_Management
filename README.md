# EduInsight – Nền tảng Learning Analytics & Dự đoán kết quả học tập trên Cloudflare

Hệ thống phân tích dữ liệu học tập (Learning Analytics), dự đoán kết quả bằng Machine Learning (Random Forest) và cá nhân hóa lộ trình học tập, triển khai trên nền tảng **Cloudflare Serverless Edge** (Cloudflare Pages, Workers, D1 SQL Database, R2 Object Storage, Workers AI).

---

## 📌 1. Giới thiệu đề tài & Mục tiêu

- **Tên dự án:** EduInsight – Learning Analytics Platform
- **Môn học:** Điện toán đám mây (Cloud Computing) - Năm 2026
- **Mục tiêu hệ thống:**
  1. **Quản lý dữ liệu học tập:** Lưu trữ có cấu trúc trên Cloudflare D1 (SQL), lưu trữ dataset CSV và tài liệu trên Cloudflare R2.
  2. **Trực quan hóa & Phân tích:** Dashboard hiển thị biểu đồ phân bố điểm, tương quan giờ học/chuyên cần, đánh giá theo từng chủ đề.
  3. **Dự đoán bằng Machine Learning:** Huấn luyện mô hình Random Forest Regressor & Classifier để dự đoán điểm cuối kỳ và phân loại nguy cơ học tập (Thấp / Trung bình / Cao).
  4. **Cá nhân hóa lộ trình học:** Tự động sinh lộ trình học tập theo quy tắc sư phạm và điểm yếu của từng sinh viên, cho phép theo dõi tiến độ.
  5. **Hạ tầng Serverless hiện đại:** Triển khai toàn diện trên hạ tầng Cloudflare Edge, đảm bảo tốc độ phản hồi nhanh, không cần quản trị máy chủ vật lý.

---

## 🏛️ 2. Kiến trúc hệ thống trên Cloudflare

```
                           NGƯỜI DÙNG
               (Sinh viên / Giảng viên / Quản trị viên)
                                |
                                v
                    CLOUDFLARE PAGES (Frontend)
             React + TypeScript + Vite + Tailwind CSS + Recharts
                                |
                        HTTPS / REST API
                                v
                   CLOUDFLARE WORKERS (Backend)
               API Gateway + Validation + Edge ML Engine
                     |               |               |
                     v               v               v
             CLOUDFLARE D1    CLOUDFLARE R2    WORKERS AI / ML
            (SQLite Edge DB) (Object Storage)  (Inference)
                     |               |
                     +-------+-------+
                             |
                     CRON TRIGGERS
             (Tác vụ tính toán rủi ro định kỳ)
```

### Các dịch vụ Cloudflare sử dụng:
1. **Cloudflare Pages:** Host giao diện Single Page Application (SPA), tích hợp CDN toàn cầu.
2. **Cloudflare Workers:** Xử lý toàn bộ logic nghiệp vụ REST API, kiểm tra dữ liệu, điều phối và suy luận mô hình học máy trực tiếp trên Edge.
3. **Cloudflare D1:** Cơ sở dữ liệu quan hệ SQL phân tán lưu trữ sinh viên, khóa học, điểm bài tập, kết quả theo chủ đề, lịch sử dự đoán và lộ trình.
4. **Cloudflare R2:** Lưu trữ đối tượng (Object Storage) không tính phí băng thông truyền tải (Zero Egress Fee) cho các file CSV thô, dataset và báo cáo.
5. **Cloudflare Workers AI:** Tích hợp inference mô hình AI khi cần xử lý nội dung tổng hợp.
6. **Cron Triggers:** Xử lý tác vụ tính toán rủi ro học tập theo lô định kỳ.

---

## 💻 3. Công nghệ sử dụng

| Tầng | Công nghệ / Thư viện |
| :--- | :--- |
| **Frontend** | React 18, TypeScript 5, Vite 6, Tailwind CSS 3, Recharts 2, Lucide React |
| **Backend API** | Cloudflare Workers, TypeScript, REST API chuẩn RESTful, Wrangler CLI |
| **Database** | Cloudflare D1 (SQLite Engine trên Edge), Migrations SQL |
| **Storage** | Cloudflare R2 (S3-compatible Object Storage) |
| **Machine Learning**| Python 3, scikit-learn, pandas, numpy, joblib |
| **Mô hình ML** | **Random Forest Regressor** (Hồi quy điểm thi) & **Random Forest Classifier** (Phân loại rủi ro) |

---

## 📊 4. Kết quả thực nghiệm Machine Learning

Mô hình được huấn luyện trên tập dữ liệu học tập mô phỏng theo cấu trúc **UCI Student Performance**, hoàn toàn tách biệt giữa các đặc trưng (features) và biến mục tiêu (target) để **ngăn ngừa rò rỉ dữ liệu (Data Leakage)**:

- **Các đặc trưng đầu vào (Features):** `attendance_rate`, `study_hours`, `assignment_score`, `quiz_score`, `completion_rate`, `previous_score`.
- **Nhãn dự đoán (Targets):**
  - Hồi quy: `final_score` (Điểm thi cuối kỳ, thang điểm 0 - 10).
  - Phân loại: `risk_level` ('Thấp' - An toàn, 'Trung bình' - Cần chú ý, 'Cao' - Nguy cơ trượt môn).

### Chỉ số đánh giá mô hình thực tế:

| Bài toán | Mô hình | Chỉ số đánh giá | Kết quả thực nghiệm |
| :--- | :--- | :--- | :--- |
| **Hồi quy điểm số** | Random Forest Regressor (100 cây, max_depth=8) | **MAE** (Sai số tuyệt đối TB) | **0.3016** |
| | | **RMSE** (Căn bậc hai MSE) | **0.3731** |
| | | **R² Score** (Độ giải thích) | **0.9545** (95.45%) |
| **Phân loại rủi ro**| Random Forest Classifier (100 cây, max_depth=8) | **Accuracy** (Độ chính xác) | **95.56%** (Kiểm thử) / 98.0% (Toàn bộ) |
| | | **Macro Precision** | **0.9525** |
| | | **Macro Recall** | **0.9605** |
| | | **Macro F1-Score** | **0.9558** |

### Ma trận nhầm lẫn (Confusion Matrix):
```
Thực tế \ Dự đoán    Dự đoán Thấp    Dự đoán Trung bình    Dự đoán Cao
Lớp Thấp (An toàn)        119                 3                  0
Lớp Trung bình              3               190                  1
Lớp Cao (Nguy cơ)           0                 2                132
```

---

## 🖥️ 5. Các trang chức năng của Website (8 Trang)

1. **Dashboard tổng quan:** Thống kê KPI (tổng SV, điểm TB, tỷ lệ đạt môn, số ca nguy cơ), biểu đồ phân bố điểm số, biểu đồ tỷ lệ rủi ro, bảng sinh viên cần hỗ trợ can thiệp, bộ lọc theo lớp và môn học.
2. **Quản lý sinh viên:** Bảng sinh viên đầy đủ phân trang, tìm kiếm, lọc theo lớp/mức rủi ro, modal xem hồ sơ học tập chi tiết, chức năng Thêm / Sửa / Xóa sinh viên.
3. **Phân tích dữ liệu học tập:** Biểu đồ phân tán (Scatter Chart) tương quan giờ học vs điểm thi, chuyên cần vs điểm thi, mạng lưới radar phân tích độ khó từng chủ đề.
4. **Dự đoán kết quả bằng Machine Learning:** Bộ điều khiển thanh trượt trực quan cho 6 tham số học tập, gọi trực tiếp Edge ML Inference trả về điểm dự đoán, mức rủi ro, xác suất đạt môn, các yếu tố cần cải thiện và khuyến nghị hành động.
5. **Cá nhân hóa lộ trình học tập:** Tự động sắp xếp các chủ đề yếu lên trước theo 4 cấp độ ưu tiên (Ưu tiên cao &lt; 5đ: học lại cơ bản; Ưu tiên trung bình 5-7đ: luyện tập thêm; Ưu tiên thấp 7-8.5đ: nâng cao; Mở rộng ≥ 8.5đ: chuyên đề). Cho phép sinh viên đánh dấu hoàn thành và cập nhật tiến độ.
6. **Quản lý dữ liệu:** Upload file CSV, xem trước dữ liệu (preview), kiểm tra lỗi định dạng, lưu trữ file thô lên Cloudflare R2, nạp bản ghi vào D1, xem lịch sử import, tải file mẫu CSV.
7. **Quản lý mô hình Machine Learning:** Chi tiết metadata mô hình, thuật toán, ngày huấn luyện, số lượng mẫu, bảng metrics MAE/RMSE/R2/Precision/Recall/F1, ma trận nhầm lẫn và biểu đồ mức độ ảnh hưởng của đặc trưng (Feature Importance).
8. **Cài đặt hệ thống:** Quản lý tài khoản, ma trận phân quyền (RBAC), trạng thái kết nối các dịch vụ Cloudflare (Pages, Workers, D1, R2, AI), hướng dẫn biến môi trường.

---

## 🚀 6. Hướng dẫn chạy thử nghiệm Local (Development)

Hệ thống được trang bị máy chủ phát triển tích hợp `dev_server.js` sử dụng SQLite nội tại của Node.js để giả lập 100% Cloudflare D1 và Cloudflare R2 mà **không cần tạo tài khoản Cloudflare trước**.

### Bước 1: Huấn luyện mô hình Machine Learning (Python)
```bash
# Huấn luyện mô hình, tính toán metrics và xuất trọng số Edge
python ml/train_model.py

# Đánh giá chi tiết mô hình
python ml/evaluate_model.py
```

### Bước 2: Biên dịch Frontend React
```bash
# Cài đặt thư viện frontend (nếu chưa cài)
cd frontend
npm install

# Build mã nguồn thành static bundle cho Cloudflare Pages
npm run build
cd ..
```

### Bước 3: Khởi động máy chủ tích hợp
```bash
# Khởi động server (API + D1 SQLite + R2 Storage + Frontend Dashboard)
node dev_server.js
```
Truy cập trình duyệt tại: **http://localhost:8787**

### Bước 4: Chạy bộ kiểm thử tự động (End-to-End Tests)
```bash
node --experimental-strip-types tests/test_e2e.js
```
Kết quả kiểm thử: **33/33 Tests PASSED (100%)**.

---

## ☁️ 7. Hướng dẫn triển khai lên Cloudflare (Production Deployment)

### Bước 1: Đăng nhập vào Cloudflare CLI (Wrangler)
```bash
npx wrangler login
```

### Bước 2: Tạo Cloudflare D1 Database
```bash
# Tạo cơ sở dữ liệu D1
npx wrangler d1 create eduinsight-db
```
Lệnh sẽ trả về `database_id` (VD: `4a9b2c1d-1234-5678-abcd-ef0123456789`).
Mở file `wrangler.jsonc` và cập nhật trường:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "eduinsight-db",
    "database_id": "<DATABASE_ID_VỪA_TẠO>"
  }
]
```

### Bước 3: Tạo Cloudflare R2 Bucket
```bash
# Tạo bucket R2 để lưu file CSV và báo cáo
npx wrangler r2 bucket create eduinsight-storage
```

### Bước 4: Chạy Migration và Nạp Seed Data lên D1
```bash
# 1. Tạo các bảng cơ sở dữ liệu
npx wrangler d1 execute eduinsight-db --remote --file=./migrations/0001_initial_schema.sql

# 2. Nạp dữ liệu mẫu ban đầu (60 sinh viên, 4 khóa học, điểm chủ đề và lộ trình)
npx wrangler d1 execute eduinsight-db --remote --file=./migrations/0002_seed_data.sql
```

### Bước 5: Build Frontend và Deploy Worker API + Pages
```bash
# Build Frontend
cd frontend
npm run build
cd ..

# Deploy toàn bộ hệ thống lên Cloudflare
npx wrangler deploy
```

Sau khi deploy thành công, Wrangler sẽ cung cấp URL công khai (VD: `https://eduinsight-api.<your-subdomain>.workers.dev`). Bạn có thể gán Custom Domain hoặc kết nối với Cloudflare Pages tùy ý.

---

## 📁 8. Cấu trúc thư mục dự án

```
DTDM/
├── frontend/                   # Ứng dụng Frontend (React, Vite, TypeScript, Tailwind)
│   ├── src/
│   │   ├── components/         # Sidebar, Header
│   │   ├── pages/              # 8 Trang chức năng
│   │   ├── api.ts              # Client API kết nối Backend
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── App.tsx             # Root layout & routing
│   │   └── main.tsx            # Entrypoint
│   ├── dist/                   # Static build output cho Cloudflare Pages
│   └── package.json
├── src/                        # Cloudflare Workers Backend
│   ├── worker.ts               # Router & Controller REST API
│   ├── edge_ml.ts              # Edge Machine Learning Inference Engine
│   ├── recommendation.ts       # Quy tắc đề xuất lộ trình sư phạm
│   └── types.ts                # Data models & bindings
├── ml/                         # Machine Learning Module (Python)
│   ├── generate_dataset.py     # Sinh dữ liệu học tập mô phỏng (UCI-like)
│   ├── train_model.py          # Huấn luyện Random Forest Regressor & Classifier
│   ├── evaluate_model.py       # Đánh giá MAE, RMSE, R2, Confusion Matrix
│   ├── predict.py              # CLI / Module suy luận độc lập
│   ├── model_metrics.json      # Báo cáo kết quả kiểm định mô hình
│   ├── model_weights.json      # Trọng số xuất bản cho Edge Worker
│   └── requirements.txt
├── migrations/                 # Cơ sở dữ liệu Cloudflare D1
│   ├── 0001_initial_schema.sql # DDL tạo 8 bảng và indexes
│   └── 0002_seed_data.sql      # DML nạp dữ liệu mẫu thực tế
├── storage/                    # Thư mục lưu trữ local giả lập D1 & R2
├── tests/                      # Bộ kiểm thử tự động
│   └── test_e2e.js             # 33 bài test toàn diện các endpoints & logic
├── dev_server.js               # Máy chủ local serverless emulator
├── wrangler.jsonc              # Cấu hình triển khai Cloudflare Wrangler
├── .env.example                # Mẫu biến môi trường
├── package.json                # Scripts quản lý dự án
└── README.md                   # Tài liệu hướng dẫn chi tiết
```

---

## 👥 9. Đơn vị thực hiện

- **Đề tài:** Phân tích dữ liệu học tập và ứng dụng Machine Learning trong dự đoán kết quả, cá nhân hóa lộ trình học tập trên nền tảng Cloudflare
- **Môn học:** Điện toán đám mây
- **Năm thực hiện:** 2026
