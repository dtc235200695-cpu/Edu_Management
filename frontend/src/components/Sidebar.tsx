// frontend/src/components/Sidebar.tsx
import React from 'react';
import { PageId, UserPersona } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  BarChart2, 
  Sparkles, 
  Compass, 
  Database, 
  Cpu, 
  Settings,
  GraduationCap,
  Cloud,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentPage: PageId;
  currentUser: UserPersona;
  onSelectPage: (page: PageId) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, currentUser, onSelectPage, onLogout }) => {
  const allowedPages: Record<UserPersona['role'], PageId[]> = {
    student: ['dashboard', 'learning-path', 'prediction'],
    lecturer: ['dashboard', 'students', 'analytics', 'prediction', 'learning-path', 'data-management', 'ml-model'],
    admin: ['dashboard', 'students', 'analytics', 'prediction', 'learning-path', 'data-management', 'ml-model', 'settings'],
  };
  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard tổng quan', icon: LayoutDashboard },
    { id: 'students' as PageId, label: 'Quản lý sinh viên', icon: Users },
    { id: 'analytics' as PageId, label: 'Phân tích dữ liệu học tập', icon: BarChart2 },
    { id: 'prediction' as PageId, label: 'Dự đoán kết quả ML', icon: Sparkles },
    { id: 'learning-path' as PageId, label: 'Lộ trình cá nhân hóa', icon: Compass },
    { id: 'data-management' as PageId, label: 'Quản lý dữ liệu & R2', icon: Database },
    { id: 'ml-model' as PageId, label: 'Quản lý mô hình ML', icon: Cpu },
    { id: 'settings' as PageId, label: 'Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-900 tracking-tight">EduInsight</h1>
            <p className="text-[11px] font-medium text-blue-600">Learning Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu chức năng
        </div>
        {navItems.filter((item) => allowedPages[currentUser.role].includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Cloudflare Edge Badge Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 mb-1">
            <Cloud className="w-4 h-4 text-orange-500" />
            <span>Nền tảng Cloudflare</span>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">Pages</span>
            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded font-medium">Workers</span>
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">D1 SQL</span>
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-medium">R2</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="mt-3 w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
