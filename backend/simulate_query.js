const db = require('./src/config/db');
const downloadController = require('./src/controllers/downloadController');
const fs = require('fs');

async function testExecute() {
    const client = await db.getClient();
    try {
        await client.query("BEGIN");
        
        // Let's redefine executeDownload locally so we can see the exact error without modifying the actual code
        const code = fs.readFileSync('./src/controllers/downloadController.js', 'utf8');
        // Extract executeDownload and buildFilters
        
        // Instead of doing that, let's just run the exact query that buildFilters generates
        const { vendor_id, campaign_id, states, quantity, min_age, max_age, job_id, include_downloaded } = {
            vendor_id: 'all', campaign_id: 'all', quantity: 10, states: [], job_id: ''
        };
        
        const filters = ["status = 'available'"];
        const params = [];
        let paramIdx = 1;
        
        const whereParts = [...filters];
        whereParts.push(`NOT EXISTS (SELECT 1 FROM dnc_numbers d WHERE d.phone = leads.phone)`);
        const whereClause = whereParts.join(" AND ");
        
        const updateQuery = `
        WITH selected_leads AS (
            SELECT id 
            FROM leads 
            WHERE ${whereClause}
            ORDER BY uploaded_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $${paramIdx}
        )
        UPDATE leads l
        SET status = 'downloaded', downloaded_at = CURRENT_TIMESTAMP
        FROM selected_leads sl
        WHERE l.id = sl.id
        RETURNING l.name, l.phone, l.email, l.country_code, l.area_code, l.disposition, l.age
    `;
        params.push(quantity);
        console.log("QUERY:", updateQuery);
        console.log("PARAMS:", params);
        
        const res = await client.query(updateQuery, params);
        console.log("ROWS:", res.rows.length);
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK").catch(()=>{});
        console.log("ERROR EXECUTING QUERY:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}
require('dotenv').config();
testExecute();
