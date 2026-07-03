
import React, { useRef, useState, useEffect } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  count?: number;
  // [FIX P8-C1] countLabel: optional suffix text rendered after the count badge
  // (e.g. "đã gửi" in the Campaign Drawer Audience tab)
  countLabel?: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: any) => void;
  variant?: 'underline' | 'pill' | 'segmented';
  className?: string;
  isDarkTheme?: boolean;
}

const Tabs: React.FC<TabsProps> = ({ items, activeId, onChange, variant = 'underline', className = '', isDarkTheme }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

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

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-700/50 overflow-x-auto scrollbar-hide max-w-full ${className}`}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0
                ${isActive
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/30 dark:border-slate-800'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }
              `}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`} />}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={`
                  px-1.5 py-0.5 rounded-md text-[9px] font-black transition-colors duration-200
                  ${isActive 
                    ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400' 
                    : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                  }
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
                            px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 border
                            ${isActive
                  ? (isDarkTheme ? 'bg-slate-800 text-white border-slate-700 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm')
                  : (isDarkTheme ? 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700')
                }
                        `}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? (isDarkTheme ? 'text-white' : 'text-slate-700') : 'text-slate-400'}`} />}
              {item.label}
              {item.count !== undefined && (
                <span className={`
                                ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold
                                ${isActive ? (isDarkTheme ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600') : (isDarkTheme ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}
                            `}>
                  {item.count.toLocaleString()}
                </span>
              )}
              {/* [FIX P8-H3] Render countLabel suffix after count badge */}
              {item.countLabel && (
                <span className={`ml-0.5 text-[8px] font-medium ${isActive ? (isDarkTheme ? 'text-slate-300' : 'text-slate-500') : 'text-slate-400'}`}>
                  {item.countLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Underline (Default)
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
              relative pb-3 px-3 text-[12px] font-bold flex items-center gap-1.5 transition-colors duration-300 whitespace-nowrap shrink-0
              ${isActive ? (isDarkTheme ? 'text-white' : 'text-slate-800') : (isDarkTheme ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}
            `}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? (isDarkTheme ? 'text-white' : 'text-slate-700') : (isDarkTheme ? 'text-slate-500' : 'text-slate-300')}`} />}
            {item.label}
            {item.count !== undefined && (
              <span className={`
                ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black
                ${isActive ? (isDarkTheme ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700') : (isDarkTheme ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}
              `}>
                {item.count.toLocaleString()}
              </span>
            )}
            {/* [FIX P8-H3] Render countLabel suffix after count badge (Underline variant) */}
            {item.countLabel && (
              <span className={`ml-0.5 text-[8px] font-medium ${isActive ? (isDarkTheme ? 'text-slate-300' : 'text-slate-500') : 'text-slate-400'}`}>
                {item.countLabel}
              </span>
            )}
          </button>
        );
      })}

      <span
        className="absolute bottom-0 h-[2.5px] transition-all duration-300 ease-out bg-violet-600 dark:bg-violet-400"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
};

export default Tabs;
