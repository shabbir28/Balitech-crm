const db = require("./src/config/db");

(async () => {
  const queries = [
    `ALTER TABLE refine_vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`,
    `ALTER TABLE refine_vendors ADD COLUMN IF NOT EXISTS comment TEXT;`,
    `ALTER TABLE refine_vendors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';`
  ];

  for (let q of queries) {
    try {
      await db.query(q);
      console.log("Success:", q);
    } catch (e) {
      console.error("Failed:", q, e.message);
    }
  }
  process.exit();
})();
