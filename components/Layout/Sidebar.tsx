
import React, { useTransition } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Send, Users, FileEdit, BarChart3,
  Settings, Mail, GitMerge, Tag, Webhook,
  ExternalLink, Zap, ChevronRight, LogOut, Globe,
  LayoutDashboard, Key, Bot, PanelLeftClose, PanelLeft, Facebook
} from 'lucide-react';

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
}

const NavItem: React.FC<{ item: NavItemConfig; onClose: () => void; isCollapsed: boolean }> = ({ item, onClose, isCollapsed }) => {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  // [PERF] Prefetch chunk on hover — by the time user clicks, chunk is already cached
  const handleMouseEnter = () => {
    if (item.prefetch) {
      item.prefetch().catch(() => { }); // fire-and-forget
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // [PERF] startTransition keeps the current page visible while the new
    // chunk loads in the background — eliminates the freeze/blank flash
    startTransition(() => {
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
        ${isPending ? 'opacity-70' : ''}
        ${isActive
          ? 'bg-amber-50 text-amber-900 shadow-sm border border-amber-100/50'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
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
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full"></div>
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

  const mainNav: NavItemConfig[] = [
    { name: 'Chiến dịch', href: '/campaigns', icon: Send, prefetch: () => import('../../pages/Campaigns') },
    { name: 'Automation', href: '/flows', icon: GitMerge, prefetch: () => import('../../pages/Flows') },
    { name: 'Khách hàng', href: '/audience', icon: Users, prefetch: () => import('../../pages/Audience') },
    { name: 'Quản lý Nhãn', href: '/tags', icon: Tag, prefetch: () => import('../../pages/Tags') },
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

  const reportsNav: NavItemConfig[] = [
    { name: 'Báo cáo', href: '/reports', icon: BarChart3, prefetch: () => import('../../pages/Reports') },
  ];

  return (
    <div className={`flex flex-col h-full bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} group/sidebar`}>

      {/* BRAND HEADER */}
      <div className={`h-28 ${isCollapsed ? 'px-3' : 'px-6'} flex items-center justify-center shrink-0 relative`}>
        {isCollapsed ? (
          <div className="relative w-12 h-12 shrink-0 group cursor-pointer">
            <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border border-amber-400/20">
              <Zap className="w-6 h-6 text-white fill-white/20" strokeWidth={3} />
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-4 w-full group cursor-pointer">
            {/* Animated Logo Icon */}
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
              <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-xl shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border border-amber-400/20">
                <Zap className="w-6 h-6 text-white fill-white/20" strokeWidth={3} />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-amber-700 transition-all duration-500">
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
        <SidebarSection title="Reports" isCollapsed={isCollapsed}>
          {reportsNav.map((item) => <NavItem key={item.name} item={item} onClose={onClose} isCollapsed={isCollapsed} />)}
        </SidebarSection>
      </nav>

      {/* SIDEBAR FOOTER - SETTING */}
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-t border-slate-100 bg-white group/footer`}>
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => `
            flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3.5 px-5'} py-4 rounded-2xl transition-all duration-300
            ${isActive
              ? 'bg-gray-100 text-slate-700 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent hover:border-slate-100'}`
          }
          title={isCollapsed ? 'Setting' : undefined}
        >
          <Settings className={`w-5 h-5 transition-transform duration-500 group-hover/footer:rotate-90`} />
          {!isCollapsed && (
            <>
              <span className="text-[14px] font-bold tracking-wide">Setting</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover/footer:opacity-100 group-hover/footer:translate-x-0 transition-all" />
            </>
          )}
        </NavLink>
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
      `}</style>
    </div>
  );
};

export default Sidebar;