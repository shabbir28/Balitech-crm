const db = require('./src/config/db');
const fs = require('fs');
async function run() {
    try {
        const client = await db.getClient();
        let res1 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads';");
        fs.writeFileSync('output.txt', "LEADS: " + res1.rows.map(r=>r.column_name).join(', ') + "\n");
        
        let res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns';");
        fs.appendFileSync('output.txt', "CAMPAIGNS: " + res2.rows.map(r=>r.column_name).join(', ') + "\n");

        client.release();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
