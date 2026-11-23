import React from 'react';
import { LogOut, Search, ShieldCheck } from 'lucide-react';
import { UserPersona, UserRole } from '../types';

interface HeaderProps {
  pageTitle: string;
  currentUser: UserPersona;
  onSearchChange?: (value: string) => void;
  onLogout?: () => void;
}

const roleBadgeStyle: Record<UserRole, string> = {
  student: 'bg-purple-100 text-purple-700 border-purple-200',
  lecturer: 'bg-blue-100 text-blue-700 border-blue-200',
  admin: 'bg-amber-100 text-amber-800 border-amber-200',
};

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  currentUser,
  onSearchChange,
  onLogout,
}) => (
  <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
    <div className="flex items-center space-x-4">
      <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
      <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Điện toán đám mây (Cloudflare)</span>
      </div>
    </div>
    <div className="flex items-center space-x-4">
      {onSearchChange && currentUser.role !== 'student' && (
        <div className="relative hidden sm:block w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã SV, họ tên, lớp..."
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white overflow-hidden flex items-center justify-center font-bold text-sm">
          {currentUser.picture ? (
            <img src={currentUser.picture} alt="" className="w-full h-full object-cover" />
          ) : currentUser.avatarText}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{currentUser.name}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${roleBadgeStyle[currentUser.role]}`}>
            {currentUser.roleBadge}
          </span>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  </header>
);

export default Header;
