const db = require('./src/config/db');

async function migrate() {
    try {
        await db.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50)
        `);
        console.log('Migration successful: Added campaign_type to leads table.');

        // Try a very basic backfill.
        // It's hard to accurately backfill because leads only have vendor_id, not session_id.
        // So we just assign the first found campaign_type from that vendor's upload_sessions.
        await db.query(`
            UPDATE leads l
            SET campaign_type = (
                SELECT us.campaign_type 
                FROM upload_sessions us 
                WHERE us.vendor_id = l.vendor_id 
                LIMIT 1
            )
            WHERE l.campaign_type IS NULL;
        `);
        console.log('Migration successful: Backfilled campaign_type for existing records.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
