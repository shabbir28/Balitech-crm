import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Download, AlertCircle, ChevronDown, Check } from 'lucide-react';

const US_STATES = [
    { name: 'Alabama', abbr: 'AL' }, { name: 'Alaska', abbr: 'AK' }, { name: 'Arizona', abbr: 'AZ' }, { name: 'Arkansas', abbr: 'AR' },
    { name: 'California', abbr: 'CA' }, { name: 'Colorado', abbr: 'CO' }, { name: 'Connecticut', abbr: 'CT' }, { name: 'Delaware', abbr: 'DE' },
    { name: 'Florida', abbr: 'FL' }, { name: 'Georgia', abbr: 'GA' }, { name: 'Hawaii', abbr: 'HI' }, { name: 'Idaho', abbr: 'ID' },
    { name: 'Illinois', abbr: 'IL' }, { name: 'Indiana', abbr: 'IN' }, { name: 'Iowa', abbr: 'IA' }, { name: 'Kansas', abbr: 'KS' },
    { name: 'Kentucky', abbr: 'KY' }, { name: 'Louisiana', abbr: 'LA' }, { name: 'Maine', abbr: 'ME' }, { name: 'Maryland', abbr: 'MD' },
    { name: 'Massachusetts', abbr: 'MA' }, { name: 'Michigan', abbr: 'MI' }, { name: 'Minnesota', abbr: 'MN' }, { name: 'Mississippi', abbr: 'MS' },
    { name: 'Missouri', abbr: 'MO' }, { name: 'Montana', abbr: 'MT' }, { name: 'Nebraska', abbr: 'NE' }, { name: 'Nevada', abbr: 'NV' },
    { name: 'New Hampshire', abbr: 'NH' }, { name: 'New Jersey', abbr: 'NJ' }, { name: 'New Mexico', abbr: 'NM' }, { name: 'New York', abbr: 'NY' },
    { name: 'North Carolina', abbr: 'NC' }, { name: 'North Dakota', abbr: 'ND' }, { name: 'Ohio', abbr: 'OH' }, { name: 'Oklahoma', abbr: 'OK' },
    { name: 'Oregon', abbr: 'OR' }, { name: 'Pennsylvania', abbr: 'PA' }, { name: 'Rhode Island', abbr: 'RI' }, { name: 'South Carolina', abbr: 'SC' },
    { name: 'South Dakota', abbr: 'SD' }, { name: 'Tennessee', abbr: 'TN' }, { name: 'Texas', abbr: 'TX' }, { name: 'Utah', abbr: 'UT' },
    { name: 'Vermont', abbr: 'VT' }, { name: 'Virginia', abbr: 'VA' }, { name: 'Washington', abbr: 'WA' }, { name: 'West Virginia', abbr: 'WV' },
    { name: 'Wisconsin', abbr: 'WI' }, { name: 'Wyoming', abbr: 'WY' }, { name: 'District of Columbia', abbr: 'DC' }
];

const DownloadLeads = () => {
    const [vendors, setVendors] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(true);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);

    const [formData, setFormData] = useState({
        states: [],
        campaign_id: '',
        vendor_id: '',
        quantity: 1000
    });
    
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    
    const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
    const stateDropdownRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vendorsRes, campaignsRes] = await Promise.all([
                    api.get('/vendors'),
                    api.get('/campaigns')
                ]);
                setVendors(vendorsRes.data);
                setCampaigns(campaignsRes.data.filter(c => c.status === 'Active'));
            } catch (err) {
                console.error('Failed to load data', err);
            } finally {
                setLoadingVendors(false);
                setLoadingCampaigns(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
                setIsStateDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleState = (abbr) => {
        setFormData(prev => {
            const newStates = prev.states.includes(abbr)
                ? prev.states.filter(s => s !== abbr)
                : [...prev.states, abbr];
            return { ...prev, states: newStates };
        });
    };

    const handleDownload = async (e) => {
        e.preventDefault();
        
        if (!formData.vendor_id) {
            setError('Please select a specific vendor to download leads from.');
            return;
        }

        setDownloading(true);
        setError('');

        try {
            const res = await api.post('/download', formData, {
                responseType: 'blob'
            });
            
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `leads_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
        } catch (err) {
            // Because responseType is blob, error message is a blob too. Need to read it.
            if (err.response && err.response.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    setError(json.message);
                } catch {
                    setError('Download failed. No leads matched criteria or server error.');
                }
            } else {
                setError('Download request failed');
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto pt-8 pb-12 px-4 animation-fade-in font-sans">
            
            <div className="flex items-center space-x-3 mb-8">
                <div className="bg-orange-500/20 p-3 rounded-xl">
                    <Download className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Download Data</h1>
                    <p className="text-gray-400 text-sm mt-1">Securely export targeted leads from your selected vendors and campaigns.</p>
                </div>
            </div>

            <div className="bg-[#13151e] border border-white/5 shadow-2xl rounded-2xl p-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <form onSubmit={handleDownload} className="space-y-8 relative z-10">
                    
                    {/* Vendor Select */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Select Vendor Data Source <span className="text-orange-500">*</span></label>
                        <div className="relative">
                            <select 
                                required
                                className="w-full bg-[#0f1117] border border-white/10 text-white rounded-xl py-4 px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-inner cursor-pointer"
                                value={formData.vendor_id}
                                onChange={e => setFormData({...formData, vendor_id: e.target.value})}
                                disabled={loadingVendors}
                            >
                                <option value="" disabled className="text-gray-500">
                                    {loadingVendors ? 'Loading vendors...' : 'Choose a precise Vendor...'}
                                </option>
                                {vendors.map(v => (
                                    <option key={v.vendor_id} value={v.vendor_id} className="text-gray-200">
                                        {v.name} {v.available_leads !== undefined ? `(${v.available_leads} available)` : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <ChevronDown className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Required: Pick exactly whose data you want to securely download.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* State Multi-Select Dropdown */}
                        <div className="relative" ref={stateDropdownRef}>
                            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">State Filter</label>
                            <div 
                                className="w-full bg-[#0f1117] border border-white/10 text-white rounded-xl py-4 px-4 flex justify-between items-center cursor-pointer hover:border-white/20 transition-colors shadow-inner"
                                onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                            >
                                <span className={formData.states.length === 0 ? 'text-gray-500' : 'text-white font-medium truncate'}>
                                    {formData.states.length === 0 
                                        ? 'Any State...' 
                                        : `${formData.states.length} State${formData.states.length > 1 ? 's' : ''} Selected`}
                                </span>
                                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isStateDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {isStateDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-[#1a1d27] border border-white/10 rounded-xl shadow-2xl max-h-72 overflow-auto" style={{ backdropFilter: 'blur(10px)' }}>
                                    <div className="p-2 space-y-1">
                                        {US_STATES.map(state => (
                                            <div 
                                                key={state.abbr}
                                                className={`flex items-center px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${formData.states.includes(state.abbr) ? 'bg-orange-500/10 text-orange-400' : 'hover:bg-white/5 text-gray-300'}`}
                                                onClick={() => toggleState(state.abbr)}
                                            >
                                                <div className={`w-5 h-5 mr-3 border rounded flex items-center justify-center transition-colors ${formData.states.includes(state.abbr) ? 'bg-orange-500 border-orange-500' : 'border-gray-500 bg-[#0f1117]'}`}>
                                                    {formData.states.includes(state.abbr) && <Check className="h-3.5 w-3.5 text-white" />}
                                                </div>
                                                <span className="text-sm font-medium">{state.name} <span className="text-xs opacity-60 ml-1">({state.abbr})</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Campaign Select */}
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Campaign Filter</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-[#0f1117] border border-white/10 text-white rounded-xl py-4 px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-inner cursor-pointer"
                                    value={formData.campaign_id}
                                    onChange={e => setFormData({...formData, campaign_id: e.target.value})}
                                    disabled={loadingCampaigns}
                                >
                                    <option value="" className="text-gray-500">
                                        {loadingCampaigns ? 'Loading campaigns...' : 'All Campaigns'}
                                    </option>
                                    {campaigns.map(c => (
                                        <option key={c.campaign_id} value={c.campaign_id} className="text-gray-200">
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <ChevronDown className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Quantity to Download <span className="text-orange-500">*</span></label>
                        <input 
                            type="number" 
                            min="1"
                            max="50000"
                            required
                            className="w-full bg-[#0f1117] border border-white/10 text-white rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-inner font-mono text-lg"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                        />
                        <p className="mt-2 text-xs text-gray-500">Maximum limit per request is strongly recommended to be &lt; 50,000 for server stability.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl flex items-center border border-red-500/20 shadow-inner">
                            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" /> <span className="font-medium text-sm">{error}</span>
                        </div>
                    )}

                    <div className="pt-6">
                        <button 
                            type="submit" 
                            disabled={downloading || loadingVendors || !formData.vendor_id}
                            className={`w-full flex justify-center items-center py-4 rounded-xl text-lg font-bold transition-all ${downloading || !formData.vendor_id ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5'}`}
                        >
                            {downloading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Export...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-3 h-6 w-6" /> Export Data to CSV
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 mt-6 shadow-inner flex items-start">
                <AlertCircle className="w-6 h-6 text-orange-500 mr-4 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-orange-400 mb-1 text-sm uppercase tracking-wide">Data Accountability</h4>
                    <p className="text-sm text-orange-200/80 leading-relaxed">Downloading leads immediately deducts them from your pool and permanently marks them as <code className="bg-black/30 px-1.5 py-0.5 rounded text-orange-300 text-xs">downloaded</code>. Please ensure your vendor source, state filters, and quantity are correct before confirming.</p>
                </div>
            </div>
        </div>
    );
};

export default DownloadLeads;
