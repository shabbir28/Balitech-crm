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

const enforceIPWhitelist = async (req, res, next) => {
    try {
        const clientIp = getClientIP(req);

        console.log("🔍 Client IP:", clientIp);

        // 1️⃣ Check if whitelist is empty (fail-open)
        const { rows: countRows } = await db.query(
            'SELECT COUNT(*) FROM ip_whitelist'
        );
        const count = parseInt(countRows[0].count, 10);

        if (count === 0) {
            console.log("⚠️ Whitelist empty → allowing all");
            return next();
        }

        // 2️⃣ Check if IP exists & allowed
        const { rows } = await db.query(
            'SELECT is_whitelisted FROM ip_whitelist WHERE ip_address = $1',
            [clientIp]
        );

        if (rows.length === 0 || rows[0].is_whitelisted === false) {
            console.log(`🚫 BLOCKED IP: ${clientIp}`);

            // Forcefully close the connection without sending an HTTP response
            // This natively simulates 'This site can't be reached' for API requests
            return req.socket.destroy();
        }

        console.log(`✅ ALLOWED IP: ${clientIp}`);
        next();

    } catch (err) {
        console.error('❌ Whitelist middleware error:', err);
        res.status(500).json({
            error: 'Internal Server Error during IP validation'
        });
    }
};

module.exports = enforceIPWhitelist;