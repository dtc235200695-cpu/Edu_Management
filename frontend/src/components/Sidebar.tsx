// frontend/src/components/Sidebar.tsx
import React from 'react';
import { PageId } from '../types';
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
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onSelectPage, 
  onLogout,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard tổng quan', icon: LayoutDashboard },
    { id: 'students' as PageId, label: 'Quản lý sinh viên', icon: Users },
    { id: 'analytics' as PageId, label: 'Phân tích học tập', icon: BarChart2 },
    { id: 'prediction' as PageId, label: 'Dự đoán kết quả ML', icon: Sparkles },
    { id: 'learning-path' as PageId, label: 'Lộ trình cá nhân hóa', icon: Compass },
    { id: 'data-management' as PageId, label: 'Quản lý dữ liệu & R2', icon: Database },
    { id: 'ml-model' as PageId, label: 'Mô hình Machine Learning', icon: Cpu },
    { id: 'settings' as PageId, label: 'Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Fixed on Desktop, Slide-over Drawer on Mobile */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen select-none transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-slate-900 tracking-tight">EduInsight</h1>
              <p className="text-[11px] font-medium text-blue-600">Learning Analytics</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Simplified, Clean Footer with Logout */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          {onLogout && (
            <button
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onLogout();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50/80 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Đăng xuất tài khoản</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
