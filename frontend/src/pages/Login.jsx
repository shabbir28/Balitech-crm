import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(formData.username, formData.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#151521] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-white selection:bg-brand-500/30 selection:text-white">
            {/* Subtle Gradient Backdrops */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[420px] relative z-10 transition-all duration-300">
                {/* Premium Dark Panel */}
                <div className="bg-[#1e1e2d] border border-[#ffffff0a] shadow-[0_0_40px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
                    
                    {/* Exact Logo Bar mapped from Dashboard Layout */}
                    <div className="h-28 flex items-center px-4 border-b border-white/5 shrink-0 relative overflow-hidden justify-center bg-black/10">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <img src="/assets/logo.png" alt="BaliTech Logo" className="h-[75px] w-auto max-w-[90%] object-contain drop-shadow-xl select-none" />
                    </div>

                    <div className="p-8 sm:p-10">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                                Welcome Back
                            </h2>
                            <p className="text-[13px] text-slate-400 font-medium">
                                Sign in to access your Balitech CRM
                            </p>
                        </div>

                        {/* Login Form */}
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm flex items-center gap-3 animate-fade-in">
                                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                    <span className="block font-medium">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-[13px] font-semibold text-slate-400 ml-1">
                                    Username
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" strokeWidth={2} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-11 py-3 bg-[#0a0a0f] border border-white/10 text-white rounded-xl focus:bg-black focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 font-medium placeholder:text-slate-600 outline-none transition-all duration-300 shadow-inner text-[14px]"
                                        placeholder="Enter your username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[13px] font-semibold text-slate-400 ml-1">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-brand-400 transition-colors" strokeWidth={2} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-11 py-3 bg-[#0a0a0f] border border-white/10 text-white rounded-xl focus:bg-black focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 font-medium placeholder:text-slate-600 tracking-[0.2em] outline-none transition-all duration-300 shadow-inner text-[14px]"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group relative overflow-hidden bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl py-3.5 px-6 font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-[14px]"
                                >
                                    {loading ? 'Authenticating...' : (
                                        <>
                                            Sign In
                                            <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2.5} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div className="flex flex-col items-center gap-2 mt-8">
                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 bg-[#1e1e2d] px-3 py-1.5 rounded-full border border-white/5">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        End-to-End Encrypted Session
                    </div>
                    <p className="text-[12px] text-slate-600 font-medium">
                        &copy; {new Date().getFullYear()} BaliTech Pvt.Ltd
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

