// frontend/src/components/Header.tsx
import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  CheckCircle2, 
  Menu, 
  LogOut 
} from 'lucide-react';
import { UserPersona, UserRole } from '../types';

interface HeaderProps {
  pageTitle: string;
  currentUser: UserPersona;
  onSwitchRole: (role: UserRole) => void;
  onSearchChange?: (val: string) => void;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  pageTitle, 
  currentUser, 
  onSwitchRole, 
  onSearchChange,
  onLogout,
  onToggleMobileMenu
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
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Hamburger & Page Title */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 -ml-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          title="Mở menu điều hướng"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate max-w-[180px] sm:max-w-none">
          {pageTitle}
        </h2>
      </div>

      {/* Right controls: Search, Notification, User Profile Switcher */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {/* Global Search - Hidden on small mobile, visible on tablet & desktop */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã SV, họ tên..."
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Notification Bell */}
        <button 
          title="Thông báo hệ thống"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center space-x-2 sm:space-x-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${getAvatarBg(currentUser.role)} text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs`}>
              {currentUser.avatarText}
            </div>
            
            <div className="hidden sm:block text-left">
              <div className="flex items-center space-x-1.5">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {currentUser.name}
                </p>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getRoleBadgeStyle(currentUser.role)}`}>
                  {currentUser.roleBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate max-w-[140px]">
                {currentUser.department}
              </p>
            </div>
            
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Role Dropdown Menu */}
          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chuyển vai trò người dùng</p>
                <p className="text-xs text-slate-600 mt-0.5">Trải nghiệm theo từng góc nhìn</p>
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
                  <div className="flex-1 truncate">
                    <p className="font-semibold text-slate-800">Ban Giảng Viên</p>
                    <p className="text-[11px] text-slate-400 truncate">Quản lý lớp & điểm số</p>
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
                  <div className="flex-1 truncate">
                    <p className="font-semibold text-slate-800">Hương Giang (SV2026)</p>
                    <p className="text-[11px] text-slate-400 truncate">Lớp K24-CNTT01</p>
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
                  <div className="flex-1 truncate">
                    <p className="font-semibold text-slate-800">Quản Trị Viên (Admin)</p>
                    <p className="text-[11px] text-slate-400 truncate">Hạ tầng & Machine Learning</p>
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
                    <LogOut className="w-4 h-4 text-red-500 shrink-0" />
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
