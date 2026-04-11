
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

const StatCard = ({ title, value, icon: Icon, trend, trendUp, loading }: any) => {
  const getGradient = (ttl: string) => {
    if (ttl.includes('Người đăng ký')) return 'from-blue-500 to-indigo-600 shadow-indigo-500/10';
    if (ttl.includes('Email đã gửi')) return 'from-amber-400 to-orange-500 shadow-orange-500/10';
    if (ttl.includes('Tỉ lệ mở')) return 'from-indigo-500 to-purple-600 shadow-indigo-500/10';
    if (ttl.includes('Lượt Click')) return 'from-emerald-500 to-teal-600 shadow-emerald-500/10';
    return 'from-slate-500 to-slate-600 shadow-slate-500/10';
  };

  return (
    <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 transition-all duration-500 group relative overflow-hidden hover-lift hover:shadow-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 opacity-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
      <div className="flex justify-between items-start mb-6 relative z-10">
        {loading ? (
          <Sk w="56px" h={56} round={16} />
        ) : (
          <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 bg-gradient-to-br ${getGradient(title)}`}>
            <Icon className="w-7 h-7" />
          </div>
        )}
        {!loading && (
          <span className={`flex items-center text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wider ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 rotate-180" />}
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10 space-y-2">
        {loading ? (
          <>
            <Sk h={40} w="70%" round={12} />
            <Sk h={12} w="50%" round={6} />
          </>
        ) : (
          <>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">{title}</p>
          </>
        )}
      </div>
    </div>
  );
};


const StatsGrid: React.FC<StatsGridProps> = ({ stats, loading }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <StatCard title="Người đăng ký" value={stats.totalSubscribers.toLocaleString()} icon={Users} trend="+12%" trendUp={true} loading={loading} />
    <StatCard title="Email đã gửi" value={stats.totalSent.toLocaleString()} icon={MailCheck} trend="+5.4%" trendUp={true} loading={loading} />
    <StatCard title="Tỉ lệ mở TB" value={`${stats.avgOpenRate}%`} icon={MailOpen} trend="-2.1%" trendUp={false} loading={loading} />
    <StatCard title="Lượt Click" value="1,294" icon={MousePointerClick} trend="+8%" trendUp={true} loading={loading} />
  </div>
);

export default StatsGrid;
