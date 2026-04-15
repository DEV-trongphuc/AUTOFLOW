
import React from 'react';
import { Menu, Search, ChevronRight, ShieldAlert, MessageCircle, ExternalLink, Command } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { useIsAdmin } from '../../hooks/useAuthUser';
import AuditLogModal from '../settings/AuditLogModal';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const path = location.pathname;
  const { handleBack } = useNavigation();
  const isAdmin = useIsAdmin();
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false);

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

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all hover:scale-110 active:scale-95 group"
            title={"Quay l\u1EA1i"}
          >
            <ChevronRight className="w-5 h-5 rotate-180 text-slate-600 transition-transform group-hover:-translate-x-0.5" />
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/50 hover:bg-white border border-slate-200/60 hover:border-amber-200 rounded-2xl transition-all group/search shadow-sm hover:shadow-lg hover:shadow-slate-200/50"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover/search:text-amber-600 group-hover/search:scale-110 transition-all" />
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-black text-slate-400 group-hover/search:text-slate-800 uppercase tracking-widest transition-colors flex items-center gap-2">
                {"T\u00ECm nhanh"} <span className="opacity-0 group-hover/search:opacity-100 transition-opacity text-amber-600 font-black animate-pulse">{"\u2022"}</span>
              </span>
              <div className="flex items-center gap-1">
                <kbd className="hidden lg:flex px-1.5 py-1 rounded-md bg-white border border-slate-200 text-[9px] font-black text-slate-400 tracking-tighter shadow-sm"><Command className="w-2.5 h-2.5" /></kbd>
                <kbd className="hidden lg:flex px-1.5 py-1 rounded-md bg-white border border-slate-200 text-[9px] font-black text-slate-400 tracking-tighter shadow-sm">K</kbd>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1"></div>

        <div className="relative group">
          <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-2 rounded-3xl bg-gradient-to-r from-amber-50/30 to-amber-50/20 hover:from-amber-50/60 hover:to-amber-50/40 transition-all group/user border border-amber-100/30 hover:border-amber-200/50 shadow-sm hover:shadow-lg hover:shadow-amber-600/10">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <p className="text-sm font-black bg-gradient-to-r from-slate-800 to-slate-700 hover:from-amber-600 hover:to-amber-600 bg-clip-text text-transparent leading-none transition-all">IDEAS EDU</p>
              <div className="mt-1.5 relative">
                {/* Glow effect - always visible */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full blur-md opacity-20 group-hover/user:opacity-50 transition-opacity"></div>
                {/* Badge - gradient always visible */}
                <div className="relative flex items-center gap-1.5 bg-gradient-to-br from-amber-400 to-amber-600 px-2.5 py-1 rounded-full transition-all shadow-md shadow-amber-600/20 group-hover/user:shadow-lg group-hover/user:shadow-amber-600/30 group-hover/user:scale-105">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">PRO MAX</span>
                </div>
              </div>
            </div>
            <div className="relative">
              {/* Outer glow - always visible */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 blur-lg opacity-20 group-hover/user:opacity-40 transition-opacity scale-110"></div>
              {/* Avatar container - gradient always visible */}
              <div className="relative w-12 h-12 rounded-full p-[2.5px] bg-gradient-to-br from-amber-400 via-amber-600 to-amber-600 transition-all shadow-lg shadow-amber-600/20 group-hover/user:shadow-xl group-hover/user:shadow-amber-600/40 group-hover/user:scale-105">
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
              {isAdmin && (
                <button
                  onClick={() => setIsAuditModalOpen(true)}
                  className="flex items-center gap-3 w-full p-3 rounded-2xl text-xs font-bold text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-all group/item"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover/item:bg-amber-100 transition-colors shadow-sm">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span>Audit Logs</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <AuditLogModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} />
    </header>
  );
};

export default Header;