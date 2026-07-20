
import React from 'react';
import { Users, MailCheck, MousePointerClick, Activity, TrendingUp, MailOpen } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalSubscribers: number;
    totalSent: number;
    avgOpenRate: number;
  };
  loading: boolean;
}

const Sk = ({ w = '100%', h = 16, round = 8 }: { w?: string; h?: number; round?: number }) => (
  <div style={{ width: w, height: h, background: '#e2e8f0', borderRadius: round, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} />
  </div>
);

const StatCard = ({ title, value, icon: Icon, trend, trendUp, loading, color, decor }: any) => {
  return (
    <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-100/70 dark:border-slate-800/80 hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[145px] group cursor-pointer">
      {decor && (
        <div className="decor-svg" style={{ color: color }}>
          {decor}
        </div>
      )}
      <div className="relative z-10 flex flex-col justify-between h-full w-full">
        <div>
          <div className="flex justify-between items-center mb-3.5">
            {loading ? (
              <Sk w="60px" h={10} round={5} />
            ) : (
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{title}</span>
            )}
            {loading ? (
              <Sk w="32px" h={32} round={16} />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15`, color: color }}>
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            {loading ? (
              <>
                <Sk h={32} w="60%" round={10} />
                <Sk h={10} w="40%" round={5} />
              </>
            ) : (
              <h3 className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none mb-2.5">{value}</h3>
            )}
          </div>
        </div>
        {!loading && (
          <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full" style={{ 
              backgroundColor: trendUp ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              color: trendUp ? '#10b981' : '#f43f5e'
            }}>
              {trendUp ? (
                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="shrink-0">
                  <path d="M12 5l9 14H3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="shrink-0">
                  <path d="M12 19L3 5h18z" />
                </svg>
              )}
              <span className="ml-0.5">{trend}</span>
            </span>
            <span className="text-slate-400 font-bold dark:text-slate-500">so với kỳ trước</span>
          </div>
        )}
      </div>
    </div>
  );
};


const StatsGrid: React.FC<StatsGridProps> = ({ stats, loading }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <StatCard 
      title="Người đăng ký" 
      value={stats.totalSubscribers.toLocaleString()} 
      icon={Users} 
      trend="+12%" 
      trendUp={true} 
      loading={loading} 
      color="#8b5cf6"
      decor={
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" stroke-dasharray="4 4" />
          <circle cx="35" cy="45" r="15" fill="currentColor" fillOpacity="0.2" />
          <circle cx="65" cy="45" r="15" fill="currentColor" fillOpacity="0.4" />
          <circle cx="50" cy="70" r="18" fill="currentColor" fillOpacity="0.6" />
        </svg>
      }
    />
    <StatCard 
      title="Email đã gửi" 
      value={stats.totalSent.toLocaleString()} 
      icon={MailCheck} 
      trend="+5.4%" 
      trendUp={true} 
      loading={loading} 
      color="#3b82f6"
      decor={
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <path d="M10 50 Q 50 10 90 50 T 90 90" stroke="currentColor" strokeWidth="2" stroke-dasharray="3 3" />
          <circle cx="10" cy="50" r="6" fill="currentColor" />
          <circle cx="50" cy="10" r="6" fill="currentColor" />
          <circle cx="90" cy="50" r="6" fill="currentColor" />
          <path d="M50 10 L 90 50" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      }
    />
    <StatCard 
      title="Tỉ lệ mở TB" 
      value={`${stats.avgOpenRate}%`} 
      icon={MailOpen} 
      trend="-2.1%" 
      trendUp={false} 
      loading={loading} 
      color="#10b981"
      decor={
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect x="20" y="20" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.6" />
          <rect x="20" y="42" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.4" />
          <rect x="20" y="64" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.2" />
        </svg>
      }
    />
    <StatCard 
      title="Lượt Click" 
      value="1,294" 
      icon={MousePointerClick} 
      trend="+8%" 
      trendUp={true} 
      loading={loading} 
      color="#ec4899"
      decor={
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" />
          <path d="M50 35 V 65 M35 50 H 65" stroke="currentColor" strokeWidth="3" stroke-linecap="round" />
        </svg>
      }
    />
  </div>
);

export default StatsGrid;
