import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import {
  fetchAppConfig,
  getErrorMessage,
  loginApi,
  requestPasswordReset,
  resetPassword,
} from '../api';
import { UserPersona } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserPersona) => void;
  initialError?: string;
}

type LoginMode = 'login' | 'forgot' | 'reset';

const authErrorMessages: Record<string, string> = {
  pending: 'Tài khoản Google đã được tạo và đang chờ quản trị viên duyệt.',
  email_unavailable: 'Không thể gửi mật khẩu qua email. Vui lòng liên hệ quản trị viên.',
  invalid_state: 'Phiên đăng nhập Google không hợp lệ. Hãy thử lại.',
  cancelled: 'Bạn đã hủy đăng nhập Google.',
  oauth_failed: 'Đăng nhập Google thất bại. Hãy thử lại sau.',
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, initialError }) => {
  const [mode, setMode] = useState<LoginMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get('authError');
    if (authError && authErrorMessages[authError]) setError(authErrorMessages[authError]);
    fetchAppConfig()
      .then((config) => {
        setGoogleEnabled(config.googleEnabled);
        if (config.missingSettings.includes('GOOGLE_REDIRECT_URI')) {
          setError('Google OAuth chưa được bật: hãy cấu hình callback HTTPS chính xác và đăng ký cùng URL đó trong Google Cloud Console.');
        }
      })
      .catch((cause: unknown) => {
        setGoogleEnabled(false);
        setError((current) => current || getErrorMessage(cause, 'Không thể tải cấu hình đăng nhập.'));
      });
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await loginApi({ identifier, password });
      if (result.user) onLoginSuccess(result.user);
      else setError(result.error || 'Đăng nhập không thành công.');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể kết nối máy chủ.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestPasswordReset(identifier);
      setMessage(result.message || 'Nếu tài khoản tồn tại, mã xác nhận sẽ được gửi qua email.');
      setMode('reset');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi mã xác nhận.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await resetPassword({ identifier, code, newPassword });
      setMessage(result.message || 'Đổi mật khẩu thành công. Hãy đăng nhập lại.');
      setPassword('');
      setCode('');
      setNewPassword('');
      setMode('login');
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đặt lại mật khẩu.'));
    } finally {
      setLoading(false);
    }
  };

  const goTo = (nextMode: LoginMode) => {
    setError(null);
    setMessage(null);
    setMode(nextMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 border border-blue-400/20 rounded-full text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Xác thực an toàn • EduInsight</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Edu<span className="text-blue-400">Insight</span>
          </h1>
          <p className="text-sm text-slate-300">
            Đăng nhập bằng email hoặc mã sinh viên và mật khẩu.
          </p>
        </div>

        <div className="bg-white/95 rounded-3xl p-7 shadow-2xl border border-white/20 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'login' ? 'Đăng nhập hệ thống' : mode === 'forgot' ? 'Quên mật khẩu' : 'Xác nhận mã email'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login'
                ? 'Vai trò được cấp bởi quản trị viên, không thể tự chọn.'
                : 'Mã xác nhận có hiệu lực trong 10 phút và chỉ dùng một lần.'}
            </p>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
              {message}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Email hoặc mã sinh viên
                <span className="relative block mt-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </span>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Mật khẩu
                <span className="relative block mt-1">
                  <LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </span>
              </label>
              <div className="text-right">
                <button type="button" onClick={() => goTo('forgot')} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                  Quên mật khẩu?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
              {googleEnabled && (
                <a
                  href="/auth/google"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <span className="font-bold text-blue-600">G</span>
                  Đăng nhập bằng Google
                </a>
              )}
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Email hoặc mã sinh viên
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </label>
              <button disabled={loading} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50">
                {loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
              </button>
              <button type="button" onClick={() => goTo('login')} className="w-full text-xs text-slate-600 flex justify-center items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Email hoặc mã sinh viên
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Mã xác nhận (6 chữ số)
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Mật khẩu mới (ít nhất 8 ký tự)
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </label>
              <button disabled={loading} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50">
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
              <button type="button" onClick={() => goTo('forgot')} className="w-full text-xs text-slate-600 flex justify-center items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Gửi mã khác
              </button>
            </form>
          )}

          {mode === 'login' && (
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Tài khoản mới đăng nhập Google sẽ chờ admin duyệt. Mật khẩu tạm thời được gửi tới email đã xác minh.</span>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-400">EduInsight • Cloudflare Workers, D1 và R2</p>
      </div>
    </div>
  );
};

export default LoginPage;
