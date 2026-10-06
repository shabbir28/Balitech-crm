import React from 'react';
import { Plus, Trash2, Edit, Eye, X, AlertTriangle, CheckCircle, Search, Paperclip, Building2, Target } from 'lucide-react';

const fieldClass = 'w-full bg-[#0c0e16] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-white/25 focus:ring-2 focus:ring-white/5 transition-all';

const formatStart = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB');
};

const shortDate = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function StatusPill({ status }) {
    const value = status || 'Active';
    const active = value === 'Active';
    const suspended = value === 'Suspended';
    const tone = active
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
        : suspended
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/25';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : suspended ? 'bg-amber-400' : 'bg-rose-400'}`} />
            {value}
        </span>
    );
}

function Blank() {
    return <span className="text-slate-600 text-xs">—</span>;
}

function Initial({ name, accent }) {
    const letter = (name || '?').trim().charAt(0).toUpperCase();
    return (
        <span
            className="w-8 h-8 rounded-xl text-[13px] font-bold flex items-center justify-center shrink-0"
            style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
        >
            {letter}
        </span>
    );
}

function IconBtn({ title, onClick, children, tone = 'slate' }) {
    const tones = {
        slate: 'bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white border-white/10',
        danger: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/20',
        view: 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border-sky-500/20',
    };
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`w-8 h-8 inline-flex items-center justify-center rounded-xl border transition-colors ${tones[tone] || tones.slate}`}
        >
            {children}
        </button>
    );
}

function Toast({ notification }) {
    if (!notification?.show) return null;
    const ok = notification.type === 'success';
    return (
        <div className={`fixed top-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold ${ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
            {ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {notification.message}
        </div>
    );
}

function DeleteDialog({ open, title, body, busy, onCancel, onConfirm }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1c27] shadow-2xl overflow-hidden">
                <div className="p-5">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{body}</p>
                </div>
                <div className="px-5 py-3 border-t border-white/5 flex justify-end gap-2 bg-black/20">
                    <button type="button" disabled={busy} onClick={onCancel} className="h-9 px-4 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-50">Cancel</button>
                    <button type="button" disabled={busy} onClick={onConfirm} className="h-9 px-4 rounded-xl text-sm font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50 inline-flex items-center gap-2">
                        {busy ? <span className="w-3.5 h-3.5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function PageBar({ icon: Icon, title, subtitle, accent, search, onSearch, searchPlaceholder, onAdd, addLabel, addButtonId }) {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}18`, border: `1px solid ${accent}33`, color: accent }}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {onSearch && (
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full h-10 pl-9 pr-8 bg-[#12141c] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-white/25 placeholder:text-slate-600"
                        />
                        {search && (
                            <button type="button" onClick={() => onSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label="Clear search">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
                {onAdd && (
                    <button
                        id={addButtonId}
                        type="button"
                        onClick={onAdd}
                        className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shrink-0 shadow-lg"
                        style={{ background: accent }}
                    >
                        <Plus className="h-4 w-4" /> {addLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, accent }) {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-[#1a1c27] px-4 py-3">
            <div className="text-xl font-bold text-white tabular-nums leading-none">{value}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                {label}
            </div>
        </div>
    );
}

function TableCard({ children }) {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-[#1a1c27] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}

const head = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500';
const cell = 'px-4 py-3 text-sm text-slate-300 align-middle';

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">{label}</span>
            {children}
        </label>
    );
}

function EmptyRow({ cols, title, hint }) {
    return (
        <tr>
            <td colSpan={cols} className="px-4 py-14 text-center">
                <p className="text-sm font-medium text-slate-300">{title}</p>
                <p className="text-xs text-slate-500 mt-1">{hint}</p>
            </td>
        </tr>
    );
}

function ModalFrame({ accent, title, subtitle, onClose, children, wide }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${wide ? 'max-w-lg' : 'max-w-[440px]'} rounded-2xl border border-white/10 bg-[#161822] shadow-[0_24px_70px_rgba(0,0,0,0.45)] overflow-hidden`}>
                <div className="h-1" style={{ background: accent }} />
                <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                        {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function VendorDirectory({
    title,
    accent = '#f59e0b',
    loading,
    vendors,
    filteredVendors,
    activeSearch,
    localSearch,
    onSearchChange,
    notification,
    deleteModal,
    onCancelDelete,
    onConfirmDelete,
    onAskDelete,
    showFormModal,
    onOpenAdd,
    onCloseForm,
    editingId,
    formData,
    setFormData,
    onSubmit,
    onEdit,
    showViewModal,
    selectedVendor,
    onOpenView,
    onCloseView,
}) {
    if (loading) return <div className="text-slate-400 text-sm py-16 text-center">Loading vendors…</div>;
    const rows = filteredVendors || [];
    const all = vendors || [];
    const active = all.filter((v) => (v.status || 'Active') === 'Active').length;

    return (
        <div className="space-y-5">
            <Toast notification={notification} />
            <DeleteDialog
                open={deleteModal?.isOpen}
                title="Delete this vendor?"
                body="This vendor will leave the list. Existing uploads stay linked to their records."
                busy={deleteModal?.isDeleting}
                onCancel={onCancelDelete}
                onConfirm={onConfirmDelete}
            />
            <PageBar
                icon={Building2}
                title={title}
                subtitle="Add vendors, keep contact details, and set who is active."
                accent={accent}
                search={localSearch}
                onSearch={onSearchChange}
                searchPlaceholder="Search name, email, phone"
                onAdd={onOpenAdd}
                addLabel="Add vendor"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Vendors" value={all.length} accent={accent} />
                <Stat label="Active" value={active} accent="#34d399" />
                <Stat label="Showing" value={rows.length} accent="#94a3b8" />
            </div>
            {activeSearch && (
                <p className="text-sm text-slate-400">
                    {rows.length} result{rows.length === 1 ? '' : 's'} for <span className="text-white font-medium">“{activeSearch}”</span>
                </p>
            )}
            <TableCard>
                <table className="min-w-[860px] w-full">
                    <thead className="bg-[#12141c]">
                        <tr>
                            <th className={head}>Vendor</th>
                            <th className={head}>Email</th>
                            <th className={head}>Phone</th>
                            <th className={head}>Note</th>
                            <th className={head}>Status</th>
                            <th className={`${head} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((vendor) => (
                            <tr key={vendor.vendor_id} className="border-t border-white/[0.05] hover:bg-white/[0.025] transition-colors">
                                <td className={cell}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Initial name={vendor.name} accent={accent} />
                                        <span className="text-white font-semibold truncate">{vendor.name}</span>
                                    </div>
                                </td>
                                <td className={`${cell} max-w-[220px] truncate`}>{vendor.email || <Blank />}</td>
                                <td className={cell}>{vendor.phone || <Blank />}</td>
                                <td className={`${cell} max-w-[220px] truncate text-slate-400`} title={vendor.comment || ''}>{vendor.comment || <Blank />}</td>
                                <td className={cell}><StatusPill status={vendor.status} /></td>
                                <td className={`${cell} text-right`}>
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                        <IconBtn title="View" tone="view" onClick={() => onOpenView(vendor)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                                        <IconBtn title="Edit" onClick={() => onEdit(vendor)}><Edit className="h-3.5 w-3.5" /></IconBtn>
                                        <IconBtn title="Delete" tone="danger" onClick={() => onAskDelete(vendor.vendor_id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <EmptyRow
                                cols={6}
                                title={activeSearch ? 'No matching vendors' : 'No vendors yet'}
                                hint={activeSearch ? 'Try another name, email, or phone.' : 'Use Add vendor to create the first one.'}
                            />
                        )}
                    </tbody>
                </table>
            </TableCard>

            {showFormModal && (
                <ModalFrame accent={accent} title={editingId ? 'Edit vendor' : 'New vendor'} subtitle={title} onClose={onCloseForm} wide>
                    <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
                        <Field label="Name">
                            <input required className={fieldClass} type="text" placeholder="Vendor name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Email">
                                <input className={fieldClass} type="email" placeholder="name@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </Field>
                            <Field label="Phone">
                                <input className={fieldClass} type="text" placeholder="Phone number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </Field>
                        </div>
                        <Field label="Status">
                            <select className={fieldClass} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </Field>
                        <Field label="Note">
                            <textarea rows="3" className={fieldClass} placeholder="Optional note" value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} />
                        </Field>
                        <button type="submit" className="w-full h-10 rounded-xl text-sm font-bold text-white" style={{ background: accent }}>
                            {editingId ? 'Save changes' : 'Save vendor'}
                        </button>
                    </form>
                </ModalFrame>
            )}

            {showViewModal && selectedVendor && (
                <ModalFrame accent={accent} title={selectedVendor.name} subtitle="Vendor details" onClose={onCloseView}>
                    <div className="px-6 pb-6 space-y-3">
                        <StatusPill status={selectedVendor.status} />
                        <div className="rounded-xl border border-white/[0.06] bg-[#0c0e16] divide-y divide-white/[0.05]">
                            {[
                                ['Email', selectedVendor.email],
                                ['Phone', selectedVendor.phone],
                                ['Created', shortDate(selectedVendor.created_at)],
                                ['Note', selectedVendor.comment],
                            ].map(([label, value]) => (
                                <div key={label} className="px-3.5 py-2.5 flex items-start justify-between gap-4">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                                    <span className="text-sm text-slate-200 text-right">{value || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </ModalFrame>
            )}
        </div>
    );
}

export function CampaignDirectory({
    title,
    accent = '#f59e0b',
    loading,
    campaigns,
    onAdd,
    addButtonId,
    variant = 'dated',
    onView,
    onEdit,
    onDelete,
    canManage = true,
    deleteModal,
    onCancelDelete,
    onConfirmDelete,
    notification,
    showViewModal,
    selectedCampaign,
    onCloseView,
    emptyLabel = 'No campaigns yet.',
}) {
    if (loading) return <div className="text-slate-400 text-sm py-16 text-center">Loading campaigns…</div>;
    const rows = campaigns || [];
    const described = variant === 'described';
    const active = rows.filter((c) => (c.status || 'Active') === 'Active').length;

    return (
        <div className="space-y-5">
            <Toast notification={notification} />
            <DeleteDialog
                open={deleteModal?.isOpen}
                title="Delete this campaign?"
                body="The campaign is removed from this list. This cannot be undone."
                busy={deleteModal?.isDeleting}
                onCancel={onCancelDelete}
                onConfirm={onConfirmDelete}
            />
            <PageBar
                icon={Target}
                title={title}
                subtitle="Campaigns used when data is uploaded and downloaded."
                accent={accent}
                onAdd={canManage ? onAdd : null}
                addLabel="Add campaign"
                addButtonId={addButtonId}
            />
            <div className="grid grid-cols-2 gap-3 max-w-md">
                <Stat label="Campaigns" value={rows.length} accent={accent} />
                <Stat label="Active" value={active} accent="#34d399" />
            </div>
            <TableCard>
                <table className="min-w-[760px] w-full">
                    <thead className="bg-[#12141c]">
                        <tr>
                            <th className={head}>Campaign</th>
                            {described ? <th className={head}>Description</th> : (
                                <>
                                    <th className={head}>Start</th>
                                    <th className={head}>File</th>
                                    <th className={head}>Note</th>
                                </>
                            )}
                            <th className={head}>Status</th>
                            {described && <th className={head}>Created</th>}
                            <th className={`${head} text-right`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((campaign) => (
                            <tr key={campaign.campaign_id} className="border-t border-white/[0.05] hover:bg-white/[0.025] transition-colors">
                                <td className={cell}>
                                    <div className="flex items-center gap-3">
                                        <Initial name={campaign.name} accent={accent} />
                                        <span className="text-white font-semibold">{campaign.name}</span>
                                    </div>
                                </td>
                                {described ? (
                                    <td className={`${cell} max-w-[320px] truncate text-slate-400`} title={campaign.description || ''}>{campaign.description || <Blank />}</td>
                                ) : (
                                    <>
                                        <td className={cell}>{formatStart(campaign.start_date) || <Blank />}</td>
                                        <td className={cell}>
                                            {campaign.attachment_url ? (
                                                <a href={`http://localhost:5000${campaign.attachment_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: accent }} title={campaign.attachment_name}>
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    <span className="truncate max-w-[140px]">{campaign.attachment_name || 'File'}</span>
                                                </a>
                                            ) : <Blank />}
                                        </td>
                                        <td className={`${cell} max-w-[220px] truncate text-slate-400`} title={campaign.comments || ''}>{campaign.comments || <Blank />}</td>
                                    </>
                                )}
                                <td className={cell}><StatusPill status={campaign.status} /></td>
                                {described && <td className={cell}>{shortDate(campaign.created_at) || <Blank />}</td>}
                                <td className={`${cell} text-right`}>
                                    {canManage ? (
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                            {onView && <IconBtn title="View" tone="view" onClick={() => onView(campaign)}><Eye className="h-3.5 w-3.5" /></IconBtn>}
                                            <IconBtn title="Edit" onClick={() => onEdit(campaign.campaign_id)}><Edit className="h-3.5 w-3.5" /></IconBtn>
                                            <IconBtn title="Delete" tone="danger" onClick={() => onDelete(campaign.campaign_id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                                        </div>
                                    ) : <Blank />}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <EmptyRow cols={described ? 5 : 6} title={emptyLabel} hint="Add a campaign when you are ready." />
                        )}
                    </tbody>
                </table>
            </TableCard>

            {showViewModal && selectedCampaign && (
                <ModalFrame accent={accent} title={selectedCampaign.name} subtitle="Campaign details" onClose={onCloseView}>
                    <div className="px-6 pb-6 space-y-3">
                        <StatusPill status={selectedCampaign.status} />
                        <div className="rounded-xl border border-white/[0.06] bg-[#0c0e16] divide-y divide-white/[0.05]">
                            <div className="px-3.5 py-2.5 flex items-start justify-between gap-4">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Start</span>
                                <span className="text-sm text-slate-200">{formatStart(selectedCampaign.start_date) || '—'}</span>
                            </div>
                            <div className="px-3.5 py-2.5 flex items-start justify-between gap-4">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Created</span>
                                <span className="text-sm text-slate-200">{shortDate(selectedCampaign.created_at) || '—'}</span>
                            </div>
                            <div className="px-3.5 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">File</span>
                                <div className="mt-1.5">
                                    {selectedCampaign.attachment_url ? (
                                        <a href={`http://localhost:5000${selectedCampaign.attachment_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: accent }}>
                                            <Paperclip className="h-3.5 w-3.5" />
                                            {selectedCampaign.attachment_name || 'Open file'}
                                        </a>
                                    ) : <span className="text-sm text-slate-500">No file</span>}
                                </div>
                            </div>
                            <div className="px-3.5 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Note</span>
                                <p className="text-sm text-slate-200 mt-1.5">{selectedCampaign.comments || 'No note.'}</p>
                            </div>
                        </div>
                    </div>
                </ModalFrame>
            )}
        </div>
    );
}
