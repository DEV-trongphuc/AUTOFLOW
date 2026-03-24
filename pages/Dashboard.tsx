

import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Plus, Activity, Mail } from 'lucide-react';
import { api } from '../services/storageAdapter';
import { Campaign, Subscriber } from '../types';
import Button from '../components/common/Button';
import StatsGrid from './Dashboard/StatsGrid';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSubscribers: 0, activeCampaigns: 0, totalSent: 0, avgOpenRate: 0, newSubscribersToday: 0 });
  const [loading, setLoading] = useState(true);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);

  // Placeholder chart data until we implement aggregation API
  const chartData = [
    { name: 'T2', sent: 0, opened: 0 }, { name: 'T3', sent: 0, opened: 0 },
    { name: 'T4', sent: 0, opened: 0 }, { name: 'T5', sent: 0, opened: 0 },
    { name: 'T6', sent: 0, opened: 0 }, { name: 'T7', sent: 0, opened: 0 },
    { name: 'CN', sent: 0, opened: 0 },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [subsRes, campsRes] = await Promise.all([api.get<Subscriber[]>('subscribers'), api.get<Campaign[]>('campaigns')]);
      if (subsRes.success && campsRes.success) {
        const totalSent = campsRes.data.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
        const totalOpened = campsRes.data.reduce((acc, c) => acc + (c.stats?.opened || 0), 0);

        // Calculate new subscribers today
        const todayStr = new Date().toISOString().split('T')[0];
        const newSubs = subsRes.data.filter((s: any) => s.joinedAt && s.joinedAt.startsWith(todayStr)).length;

        // Get recent campaigns
        const sortedCampaigns = campsRes.data
          .filter((c: any) => c.status === 'sent' || c.status === 'completed')
          .sort((a, b) => new Date(b.sentAt || b.createdAt || 0).getTime() - new Date(a.sentAt || a.createdAt || 0).getTime())
          .slice(0, 3);
        setRecentCampaigns(sortedCampaigns);

        setStats({
          totalSubscribers: subsRes.data.length,
          activeCampaigns: campsRes.data.length,
          totalSent,
          avgOpenRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
          newSubscribersToday: newSubs
        });
      }
      setLoading(false);
    })();
  }, []);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  return (
    <div className="space-y-6 lg:space-y-10">
      <div className="bg-gradient-to-br from-[#2c3e50] to-[#1a252f] rounded-3xl lg:rounded-[32px] p-6 lg:p-10 text-white flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffa900] opacity-10 rounded-full blur-[100px] -mr-48 -mt-48 animate-pulse"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Chào mừng trở lại! 👋</h2>
          <p className="text-slate-300 font-medium text-lg">Hệ thống của bạn đang hoạt động tuyệt vời. Hôm nay có <strong className="text-white">{stats.newSubscribersToday.toLocaleString()} người</strong> mới.</p>
        </div>
        <div className="mt-8 md:mt-0 relative z-10"><Button size="lg" icon={Plus} className="px-8" onClick={() => navigate('/campaigns')}>Tạo chiến dịch mới</Button></div>
      </div>

      <StatsGrid stats={stats} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-5 lg:p-10 rounded-3xl lg:rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 lg:mb-10">
            <div><h3 className="text-lg lg:text-xl font-bold text-slate-700 tracking-tight">Hiệu suất gửi Email</h3><p className="text-xs lg:text-sm font-semibold text-slate-400">Dữ liệu 7 ngày gần nhất</p></div>
            <button className="w-fit text-[10px] font-bold uppercase tracking-widest text-[#ca7900] hover:text-[#ffa900] flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl transition-all">Chi tiết <ArrowUpRight className="w-4 h-4" /></button>
          </div>
          <div className="h-[250px] lg:h-[350px] flex items-center justify-center relative">
            {/* Overlay for empty state */}
            {stats.totalSent === 0 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[1px]">
                <p className="text-slate-400 text-sm font-bold">Chưa có dữ liệu gửi</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffa900" stopOpacity={0.4} /><stop offset="95%" stopColor="#ffa900" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2c3e50" stopOpacity={0.4} /><stop offset="95%" stopColor="#2c3e50" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1)', padding: '20px' }} itemStyle={{ fontSize: '12px', fontWeight: 700 }} labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '11px', fontWeight: 600 }} />
              <Area type="monotone" dataKey="sent" name="Đã gửi" stroke="#ffa900" strokeWidth={4} fill="url(#colorSent)" />
              <Area type="monotone" dataKey="opened" name="Đã mở" stroke="#2c3e50" strokeWidth={4} fill="url(#colorOpened)" />
            </AreaChart></ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[32px] shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg lg:text-xl font-bold text-slate-700 mb-6 lg:mb-8 tracking-tight">Thao tác nhanh</h3>
          <div className="space-y-4 mb-10">
            <Button variant="secondary" className="w-full justify-start py-4 rounded-2xl" icon={Plus} onClick={() => navigate('/flows')}>Tạo kịch bản</Button>
            <Button variant="secondary" className="w-full justify-start py-4 rounded-2xl" icon={Plus} onClick={() => navigate('/audience')}>Thêm danh sách</Button>
            <Button variant="secondary" className="w-full justify-start py-4 rounded-2xl" icon={Activity}>Xem Log</Button>
          </div>
          <div className="mt-auto pt-10 border-t border-slate-5"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Hoạt động gần đây</h3>
            <div className="space-y-6">
              {recentCampaigns.length > 0 ? recentCampaigns.map((c) => (
                <div key={c.id} className="flex items-start gap-4 group cursor-pointer" onClick={() => navigate('/campaigns')}>
                  <div className="w-2 h-2 rounded-full bg-[#ffa900] mt-1.5 shadow-[0_0_10px_rgba(255,169,0,0.5)] group-hover:scale-150 transition-transform"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 leading-relaxed"><span className="text-slate-800 font-bold">{c.name}</span> đã hoàn tất.</p>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">{formatTimeAgo(c.sentAt || c.createdAt)}</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">Chưa có hoạt động nào.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;