const db = require('../config/db');

const getClientIP = (req) => {
    let ip =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket.remoteAddress ||
        req.ip;

    // Normalize IPv6 mapped IPv4 (::ffff:xxx.xxx.xxx.xxx → xxx.xxx.xxx.xxx)
    if (ip && ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }

    // Normalize localhost
    if (ip === '::1') {
        ip = '127.0.0.1';
    }

    return ip;
};

// ─── In-Memory Cache ───────────────────────────────────────────────────────
// Pehle: Har request par 2 DB queries hoti thin
// Ab:    Sirf har 60 seconds mein 1 DB query — baaki sab memory se
const CACHE_TTL_MS = 60 * 1000; // 1 minute
let cachedWhitelist = null;   // Map<ip_address, is_whitelisted>
let cachedIsEmpty   = true;   // agar whitelist empty hai
let cacheExpiry     = 0;

const refreshCache = async () => {
    const { rows } = await db.query('SELECT ip_address, is_whitelisted FROM ip_whitelist');
    cachedIsEmpty   = rows.length === 0;
    cachedWhitelist = new Map(rows.map(r => [r.ip_address, r.is_whitelisted]));
    cacheExpiry     = Date.now() + CACHE_TTL_MS;
};

// Bahar se call karke cache force-refresh kar sako (jab IP add/remove ho)
const invalidateWhitelistCache = () => {
    cacheExpiry = 0;
};
// ───────────────────────────────────────────────────────────────────────────

const enforceIPWhitelist = async (req, res, next) => {
    try {
        const clientIp = getClientIP(req);

        // Cache expire ho gayi ho toh refresh karo
        if (Date.now() > cacheExpiry) {
            await refreshCache().catch((err) => {
                console.error('⚠️  IP whitelist cache refresh failed (fail-open):', err.message);
                // Keep old cache if available; reset expiry so we retry after 10s
                cacheExpiry = Date.now() + 10 * 1000;
            });
        }

        // 1️⃣ Whitelist empty hai ya Localhost hai → sab allow karo (fail-open / dev friendly)
        if (cachedIsEmpty || clientIp === '127.0.0.1' || clientIp === '::1') {
            return next();
        }

        // 2️⃣ IP check karo memory se (no DB hit)
        const isWhitelisted = cachedWhitelist.get(clientIp);

        if (isWhitelisted === undefined || isWhitelisted === false) {
            // Send 403 Forbidden instead of destroying socket so frontend catches it instantly
            return res.status(403).json({ error: 'Access Denied: IP not whitelisted' });
        }

        next();

    } catch (err) {
        console.error('❌ Whitelist middleware error:', err);
        // Cache error par bhi app band nahi honi chahiye — allow karo
        next();
    }
};

module.exports = enforceIPWhitelist;
module.exports.invalidateWhitelistCache = invalidateWhitelistCache;