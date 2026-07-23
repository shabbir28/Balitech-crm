const db = require('./src/config/db'); 
async function check() {
    try {
        const res = await db.query(`SELECT status, COUNT(*) as count FROM leads WHERE vendor_id=(SELECT vendor_id FROM vendors WHERE name='Altaf' LIMIT 1) GROUP BY status`);
        console.log("Altaf leads status:", res.rows);
        const res2 = await db.query(`SELECT COUNT(*) FROM leads WHERE vendor_id=(SELECT vendor_id FROM vendors WHERE name='Altaf' LIMIT 1) AND status='available'`);
        console.log("Available:", res2.rows[0]);
        const res3 = await db.query(`SELECT COUNT(*) FROM leads WHERE vendor_id=(SELECT vendor_id FROM vendors WHERE name='Altaf' LIMIT 1) AND status='available' AND area_code IN ('205', '251', '256', '334', '938', '907', '480', '520', '602', '623', '928')`);
        console.log("Available in AL, AK, AZ:", res3.rows[0]);
    } catch(e) { console.error(e); }
    process.exit(0);
}
check();
