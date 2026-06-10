import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
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

  const mainRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis smooth scroll on the dashboard main container
  useEffect(() => {
    if (!mainRef.current) return;

    const lenis = new Lenis({
      wrapper: mainRef.current,
      content: mainRef.current.firstElementChild as HTMLElement,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Instantly scroll back to top on route change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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
          isCollapsed={sidebarOpen ? false : sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      {/* Main Content Area - Adjusts based on sidebar state */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main ref={mainRef} className="flex-1 w-full overflow-y-auto overflow-x-hidden p-0 relative">
          <div className="grid w-full p-3 lg:p-10 min-h-full overflow-hidden">
            {/* Golden glow decor — top-right corner accent */}
            <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[400px] z-0" style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.13) 0%, transparent 65%)' }} />

            {/* True Overlapping Crossfade (CSS Grid) to eliminate white flashes */}
            <AnimatePresence>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeOut" } }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="max-w-[1400px] w-full min-w-0 mx-auto col-start-1 row-start-1 z-1000"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;