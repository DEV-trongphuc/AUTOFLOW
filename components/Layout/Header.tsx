
import React from 'react';
import { Menu, Bell, ChevronRight, ShieldAlert, MessageCircle, ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const path = location.pathname;
  const { handleBack } = useNavigation();

  const getBreadcrumb = () => {
    if (path.startsWith('/campaigns')) return 'Chiến dịch';
    if (path.startsWith('/flows')) return 'Automation';
    if (path.startsWith('/audience')) return 'Khách hàng';
    if (path.startsWith('/templates')) return 'Mẫu Email';
    if (path.startsWith('/reports')) return 'Báo cáo';
    if (path.startsWith('/settings')) return 'Cài đặt';
    return 'MailFlow Pro';
  };

  return (
    <header className="flex items-center justify-between h-20 px-6 lg:px-10 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="text-slate-500 hover:text-slate-800 lg:hidden p-2 hover:bg-slate-50 rounded-xl transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium tracking-tight">
            <button
              onClick={handleBack}
              className="p-1 pr-3 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-all flex items-center gap-2"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg shadow-sm">
                <ChevronRight className="w-4 h-4 rotate-180 text-slate-600" />
              </div>
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Quay lại</span>
            </button>
          </div>

        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative w-10 h-10 flex items-center justify-center rounded-2xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all group shadow-sm hover:shadow-amber-100">
          <Bell className="w-5 h-5 transition-transform group-hover:swing" />
          <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 ring-2 ring-white"></span>
          </span>
        </button>

        <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1"></div>

        <div className="relative group">
          <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-2 rounded-3xl bg-gradient-to-r from-amber-50/30 to-amber-50/20 hover:from-amber-50/60 hover:to-amber-50/40 transition-all group/user border border-amber-100/30 hover:border-amber-200/50 shadow-sm hover:shadow-lg hover:shadow-amber-500/10">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <p className="text-sm font-black bg-gradient-to-r from-slate-800 to-slate-700 hover:from-amber-500 hover:to-amber-600 bg-clip-text text-transparent leading-none transition-all">IDEAS EDU</p>
              <div className="mt-1.5 relative">
                {/* Glow effect - always visible */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full blur-md opacity-20 group-hover/user:opacity-50 transition-opacity"></div>
                {/* Badge - gradient always visible */}
                <div className="relative flex items-center gap-1.5 bg-gradient-to-br from-amber-400 to-amber-600 px-2.5 py-1 rounded-full transition-all shadow-md shadow-amber-500/20 group-hover/user:shadow-lg group-hover/user:shadow-amber-500/30 group-hover/user:scale-105">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">PRO MAX</span>
                </div>
              </div>
            </div>
            <div className="relative">
              {/* Outer glow - always visible */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 blur-lg opacity-20 group-hover/user:opacity-40 transition-opacity scale-110"></div>
              {/* Avatar container - gradient always visible */}
              <div className="relative w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 transition-all shadow-lg shadow-amber-500/20 group-hover/user:shadow-xl group-hover/user:shadow-amber-500/40 group-hover/user:scale-105">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-sm group-hover/user:from-amber-600 group-hover/user:to-amber-800 transition-all">
                    ID
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Hover Actions */}
          <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-[100]">
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-3xl p-3 w-48 space-y-2">
              <a
                href="https://fb.com/turni0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-3 rounded-2xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all group/item"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover/item:bg-rose-100 transition-colors shadow-sm">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span>Báo cáo sự cố</span>
              </a>
              <a
                href="https://fb.com/turni0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-3 rounded-2xl text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all group/item"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shadow-sm">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span>Liên hệ IT</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;