import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
    Download, Database, ShieldBan, Target, Layers,
    CheckCircle2, ArrowUpRight, Building2, FolderUp, Zap, AlertCircle, BadgeDollarSign, Split
} from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#10b981', '#ec4899', '#06b6d4', '#f97316'];

const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 18px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)', minWidth: 150 }}>
            {label && <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>}
            {payload.map((e, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 20, marginTop: i ? 6 : 0 }}>
                    <span style={{ display:'flex', alignItems:'center', gap: 7, fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius:'50%', background: e.color || e.payload?.fill || '#f59e0b', flexShrink: 0 }} />
                        {e.name}
                    </span>
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 800, fontVariantNumeric:'tabular-nums' }}>{e.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
};

const KpiCard = ({ icon: IconComponent, label, value, sub, color, index }) => (
    <div
        style={{
            background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 22, padding: '24px 24px 20px',
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: 18,
            minHeight: 168,
            transition: 'transform .3s ease, border-color .3s ease, box-shadow .3s ease',
            animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${index * 70}ms both`,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor=`${color}35`; e.currentTarget.style.boxShadow=`0 16px 40px -10px ${color}30`; }}
        onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow=''; }}
    >
        <div style={{ position:'absolute', top:-40, right:-40, width:170, height:170, borderRadius:'50%', background: color, opacity:.07, filter:'blur(50px)', pointerEvents:'none' }} />
        <div style={{ width:50, height:50, borderRadius:16, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IconComponent size={22} color={color} strokeWidth={1.8} />
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

const Card = ({ children, style={} }) => (
    <div style={{ background:'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))', border:'1px solid rgba(255,255,255,0.07)', borderRadius:24, overflow:'hidden', ...style }}>
        {children}
    </div>
);

const CardHead = ({ title, subtitle, icon: IconComponent, color='#f59e0b', badge }) => (
    <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:13, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <IconComponent size={19} color={color} strokeWidth={1.8} />
            </div>
            <div>
                <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.01em' }}>{title}</div>
                {subtitle && <div style={{ fontSize:11, color:'#4b5563', fontWeight:500, marginTop:2 }}>{subtitle}</div>}
            </div>
        </div>
        {badge}
    </div>
);

const EmptyState = ({ label, style={} }) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, opacity:0.4, ...style }}>
        <AlertCircle size={28} color="#6b7280" strokeWidth={1.5} />
        <span style={{ fontSize:13, color:'#6b7280', fontWeight:500 }}>{label}</span>
    </div>
);

const SafeQuoteDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rdy, setRdy] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setRdy(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        let alive = true;
        const load = (silent) => {
            api.get('/safe-quote-dashboard/stats')
                .then(r => { if (alive) setData(r.data); })
                .catch(console.error)
                .finally(() => { if (alive && !silent) setLoading(false); });
        };
        load(false);
        const timer = setInterval(() => load(true), 15000);
        const onFocus = () => load(true);
        window.addEventListener('focus', onFocus);
        return () => {
            alive = false;
            clearInterval(timer);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', padding:'12px 24px', borderRadius:999 }}>
                <Zap size={15} color="#f59e0b" style={{ animation:'pulse 1.5s infinite' }} />
                <span style={{ fontSize:14, fontWeight:600, color:'#f59e0b' }}>Loading Safe Quote analytics…</span>
            </div>
        </div>
    );

    if (!data) return <div style={{ color:'#f87171', padding:32 }}>Failed to load Safe Quote dashboard.</div>;

    const { totals = {}, vendorDistribution = [], campaignStats = [], leadStatusBreakdown = [], recentSessions = [] } = data;
    const STATUS_COLORS = { available:'#10b981', downloaded:'#3b82f6', DNC:'#f43f5e', dnc:'#f43f5e', SALE:'#34d399', sale:'#34d399', SEPARATION:'#f59e0b', separation:'#f59e0b', unknown:'#6b7280' };
    const statusPieData = leadStatusBreakdown.map(s => ({
        name: s.status || 'Unknown',
        value: +s.count,
        fill: STATUS_COLORS[s.status] || '#6b7280'
    }));

    return (
        <div style={{ fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:40 }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>

            <div style={{ marginBottom:32, display:'flex', justifyContent:'space-between', gap:16, flexWrap:'wrap', animation:'fadeUp .5s ease both' }}>
                <div>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                        <Zap size={13} color="#f59e0b" />
                        <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'#f59e0b' }}>Safe Quote Dashboard</span>
                    </div>
                    <h1 style={{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', lineHeight:1 }}>Safe Quote Command Center</h1>
                    <p style={{ fontSize:14, color:'#4b5563', marginTop:8, fontWeight:500, maxWidth:640 }}>
                        Only Safe Quote vendors, campaigns, uploads, and downloads. Numbers already stored in Safe Quote are skipped. Other modules are not compared.
                    </p>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                    <Link to="/safe-quote-upload" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#d97706', color:'#fff', borderRadius:12, padding:'10px 16px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
                        Upload Data <ArrowUpRight size={15} />
                    </Link>
                    <Link to="/safe-quote-vendors" style={{ display:'inline-flex', alignItems:'center', gap:8, border:'1px solid rgba(255,255,255,0.1)', color:'#cbd5e1', borderRadius:12, padding:'10px 16px', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                        Vendors
                    </Link>
                </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:16, marginBottom:24 }}>
                <KpiCard index={0} icon={Database} label="Total Data" value={+(totals.total_contacts || 0)} color="#f59e0b" sub="Safe Quote records" />
                <KpiCard index={1} icon={CheckCircle2} label="Available" value={+(totals.remaining_leads || 0)} color="#10b981" sub="Ready to download" />
                <KpiCard index={2} icon={Download} label="Downloaded" value={+(totals.total_downloaded || 0)} color="#3b82f6" sub="Exported from Safe Quote" />
                <KpiCard index={8} icon={ShieldBan} label="Safe Quote DNC" value={+(totals.sq_dnc_count || 0)} color="#e11d48" sub="Numbers on the DNC list" />
                <KpiCard index={9} icon={BadgeDollarSign} label="Safe Quote Sale" value={+(totals.sq_sale_count || 0)} color="#10b981" sub="Numbers on the Sale list" />
                <KpiCard index={10} icon={Split} label="Separation" value={+(totals.sq_separation_count || 0)} color="#f59e0b" sub="Numbers on the Separation list" />
                <KpiCard index={4} icon={Building2} label="Vendors" value={+(totals.total_vendors || 0)} color="#a855f7" sub={`${+(totals.active_vendors || 0)} active`} />
                <KpiCard index={5} icon={Target} label="Campaigns" value={+(totals.total_campaigns || 0)} color="#06b6d4" sub={`${+(totals.active_campaigns || 0)} active`} />
                <KpiCard index={6} icon={FolderUp} label="Sessions" value={+(totals.total_sessions || 0)} color="#f97316" sub="Upload sessions" />
                <KpiCard index={7} icon={Layers} label="Files" value={+(totals.total_jobs || 0)} color="#8b5cf6" sub="Uploaded files" />
            </div>

            <div style={{ marginBottom: 32 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <Target size={16} color="#f59e0b" />
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.02em' }}>Safe Quote Campaigns</h2>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
                    {campaignStats.length > 0 ? campaignStats.map((camp, idx) => (
                        <KpiCard
                            key={camp.name}
                            index={idx}
                            icon={Target}
                            label={camp.name}
                            value={+(camp.available_count || 0)}
                            color={COLORS[idx % COLORS.length]}
                            sub={`Sale ${(+camp.sale_count || 0).toLocaleString()} · DNC ${(+camp.dnc_count || 0).toLocaleString()} · Sep ${(+camp.separation_count || 0).toLocaleString()}`}
                        />
                    )) : (
                        <KpiCard index={0} icon={Target} label="No campaign data" value={0} color="#f59e0b" sub="Upload a file to see campaign totals" />
                    )}
                </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 340px', gap:20, marginBottom:20, animation:'fadeUp .5s .25s ease both' }}>
                <Card>
                    <CardHead title="Available by Vendor" subtitle="Downloadable Safe Quote leads" icon={Building2} color="#a855f7" />
                    <div style={{ padding:'24px 16px 20px', height:290, minHeight:290, minWidth:200 }}>
                        {rdy && vendorDistribution.length ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} debounce={100}>
                                <BarChart data={vendorDistribution} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} dy={12} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} dx={-8} />
                                    <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,0.03)', radius:6 }} />
                                    <Bar dataKey="count" name="Available" radius={[8,8,4,4]} maxBarSize={52} animationDuration={1400}>
                                        {vendorDistribution.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.85} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState label="No Safe Quote vendors yet" />}
                    </div>
                </Card>

                <Card>
                    <CardHead title="Lead Status" subtitle="Safe Quote records only" icon={Database} color="#f59e0b" />
                    <div style={{ padding:'16px 16px 0', minHeight:200, minWidth:200 }}>
                        <div style={{ position:'relative', height:200, minHeight:200, minWidth:200 }}>
                            {rdy && statusPieData.length ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={150} debounce={100}>
                                    <PieChart>
                                        <Pie data={statusPieData} innerRadius={60} outerRadius={88} paddingAngle={4} dataKey="value" nameKey="name" stroke="transparent" cornerRadius={6} animationDuration={1400}>
                                            {statusPieData.map((s,i)=><Cell key={i} fill={s.fill} />)}
                                        </Pie>
                                        <Tooltip content={<Tip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyState label="No lead data yet" />}
                            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                                <span style={{ fontSize:26, fontWeight:800, color:'#fff' }}>{(+totals.total_contacts || 0).toLocaleString()}</span>
                                <span style={{ fontSize:10, color:'#4b5563', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginTop:2 }}>Total</span>
                            </div>
                        </div>
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

            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:20, marginBottom:20 }}>
                <Card>
                    <CardHead title="Leads by Campaign" subtitle="Counts stay inside Safe Quote campaigns" icon={Target} color="#06b6d4" />
                    <div style={{ padding:'24px 16px 20px', height:270, minHeight:270, minWidth:200 }}>
                        {rdy && campaignStats.length ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} debounce={100}>
                                <BarChart data={campaignStats} layout="vertical" margin={{ top:5, right:20, left:10, bottom:0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill:'#4b5563', fontSize:11, fontWeight:600 }} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill:'#9ca3af', fontSize:11, fontWeight:600 }} width={110} />
                                    <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="available_count" name="Available" radius={[0,6,6,0]} maxBarSize={26} fill="#f59e0b" fillOpacity={0.85} animationDuration={1400} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState label="No campaign data yet" />}
                    </div>
                </Card>
            </div>

            <Card style={{ animation:'fadeUp .5s .55s ease both' }}>
                <CardHead title="Recent Upload Sessions" subtitle="Latest Safe Quote file uploads" icon={FolderUp} color="#f59e0b" />
                <div>
                    <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 100px 130px', padding:'10px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        {['Campaign','Vendor','Files','Date'].map(h=>(
                            <span key={h} style={{ fontSize:10, fontWeight:700, color:'#4b5563', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</span>
                        ))}
                    </div>
                    {recentSessions.length ? recentSessions.map((s,i)=>(
                        <Link key={s.id} to={`/safe-quote-sessions/${s.id}`} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 100px 130px', padding:'14px 24px', borderBottom: i<recentSessions.length-1?'1px solid rgba(255,255,255,0.03)':'none', alignItems:'center', textDecoration:'none' }}>
                            <span style={{ fontSize:13, color:'#e5e7eb', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', paddingRight:12 }}>{s.campaign_type||'—'}</span>
                            <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>{s.vendor_name||'—'}</span>
                            <span style={{ fontSize:13, color:'#f59e0b', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{(+s.job_count||0)}</span>
                            <span style={{ fontSize:11, color:'#6b7280', fontWeight:500 }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</span>
                        </Link>
                    )) : (
                        <EmptyState label="No Safe Quote sessions yet" style={{ padding:40 }} />
                    )}
                    {recentSessions.length > 0 && (
                        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.1)' }}>
                            <Link to="/safe-quote-sessions" style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                View All Sessions <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default SafeQuoteDashboard;
