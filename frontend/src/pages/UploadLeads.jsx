import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, ArrowRight, Check, Database, Building2, Layers } from 'lucide-react';

const UploadLeads = () => {
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [campaignType, setCampaignType] = useState('');
    const [step, setStep] = useState(1);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        api.get('/vendors').then(res => setVendors(res.data)).catch(console.error);
        api.get('/campaigns').then(res => {
            // Only show active campaigns for uploading leads
            setCampaigns(res.data.filter(c => c.status === 'Active'));
        }).catch(console.error);
    }, []);

    const isCompareMode =
        location.pathname === '/compare' ||
        new URLSearchParams(location.search).get('compare') === 'true';

    const handleNextStep = () => {
        if (!selectedVendor) {
            setError('Please select a vendor source first.');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleCreateSession = async () => {
        if (!selectedVendor || !campaignType) {
            setError('Please select a campaign type.');
            return;
        }

        setCreating(true);
        setError('');

        try {
            const selectedCampaignObj = campaigns.find(c => c.campaign_id === campaignType);
            const campaignName = selectedCampaignObj ? selectedCampaignObj.name : campaignType;

            const res = await api.post('/sessions', {
                vendor_id: selectedVendor,
                campaign_type: campaignName
            });
            if (isCompareMode) {
                navigate(`/sessions/${res.data.id}/add-job?mode=compare`);
            } else {
                navigate(`/sessions/${res.data.id}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Server error creating session');
        } finally {
            setCreating(false);
        }
    };

    const stepIcons = [Building2, Layers, Database];

    return (
        <div className="w-full h-full flex flex-col font-sans">
            
            {/* Premium Stepper Header */}
            <div className="bg-[#1e1e2d] border border-white/5 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm">
                <div className="w-full max-w-4xl mx-auto relative px-4 sm:px-12">
                    {/* Connecting Line */}
                    <div className="absolute top-6 left-[15%] right-[15%] h-[2px] bg-white/5 -z-10 rounded-full"></div>
                    {/* Progress Line */}
                    <div className="absolute top-6 left-[15%] h-[2px] bg-brand-500 -z-10 rounded-full transition-all duration-500 ease-out" 
                         style={{ width: step === 1 ? '0%' : step === 2 ? '35%' : '70%' }}></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        {['Select Vendor', 'Select Campaign', 'Add Jobs'].map((label, index) => {
                            const stepNum = index + 1;
                            const isActive = step === stepNum;
                            const isPast = step > stepNum;
                            const StepIcon = stepIcons[index];
                            
                            return (
                                <div key={label} className="flex flex-col items-center w-32 text-center group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                                        isActive || isPast 
                                            ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-brand-400/50 scale-110' 
                                            : 'bg-[#0a0a0f] text-slate-500 border border-white/10'
                                    }`}>
                                        {isPast ? <Check className="w-6 h-6 stroke-[3]" /> : <StepIcon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />}
                                    </div>
                                    <span className={`text-[13px] mt-4 font-semibold tracking-wide transition-colors ${
                                        isActive || isPast ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-400'
                                    }`}>
                                        {label}
                                    </span>
                                    {isActive && (
                                        <div className="mt-2 text-[11px] text-slate-500 uppercase tracking-widest font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">Current</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col items-center w-full max-w-2xl mx-auto">
                {step === 1 && (
                    <div className="w-full bg-[#1e1e2d] border border-white/5 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-fade-in relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-[60px] pointer-events-none"></div>

                        <div className="text-center mb-10 relative z-10">
                            <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-brand-400">
                                <Building2 size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Select Vendor Source</h2>
                            <p className="text-[14px] text-slate-400 font-medium">Choose the vendor this data was acquired from to begin the upload session.</p>
                        </div>
                        
                        <div className="w-full relative group mb-8 z-10 max-w-lg mx-auto">
                            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide ml-1">Select A Vendor</label>
                            <div className="relative">
                                {/* Decorative Icon */}
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand-400">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <select 
                                    className="w-full bg-[#0a0a0f] border-2 border-white/10 hover:border-brand-500/50 text-white rounded-2xl py-4 pl-12 pr-10 appearance-none focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium shadow-inner cursor-pointer text-[15px]"
                                    value={selectedVendor}
                                    onChange={(e) => {
                                        setSelectedVendor(e.target.value);
                                        setError('');
                                    }}
                                >
                                    <option value="" disabled className="text-slate-500">Choose a Vendor...</option>
                                    {vendors.map(v => (
                                        <option key={v.vendor_id} value={v.vendor_id} className="text-white bg-[#1e1e2d] py-2">
                                            {v.name} ({v.company})
                                        </option>
                                    ))}
                                </select>
                                {/* Custom Chevron */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 group-hover:text-brand-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3 text-sm font-medium animate-fade-in relative z-10">
                                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                {error}
                            </div>
                        )}

                        <div className="w-full flex justify-end mt-4 relative z-10 max-w-lg mx-auto">
                            <button 
                                onClick={handleNextStep}
                                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] flex items-center gap-2 active:scale-[0.98] text-[14px]"
                            >
                                Continue to Campaign <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="w-full bg-[#1e1e2d] border border-white/5 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-fade-in relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-[60px] pointer-events-none"></div>

                        <div className="text-center mb-10 relative z-10">
                            <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-brand-400">
                                <Layers size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Select Campaign Type</h2>
                            <p className="text-[14px] text-slate-400 font-medium">Categorize this upload session to ensure proper data routing.</p>
                        </div>
                        
                        <div className="w-full relative group mb-8 z-10 max-w-lg mx-auto">
                            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide ml-1">Select A Campaign</label>
                            <div className="relative">
                                {/* Decorative Icon */}
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand-400">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <select 
                                    className="w-full bg-[#0a0a0f] border-2 border-white/10 hover:border-brand-500/50 text-white rounded-2xl py-4 pl-12 pr-10 appearance-none focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium shadow-inner cursor-pointer text-[15px]"
                                    value={campaignType}
                                    onChange={(e) => {
                                        setCampaignType(e.target.value);
                                        setError('');
                                    }}
                                >
                                    <option value="" disabled className="text-slate-500">Choose a Campaign...</option>
                                    {campaigns.map(c => (
                                        <option key={c.campaign_id} value={c.campaign_id} className="text-white bg-[#1e1e2d] py-2">
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {/* Custom Chevron */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 group-hover:text-brand-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            {campaigns.length === 0 && <p className="text-slate-500 text-xs mt-2 ml-1">No active campaigns available.</p>}
                        </div>

                        {error && (
                            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3 text-sm font-medium animate-fade-in relative z-10">
                                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                {error}
                            </div>
                        )}

                        <div className="w-full flex justify-between items-center mt-6 relative z-10 max-w-lg mx-auto gap-4">
                            <button 
                                onClick={() => setStep(1)}
                                className="bg-[#0a0a0f] hover:bg-white/5 border border-white/10 text-slate-300 px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 active:scale-[0.98] text-[14px]"
                            >
                                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back
                            </button>
                            <button 
                                onClick={handleCreateSession}
                                disabled={creating}
                                className={`flex-1 justify-center text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] flex items-center gap-2 active:scale-[0.98] text-[14px] ${
                                    creating 
                                        ? 'bg-brand-500/50 cursor-not-allowed border border-brand-500/20' 
                                        : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400'
                                }`}
                            >
                                {creating ? 'Creating Session...' : 'Create Session'} <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UploadLeads;
