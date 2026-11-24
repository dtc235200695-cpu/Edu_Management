import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Database, Lock, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { fetchCloudflareHealth, getErrorMessage } from '../api';
import { AccountManagement } from '../components/AccountManagement';

type CloudflareStatus = 'checking' | 'connected' | 'unavailable' | 'not-configured';
type SettingsTab = 'cloudflare' | 'roles' | 'about';

export const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('cloudflare');
  const [cloudflareStatus, setCloudflareStatus] = useState<CloudflareStatus>('checking');
  const [cloudflareError, setCloudflareError] = useState<string | null>(null);

  const checkCloudflare = async () => {
    setCloudflareStatus('checking');
    setCloudflareError(null);
    try {
      await fetchCloudflareHealth();
      setCloudflareStatus('connected');
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể kiểm tra kết nối Cloudflare.');
      setCloudflareStatus(message.includes('CLOUDFLARE_WORKER_URL') ? 'not-configured' : 'unavailable');
      setCloudflareError(message);
    }
  };

  useEffect(() => {
    if (activeTab === 'cloudflare') void checkCloudflare();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap gap-2">
        <TabButton active={activeTab === 'cloudflare'} onClick={() => setActiveTab('cloudflare')}>
          <Cloud className="w-4 h-4" /> Hạ tầng Cloudflare
        </TabButton>
        <TabButton active={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>
          <Lock className="w-4 h-4" /> Tài khoản &amp; Phân quyền
        </TabButton>
        <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
          <Server className="w-4 h-4" /> Thông tin phiên bản
        </TabButton>
      </div>

      {activeTab === 'cloudflare' && (
        <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900">Trạng thái dịch vụ Cloudflare</h3>
              <p className="mt-1 text-xs text-slate-500">Kiểm tra trực tiếp Worker, D1 và R2.</p>
              {cloudflareError && <p role="alert" className="mt-2 text-xs text-red-600">{cloudflareError}</p>}
            </div>
            <button type="button" onClick={() => void checkCloudflare()} disabled={cloudflareStatus === 'checking'} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${cloudflareStatus === 'checking' ? 'animate-spin' : ''}`} />
              Kiểm tra lại
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ServiceCard title="Cloudflare Workers API" detail="Backend API và xác thực D1" icon={<Server className="w-4 h-4 text-orange-500" />} status={cloudflareStatus} />
            <ServiceCard title="Cloudflare D1 SQL" detail="Tài khoản, role, mật khẩu hash và mã reset" icon={<Database className="w-4 h-4 text-emerald-500" />} status={cloudflareStatus} />
            <ServiceCard title="Cloudflare R2 Object Storage" detail="Bucket private dùng lưu CSV" icon={<Cloud className="w-4 h-4 text-purple-500" />} status={cloudflareStatus} />
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
            <h4 className="mb-1 flex items-center gap-2 font-bold"><ShieldCheck className="w-4 h-4" />Secrets</h4>
            API secrets chỉ được lưu ở backend/Cloudflare Worker, không đưa vào frontend bundle.
          </div>
        </section>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900">Quyền theo vai trò</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><strong>Sinh viên:</strong> dashboard và chức năng cá nhân được giới hạn theo tài khoản.</li>
              <li><strong>Giảng viên:</strong> xem/quản lý dữ liệu học tập, phân tích, dự đoán và nhập CSV.</li>
              <li><strong>Quản trị viên:</strong> toàn quyền và quản lý tài khoản, role, trạng thái.</li>
              <li>Tài khoản Google mới được kích hoạt tự động với quyền sinh viên; chỉ quản trị viên được gán role khác và mã sinh viên.</li>
            </ul>
          </div>
          <AccountManagement />
        </div>
      )}

      {activeTab === 'about' && (
        <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">EI</div>
            <div>
              <h3 className="font-bold text-slate-900">EduInsight – Learning Analytics Platform</h3>
              <p className="text-xs text-slate-500">React, Node.js, Cloudflare Worker, D1 và R2</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">Phiên đăng nhập được quản lý bằng JWT HttpOnly cookie; mật khẩu được băm bằng scrypt và quyền được xác minh phía backend.</p>
        </section>
      )}
    </div>
  );
};

const TabButton: React.FC<React.PropsWithChildren<{ active: boolean; onClick: () => void }>> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
  >
    {children}
  </button>
);

const ServiceCard: React.FC<{
  title: string;
  detail: string;
  icon: React.ReactNode;
  status: CloudflareStatus;
}> = ({ title, detail, icon, status }) => {
  const labels: Record<CloudflareStatus, string> = {
    checking: 'Đang kiểm tra',
    connected: 'Đã kết nối',
    unavailable: 'Không kết nối',
    'not-configured': 'Chưa cấu hình',
  };
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">{icon}{title}</h4>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
        {status === 'connected' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : status === 'checking' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
        {labels[status]}
      </span>
    </div>
  );
};
