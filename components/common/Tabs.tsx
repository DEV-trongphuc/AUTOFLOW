
import React, { useRef, useState, useEffect } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: any) => void;
  variant?: 'underline' | 'pill';
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
                            px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 border
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
          </button>
        );
      })}

      {/* Indicator */}
      <span
        className={`absolute bottom-0 h-[2px] transition-all duration-300 ease-out ${isDarkTheme ? 'bg-brand' : 'bg-[#ffa900]'}`}
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
    </div>
  );
};

export default Tabs;
