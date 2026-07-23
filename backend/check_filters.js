const db = require('./src/config/db'); 
async function check() {
    try {
        let q = `
            SELECT COUNT(*) 
            FROM leads 
            WHERE vendor_id=(SELECT vendor_id FROM vendors WHERE name='Altaf' LIMIT 1) 
              AND status='available' 
              AND NOT EXISTS (SELECT 1 FROM dnc_numbers d WHERE d.phone = leads.phone)
        `;
        let res = await db.query(q);
        console.log("Total available leads for Altaf NOT in DNC:", res.rows[0].count);

    } catch(e) { console.error(e); }
    process.exit(0);
}
check();
