import React, { useTransition, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Send, Users, FileEdit, BarChart3,
  Settings, Mail, GitMerge, Tag, Webhook,
  ExternalLink, Zap, ChevronRight, LogOut, Globe,
  LayoutDashboard, Key, Bot, PanelLeftClose, PanelLeft, Facebook, Gift
} from 'lucide-react';
import { api } from '../../services/storageAdapter';

interface SidebarProps {
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItemConfig {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  prefetch?: () => Promise<any>; // [PERF] chunk prefetch on hover
  prefetchApis?: string[]; // [PERF] preload static APIs on hover
}

const updateRecentModules = (href: string) => {
  const pathMap: Record<string, string> = {
    '/campaigns': 'campaigns',
    '/flows': 'flows',
    '/templates': 'templates',
    '/ai-training': 'ai-training',
    '/web-tracking': 'web-tracking',
    '/audience': 'audience',
    '/vouchers': 'vouchers',
    '/tags': 'tags',
    '/meta-messenger': 'meta-messenger'
  };

  const id = pathMap[href];
  if (!id) return;

  try {
    const stored = localStorage.getItem('recent_modules');
    let recents: any[] = stored ? JSON.parse(stored) : [];

    // Migrate old format (string[]) to new object format
    if (recents.length > 0 && typeof recents[0] === 'string') {
      recents = recents.map(r => ({ id: r, t: 0 }));
    }

    const now = Date.now();
    const ONE_HOUR = 3600000;

    if (recents.length > 0) {
      const last = recents[0];
      // If the same module is visited within 1 hour, just update the timestamp
      if (last.id === id && (now - last.t) < ONE_HOUR) {
        last.t = now;
        localStorage.setItem('recent_modules', JSON.stringify(recents));
        return;
      }
    }

    // Add new history entry, limit to 10
    const updated = [{ id, t: now }, ...recents.filter(x => x.id !== id)].slice(0, 10);
    localStorage.setItem('recent_modules', JSON.stringify(updated));
  } catch (e) { }
};

const NavItem: React.FC<{ item: NavItemConfig; onClose: () => void; isCollapsed: boolean }> = ({ item, onClose, isCollapsed }) => {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  // [PERF] Prefetch chunk on hover — by the time user clicks, chunk is already cached
  const handleMouseEnter = () => {
    if (item.prefetch) {
      item.prefetch().catch(() => { }); // fire-and-forget
    }
    // [PERF] Triggers data prefetching 
    if (item.prefetchApis && item.prefetchApis.length > 0) {
      item.prefetchApis.forEach(endpoint => {
        api.get(endpoint).catch(() => { });
      });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // [PERF] startTransition keeps the current page visible while the new
    // chunk loads in the background — eliminates the freeze/blank flash
    startTransition(() => {
      updateRecentModules(item.href);
      navigate(item.href);
      onClose();
    });
  };

  return (
    <NavLink
      to={item.href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={({ isActive }) => `
        relative flex items-center ${isCollapsed ? 'justify-center px-3' : 'justify-between px-5'} py-3.5 mx-4 rounded-xl transition-all duration-300 group
        ${isPending ? 'opacity-70 scale-[0.98]' : ''}
        ${isActive
          ? 'bg-amber-500/10 backdrop-blur-md text-amber-950 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-amber-500/20 shadow-[inset_0_1px_rgba(255,255,255,0.7)]'
          : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800 border border-transparent hover:backdrop-blur-sm'
        }
      `}
      title={isCollapsed ? item.name : undefined}
    >
      {({ isActive }) => (
        <>
          <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
            <item.icon
              className={`w-[20px] h-[20px] transition-transform duration-300 ${isActive ? 'text-amber-600 scale-105' : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'}`}
              strokeWidth={isActive ? 2 : 2}
            />
            {!isCollapsed && (
              <span className={`text-[14px] tracking-wide font-medium`}>
                {item.name}
              </span>
            )}
          </div>

          {!isCollapsed && item.badge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              {item.badge}
            </span>
          )}

          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-600 rounded-r-full"></div>
          )}
        </>
      )}
    </NavLink>
  );
};

const SidebarSection: React.FC<{ title: string; children: React.ReactNode; isCollapsed: boolean }> = ({ title, children, isCollapsed }) => (
  <div className="mb-8">
    {!isCollapsed && (
      <h4 className="px-8 mb-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
        {title}
      </h4>
    )}
    {isCollapsed && (
      <div className="px-4 mb-3 flex justify-center">
        <div className="w-8 h-px bg-slate-200"></div>
      </div>
    )}
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ onClose, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();

  useEffect(() => {
    updateRecentModules(location.pathname);
  }, [location.pathname]);

  const mainNav: NavItemConfig[] = [
    { name: 'Trang chủ', href: '/', icon: LayoutDashboard, prefetch: () => import('../../pages/Dashboard') },
    { name: 'Chiến dịch', href: '/campaigns', icon: Send, prefetch: () => import('../../pages/Campaigns') },
    { name: 'Automation', href: '/flows', icon: GitMerge, badge: 'Hot', prefetch: () => import('../../pages/Flows'), prefetchApis: ['flows'] },
    { name: 'Khách hàng', href: '/audience', icon: Users, prefetch: () => import('../../pages/Audience') },
    { name: 'Quản lý Nhãn', href: '/tags', icon: Tag, prefetch: () => import('../../pages/Tags'), prefetchApis: ['tags'] },
    { name: 'Kho Voucher', href: '/vouchers', icon: Gift, badge: 'Promo', prefetch: () => import('../../pages/Vouchers') },
    { name: 'Mẫu Email', href: '/templates', icon: FileEdit, prefetch: () => import('../../pages/Templates') },
  ];

  const configNav: NavItemConfig[] = [
    { name: 'AI System', href: '/ai-training', icon: Bot, prefetch: () => import('../../pages/AITraining') },
    { name: 'Zalo OA', href: '/zalo-settings', icon: Send, prefetch: () => import('../../pages/SocialSettings') },
    { name: 'Meta Messenger', href: '/meta-messenger', icon: Facebook, prefetch: () => import('../../pages/MetaMessenger') },
  ];

  const analyticsNav: NavItemConfig[] = [
    { name: 'Website Tracking', href: '/web-tracking', icon: Globe, prefetch: () => import('../../pages/WebTracking') },
    { name: 'API Triggers', href: '/api-triggers', icon: Webhook, badge: 'Dev', prefetch: () => import('../../pages/ApiTriggers') },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  return (
    <div className={`flex flex-col h-full bg-slate-50/40 backdrop-blur-3xl border-r border-white/60 shadow-[4px_0_30px_rgba(0,0,0,0.03)] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} group/sidebar z-20 relative`}>

      {/* BRAND HEADER */}
      <div className={`h-28 ${isCollapsed ? 'px-3' : 'px-6'} flex items-center justify-center shrink-0 relative`}>
        {isCollapsed ? (
          <div className="relative w-12 h-12 shrink-0 group cursor-pointer">
            <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full animate-logo-pulse"></div>
            <div className="relative w-full h-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out overflow-hidden rounded-full border-2 border-white/80 shadow-lg shadow-amber-600/20">
              <img src="/imgs/ICON.png" className="w-full h-full object-contain relative z-10" alt="Logo" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-logo-shine pointer-events-none z-20"></div>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-4 w-full group cursor-pointer">
            {/* Animated Logo Icon */}
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full animate-logo-pulse"></div>
              <div className="relative w-full h-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out overflow-hidden rounded-full border-2 border-white/80 shadow-lg shadow-amber-600/20">
                <img src="/imgs/ICON.png" className="w-full h-full object-contain relative z-10" alt="Logo" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-logo-shine pointer-events-none z-20"></div>
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-600 group-hover:to-amber-700 transition-all duration-500">
                AUTOFLOW
              </h1>
              <div className="flex items-center gap-2 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                <span className="h-3 w-[2px] bg-amber-300 rotate-12"></span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] truncate group-hover:text-amber-600 transition-colors">
                  Digital AI Vision
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-all shadow-md hover:shadow-lg z-10 group/toggle opacity-0 group-hover/sidebar:opacity-100"
          title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {isCollapsed ? (
            <PanelLeft className="w-3.5 h-3.5 group-hover/toggle:scale-110 transition-transform" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 group-hover/toggle:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* SCROLLABLE NAV - Hidden scrollbar */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-2 scrollbar-hide">
        <SidebarSection title="Marketing" isCollapsed={isCollapsed}>
          {mainNav.map((item) => <NavItem key={item.name} item={item} onClose={onClose} isCollapsed={isCollapsed} />)}
        </SidebarSection>

        <SidebarSection title="AI System" isCollapsed={isCollapsed}>
          {configNav.map((item) => <NavItem key={item.name} item={item} onClose={onClose} isCollapsed={isCollapsed} />)}
        </SidebarSection>

        <SidebarSection title="Tracking" isCollapsed={isCollapsed}>
          {analyticsNav.map((item) => <NavItem key={item.name} item={item} onClose={onClose} isCollapsed={isCollapsed} />)}
        </SidebarSection>

        {isAdmin && (
          <SidebarSection title="Administration" isCollapsed={isCollapsed}>
            <NavItem item={{ name: 'Quản lý User', href: '/admin/users', icon: Users }} onClose={onClose} isCollapsed={isCollapsed} />
          </SidebarSection>
        )}
      </nav>

      {/* SIDEBAR FOOTER - PROFILE & SETTING */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-white/50 bg-transparent space-y-2`}>
        {/* Profile & Logout Unified Container */}
        <div className={`bg-white/40 border border-white/60 rounded-2xl flex items-center backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${isCollapsed ? 'flex-col p-2 gap-2' : 'p-1.5 gap-1'}`}>
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) => `
                flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 flex-1'} py-2 rounded-xl transition-all duration-300
                ${isActive
                ? 'bg-white/80 text-amber-900 shadow-sm border border-white scale-[1.02]'
                : 'text-slate-600 hover:bg-white/60 border border-transparent hover:border-white'}`
            }
            title={isCollapsed ? 'Thông tin cá nhân' : undefined}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white bg-white shadow-sm">
              <img src={user.picture || "/imgs/ICON.png"} className="w-full h-full object-cover" alt="" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-black tracking-tight text-amber-900 truncate uppercase">{user.name}</span>
                <span className="text-[9px] font-bold text-amber-600/70 uppercase tracking-tighter">{user.role}</span>
              </div>
            )}
          </NavLink>

          {!isCollapsed ? (
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-9 h-9 flex items-center justify-center text-amber-600/50 hover:text-rose-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-rose-100 hover:shadow-sm shrink-0"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="flex w-full items-center justify-center p-2 rounded-xl transition-all text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes shine-logo {
          0% { transform: translateX(-150%) skewX(-30deg); }
          20% { transform: translateX(150%) skewX(-30deg); }
          100% { transform: translateX(150%) skewX(-30deg); }
        }

        @keyframes float-logo {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.6; }
        }

        .animate-logo-shine {
          animation: shine-logo 3.5s infinite ease-in-out;
        }

        .animate-logo-pulse {
          animation: float-logo 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;