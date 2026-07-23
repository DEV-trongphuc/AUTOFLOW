import React, { useRef, useState, useEffect, useId } from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  count?: number;
  countLabel?: string;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: any) => void;
  variant?: 'underline' | 'pill' | 'segmented' | 'sub-segmented' | 'glass';
  className?: string;
  isDarkTheme?: boolean;
  layoutId?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'underline',
  className = '',
  isDarkTheme,
  layoutId,
  size = 'md',
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const autoId = useId();
  const activeLayoutId = layoutId || `tabs-active-${autoId}`;

  useEffect(() => {
    if (variant === 'underline') {
      const activeIndex = items.findIndex(item => item.id === activeId);
      const currentTab = tabsRef.current[activeIndex];

      if (currentTab) {
        setIndicatorStyle({
          left: currentTab.offsetLeft,
          width: currentTab.clientWidth
        });
      }
    }
  }, [activeId, items, variant]);

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: 'px-2.5 py-1 text-[11px]',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1.5',
    },
    md: {
      padding: 'px-4 py-2 text-xs md:text-[13px]',
      icon: 'w-4 h-4',
      gap: 'gap-2',
    },
    lg: {
      padding: 'px-5 py-2.5 text-sm',
      icon: 'w-4.5 h-4.5',
      gap: 'gap-2.5',
    },
  }[size];

  // Variant 1: Segmented (Main High-Level Tabs)
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner backdrop-blur-md overflow-x-auto scrollbar-hide max-w-full ${className}`}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                relative ${sizeConfig.padding} rounded-xl font-bold transition-all duration-200 flex items-center ${sizeConfig.gap} whitespace-nowrap shrink-0 outline-none select-none
                ${isActive
                  ? 'text-slate-900 dark:text-white font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId={activeLayoutId}
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-md shadow-slate-200/60 dark:shadow-slate-950/80 border border-slate-200/80 dark:border-slate-700/70"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  style={{ zIndex: 0 }}
                />
              )}
              {Icon && (
                <Icon className={`relative z-10 ${sizeConfig.icon} transition-colors duration-200 ${isActive ? 'text-amber-500 dark:text-amber-400 scale-105' : 'text-slate-400 dark:text-slate-500'}`} />
              )}
              <span className="relative z-10 tracking-tight">{item.label}</span>
              {(item.count !== undefined || item.badge !== undefined) && (
                <span className={`
                  relative z-10 ml-0.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-black tracking-wider transition-colors duration-200
                  ${isActive
                    ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-500/20'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }
                `}>
                  {item.count !== undefined ? item.count.toLocaleString() : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant 2: Sub-segmented (Secondary/Level 2 Tab Navigation)
  if (variant === 'sub-segmented') {
    return (
      <div className={`inline-flex items-center gap-1 bg-slate-100/60 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/80 overflow-x-auto scrollbar-hide max-w-full ${className}`}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 outline-none select-none
                ${isActive
                  ? 'text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-900/60'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId={activeLayoutId}
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/50"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  style={{ zIndex: 0 }}
                />
              )}
              {Icon && (
                <Icon className={`w-3.5 h-3.5 relative z-10 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              )}
              <span className="relative z-10">{item.label}</span>
              {item.count !== undefined && (
                <span className={`
                  relative z-10 px-1.5 py-0.2 rounded text-[9px] font-bold
                  ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200/50 dark:bg-slate-800 text-slate-400'}
                `}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant 3: Glass / Floating Pills
  if (variant === 'glass') {
    return (
      <div className={`inline-flex items-center gap-1.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm ${className}`}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                relative ${sizeConfig.padding} rounded-xl font-bold transition-all flex items-center ${sizeConfig.gap} whitespace-nowrap shrink-0 outline-none select-none
                ${isActive
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId={activeLayoutId}
                  className="absolute inset-0 bg-amber-500/10 dark:bg-amber-400/10 rounded-xl border border-amber-500/20 dark:border-amber-400/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ zIndex: 0 }}
                />
              )}
              {Icon && <Icon className={`relative z-10 ${sizeConfig.icon} ${isActive ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />}
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Variant 4: Pill
  if (variant === 'pill') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                relative px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border outline-none select-none
                ${isActive
                  ? (isDarkTheme
                      ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                      : 'bg-white text-slate-900 border-slate-200/90 shadow-sm shadow-slate-100')
                  : (isDarkTheme
                      ? 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60')
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId={activeLayoutId}
                  className={`absolute inset-0 rounded-xl ${isDarkTheme ? 'bg-slate-800' : 'bg-slate-100/80'}`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{ zIndex: 0 }}
                />
              )}
              {Icon && <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? (isDarkTheme ? 'text-amber-400' : 'text-amber-600') : 'text-slate-400'}`} />}
              <span className="relative z-10">{item.label}</span>
              {item.count !== undefined && (
                <span className={`
                  relative z-10 ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold
                  ${isActive ? (isDarkTheme ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700') : (isDarkTheme ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}
                `}>
                  {item.count.toLocaleString()}
                </span>
              )}
              {item.countLabel && (
                <span className={`relative z-10 ml-0.5 text-[8px] font-medium ${isActive ? (isDarkTheme ? 'text-slate-300' : 'text-slate-500') : 'text-slate-400'}`}>
                  {item.countLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant 5: Underline (Default)
  return (
    <div className={`flex border-b mb-6 relative px-1 overflow-x-auto scrollbar-hide no-wrap ${className} ${isDarkTheme ? 'border-slate-800' : 'border-slate-200'}`}>
      {items.map((item, idx) => {
        const isActive = activeId === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={el => { tabsRef.current[idx] = el; }}
            onClick={() => onChange(item.id)}
            className={`
              relative pb-3 px-3 text-[13px] font-bold flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0 outline-none select-none
              ${isActive ? (isDarkTheme ? 'text-amber-400 font-extrabold' : 'text-amber-600 font-extrabold') : (isDarkTheme ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}
            `}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? (isDarkTheme ? 'text-amber-400' : 'text-amber-600') : 'text-slate-400'}`} />}
            {item.label}
            {item.count !== undefined && (
              <span className={`
                ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black
                ${isActive ? (isDarkTheme ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-50 text-amber-600') : (isDarkTheme ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}
              `}>
                {item.count.toLocaleString()}
              </span>
            )}
            {item.countLabel && (
              <span className={`ml-0.5 text-[8px] font-medium ${isActive ? (isDarkTheme ? 'text-amber-300' : 'text-slate-500') : 'text-slate-400'}`}>
                {item.countLabel}
              </span>
            )}
          </button>
        );
      })}

      <span
        className="absolute bottom-0 h-[2.5px] rounded-full transition-all duration-300 ease-out bg-amber-500 dark:bg-amber-400 shadow-sm shadow-amber-500/50"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
};

export default Tabs;

