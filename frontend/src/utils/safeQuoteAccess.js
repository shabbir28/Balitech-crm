export const SAFE_QUOTE_MODULE = 'safe_quote';
export const SAFE_QUOTE_PAGES_SET = 'sq_pages_set';

export const SAFE_QUOTE_PAGES = [
    { id: 'sq_dashboard', label: 'Dashboard', path: '/safe-quote-dashboard' },
    { id: 'sq_vendors', label: 'Vendor', path: '/safe-quote-vendors' },
    { id: 'sq_campaigns', label: 'Campaigns', path: '/safe-quote-campaigns' },
    { id: 'sq_upload', label: 'Upload', path: '/safe-quote-upload' },
    { id: 'sq_sessions', label: 'Session', path: '/safe-quote-sessions' },
    { id: 'sq_data', label: 'All Data', path: '/safe-quote-data' },
    { id: 'sq_download', label: 'Download', path: '/safe-quote-download' },
    { id: 'sq_downloaded', label: 'Downloaded', path: '/safe-quote-already-downloaded' },
    { id: 'sq_dnc', label: 'DNC / SALE / Separation', path: '/safe-quote-dnc' },
];

export const SAFE_QUOTE_PAGE_IDS = SAFE_QUOTE_PAGES.map((page) => page.id);

export function parseModuleList(raw) {
    if (!raw) return [];
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            return [];
        }
    }
    return Array.isArray(raw) ? raw : [];
}

export function safeQuotePageAllowed(rawModules, pageId, isSuperAdmin = false) {
    if (isSuperAdmin) return true;
    const modules = parseModuleList(rawModules);
    if (!modules.includes(SAFE_QUOTE_MODULE)) return false;
    if (!modules.includes(SAFE_QUOTE_PAGES_SET)) return true;
    return modules.includes(pageId);
}

export function firstSafeQuotePath(rawModules) {
    const page = SAFE_QUOTE_PAGES.find((item) => safeQuotePageAllowed(rawModules, item.id, false));
    return page ? page.path : null;
}

export function expandSafeQuotePages(rawModules) {
    const modules = parseModuleList(rawModules);
    if (!modules.includes(SAFE_QUOTE_MODULE) || modules.includes(SAFE_QUOTE_PAGES_SET)) {
        return modules;
    }
    return [...modules, SAFE_QUOTE_PAGES_SET, ...SAFE_QUOTE_PAGE_IDS];
}
