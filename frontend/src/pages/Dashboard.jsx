import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
    Users, Download, Database, ShieldBan, Target, Layers,
    CheckCircle2, Clock, ArrowUpRight, TrendingUp, TrendingDown,
    Building2, FolderUp, Zap, AlertCircle
} from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#a855f7', '#10b981', '#ec4899', '#06b6d4', '#f59e0b'];

/* ── Tooltip ───────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 18px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', minWidth: 150 }}>
            {label && <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>}
            {payload.map((e, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 20, marginTop: i ? 6 : 0 }}>
                    <span style={{ display:'flex', alignItems:'center', gap: 7, fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius:'50%', background: e.color, flexShrink: 0 }} />
                        {e.name}
                    </span>
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 800, fontVariantNumeric:'tabular-nums' }}>{e.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
};

/* ── KPI Card ─────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, sub, color, index }) => (
    <div
        style={{
            background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 22, padding: '24px 24px 20px',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: 18,
            transition: 'transform .3s ease, border-color .3s ease, box-shadow .3s ease',
            animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${index * 70}ms both`,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor=`${color}35`; e.currentTarget.style.boxShadow=`0 16px 40px -10px ${color}30`; }}
        onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow=''; }}
    >
        <div style={{ position:'absolute', top:-40, right:-40, width:170, height:170, borderRadius:'50%', background: color, opacity:.07, filter:'blur(50px)', pointerEvents:'none' }} />
        <div style={{ width:50, height:50, borderRadius:16, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={22} color={color} strokeWidth={1.8} />
        </div>
        <div>
            <div style={{ fontSize:34, fontWeight:800, color:'#fff', lineHeight:1, letterSpacing:'-0.03em', fontVariantNumeric:'tabular-nums', marginBottom: 6 }}>
                {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:'#6b7280', letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</div>
            {sub && <div style={{ fontSize:11, color:'#374151', marginTop:4, fontWeight:500 }}>{sub}</div>}
        </div>
    </div>
);

/* ── Card Shell ───────────────────────────────────────── */
const Card = ({ children, style={} }) => (
    <div style={{ background:'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))', border:'1px solid rgba(255,255,255,0.07)', borderRadius:24, overflow:'hidden', ...style }}>
        {children}
    </div>
);

const CardHead = ({ title, subtitle, icon: Icon, color='#f97316', badge }) => (
    <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:13, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={19} color={color} strokeWidth={1.8} />
            </div>
            <div>
                <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.01em' }}>{title}</div>
                {subtitle && <div style={{ fontSize:11, color:'#4b5563', fontWeight:500, marginTop:2 }}>{subtitle}</div>}
            </div>
        </div>
        {badge}
    </div>
);

/* ── Status Badge ─────────────────────────────────────── */
const StatusBadge = ({ label, positive }) => (
    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, background: positive?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)', border:`1px solid ${positive?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'}`, color: positive?'#4ade80':'#f87171' }}>
    {positive ? <TrendingUp size={11}/> : <TrendingDown size={11}/>} {label}
    </div>
);

/* ── Main ────────────────────────────────────────────── */
const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rdy, setRdy] = useState(false);

    useEffect(() => setRdy(true), []);

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(r => setData(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', padding:'12px 24px', borderRadius:999 }}>
                <Zap size={15} color="#f97316" style={{ animation:'pulse 1.5s infinite' }} />
                <span style={{ fontSize:14, fontWeight:600, color:'#f97316' }}>Loading analytics…</span>
            </div>
        </div>
    );

    if (!data) return <div style={{ color:'#f87171', padding:32 }}>Failed to load stats.</div>;

    const { totals, vendorDistribution, campaignStats, dncStats, leadStatusBreakdown, recentSessions } = data;

    // enrich lead status for pie
    const STATUS_COLORS = { available:'#10b981', downloaded:'#3b82f6', dnc:'#f97316', sold:'#a855f7', duplicate:'#6b7280' };
    const statusPieData = leadStatusBreakdown?.map(s => ({ name: s.status || 'Unknown', value: s.count, fill: STATUS_COLORS[s.status] || '#6b7280' })) || [];

    return (
        <div style={{ fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:40 }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Header */}
            <div style={{ marginBottom:32, animation:'fadeUp .5s ease both' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                    <Zap size={13} color="#f97316" />
                    <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'#f97316' }}>Live Dashboard</span>
                </div>
                <h1 style={{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', lineHeight:1 }}>CRM Command Center</h1>
                <p style={{ fontSize:14, color:'#4b5563', marginTop:8, fontWeight:500 }}>Live data across Leads, Vendors, Campaigns, DNC and Sessions.</p>
            </div>

            {/* ── KPI Row ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:16, marginBottom:24 }}>
                <KpiCard index={0} icon={Database}  label="Total Leads"       value={+totals.total_contacts}  color="#3b82f6" sub="All uploaded records" />
                <KpiCard index={1} icon={CheckCircle2} label="Available"       value={+totals.remaining_leads} color="#10b981" sub="Ready for calling" />
                <KpiCard index={2} icon={Download}  label="Downloaded"         value={+totals.total_downloaded} color="#f97316" sub="Sent to agents" />
                <KpiCard index={3} icon={Building2} label="Vendors"            value={+totals.total_vendors}   color="#a855f7" sub="Active suppliers" />
                <KpiCard index={4} icon={Target}    label="Campaigns"          value={+totals.active_campaigns} color="#06b6d4" sub="Active campaigns" />
                <KpiCard index={5} icon={ShieldBan} label="DNC Numbers"        value={+totals.dnc_count}       color="#f43f5e" sub="Blocked lines" />
                <KpiCard index={6} icon={FolderUp}  label="Upload Sessions"    value={+totals.total_sessions}  color="#f59e0b" sub="All sessions" />
                <KpiCard index={7} icon={Layers}    label="SALE Numbers"       value={+totals.sale_count}      color="#8b5cf6" sub="Converted lines" />
            </div>

            {/* ── Row 2: Vendor Bar + Lead Status Pie ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, marginBottom:20, animation:'fadeUp .5s .25s ease both' }}>
                {/* Vendor-wise leads */}
                <Card>
                    <CardHead title="Leads by Vendor" subtitle="Total records per data provider" icon={Building2} color="#a855f7" />
                    <div style={{ padding:'24px 16px 20px', height:290 }}>
                        {rdy && vendorDistribution?.length ? (
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={vendorDistribution} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} dy={12} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} dx={-8} />
                                    <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,0.03)', radius:6 }} />
                                    <Bar dataKey="count" name="Leads" radius={[8,8,4,4]} maxBarSize={52} animationDuration={1400}>
                                        {vendorDistribution.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.85} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState label="No vendor data yet" />}
                    </div>
                </Card>

                {/* Lead Status Donut */}
                <Card>
                    <CardHead title="Lead Status" subtitle="Breakdown by current state" icon={Database} color="#3b82f6" />
                    <div style={{ padding:'16px 16px 0' }}>
                        <div style={{ position:'relative', height:200 }}>
                            {rdy && statusPieData.length ? (
                                <ResponsiveContainer width="99%" height="100%">
                                    <PieChart>
                                        <Pie data={statusPieData} innerRadius={60} outerRadius={88} paddingAngle={4} dataKey="value" nameKey="name" stroke="transparent" cornerRadius={6} animationDuration={1400}>
                                            {statusPieData.map((s,i)=><Cell key={i} fill={s.fill} />)}
                                        </Pie>
                                        <Tooltip content={<Tip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyState label="No lead data yet" />}
                            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                                <span style={{ fontSize:26, fontWeight:800, color:'#fff' }}>{(+totals.total_contacts||0).toLocaleString()}</span>
                                <span style={{ fontSize:10, color:'#4b5563', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginTop:2 }}>Total</span>
                            </div>
                        </div>
                        {/* Legend */}
                        <div style={{ padding:'14px 4px 18px', display:'flex', flexDirection:'column', gap:8 }}>
                            {statusPieData.map(s=>(
                                <div key={s.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                        <span style={{ width:10, height:10, borderRadius:3, background:s.fill, display:'inline-block', flexShrink:0 }} />
                                        <span style={{ fontSize:12, color:'#9ca3af', fontWeight:600, textTransform:'capitalize' }}>{s.name}</span>
                                    </div>
                                    <span style={{ fontSize:13, fontWeight:700, color:'#fff', fontVariantNumeric:'tabular-nums' }}>{s.value?.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── Row 3: Campaign Bar + DNC Stacked Bar ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20, animation:'fadeUp .5s .4s ease both' }}>
                {/* Campaign Leads */}
                <Card>
                    <CardHead title="Leads by Campaign" subtitle="Records tied to each active campaign" icon={Target} color="#06b6d4" />
                    <div style={{ padding:'24px 16px 20px', height:270 }}>
                        {rdy && campaignStats?.length ? (
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={campaignStats} layout="vertical" margin={{ top:5, right:20, left:10, bottom:0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill:'#9ca3af', fontSize:11, fontWeight:600 }} width={90} />
                                    <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="count" name="Leads" radius={[0,6,6,0]} maxBarSize={26} fill="#06b6d4" fillOpacity={0.85} animationDuration={1400} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState label="No campaign data yet" />}
                    </div>
                </Card>

                {/* DNC / SALE per campaign */}
                <Card>
                    <CardHead title="DNC & SALE by Campaign" subtitle="Blocked vs converted numbers per campaign" icon={ShieldBan} color="#f43f5e"
                        badge={<div style={{ display:'flex', gap:10 }}>
                            <span style={{ fontSize:11, color:'#f43f5e', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:8,height:8,borderRadius:2,background:'#f43f5e',display:'inline-block'}} />DNC</span>
                            <span style={{ fontSize:11, color:'#8b5cf6', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:8,height:8,borderRadius:2,background:'#8b5cf6',display:'inline-block'}} />SALE</span>
                        </div>}
                    />
                    <div style={{ padding:'24px 16px 20px', height:270 }}>
                        {rdy && dncStats?.length ? (
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={dncStats} layout="vertical" margin={{ top:5, right:20, left:10, bottom:0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} />
                                    <YAxis dataKey="campaign" type="category" axisLine={false} tickLine={false} tick={{ fill:'#9ca3af', fontSize:11, fontWeight:600 }} width={80} />
                                    <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="dnc_count"  name="DNC"  radius={[0,4,4,0]} maxBarSize={14} fill="#f43f5e" fillOpacity={0.85} animationDuration={1400} />
                                    <Bar dataKey="sale_count" name="SALE" radius={[0,4,4,0]} maxBarSize={14} fill="#8b5cf6" fillOpacity={0.85} animationDuration={1400} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState label="No DNC/SALE data yet" />}
                    </div>
                </Card>
            </div>

            {/* ── Row 4: Recent Sessions Table ── */}
            <Card style={{ animation:'fadeUp .5s .55s ease both' }}>
                <CardHead title="Recent Upload Sessions" subtitle="Latest data ingestion activity" icon={FolderUp} color="#f59e0b"
                    badge={<StatusBadge label="Live" positive />}
                />
                <div style={{ padding:'4px 0 4px' }}>
                    {/* Table Header */}
                    <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 100px 130px', padding:'10px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        {['Campaign','Vendor','Jobs','Date'].map(h=>(
                            <span key={h} style={{ fontSize:10, fontWeight:700, color:'#4b5563', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</span>
                        ))}
                    </div>
                    {recentSessions?.length ? recentSessions.map((s,i)=>(
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 100px 130px', padding:'14px 24px', borderBottom: i<recentSessions.length-1?'1px solid rgba(255,255,255,0.03)':'none', alignItems:'center', transition:'background .2s' }}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        >
                            <span style={{ fontSize:13, color:'#e5e7eb', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight:12 }}>{s.campaign_type||'—'}</span>
                            <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>{s.vendor_name||'—'}</span>
                            <span style={{ fontSize:13, color:'#f97316', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{(+s.job_count||0)}</span>
                            <span style={{ fontSize:11, color:'#6b7280', fontWeight:500 }}>{new Date(s.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                        </div>
                    )) : (
                        <EmptyState label="No upload sessions found" style={{ padding:40 }} />
                    )}
                </div>
            </Card>
        </div>
    );
};

const EmptyState = ({ label, style={} }) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, opacity:0.4, ...style }}>
        <AlertCircle size={28} color="#6b7280" strokeWidth={1.5} />
        <span style={{ fontSize:13, color:'#6b7280', fontWeight:500 }}>{label}</span>
    </div>
);

export default Dashboard;
