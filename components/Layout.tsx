import * as React from 'react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Layout/Sidebar';
import Header from './Layout/Header';
import CommandPalette from './Layout/CommandPalette';
import './Layout/particles.css';
import './Layout/stagger.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // [UI] Persistence — retrieve from localStorage to avoid "collapsing back" on every page change
    const stored = localStorage.getItem('sidebar_collapsed');
    return stored === null ? true : stored === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 antialiased bg-noise">
      <div className="particle-container">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>
      <CommandPalette />

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
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* Main Content Area - Adjusts based on sidebar state */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-10 scroll-smooth relative">
          {/* Golden glow decor — top-right corner accent */}
          <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[400px] z-0" style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.13) 0%, transparent 65%)' }} />
          {/* Slide-Up with slower overshoot spring (bouncing back) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ type: "spring", bounce: 0.45, duration: 0.85 }}
              className="max-w-[1400px] mx-auto origin-top"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;