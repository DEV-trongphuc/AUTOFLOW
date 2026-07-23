import React, { useTransition, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Send, Users, FileEdit, BarChart3,
  Settings, Mail, GitMerge, Tag, Webhook, Link, QrCode,
  ExternalLink, Zap, ChevronRight, ChevronLeft, Globe, Shield,
  LayoutDashboard, Key, Bot, Facebook, Gift, FileText, Cpu
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

const NavItem: React.FC<{ item: NavItemConfig; onClose: () => void; isCollapsed: boolean; badgeOverride?: string | number | null }> = React.memo(({ item, onClose, isCollapsed, badgeOverride }) => {
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
        relative flex items-center w-full transition-all duration-200 group outline-none focus:outline-none focus:ring-0
        ${isCollapsed ? 'justify-center py-3 border-l-[3px]' : 'px-6 py-3 border-l-[3px]'}
        ${isPending ? 'opacity-70 scale-[0.98]' : ''}
        ${isActive
          ? 'bg-white/[0.12] text-white border-l-[var(--color-primary)] font-bold'
          : 'text-white/60 hover:bg-white/[0.08] hover:text-white/90 border-l-transparent'
        }
      `}
      title={isCollapsed ? item.name : undefined}
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            {/* Icon Wrapper Box */}
            <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-200 relative ${isActive ? 'bg-white/[0.15] text-white' : 'bg-white/[0.06] text-white/50 group-hover:text-white/80'}`}>
              <item.icon
                className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}
                strokeWidth={2}
              />
              {isCollapsed && badgeOverride && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-[#080424] shadow-sm animate-pulse"></span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[13px] tracking-wide font-medium">
                {item.name}
              </span>
            )}
          </div>

          {!isCollapsed && (badgeOverride !== undefined ? badgeOverride !== null : item.badge) && (
            badgeOverride !== undefined ? (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ml-auto shrink-0 transition-all duration-200
                ${isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                }`}
              >
                {badgeOverride}
              </span>
            ) : (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-white/10 text-white/50'} ml-auto`}>
                {item.badge}
              </span>
            )
          )}
        </>
      )}
    </NavLink>
  );
});

const SidebarSection: React.FC<{ title: string; children: React.ReactNode; isCollapsed: boolean }> = React.memo(({ title, children, isCollapsed }) => (
  <div className="mb-6">
    {!isCollapsed ? (
      <h4 className="px-6 mb-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
        {title}
      </h4>
    ) : (
      <div className="px-4 mb-2 flex justify-center">
        <div className="w-8 h-px bg-white/10"></div>
      </div>
    )}
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
));

export const MAIN_NAV: NavItemConfig[] = [
  { name: 'Trang chủ', href: '/', icon: LayoutDashboard, prefetch: () => import('../../pages/Dashboard') },
  { name: 'Chiến dịch', href: '/campaigns', icon: Send, prefetch: () => import('../../pages/Campaigns') },
  { name: 'Automation', href: '/flows', icon: GitMerge, badge: 'Hot', prefetch: () => import('../../pages/Flows'), prefetchApis: ['flows'] },
  { name: 'Khách hàng', href: '/audience', icon: Users, prefetch: () => import('../../pages/Audience') },
  { name: 'Quản lý Nhãn', href: '/tags', icon: Tag, prefetch: () => import('../../pages/Tags'), prefetchApis: ['tags'] },
  { name: 'Mẫu Email', href: '/templates', icon: FileEdit, prefetch: () => import('../../pages/Templates') },
  { name: 'Kho Voucher', href: '/vouchers', icon: Gift, badge: 'Promo', prefetch: () => import('../../pages/Vouchers') },
  { name: 'Khảo Sát', href: '/surveys', icon: FileText, badge: 'New', prefetch: () => import('../../pages/Surveys') },
];

export const CONFIG_NAV: NavItemConfig[] = [
  { name: 'AI System', href: '/ai-training', icon: Bot, prefetch: () => import('../../pages/AITraining') },
  { name: 'Zalo OA', href: '/zalo-settings', icon: Send, prefetch: () => import('../../pages/SocialSettings') },
  { name: 'Meta Messenger', href: '/meta-messenger', icon: Facebook, prefetch: () => import('../../pages/MetaMessenger') },
];

export const ANALYTICS_NAV: NavItemConfig[] = [
  { name: 'Website Tracking', href: '/web-tracking', icon: Globe, prefetch: () => import('../../pages/WebTracking') },
  { name: 'Link & QR', href: '/links-qr', icon: QrCode, badge: 'Track', prefetch: () => import('../../pages/LinksQR') },
  { name: 'API Triggers', href: '/api-triggers', icon: Webhook, badge: 'Dev', prefetch: () => import('../../pages/ApiTriggers') },
];

const Sidebar: React.FC<SidebarProps> = ({ onClose, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const [activeFlowCount, setActiveFlowCount] = React.useState<number | null>(null);

  useEffect(() => {
    updateRecentModules(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '260px');
  }, [isCollapsed]);

  useEffect(() => {
    api.get<any>('flows')
      .then(res => {
        if (res && res.success) {
          const raw = res.data;
          const flowList = Array.isArray(raw) ? raw : (raw?.data || []);
          const count = flowList.filter((f: any) => f.status === 'active').length;
          setActiveFlowCount(count > 0 ? count : null);
        }
      })
      .catch(err => console.error("Error fetching flows in sidebar", err));
  }, [location.pathname]);



  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  return (
    <div 
      className={`flex flex-col h-full text-[#dadada] border-r border-[var(--color-border-light)] shadow-[4px_0_24px_rgba(0,0,0,0.12)] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-[260px]'} group/sidebar z-20 relative bg-[var(--sidebar-bg)]`}
    >

      {/* BRAND HEADER */}
      <div className={`h-[92px] ${isCollapsed ? 'px-3' : 'px-6'} flex items-center justify-center shrink-0 relative border-b border-white/10`}>
        {isCollapsed ? (
          <div className="relative w-[42px] h-[42px] shrink-0 group cursor-pointer mx-auto">
            <div className="relative w-full h-full flex items-center justify-center rounded-full border-2 border-purple-400/80 shadow-[0_0_12px_rgba(192,132,252,0.5),0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden">
              <img src="https://crm-domation.vercel.app/LOGO.jpg" className="w-full h-full object-cover" alt="Logo" />
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-[0.875rem] w-full group cursor-pointer">
            <div className="relative w-[42px] h-[42px] shrink-0 rounded-full border-2 border-purple-400/80 shadow-[0_0_12px_rgba(192,132,252,0.5),0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden">
              <img src="https://crm-domation.vercel.app/LOGO.jpg" className="w-full h-full object-cover" alt="Logo" />
            </div>

            <div className="flex flex-col min-w-0">
              <h1 className="text-[1.45rem] font-black text-white tracking-tight leading-none">
                DOMATION
              </h1>
              <span className="text-[0.625rem] font-extrabold tracking-widest mt-1 uppercase bg-gradient-to-r from-[#d8b4fe] via-[#c084fc] to-[#a855f7] bg-clip-text text-transparent">
                / AUTOMATION
              </span>
            </div>
          </div>
        )}

        {/* Floating Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-full flex items-center justify-center shadow-md z-[60] hover:scale-110 active:scale-95 transition-all opacity-100 cursor-pointer"
          title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* QUICK ACTION BUTTON */}
      <div className={`py-4 ${isCollapsed ? 'px-2' : 'px-4'} flex justify-center border-b border-white/10 shrink-0`}>
        {isCollapsed ? (
          <button
            className="w-11 h-11 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-purple-500 to-violet-600 shadow-[0_4px_12px_rgba(168,85,247,0.4)] hover:scale-105 transition-all cursor-pointer"
            title="AI Automation"
          >
            <Cpu className="w-5 h-5" />
          </button>
        ) : (
          <button
            className="w-full h-11 rounded-[12px] flex items-center justify-center gap-2 text-white text-[13px] font-bold bg-gradient-to-r from-purple-500 to-violet-600 shadow-[0_4px_12px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(168,85,247,0.5)] transition-all cursor-pointer"
          >
            <Cpu className="w-4 h-4" /> AI Automation
          </button>
        )}
      </div>

      {/* SCROLLABLE NAV - Hidden scrollbar */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
        <SidebarSection title="Marketing" isCollapsed={isCollapsed}>
          {MAIN_NAV.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              onClose={onClose}
              isCollapsed={isCollapsed}
              badgeOverride={item.name === 'Automation' ? activeFlowCount : undefined}
            />
          ))}
        </SidebarSection>

        <SidebarSection title="AI System" isCollapsed={isCollapsed}>
          {CONFIG_NAV.map((item) => <NavItem key={item.name} item={item} onClose={onClose} isCollapsed={isCollapsed} />)}
        </SidebarSection>

        <SidebarSection title="Tracking" isCollapsed={isCollapsed}>
          {ANALYTICS_NAV.map((item) => <NavItem key={item.name} item={item} onClose={onClose} isCollapsed={isCollapsed} />)}
        </SidebarSection>

        {isAdmin && (
          <SidebarSection title="Administration" isCollapsed={isCollapsed}>
            <NavItem item={{ name: 'Quản lý User', href: '/admin/users', icon: Users }} onClose={onClose} isCollapsed={isCollapsed} />
          </SidebarSection>
        )}
      </nav>



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