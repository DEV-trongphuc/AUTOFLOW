
import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  fullWidth?: boolean;
  isDarkTheme?: boolean;
  multiline?: boolean;
  rows?: number;
  customSize?: 'sm' | 'md' | 'lg';
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon: Icon,
  fullWidth = true,
  className = '',
  disabled,
  isDarkTheme,
  multiline,
  rows = 3,
  customSize = 'md',
  ...props
}) => {
  const Component = multiline ? 'textarea' : 'input';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 ${error ? 'text-rose-600' : (isDarkTheme ? 'text-slate-500' : 'text-slate-400')}`}>
          {label} {props.required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${isDarkTheme ? 'text-slate-500 group-focus-within:text-slate-300' : 'text-slate-400 group-focus-within:text-slate-600'}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <Component
          className={`
            w-full border rounded-xl px-3.5 text-[13px] md:text-sm font-bold
            placeholder:text-slate-300 placeholder:font-medium
            transition-all duration-200 shadow-sm outline-none
            ${customSize === 'sm' ? 'h-8 md:h-9 text-[11px]' : 'h-9 md:h-[42px]'}
            ${multiline ? 'h-auto py-2.5 resize-none' : ''}
            ${isDarkTheme
              ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 hover:border-slate-600 focus:border-slate-500 focus:ring-slate-500/5 shadow-none'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10'
            }
            ${disabled ? (isDarkTheme ? 'bg-slate-900 text-slate-600 cursor-not-allowed border-slate-800' : 'bg-slate-50 text-slate-400 cursor-not-allowed') : ''}
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-rose-500 bg-rose-50/10' : ''}
          `}
          disabled={disabled}
          rows={multiline ? rows : undefined}
          {...(props as any)}
        />
      </div>
      {error && <p className="text-[10px] text-rose-600 mt-1 ml-1 font-medium">{error}</p>}
    </div>
  );
};

export default React.memo(Input);
