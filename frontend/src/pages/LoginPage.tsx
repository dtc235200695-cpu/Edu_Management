// frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { loginApi } from '../api';
import { UserPersona, UserRole, USER_PERSONAS } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Server
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserPersona) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [username, setUsername] = useState('SV2026');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    if (role === 'student') {
      setUsername('SV2026');
      setPassword('123456');
    } else if (role === 'lecturer') {
      setUsername('giangvien.dtm@cloud.edu.vn');
      setPassword('123456');
    } else {
      setUsername('admin');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginApi({
        username,
        password,
        role: selectedRole
      });

      if (res.success && res.user) {
        localStorage.setItem('eduinsight_auth', JSON.stringify(res.user));
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Đăng nhập không thành công');
      }
    } catch (err: any) {
      // Fallback local authentication if offline/demo
      if (USER_PERSONAS[selectedRole]) {
        const fallbackUser = USER_PERSONAS[selectedRole];
        localStorage.setItem('eduinsight_auth', JSON.stringify(fallbackUser));
        onLoginSuccess(fallbackUser);
      } else {
        setError(err.message || 'Lỗi kết nối tới hệ thống Cloudflare');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    handleRoleChange(role);
    const targetUser = USER_PERSONAS[role];
    localStorage.setItem('eduinsight_auth', JSON.stringify(targetUser));
    onLoginSuccess(targetUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 bg-blue-500/10 border border-blue-400/20 rounded-full text-blue-300 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Nền tảng Cloudflare Serverless Edge</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Edu<span className="text-blue-400">Insight</span>
          </h1>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            Phân tích dữ liệu học tập và ứng dụng Machine Learning dự đoán kết quả, cá nhân hóa lộ trình
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-7 shadow-2xl border border-white/20 space-y-5">
          {/* Role Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Chọn vai trò đăng nhập
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  selectedRole === 'student' 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🎓 Sinh viên</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('lecturer')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  selectedRole === 'lecturer' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👨‍🏫 Giảng viên</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  selectedRole === 'admin' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚙️ Admin</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedRole === 'student' ? 'Mã sinh viên hoặc Email *' : 'Tên đăng nhập / Email *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === 'student' ? 'VD: SV2026' : 'Tài khoản...'}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Mật khẩu *</label>
                <span className="text-[11px] text-slate-400">Gợi ý: 123456</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 ${
                selectedRole === 'student'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : selectedRole === 'admin'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực Cloudflare...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo 1-Click Access */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Đăng nhập nhanh 1-Click (Dành cho Buổi báo cáo)
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student')}
                className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-semibold transition-colors border border-purple-200/60"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <span>Đăng nhập vai <strong>Sinh viên: Hương Giang (SV2026)</strong></span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('lecturer')}
                className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-semibold transition-colors border border-blue-200/60"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Đăng nhập vai <strong>Ban Giảng Viên</strong></span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold transition-colors border border-amber-200/60"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span>Đăng nhập vai <strong>Quản Trị Viên (Admin)</strong></span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>Báo cáo môn học Điện toán đám mây • Cloudflare Edge Ecosystem 2026</p>
          <p className="text-[11px] text-slate-500">Cloudflare Pages + Workers API + D1 SQL Database + R2 Object Storage</p>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
