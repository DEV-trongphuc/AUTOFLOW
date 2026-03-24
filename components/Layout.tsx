import * as React from 'react';
import { useState } from 'react';
import Sidebar from './Layout/Sidebar';
import Header from './Layout/Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 antialiased">

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Desktop/Mobile */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </aside>

      {/* Main Content Area - Adjusts based on sidebar state */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-10 scroll-smooth relative">
          {/* Golden glow decor — top-right corner accent */}
          <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[400px] z-0" style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.13) 0%, transparent 65%)' }} />
          {/* [PERF] Reduced from 700ms slide-in to 200ms fade-in — faster tab switching */}
          <div className="max-w-[1400px] mx-auto animate-in fade-in duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;