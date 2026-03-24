import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, Lock, User, ArrowRight } from 'lucide-react';

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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center mb-6 mt-4">
                    <img src="/assets/logo.png" alt="BaliTech Logo" className="h-28 w-auto object-contain drop-shadow-[0_10px_35px_rgba(245,158,11,0.25)] select-none" />
                </div>
                <h2 className="text-center text-4xl font-extrabold text-slate-900 tracking-tight">
                    Welcome Back
                </h2>
                <p className="mt-3 text-center text-base text-slate-500">
                    Sign in to access your BPO Data CRM
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
                <div className="bg-white/80 backdrop-blur-xl py-10 px-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/60 sm:rounded-3xl sm:px-12">
                    <form className="space-y-7" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50/80 backdrop-blur-sm text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-start animate-fade-in">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">
                                Username
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="input-field pl-11 py-3.5 bg-slate-50/50 border-slate-200"
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Password
                                </label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="input-field pl-11 py-3.5 bg-slate-50/50 border-slate-200"
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
                                className="w-full btn-primary py-3.5 text-base shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] flex items-center justify-center gap-2 group"
                            >
                                {loading ? 'Authenticating...' : (
                                    <>
                                        Sign In securely
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
