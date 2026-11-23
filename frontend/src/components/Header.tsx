// frontend/src/components/Header.tsx
import React from 'react';
import { Search, Bell, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  pageTitle: string;
  onSearchChange?: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, onSearchChange }) => {
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
            placeholder="Tìm kiếm mã SV, họ tên..."
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

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            GV
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">Ban Giảng Viên</p>
            <p className="text-[11px] text-slate-500">Bộ môn KHMT & ĐTĐM</p>
          </div>
        </div>
      </div>
    </header>
  );
};
