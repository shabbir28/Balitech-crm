const db = require('./src/config/db');
db.query("SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name = 'leads'")
    .then(r => {
        console.log('Columns:', r.rows);
        process.exit(0);
    })
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
