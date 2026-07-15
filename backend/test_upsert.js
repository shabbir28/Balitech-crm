const db = require('./src/config/db');
async function run() {
    try {
        await db.query('BEGIN');
        const badItems = [{ phone: '1234567890', type: 'State DNC', reason: 'Test' }];
        const valueStrings = ['($1, $2, $3, $4, $5, $6)'];
        const insertValues = ['1234567890', 'DNC', 'Blacklist Alliance API', 'Test', 1, null];
        
        await db.query(`
            INSERT INTO premium_dnc_numbers (phone, dnc_type, source, notes, created_by, campaign_id)
            VALUES ${valueStrings.join(",")}
            ON CONFLICT (phone) DO UPDATE
            SET dnc_type = EXCLUDED.dnc_type,
                source = EXCLUDED.source,
                notes = EXCLUDED.notes,
                created_by = EXCLUDED.created_by,
                campaign_id = COALESCE(EXCLUDED.campaign_id, premium_dnc_numbers.campaign_id)
        `, insertValues);
        await db.query('ROLLBACK');
        console.log("Success");
    } catch(err) {
        console.log("Error:", err.message);
    }
    process.exit(0);
}
run();
