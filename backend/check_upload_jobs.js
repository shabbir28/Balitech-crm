const db = require('./src/config/db');
db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'upload_jobs'")
    .then(r => {
        console.log('Columns:', r.rows.map(x => x.column_name));
        process.exit(0);
    })
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
