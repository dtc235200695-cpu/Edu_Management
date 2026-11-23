import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import {
  createAdminUser,
  fetchAdminUsers,
  getErrorMessage,
  updateAdminUser,
} from '../api';
import { AccountRole, AccountStatus, AdminUser } from '../types';

type UserDraft = Pick<AdminUser, 'role' | 'status' | 'studentId'>;

const primaryAdminEmail = 'hoanghai69205@gmail.com';

export const AccountManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [studentId, setStudentId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminUsers();
      setUsers(result.users);
      setDrafts(Object.fromEntries(result.users.map((user) => [
        user.id,
        { role: user.role, status: user.status, studentId: user.studentId },
      ])));
    } catch (cause) {
      setError(getErrorMessage(cause, 'Không thể tải danh sách tài khoản.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const updateDraft = (id: string, patch: Partial<UserDraft>) => {
    setDrafts((existing) => ({
      ...existing,
      [id]: { ...existing[id], ...patch },
    }));
  };

  const saveUser = async (user: AdminUser) => {
    const draft = drafts[user.id];
    if (!draft) return;
    setSavingId(user.id);
    setError(null);
    setNotice(null);
    try {
      await updateAdminUser(user.id, draft);
      setNotice(`Đã cập nhật quyền cho ${user.email}.`);
      await loadUsers();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Không thể cập nhật tài khoản.'));
    } finally {
      setSavingId(null);
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const result = await createAdminUser({
        email,
        name,
        role,
        studentId: role === 'student' ? studentId : undefined,
      });
      setNotice(
        result.warning ||
          `Đã tạo tài khoản ${result.user.email} và gửi mật khẩu tạm thời qua email.`,
      );
      setEmail('');
      setName('');
      setStudentId('');
      await loadUsers();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Không thể tạo tài khoản.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Tạo tài khoản sinh viên / giảng viên</h3>
          <p className="text-xs text-slate-500 mt-1">Mật khẩu ngẫu nhiên được gửi tới email; lần đăng nhập bằng mật khẩu đầu tiên yêu cầu đổi mật khẩu.</p>
        </div>
        <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Họ và tên"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as 'student' | 'lecturer')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="student">Sinh viên</option>
            <option value="lecturer">Giảng viên</option>
          </select>
          {role === 'student' && (
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9._-]{3,30}"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="Mã sinh viên"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <button
            type="submit"
            disabled={creating}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Tạo tài khoản
          </button>
        </form>
      </section>

      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tài khoản và phân quyền</h3>
            <p className="text-xs text-slate-500 mt-1">Tài khoản Google mới ở trạng thái chờ duyệt cho tới khi admin cấp role và mã sinh viên.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải tài khoản...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có tài khoản nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-700">
                <tr>
                  <th className="p-3">Tài khoản</th>
                  <th className="p-3">Mã SV</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const draft = drafts[user.id] || {
                    role: user.role,
                    status: user.status,
                    studentId: user.studentId,
                  };
                  const primaryAdmin = user.email.toLowerCase() === primaryAdminEmail;
                  return (
                    <tr key={user.id}>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{user.name}</div>
                        <div className="text-slate-500">{user.email}</div>
                      </td>
                      <td className="p-3">
                        {draft.role === 'student' || draft.studentId ? (
                          <input
                            value={draft.studentId}
                            onChange={(event) => updateDraft(user.id, { studentId: event.target.value })}
                            disabled={primaryAdmin}
                            aria-label={`Mã sinh viên của ${user.email}`}
                            className="w-28 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                          />
                        ) : '—'}
                      </td>
                      <td className="p-3">
                        <select
                          value={draft.role}
                          onChange={(event) => {
                            const nextRole = event.target.value as AccountRole;
                            updateDraft(user.id, {
                              role: nextRole,
                              ...(nextRole !== 'student' ? { studentId: '' } : {}),
                            });
                          }}
                          disabled={primaryAdmin}
                          aria-label={`Vai trò của ${user.email}`}
                          className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                        >
                          <option value="pending">Chờ duyệt</option>
                          <option value="student">Sinh viên</option>
                          <option value="lecturer">Giảng viên</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={draft.status}
                          onChange={(event) => updateDraft(user.id, { status: event.target.value as AccountStatus })}
                          disabled={primaryAdmin}
                          aria-label={`Trạng thái của ${user.email}`}
                          className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                        >
                          <option value="pending">Chờ duyệt</option>
                          <option value="active">Hoạt động</option>
                          <option value="suspended">Tạm khóa</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => void saveUser(user)}
                          disabled={primaryAdmin || savingId === user.id}
                          className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
                        >
                          {savingId === user.id ? 'Đang lưu...' : 'Lưu'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
