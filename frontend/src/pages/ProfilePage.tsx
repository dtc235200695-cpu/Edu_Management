import React, { FormEvent, useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, Info, LockKeyhole, Mail, Save, UserRound } from 'lucide-react';
import { getErrorMessage, updateProfile } from '../api';
import { UserPersona } from '../types';

interface ProfilePageProps {
  user: UserPersona;
  onProfileUpdated: (user: UserPersona) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onProfileUpdated }) => {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 120 || /[\r\n]/.test(trimmedName)) {
      setError('Họ tên phải có từ 1 đến 120 ký tự.');
      setNotice(null);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await updateProfile(trimmedName);
      if (!result.user) throw new Error('Máy chủ không trả về thông tin hồ sơ.');
      onProfileUpdated(result.user);
      setName(result.user.name);
      setNotice('Thông tin cá nhân đã được cập nhật.');
    } catch (cause) {
      setError(getErrorMessage(cause, 'Không thể cập nhật thông tin cá nhân.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/15 text-xl font-bold">
              {user.picture ? (
                <img src={user.picture} alt="" className="h-full w-full object-cover" />
              ) : (
                user.avatarText
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-blue-100">Hồ sơ tài khoản</p>
              <h2 className="mt-1 truncate text-2xl font-bold">{user.name}</h2>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                <BadgeCheck className="h-4 w-4" />
                {user.roleTitle}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h3>
            <p className="mt-1 text-sm text-slate-500">
              Cập nhật tên hiển thị trong hệ thống. Các thông tin định danh được quản lý riêng để bảo vệ tài khoản.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
              Họ và tên
              <span className="relative mt-2 block">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  minLength={1}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Email tài khoản
              <span className="relative mt-2 block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  value={user.email}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-500"
                />
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Mã sinh viên
              <span className="relative mt-2 block">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={user.studentId || 'Chưa được cấp'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-500"
                />
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              Email, vai trò và mã sinh viên chỉ có thể được thay đổi qua quy trình quản trị.
            </p>
            <button
              type="submit"
              disabled={saving || name.trim() === user.name}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;
