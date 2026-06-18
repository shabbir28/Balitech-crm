import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, UploadCloud, X, Check, CheckCircle2, AlertCircle, User, Eye, EyeOff } from 'lucide-react';

const FormField = ({ label, children, error }) => (
    <div className="mb-5">
        <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {label}
        </label>
        {children}
        {error && <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {error}</p>}
    </div>
);

const AddUser = ({ editMode }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const fileInputRef = useRef();
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        date_of_birth: '', password: '', confirm_password: '', role: '',
    });
    const [profileFile, setProfileFile] = useState(null);
    const [profilePreview, setProfilePreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [loadingUser, setLoadingUser] = useState(editMode);
    const [showPassword, setShowPassword] = useState(false);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (!editMode || !id) return;
        api.get(`/users/${id}`)
            .then(res => {
                const u = res.data;
                setForm(prev => ({
                    ...prev,
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    email: u.email || '',
                    phone: u.phone || '',
                    date_of_birth: u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
                    role: u.role || '',
                    password: '',
                    confirm_password: '',
                }));
                if (u.profile_picture) {
                    setProfilePreview(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${u.profile_picture}`);
                }
            })
            .catch(() => showToast('Failed to load user data', 'error'))
            .finally(() => setLoadingUser(false));
    }, [editMode, id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (file) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(file.type)) {
            showToast('Unsupported file type. Use JPG, PNG, WebP, PDF.', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('File too large. Max 5MB.', 'error');
            return;
        }
        setProfileFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => setProfilePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setProfilePreview(null);
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.first_name.trim()) errs.first_name = 'Required';
        if (!form.last_name.trim()) errs.last_name = 'Required';
        if (!form.email.trim()) errs.email = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
        if (!editMode && !form.password) errs.password = 'Required';
        if (form.password && form.password.length < 6) errs.password = 'Min 6 characters';
        if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match';
        if (!form.role) errs.role = 'Required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k !== 'confirm_password' && v) formData.append(k, v);
            });
            if (profileFile) formData.append('profile_picture', profileFile);

            if (editMode) {
                await api.put(`/users/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                showToast('User updated successfully!', 'success');
            } else {
                await api.post('/users', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                showToast('User created successfully!', 'success');
            }
            setTimeout(() => navigate('/users'), 1500);
        } catch (err) {
            showToast(err?.response?.data?.message || (editMode ? 'Failed to update user' : 'Failed to create user'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingUser) return (
        <div className="flex items-center justify-center h-64 text-slate-400 font-medium">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            Loading user data...
        </div>
    );

    const inputClass = (error) => `w-full bg-[#0a0a0f] border ${error ? 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20' : 'border-white/10 focus:border-brand-500/50 focus:ring-brand-500/20'} rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-all focus:ring-2 shadow-inner`;

    return (
        <div className="max-w-6xl mx-auto font-sans pb-12">
            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-[#13151f] border border-white/[0.07] shadow-2xl rounded-xl p-4 flex items-start gap-3">
                        {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white">{toast.msg}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate('/users')} 
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        {editMode ? 'Edit User' : 'Add New User'}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">
                        {editMode ? 'Update the details and permissions for this user.' : 'Create a new user account and assign roles.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
                
                {/* Left - Form Fields */}
                <div className="bg-[#1e1e2d] border border-white/[0.05] shadow-2xl rounded-3xl relative overflow-hidden p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <FormField label="First Name" error={errors.first_name}>
                            <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="e.g. John" className={inputClass(errors.first_name)} />
                        </FormField>

                        <FormField label="Last Name" error={errors.last_name}>
                            <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="e.g. Doe" className={inputClass(errors.last_name)} />
                        </FormField>

                        <div className="md:col-span-2">
                            <FormField label="Email Address" error={errors.email}>
                                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john.doe@example.com" className={inputClass(errors.email)} />
                            </FormField>
                        </div>

                        <FormField label="Phone Number" error={errors.phone}>
                            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className={inputClass(errors.phone)} />
                        </FormField>

                        <FormField label="Date of Birth" error={errors.date_of_birth}>
                            <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className={`${inputClass(errors.date_of_birth)} color-scheme-dark`} />
                        </FormField>

                        <FormField label="Password" error={errors.password}>
                            <div className="relative">
                                <input 
                                    name="password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={form.password} 
                                    onChange={handleChange} 
                                    placeholder={editMode ? "Leave blank to keep current" : "••••••••"} 
                                    className={inputClass(errors.password)} 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </FormField>

                        <FormField label="Confirm Password" error={errors.confirm_password}>
                            <div className="relative">
                                <input 
                                    name="confirm_password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={form.confirm_password} 
                                    onChange={handleChange} 
                                    placeholder="••••••••" 
                                    className={inputClass(errors.confirm_password)} 
                                />
                            </div>
                        </FormField>

                        <div className="md:col-span-2">
                            <FormField label="Select Role" error={errors.role}>
                                <select name="role" value={form.role} onChange={handleChange} className={inputClass(errors.role) + " appearance-none"}>
                                    <option value="" disabled>Select Role...</option>
                                    <option value="super_admin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                    <option value="data_entry">Data Entry</option>
                                </select>
                            </FormField>
                        </div>
                    </div>
                </div>

                {/* Right - Attachment & Submit */}
                <div className="flex flex-col gap-6">
                    {/* Attachment Card */}
                    <div className="bg-[#1e1e2d] border border-white/[0.05] shadow-2xl rounded-3xl p-6 relative overflow-hidden">
                        <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Profile Photo</h2>
                        
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                                dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 hover:border-brand-500/50 hover:bg-white/[0.02]'
                            }`}
                        >
                            {profilePreview ? (
                                <div className="relative group inline-block">
                                    <img src={profilePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-brand-500/30 group-hover:border-brand-500/60 transition-colors shadow-lg" />
                                    <button 
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setProfileFile(null); setProfilePreview(null); }}
                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1.5 shadow-lg scale-0 group-hover:scale-100 transition-transform"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : profileFile ? (
                                <div className="py-4">
                                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 mx-auto mb-3">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-semibold text-white truncate px-2">{profileFile.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">Click to replace</p>
                                </div>
                            ) : (
                                <div className="py-4">
                                    <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                                        <UploadCloud className="w-6 h-6" />
                                    </div>
                                    <button type="button" className="bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-lg mb-2 shadow-[0_2px_10px_rgba(245,158,11,0.2)]">
                                        Browse File
                                    </button>
                                    <p className="text-xs text-slate-500 font-medium">JPG, PNG, WebP</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileChange(e.target.files[0])} />

                        {/* Profile Summary Card (Only if data exists) */}
                        {(form.first_name || form.last_name || form.email) && (
                            <div className="mt-6 p-4 rounded-2xl bg-black/20 border border-white/5 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-inner overflow-hidden shrink-0">
                                    {profilePreview ? (
                                        <img src={profilePreview} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        ((form.first_name[0] || '') + (form.last_name[0] || '')).toUpperCase() || <User className="w-5 h-5 text-white/70" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">
                                        {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}` : 'New User'}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{form.email || 'No email provided'}</p>
                                    {form.role && (
                                        <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                                            form.role === 'super_admin' ? 'bg-amber-500/10 text-amber-400' :
                                            form.role === 'admin' ? 'bg-blue-500/10 text-blue-400' :
                                            'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                            {form.role.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full bg-gradient-to-r from-brand-500 to-orange-500 text-white font-bold rounded-2xl py-4 shadow-[0_8px_24px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.4)] transition-all duration-300 flex items-center justify-center gap-2 ${
                            submitting ? 'opacity-70 cursor-not-allowed scale-[0.98]' : 'hover:-translate-y-0.5 active:scale-[0.98]'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {editMode ? 'Saving Changes...' : 'Creating User...'}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                {editMode ? 'Save Changes' : 'Create User'}
                            </>
                        )}
                    </button>
                </div>
            </form>
            
            <style>{`
                .color-scheme-dark::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.5;
                    cursor: pointer;
                }
                .color-scheme-dark::-webkit-calendar-picker-indicator:hover {
                    opacity: 0.8;
                }
                
                /* Override Chrome/Edge Autofill White Background */
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active{
                    -webkit-box-shadow: 0 0 0 30px #0a0a0f inset !important;
                    -webkit-text-fill-color: white !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
        </div>
    );
};

export default AddUser;
