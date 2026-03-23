import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { ArrowUpRight, Database, Users, Activity, CheckCircle, BarChart3, Globe } from 'lucide-react';

// Premium Color Palette
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

const StatCard = ({ icon, label, value, trend, color }) => {
    return (
        <div className="group bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
            
            <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    {React.createElement(icon, { size: 22, style: { color }, strokeWidth: 2 })}
                </div>
                {trend && (
                    <div className="flex items-center text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20">
                        <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                        {trend}%
                    </div>
                )}
            </div>
            
            <div>
                <p className="text-[2rem] font-bold text-white tracking-tight leading-none mb-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                <p className="text-[13px] font-medium text-slate-400 tracking-wide uppercase">{label}</p>
            </div>
        </div>
    );
};

// Premium Tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f0f11]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl outline-none min-w-[150px]">
                <p className="text-[12px] font-bold text-slate-400 mb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-[13px] font-medium text-white">
                                <span className="w-2 h-2 rounded-full" style={{ background: entry.color, boxShadow: `0 0 8px ${entry.color}` }}></span>
                                {entry.name || 'Value'}
                            </span>
                            <span className="text-[13px] font-bold text-white tabular-nums">
                                {entry.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(true);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex h-[400px] items-center justify-center">
            <span className="text-[14px] font-medium text-brand-400 animate-pulse bg-brand-400/10 px-4 py-2 rounded-full border border-brand-400/20">Establishing connection...</span>
        </div>
    );
    
    if (!stats) return (
        <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-2xl max-w-md">
            <p className="text-[15px] font-bold text-white mb-1">Telemetry Error</p>
            <p className="text-[13px] text-slate-400 leading-relaxed">Failed to aggregate statistics. Please verify system connectivity and refresh the interface.</p>
        </div>
    );

    const { totals, vendorDistribution, countryDistribution, dailyActivity } = stats;

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">System Overview</h1>
                <p className="text-[14px] text-slate-400 mt-1 md:mt-2 font-medium">Real-time aggregate performance metrics and telemetry.</p>
            </div>

            {/* Grid Metrics - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard icon={Database} label="Total Contacts" value={totals.total_contacts || 0} trend="12.5" color="#3b82f6" />
                <StatCard icon={Users} label="Total Vendors" value={totals.total_vendors || 0} color="#8b5cf6" />
                <StatCard icon={Activity} label="Total Downloaded" value={totals.total_downloaded || 0} trend="8.2" color="#f59e0b" />
                <StatCard icon={CheckCircle} label="Remaining Leads" value={totals.remaining_leads || 0} trend="41.9" color="#10b981" />
            </div>

            {/* Area Chart - Premium Fade */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
                            <BarChart3 className="h-5 w-5 text-brand-400" />
                        </div>
                        <h2 className="text-[16px] font-bold text-white">Ingestion Velocity</h2>
                    </div>
                </div>
                
                <div className="h-[250px] md:h-[300px] w-full">
                    {isReady && (
                        <ResponsiveContainer width="99%" height="100%" minWidth={1} debounce={1}>
                        <AreaChart data={dailyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={(s) => { const d = new Date(s); return d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' }); }}
                                axisLine={false} 
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                                dy={10}
                                minTickGap={20}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                                dx={-10}
                                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            
                            <Area 
                                type="monotone" 
                                dataKey="total_quantity" 
                                name="Volume"
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fill="url(#colorBrand)" 
                                activeDot={{ r: 6, fill: '#0a0a0a', stroke: '#3b82f6', strokeWidth: 3 }} 
                            />
                        </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Split Distribution Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Vendors Bar Chart */}
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 hover:border-white/20 transition-colors">
                    <div className="mb-8">
                        <h3 className="text-[18px] font-bold text-white mb-1">Source Networks</h3>
                        <p className="text-[13px] text-slate-400 font-medium">Data partitioned by registered provider.</p>
                    </div>
                    <div className="h-[250px] w-full">
                        {isReady && (
                            <ResponsiveContainer width="99%" height="100%" minWidth={1} debounce={1}>
                                <BarChart data={vendorDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                                        dy={10} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                        tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                                        dx={-10}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar dataKey="count" name="Records" radius={[6, 6, 6, 6]} maxBarSize={48}>
                                        {vendorDistribution?.map((_, i) => (
                                            <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.9} className="hover:fill-opacity-100 transition-opacity cursor-pointer" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Geography Donut */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col hover:border-white/20 transition-colors">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe size={16} className="text-emerald-400" />
                            <h3 className="text-[12px] font-bold uppercase tracking-widest text-emerald-400">Demographics</h3>
                        </div>
                        <h2 className="text-[18px] font-bold text-white">Global Reach</h2>
                    </div>
                    
                    <div className="flex-1 min-h-[220px] relative flex items-center justify-center">
                        {isReady && (
                            <ResponsiveContainer width="99%" height="100%" minWidth={1} debounce={1}>
                                <PieChart>
                                    <Pie 
                                        data={countryDistribution} 
                                        innerRadius={65} 
                                        outerRadius={90}
                                        paddingAngle={4} 
                                        dataKey="count" 
                                        nameKey="country_code" 
                                        stroke="none"
                                        cornerRadius={6}
                                    >
                                        {countryDistribution?.map((_, i) => (
                                            <Cell key={`pie-cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} className="hover:opacity-80 transition-opacity outline-none cursor-pointer" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                            <span className="text-[2rem] font-bold text-white leading-none">{countryDistribution?.length || 0}</span>
                        </div>
                    </div>
                    
                    {/* Modern Legend */}
                    <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                        {countryDistribution?.slice(0, 4).map((e, i) => (
                            <div key={e.country_code} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: `${PIE_COLORS[i % PIE_COLORS.length]}20`, color: PIE_COLORS[i % PIE_COLORS.length] }}>
                                        {e.country_code}
                                    </div>
                                    <span className="text-[13px] text-slate-300 font-medium tracking-wide">
                                        {e.country_code === 'US' ? 'United States' : e.country_code === 'UK' ? 'United Kingdom' : e.country_code === 'CA' ? 'Canada' : e.country_code}
                                    </span>
                                </div>
                                <span className="text-[13px] text-white font-bold bg-white/5 px-2.5 py-1 rounded-lg">{(e.count || 0).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style jsx="true">{`
                .recharts-default-tooltip { outline: none !important; }
            `}</style>
        </div>
    );
};

export default Dashboard;
