const db = require('./src/config/db');

async function allowLocalhost() {
    try {
        const check = await db.query('SELECT * FROM ip_whitelist WHERE ip_address = $1', ['127.0.0.1']);
        
        if (check.rows.length > 0) {
            await db.query('UPDATE ip_whitelist SET is_whitelisted = true WHERE ip_address = $1', ['127.0.0.1']);
            console.log("✅ Localhost (127.0.0.1) was already in the table and has been set to allowed.");
        } else {
            await db.query('INSERT INTO ip_whitelist (ip_address, is_whitelisted) VALUES ($1, $2)', ['127.0.0.1', true]);
            console.log("✅ Localhost (127.0.0.1) added to the whitelist successfully!");
        }
    } catch (error) {
        console.error("❌ Array error:", error);
    } finally {
        process.exit();
    }
}

allowLocalhost();
