const db = require('./src/config/db'); 
async function check() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
        console.log("Leads columns:", res.rows.map(r=>r.column_name));
        
        // Let's also check if there's any campaign_type values in leads table
        const res2 = await db.query("SELECT campaign_type, COUNT(*) FROM leads GROUP BY campaign_type");
        console.log("Campaign types:", res2.rows);

    } catch(e) { console.error(e); }
    process.exit(0);
}
check();
