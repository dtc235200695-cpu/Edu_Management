// frontend/src/components/Header.tsx
import React, { useState } from 'react';
import { Search, Bell, ShieldCheck, CheckCircle2, ChevronDown, User, GraduationCap, UserCheck, Shield, LogOut } from 'lucide-react';
import { UserPersona, UserRole, USER_PERSONAS } from '../types';

interface HeaderProps {
  pageTitle: string;
  currentUser: UserPersona;
  onSwitchRole: (role: UserRole) => void;
  onSearchChange?: (val: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  pageTitle, 
  currentUser, 
  onSwitchRole, 
  onSearchChange,
  onLogout
}) => {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'student':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'lecturer':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getAvatarBg = (role: UserRole) => {
    switch (role) {
      case 'student':
        return 'bg-purple-600';
      case 'admin':
        return 'bg-amber-600';
      case 'lecturer':
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Title & Page context */}
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Điện toán đám mây (Cloudflare)</span>
        </div>
      </div>

      {/* Right controls: Search, Edge status, Notifications, User Profile */}
      <div className="flex items-center space-x-4">
        {/* Global Search */}
        <div className="relative hidden sm:block w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã SV, họ tên, lớp..."
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Edge Status Badge */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Cloudflare Edge: Sẵn sàng</span>
        </div>

        {/* Notification Bell */}
        <button 
          title="Thông báo hệ thống"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center space-x-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className={`w-9 h-9 rounded-full ${getAvatarBg(currentUser.role)} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
              {currentUser.avatarText}
            </div>
            <div className="hidden md:block text-left">
              <div className="flex items-center space-x-1.5">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{currentUser.name}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getRoleBadgeStyle(currentUser.role)}`}>
                  {currentUser.roleBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{currentUser.department}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Role Dropdown Menu */}
          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chuyển vai trò người dùng</p>
                <p className="text-xs text-slate-600 mt-0.5">Trải nghiệm hệ thống theo từng đối tượng</p>
              </div>

              <div className="space-y-1 mt-1">
                {/* Giảng viên */}
                <button
                  onClick={() => {
                    onSwitchRole('lecturer');
                    setIsRoleMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    currentUser.role === 'lecturer' ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    GV
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Ban Giảng Viên</p>
                    <p className="text-[11px] text-slate-400">Quản lý lớp & kết quả học tập</p>
                  </div>
                  {currentUser.role === 'lecturer' && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>

                {/* Sinh viên */}
                <button
                  onClick={() => {
                    onSwitchRole('student');
                    setIsRoleMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    currentUser.role === 'student' ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    SV
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Hương Giang (SV2026)</p>
                    <p className="text-[11px] text-slate-400">Lớp K24-CNTT01 • Lộ trình cá nhân</p>
                  </div>
                  {currentUser.role === 'student' && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />}
                </button>

                {/* Quản trị viên */}
                <button
                  onClick={() => {
                    onSwitchRole('admin');
                    setIsRoleMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    currentUser.role === 'admin' ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    AD
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Quản Trị Viên (Admin)</p>
                    <p className="text-[11px] text-slate-400">Cloudflare D1, R2, Cron, Model</p>
                  </div>
                  {currentUser.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>
              </div>

              {onLogout && (
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsRoleMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;
