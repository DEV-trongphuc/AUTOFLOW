import * as React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface Option {
  value: string;
  label: React.ReactNode;
  searchLabel?: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ElementType;
  disabled?: boolean;
  direction?: 'top' | 'bottom';
  className?: string;
  variant?: 'outline' | 'filled' | 'ghost' | 'premium';
  placeholder?: string;
  size?: 'md' | 'sm' | 'xs';
  searchable?: boolean;
  searchPlaceholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label, options, value, onChange, icon: Icon, disabled,
  direction = 'bottom', className = '', variant = 'filled', placeholder = 'Chọn...', size = 'md',
  searchable = false, searchPlaceholder = 'Tìm kiếm...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter(opt => {
      const searchStr = opt.searchLabel || (typeof opt.label === 'string' ? opt.label : '');
      return searchStr.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [options, searchTerm, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, searchable]);

  const getButtonStyles = () => {
    let heightClass = "h-[42px]";
    if (size === 'sm') heightClass = "h-9 text-xs";
    if (size === 'xs') heightClass = "h-8 text-[10px] px-2.5 rounded-lg";

    const base = `flex items-center justify-between px-4 ${heightClass} cursor-pointer transition-all duration-300 text-sm font-bold group relative overflow-hidden select-none`;

    if (variant === 'premium') {
      return `${base} bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-amber-600/50 text-white rounded-2xl ${isOpen ? 'ring-4 ring-amber-600/20 border-amber-600/50 bg-slate-900' : ''}`;
    }
    if (variant === 'outline') {
      return `${base} rounded-xl ${disabled ? 'bg-slate-50' : 'bg-white'} border border-slate-200 hover:border-slate-300 text-slate-700 ${isOpen ? 'border-amber-600 ring-4 ring-amber-600/10' : ''} shadow-sm`;
    }
    if (variant === 'filled') {
      return `${base} rounded-xl bg-slate-50 border border-transparent hover:bg-slate-100 text-slate-700 ${isOpen ? 'bg-white border-amber-600 shadow-md ring-4 ring-amber-600/10' : ''}`;
    }
    if (variant === 'ghost') {
      return `${base} rounded-xl border border-transparent hover:bg-slate-100/50 text-slate-600 hover:text-slate-900 ${isOpen ? 'bg-white shadow-sm text-slate-800' : 'bg-transparent'}`;
    }
    return base;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ width: '100%' }}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 text-slate-400">
          {label}
        </label>
      )}
      <div
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        className={`
          ${getButtonStyles()}
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <div className="flex items-center gap-2.5 overflow-hidden z-10 w-full h-full">
          {Icon && (
            <div className={`flex items-center justify-center transition-colors duration-300 shrink-0 ${variant === 'premium' ? 'text-amber-400' : (isOpen ? 'text-amber-600' : 'text-slate-400')}`}>
              <Icon className={size === 'xs' ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </div>
          )}
          <span className={`truncate flex-1 ${selectedOption ? '' : 'text-slate-400 font-medium'}`}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={`shrink-0 w-3.5 h-3.5 ml-2 transition-transform duration-500 z-10 ${isOpen ? 'rotate-180 text-amber-600' : 'text-slate-400'}`} />
      </div>

      {isOpen && !disabled && (
        <div className={`
            absolute z-[500] min-w-[240px] w-full border rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-2 animate-in fade-in zoom-in-95 duration-300
            ${direction === 'top' ? 'bottom-full mb-3 origin-bottom' : 'top-full mt-3 right-0 origin-top'}
            ${variant === 'premium'
            ? 'bg-slate-900 border-white/10 shadow-black/50'
            : 'bg-white border-slate-100'}
        `}>
          {searchable && (
            <div className="relative mb-2 group/search">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${variant === 'premium' ? 'text-white/20' : 'text-slate-400'}`} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-2.5 pl-10 pr-4 text-xs font-bold outline-none rounded-xl transition-all ${variant === 'premium'
                    ? 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/10'
                    : 'bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-600/10'
                  }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${variant === 'premium' ? 'hover:bg-white/10 text-white/40' : 'hover:bg-slate-100 text-slate-400'}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
            {filteredOptions.map((opt) => {
              const isActive = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearchTerm(''); }}
                  className={`
                    px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer group/opt select-none
                    ${isActive
                      ? (variant === 'premium' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-600')
                      : (variant === 'premium' ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}
                  `}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive && <Check className={`w-3.5 h-3.5 ${variant === 'premium' ? 'text-white' : 'text-amber-600'}`} />}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="text-center py-6 px-4">
                <p className={`text-xs font-medium ${variant === 'premium' ? 'text-white/40' : 'text-slate-400'}`}>
                  Không tìm thấy kết quả cho "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Select;
