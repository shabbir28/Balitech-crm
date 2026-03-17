import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, UploadCloud, User, X, Check } from 'lucide-react';

const inputStyle = {
    width: '100%',
    background: '#0f1117',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '11px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const labelStyle = {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    display: 'block',
};

const FormField = ({ label, children }) => (
    <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>{label}</label>
        {children}
    </div>
);

const AddUser = () => {
    const navigate = useNavigate();
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

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (file) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(file.type)) {
            showToast('Unsupported file type. Use JPG, PNG, PDF.', 'error');
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
        if (!form.password) errs.password = 'Required';
        else if (form.password.length < 6) errs.password = 'Min 6 characters';
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

            await api.post('/users', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showToast('User created successfully!');
            setTimeout(() => navigate('/users'), 1500);
        } catch (err) {
            showToast(err?.response?.data?.message || 'Failed to create user', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1000, margin: '0 auto' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff', padding: '12px 20px', borderRadius: 10,
                    fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <button onClick={() => navigate('/users')} style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#9ca3af', cursor: 'pointer', borderRadius: 8, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
                }}>
                    <ArrowLeft size={15} /> Back
                </button>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Add User</h1>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Please fill in the user details below.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
                    {/* Left - Form Fields */}
                    <div style={{
                        background: '#13151e', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16, padding: 28
                    }}>
                        {/* First Name */}
                        <FormField label="First Name">
                            <input
                                name="first_name" value={form.first_name} onChange={handleChange}
                                placeholder="Enter First Name"
                                style={{ ...inputStyle, borderColor: errors.first_name ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = errors.first_name ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                            />
                            {errors.first_name && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.first_name}</p>}
                        </FormField>

                        {/* Last Name */}
                        <FormField label="Last Name">
                            <input
                                name="last_name" value={form.last_name} onChange={handleChange}
                                placeholder="Enter Last Name"
                                style={{ ...inputStyle, borderColor: errors.last_name ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = errors.last_name ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                            />
                            {errors.last_name && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.last_name}</p>}
                        </FormField>

                        {/* Email */}
                        <FormField label="Email Address">
                            <input
                                name="email" type="email" value={form.email} onChange={handleChange}
                                placeholder="Enter Email Address"
                                style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = errors.email ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                            />
                            {errors.email && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.email}</p>}
                        </FormField>

                        {/* Phone */}
                        <FormField label="Phone Number">
                            <input
                                name="phone" value={form.phone} onChange={handleChange}
                                placeholder="Enter Phone Number"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </FormField>

                        {/* Date of Birth */}
                        <FormField label="Date of Birth">
                            <input
                                name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange}
                                placeholder="dd/mm/yyyy"
                                style={{ ...inputStyle, colorScheme: 'dark' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </FormField>

                        {/* Password */}
                        <FormField label="Password">
                            <input
                                name="password" type="password" value={form.password} onChange={handleChange}
                                placeholder="Enter Password"
                                style={{ ...inputStyle, borderColor: errors.password ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = errors.password ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                            />
                            {errors.password && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.password}</p>}
                        </FormField>

                        {/* Confirm Password */}
                        <FormField label="Confirm Password">
                            <input
                                name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange}
                                placeholder="Confirm Password"
                                style={{ ...inputStyle, borderColor: errors.confirm_password ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = errors.confirm_password ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                            />
                            {errors.confirm_password && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.confirm_password}</p>}
                        </FormField>

                        {/* Select Role */}
                        <FormField label="Select Role">
                            <select
                                name="role" value={form.role} onChange={handleChange}
                                style={{ ...inputStyle, cursor: 'pointer', borderColor: errors.role ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                onBlur={e => e.target.style.borderColor = errors.role ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                            >
                                <option value="" disabled>Select Role</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="data_entry">Data Entry</option>
                            </select>
                            {errors.role && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.role}</p>}
                        </FormField>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: '100%',
                                background: submitting ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none',
                                borderRadius: 10,
                                padding: '13px',
                                color: '#111',
                                fontWeight: 700,
                                fontSize: 15,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                                transition: 'opacity 0.2s',
                                marginTop: 4
                            }}
                        >
                            {submitting ? 'Creating User...' : 'Create User'}
                        </button>
                    </div>

                    {/* Right - Attachment */}
                    <div style={{
                        background: '#13151e', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16, padding: 24
                    }}>
                        <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachment</p>

                        {/* Drop Zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            style={{
                                border: `2px dashed ${dragOver ? '#f59e0b' : 'rgba(255,255,255,0.12)'}`,
                                borderRadius: 12,
                                padding: '28px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: dragOver ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.01)',
                                transition: 'all 0.2s',
                                marginBottom: 16
                            }}
                        >
                            {profilePreview ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={profilePreview} alt="Preview"
                                        style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(245,158,11,0.4)', margin: '0 auto', display: 'block' }} />
                                    <button onClick={e => { e.stopPropagation(); setProfileFile(null); setProfilePreview(null); }}
                                        style={{ position: 'absolute', top: 0, right: '50%', transform: 'translateX(50px)', background: '#ef4444', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={12} color="#fff" />
                                    </button>
                                    <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 10 }}>Click to change photo</p>
                                </div>
                            ) : profileFile ? (
                                <div>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                                    <p style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>{profileFile.name}</p>
                                    <p style={{ color: '#6b7280', fontSize: 11 }}>Click to change</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <UploadCloud size={22} color="#f59e0b" />
                                    </div>
                                    <button
                                        type="button"
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            border: 'none', borderRadius: 8, padding: '8px 20px',
                                            color: '#111', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                            marginBottom: 10
                                        }}>
                                        Browse File
                                    </button>
                                    <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>
                                        Click or drag files to upload<br />
                                        <span style={{ color: '#4b5563' }}>Supported: JPG, PNG, WebP, PDF</span>
                                    </p>
                                </>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                            onChange={e => handleFileChange(e.target.files[0])} />

                        {/* Profile Preview Card */}
                        {(form.first_name || form.last_name) && (
                            <div style={{
                                marginTop: 16, padding: '14px', background: 'rgba(245,158,11,0.05)',
                                border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, textAlign: 'center'
                            }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: 'rgba(245,158,11,0.2)', border: '2px solid rgba(245,158,11,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 8px', color: '#f59e0b', fontWeight: 800, fontSize: 18
                                }}>
                                    {profilePreview
                                        ? <img src={profilePreview} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                        : ((form.first_name[0] || '') + (form.last_name[0] || '')).toUpperCase()
                                    }
                                </div>
                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>
                                    {form.first_name} {form.last_name}
                                </p>
                                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{form.email || 'No email'}</p>
                                {form.role && (
                                    <span style={{
                                        display: 'inline-block', marginTop: 6,
                                        background: form.role === 'super_admin' ? 'rgba(245,158,11,0.15)' : form.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                                        color: form.role === 'super_admin' ? '#f59e0b' : form.role === 'admin' ? '#818cf8' : '#10b981',
                                        border: `1px solid ${form.role === 'super_admin' ? 'rgba(245,158,11,0.3)' : form.role === 'admin' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600
                                    }}>
                                        {form.role === 'super_admin' ? 'Super Admin' : form.role === 'admin' ? 'Admin' : 'Data Entry'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddUser;
