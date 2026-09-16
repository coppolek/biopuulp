import React, { useState, useEffect } from 'react';
import { BioPage, PageAnalytics } from '../types';
import { getPageAnalytics } from '../lib/db';
import { ArrowLeft, TrendingUp, Users, ExternalLink, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard({ page, onBack }: { page: BioPage, onBack: () => void }) {
  const [analytics, setAnalytics] = useState<PageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getPageAnalytics(page.id);
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [page.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 mb-4">Nessun dato disponibile</p>
        <button onClick={onBack} className="text-black underline font-bold uppercase text-xs tracking-widest">Torna indietro</button>
      </div>
    );
  }

  const totalViews = analytics.dailyStats.reduce((sum, day) => sum + day.views, 0);
  const totalClicks = analytics.dailyStats.reduce((sum, day) => sum + day.clicks, 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];

  return (
    <div className="min-h-screen bg-gray-50 text-black flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-black tracking-tighter uppercase leading-none">Analytics</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{page.slug}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-gray-500 mb-4">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Visualizzazioni (7g)</span>
            </div>
            <span className="text-4xl font-black">{totalViews}</span>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-gray-500 mb-4">
              <ExternalLink className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Click (7g)</span>
            </div>
            <span className="text-4xl font-black">{totalClicks}</span>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 text-gray-500 mb-4">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">CTR Medio</span>
            </div>
            <span className="text-4xl font-black">{ctr}%</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Daily Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5" />
              <h2 className="font-black uppercase tracking-tighter text-lg">Traffico Giornaliero</h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyStats} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#666' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#666' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Line type="monotone" name="Visualizzazioni" dataKey="views" stroke="#000000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Click" dataKey="clicks" stroke="#9ca3af" strokeWidth={3} dot={{ r: 4, fill: '#9ca3af' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Chart */}
          {analytics.monthlyStats && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5" />
                <h2 className="font-black uppercase tracking-tighter text-lg">Traffico Mensile</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyStats} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="views" name="Visualizzazioni" fill="#000000" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="clicks" name="Click" fill="#9ca3af" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Referrals Chart */}
          {analytics.referrals && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5" />
                <h2 className="font-black uppercase tracking-tighter text-lg">Sorgenti di Traffico</h2>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-[350px]">
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.referrals}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="source"
                      >
                        {analytics.referrals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <ul className="space-y-4">
                    {analytics.referrals.map((ref, i) => {
                      const totalReferrals = analytics.referrals!.reduce((sum, r) => sum + r.count, 0);
                      const percentage = ((ref.count / totalReferrals) * 100).toFixed(1);
                      return (
                        <li key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="font-bold text-sm">{ref.source}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-black">{ref.count}</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
