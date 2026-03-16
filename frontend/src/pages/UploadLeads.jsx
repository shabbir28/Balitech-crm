import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const UploadLeads = () => {
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [campaignType, setCampaignType] = useState('');
    const [step, setStep] = useState(1);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const CAMPAIGN_TYPES = ['ACA', 'MEDICARE', 'MED ALERT', 'FINAL EXPENSE'];

    useEffect(() => {
        api.get('/vendors').then(res => setVendors(res.data)).catch(console.error);
    }, []);

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
            const res = await api.post('/sessions', {
                vendor_id: selectedVendor,
                campaign_type: campaignType === 'FINAL EXPENSE' ? 'Final Expense' : campaignType
            });
            navigate(`/sessions/${res.data.id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Server error creating session');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#60636f] text-gray-200 font-sans">
            
            {/* Top Light Section */}
            <div className="bg-[#f0f1f3] pt-12 pb-8 flex justify-center">
                {/* Stepper */}
                <div className="w-full max-w-3xl relative mt-4">
                    <div className="flex justify-between items-center relative z-10 px-12">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gray-300 -z-10"></div>
                        
                        {['Select Vendor', 'Select Campaign', 'Add Jobs'].map((label, index) => {
                            const stepNum = index + 1;
                            const isActive = step === stepNum;
                            const isPast = step > stepNum;
                            
                            return (
                                <div key={label} className="flex flex-col items-center bg-[#f0f1f3] px-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg relative z-10 border-4 border-white shadow-sm ${
                                        isActive || isPast ? 'bg-[#f57c00] text-white' : 
                                        'bg-white text-gray-400 border-gray-200'
                                    }`}>
                                        {isPast ? <Check className="w-5 h-5 font-bold" /> : stepNum}
                                    </div>
                                    <span className={`text-sm mt-3 font-semibold ${isActive || isPast ? 'text-[#f57c00]' : 'text-gray-500'}`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col items-center pt-24 pb-24 px-6 bg-[#60636f]">
                <div className="w-full max-w-2xl">
                    
                    {step === 1 && (
                        <div className="animate-fade-in flex flex-col items-center">
                            <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Select Vendor Source</h2>
                            <p className="text-gray-300 mb-10 text-sm">Choose the vendor this data was acquired from to begin the upload session.</p>
                            
                            <div className="w-full relative group mb-8">
                                <select 
                                    className="w-full bg-[#4E515C] border border-[#5E616E] text-white rounded-xl py-6 px-6 appearance-none focus:outline-none focus:border-orange-500 transition-colors text-lg font-bold shadow-md cursor-pointer hover:bg-[#555864]"
                                    value={selectedVendor}
                                    onChange={(e) => {
                                        setSelectedVendor(e.target.value);
                                        setError('');
                                    }}
                                >
                                    <option value="" disabled className="text-gray-400">SELECT VENDOR...</option>
                                    {vendors.map(v => (
                                        <option key={v.vendor_id} value={v.vendor_id} className="text-white">
                                            {v.name} ({v.company})
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-gray-400">
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>

                            {error && (
                                <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-center text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="w-full flex justify-end mt-4">
                                <button 
                                    onClick={handleNextStep}
                                    className="bg-[#f57c00] hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg flex items-center"
                                >
                                    Next Step <ArrowRight className="ml-2 w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in flex flex-col items-center">
                            <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Select Campaign Type</h2>
                            <p className="text-gray-300 mb-12 text-sm">Categorize this upload session to ensure proper data routing.</p>
                            
                            {/* Exact identical grid layout from the picture */}
                            <div className="grid grid-cols-2 gap-4 w-full mb-16">
                                {CAMPAIGN_TYPES.map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            setCampaignType(type);
                                            setError('');
                                        }}
                                        className={`py-8 px-4 rounded-xl text-center font-bold text-lg tracking-wide transition-all shadow-md ${
                                            campaignType === type 
                                                ? 'bg-[#f57c00] text-white ring-2 ring-orange-400 ring-offset-2 ring-offset-[#60636f]' 
                                                : 'bg-[#4E515C] text-gray-200 hover:bg-[#555864]'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 text-center text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="w-full flex justify-between items-center mt-4">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="bg-[#3A3C45] hover:bg-[#434550] text-gray-200 px-8 py-3 rounded-lg font-bold transition-colors shadow-lg flex items-center"
                                >
                                    <ArrowLeft className="mr-2 w-5 h-5" /> Back
                                </button>
                                <button 
                                    onClick={handleCreateSession}
                                    disabled={creating}
                                    className={`${creating ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#f57c00] hover:bg-orange-600'} text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg flex items-center`}
                                >
                                    {creating ? 'Creating...' : 'Create Session'} <ArrowRight className="ml-2 w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default UploadLeads;
