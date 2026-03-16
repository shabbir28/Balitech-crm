import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Database, 
    CheckCircle, 
    Activity,
    Users
} from 'lucide-react';
import { 
    AreaChart,
    Area,
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'];

const StatCard = ({ icon, label, value, color, glowColor }) => {
    const Icon = icon;
    return (
        <div className="rounded-2xl border border-white/[0.06] p-5 relative overflow-hidden flex items-start gap-4"
            style={{ background: 'linear-gradient(135deg, #1a1d2e 0%, #13151e 100%)' }}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ background: `radial-gradient(circle at top right, ${glowColor}, transparent 65%)` }} />
            <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={22} style={{ color }} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-extrabold text-white tracking-tight leading-none">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
            </div>
            <div className="absolute bottom-3 right-3 opacity-5">
                <Icon size={56} strokeWidth={1} />
            </div>
        </div>
    );
};

const chartTooltipStyle = {
    backgroundColor: '#1a1d2e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: 12,
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

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
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
        </div>
    );
    if (!stats) return <div className="text-red-400 p-4">Failed to load stats.</div>;

    const { totals, vendorDistribution, countryDistribution, dailyActivity } = stats;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
                <p className="text-gray-500 mt-1 text-sm font-medium">Real-time analytics for your BPO data platform</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Database}     label="Total Contacts" value={totals.total_contacts || 0}  color="#f59e0b" glowColor="#f59e0b" />
                <StatCard icon={Users}        label="Total Vendors"  value={totals.total_vendors || 0}   color="#3b82f6" glowColor="#3b82f6" />
                <StatCard icon={Activity}     label="Total DNC"      value={totals.total_downloaded || 0} color="#a78bfa" glowColor="#8b5cf6" />
                <StatCard icon={CheckCircle}  label="Available"      value={totals.remaining_leads || 0}  color="#34d399" glowColor="#10b981" />
            </div>

            {/* Contacts Overview Area Chart */}
            <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: '#1a1d2e' }}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-bold text-white">Contacts Overview</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Download activity trend over time</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-0.5 rounded bg-amber-400"></span> Active
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-0.5 rounded bg-blue-500"></span> Contacts Viewed
                        </span>
                    </div>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyActivity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(s) => { const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()}`; }}
                                axisLine={false} tickLine={false}
                                tick={{ fill: '#4b5563', fontSize: 11 }} dy={8}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={chartTooltipStyle}
                                labelFormatter={(l) => new Date(l).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                itemStyle={{ color: '#e5e7eb' }}
                            />
                            <Area type="monotone" dataKey="total_quantity" stroke="#f59e0b" strokeWidth={2.5}
                                fill="url(#gradGold)" dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: '#13151e', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row: Bar Chart + Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Daily Reports Bar Chart */}
                <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] p-6" style={{ background: '#1a1d2e' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-white">Leads by Vendor</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Distribution across all data sources</p>
                        </div>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={vendorDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false}
                                    tick={{ fill: '#4b5563', fontSize: 11 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
                                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    itemStyle={{ color: '#e5e7eb' }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                                    {vendorDistribution.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.9} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Geographies Pie */}
                <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] p-6 flex flex-col" style={{ background: '#1a1d2e' }}>
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-white">Top Geographies</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Breakdown by country</p>
                    </div>
                    <div className="flex-1 min-h-0 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={countryDistribution} innerRadius={55} outerRadius={82}
                                    paddingAngle={3} dataKey="count" nameKey="country_code" stroke="none">
                                    {countryDistribution.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: '#e5e7eb' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-2">
                        {countryDistribution.slice(0, 4).map((e, i) => (
                            <div key={e.country_code} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                                    <span className="text-gray-400 font-medium">{e.country_code}</span>
                                </div>
                                <span className="text-gray-300 font-bold">{e.count?.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
