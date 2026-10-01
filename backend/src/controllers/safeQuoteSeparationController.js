const db = require("../config/db");
const { normalizeUsDigits } = require("../utils/phoneParser");
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");

const listSeparation = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND s.phone ILIKE $${params.length}`;
    }

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT s.*, c.name AS campaign_name
         FROM safe_quote_separation_data s
         LEFT JOIN safe_quote_campaigns c ON s.campaign_id = c.campaign_id
         ${where}
         ORDER BY s.uploaded_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM safe_quote_separation_data s ${where}`, params),
    ]);

    res.json({
      data: dataResult.rows,
      total: countResult.rows[0].count,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Safe Quote Separation list error:", err);
    res.status(500).json({ message: "Server error fetching separation list" });
  }
};

const importSeparation = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const campaignId = req.body?.campaign_id || null;

    const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
    cleanupFile(req.file.path);

    const phones = [];
    for (const record of records) {
      const phone = normalizeUsDigits(record.phone);
      if (phone) phones.push(phone);
    }
    const uniquePhones = Array.from(new Set(phones));
    if (uniquePhones.length === 0) {
      return res.status(400).json({ message: "No valid phone numbers found" });
    }

    const BATCH = 1000;
    let upserted = 0;
    for (let i = 0; i < uniquePhones.length; i += BATCH) {
      const chunk = uniquePhones.slice(i, i + BATCH);
      const values = [];
      const placeholders = [];
      let idx = 1;
      for (const phone of chunk) {
        placeholders.push(`($${idx}, $${idx + 1})`);
        values.push(phone, campaignId);
        idx += 2;
      }
      const result = await db.query(
        `INSERT INTO safe_quote_separation_data (phone, campaign_id)
         VALUES ${placeholders.join(",")}
         ON CONFLICT (phone) DO UPDATE
         SET campaign_id = COALESCE(EXCLUDED.campaign_id, safe_quote_separation_data.campaign_id)
         RETURNING phone`,
        values
      );
      upserted += result.rowCount;
    }

    await db.query(
      `UPDATE safe_quote_data SET status = 'separation', downloaded_at = NULL WHERE phone = ANY($1::text[])`,
      [uniquePhones]
    );

    res.json({
      message: "Separation import completed",
      total_found: uniquePhones.length,
      upserted,
    });
  } catch (err) {
    console.error("Safe Quote Separation import error:", err);
    res.status(500).json({ message: "Server error importing separation numbers" });
  }
};

const deleteSeparation = async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM safe_quote_separation_data WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Number not found" });
    res.json({ message: "Separation number deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Safe Quote Separation delete error:", err);
    res.status(500).json({ message: "Server error deleting separation number" });
  }
};

module.exports = { listSeparation, importSeparation, deleteSeparation };
