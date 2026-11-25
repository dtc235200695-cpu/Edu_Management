import React, { useState } from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { getErrorMessage } from '../api';

interface ChangePasswordPageProps {
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  onLogout: () => void;
  logoutError?: string | null;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({
  onSubmit,
  onLogout,
  logoutError,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(currentPassword, newPassword);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Không thể cập nhật mật khẩu.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-7 shadow-lg space-y-4">
        <div>
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
            <LockKeyhole className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Đổi mật khẩu tạm thời</h1>
          <p className="mt-1 text-sm text-slate-600">Cần đổi mật khẩu trước khi sử dụng hệ thống. Mật khẩu tối thiểu 8 ký tự.</p>
        </div>
        {(error || logoutError) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || logoutError}</p>
        )}
        <input
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Mật khẩu tạm thời"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Mật khẩu mới"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Nhập lại mật khẩu mới"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />
        <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
        <button type="button" onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-red-600">
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </form>
    </div>
  );
};
