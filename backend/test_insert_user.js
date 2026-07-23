const db = require("./src/config/db");

(async () => {
  try {
    const res = await db.query(
      `INSERT INTO users (username, first_name, last_name, email, phone, date_of_birth, password_hash, role, status, profile_picture, created_by, accessible_modules, accessible_campaigns)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12)
       RETURNING id`,
      [
        "testuser2",
        "Test",
        "User",
        "testuser2@example.com",
        null,
        null,
        "hash",
        "admin",
        null,
        1,
        JSON.stringify([]),
        JSON.stringify([])
      ]
    );
    console.log("Success:", res.rows[0]);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    process.exit();
  }
})();
