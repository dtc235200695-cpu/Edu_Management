// frontend/src/pages/SystemSettings.tsx
import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Database,
  Cloud,
  Cpu,
  User,
  Lock,
  Server,
  CheckCircle2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'roles' | 'about'>('cloudflare');

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('cloudflare')}
          className={`shrink-0 flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === 'cloudflare' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Hạ tầng Cloudflare</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`shrink-0 flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === 'roles' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Lock className="w-4 h-4" />
          <span>Tài khoản &amp; Phân quyền</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`shrink-0 flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === 'about' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <Server className="w-4 h-4" />
          <span>Thông tin phiên bản</span>
        </button>
      </div>

      {/* Tab 1: Cloudflare Infrastructure Status */}
      {activeTab === 'cloudflare' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">Trạng thái kết nối dịch vụ Cloudflare</h3>
            <p className="text-xs text-slate-500 mb-5">
              Hệ thống hoạt động trên kiến trúc Edge Serverless không máy chủ vật lý
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cloudflare Pages */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <span>Cloudflare Pages</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Triển khai Single Page Application (React, Vite, Tailwind CSS)
                  </p>
                  <span className="text-[11px] font-mono text-slate-600 mt-2 block">
                    Routing: Edge CDN Global
                  </span>
                </div>
                <span className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Hoạt động</span>
                </span>
              </div>

              {/* Cloudflare Workers */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <Server className="w-4 h-4 text-orange-500" />
                    <span>Cloudflare Workers API</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    API Gateway, Authentication, Validation, Edge ML inference
                  </p>
                  <span className="text-[11px] font-mono text-slate-600 mt-2 block">
                    Runtime: V8 Isolate (Zero Cold-Start)
                  </span>
                </div>
                <span className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sẵn sàng</span>
                </span>
              </div>

              {/* Cloudflare D1 Database */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Cloudflare D1 SQL</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Cơ sở dữ liệu quan hệ cho sinh viên, khóa học, điểm và lộ trình
                  </p>
                  <span className="text-[11px] font-mono text-slate-600 mt-2 block">
                    Binding: DB (SQLite Engine)
                  </span>
                </div>
                <span className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã kết nối</span>
                </span>
              </div>

              {/* Cloudflare R2 Storage */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <Cloud className="w-4 h-4 text-purple-500" />
                    <span>Cloudflare R2 Object Storage</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Lưu trữ file dữ liệu CSV thô, báo cáo xuất bản và model weights
                  </p>
                  <span className="text-[11px] font-mono text-slate-600 mt-2 block">
                    Binding: STORAGE (Zero Egress Fee)
                  </span>
                </div>
                <span className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sẵn sàng</span>
                </span>
              </div>
            </div>
          </div>

          {/* Security Best Practices Reminder */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
            <h4 className="font-bold flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Bảo mật & Quản lý Secrets trên Cloudflare</span>
            </h4>
            <p>
              Hệ thống tuân thủ nguyên tắc không lưu trữ API Token, Database credentials hoặc bí mật trực tiếp trong mã nguồn frontend.
              Các biến môi trường được quản lý qua Cloudflare Dashboard và lệnh <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">wrangler secret put</code>.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Roles and Accounts */}
      {activeTab === 'roles' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Ma trận phân quyền (Role-Based Access Control)</h3>
            <p className="text-xs text-slate-500">Phân tách rõ ràng quyền hạn giữa Sinh viên, Giảng viên và Quản trị viên</p>
          </div>

          {/* Active System Users List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  GV
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Ban Giảng Viên</h4>
                  <span className="text-[11px] text-blue-700 font-semibold">Vai trò: Giảng viên</span>
                </div>
              </div>
              <p className="text-xs text-slate-600">Quyền xem toàn bộ sinh viên, chấm điểm, quản lý lộ trình học tập, nhập dữ liệu CSV.</p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-blue-100">
                Email: giangvien.dtm@cloud.edu.vn
              </div>
            </div>

            <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  SV
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Nguyễn Văn A (SV2026)</h4>
                  <span className="text-[11px] text-purple-700 font-semibold">Vai trò: Sinh viên</span>
                </div>
              </div>
              <p className="text-xs text-slate-600">Lớp K22-CNTT01. Quyền xem hồ sơ cá nhân, đánh dấu tiến độ bài học, chạy dự đoán ML kết quả học tập.</p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-purple-100">
                Email: a.sv2026@student.edu.vn
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                  AD
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Quản Trị Viên (Admin)</h4>
                  <span className="text-[11px] text-amber-800 font-semibold">Vai trò: Quản trị viên</span>
                </div>
              </div>
              <p className="text-xs text-slate-600">Toàn quyền hệ thống, quản lý Cloudflare D1 migrations, cấu hình R2 bucket và phiên bản mô hình ML.</p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-amber-100">
                Email: admin@eduinsight.cloudflare.com
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 font-bold text-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Tính năng / Quyền hạn</th>
                  <th className="p-3 text-center">Sinh viên</th>
                  <th className="p-3 text-center">Giảng viên</th>
                  <th className="p-3 text-center">Quản trị viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-semibold">Xem Dashboard cá nhân & Lộ trình học</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Đánh dấu tiến độ hoàn thành bài học</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Chạy dự đoán kết quả học tập (ML)</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Quản lý danh sách sinh viên & Điểm số</td>
                  <td className="p-3 text-center text-slate-300">—</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Nhập dữ liệu CSV thô & Lưu trữ R2</td>
                  <td className="p-3 text-center text-slate-300">—</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Cấu hình hệ thống, D1 Migration & Model Version</td>
                  <td className="p-3 text-center text-slate-300">—</td>
                  <td className="p-3 text-center text-slate-300">—</td>
                  <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: About & Version info */}
      {activeTab === 'about' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
              EI
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">EduInsight – Learning Analytics Platform</h3>
              <p className="text-xs text-slate-500">Đề tài Báo cáo môn học Điện toán đám mây • Năm 2026</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-slate-800">Phiên bản giao diện:</span> 1.2.0 (React 18 + TypeScript + Vite)
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-slate-800">Cloudflare Workers Runtime:</span> 2026 Edge Environment
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-slate-800">Mô hình Machine Learning:</span> Random Forest Regressor &amp; Classifier
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-slate-800">Hạ tầng triển khai:</span> Cloudflare Pages + Workers + D1 + R2
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
