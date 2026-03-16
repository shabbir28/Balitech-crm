import React, { useState, useEffect } from 'react';
import api from '../services/api';

const LeadsTable = () => {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const fetchLeads = async (pageToFetch) => {
        setLoading(true);
        try {
            const res = await api.get(`/leads?page=${pageToFetch}&limit=20`);
            setLeads(res.data.data);
            setTotal(res.data.total);
            setPage(res.data.page);
        } catch (err) {
            console.error('Failed to fetch leads', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads(1);
    }, []);

    const totalPages = Math.ceil(total / 20);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">All Leads ({total.toLocaleString()})</h1>

            <div className="card overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 tracking-wider text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 tracking-wider text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                            <th className="px-6 py-3 tracking-wider text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 tracking-wider text-left text-xs font-semibold text-gray-500 uppercase">Country</th>
                            <th className="px-6 py-3 tracking-wider text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading leads...</td></tr>
                        ) : (
                            leads.map(lead => (
                                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{lead.name || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono">{lead.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.email || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{lead.country_code} ({lead.area_code})</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center ${
                                            lead.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                        {!loading && leads.length === 0 && (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No leads found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm border">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button onClick={() => fetchLeads(page - 1)} disabled={page === 1} className="btn-secondary text-sm">Previous</button>
                        <button onClick={() => fetchLeads(page + 1)} disabled={page === totalPages} className="btn-secondary text-sm ml-3">Next</button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => fetchLeads(page - 1)}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchLeads(page + 1)}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadsTable;
