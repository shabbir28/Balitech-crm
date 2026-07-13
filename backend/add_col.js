const db = require('./src/config/db');
db.query('ALTER TABLE refine_data ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 1;')
  .then(() => {
    console.log("Column added");
    process.exit(0);
  })
  .catch(console.error);
