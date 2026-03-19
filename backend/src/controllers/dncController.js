const db = require("../config/db");
const { normalizeUsDigits } = require("../utils/phoneParser");
const { processFileBuffer } = require("../utils/fileProcessor");

const VALID_TYPES = new Set(["DNC", "SALE"]);

const normalizeType = (value) => {
  const t = String(value || "").trim().toUpperCase();
  // BLA to DNC mapping for backward compatibility if needed, 
  // but since we migrated DB, we just ensure we use DNC.
  if (t === 'BLA') return 'DNC';
  return VALID_TYPES.has(t) ? t : null;
};

// GET /api/dnc
const listDnc = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const params = [];
    let where = "WHERE 1=1";

    const t = type ? normalizeType(type) : null;
    if (t) {
      params.push(t);
      where += ` AND d.dnc_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (d.phone ILIKE $${params.length} OR d.source ILIKE $${params.length})`;
    }

    const dataQuery = `
      SELECT d.*, u.username AS created_by_username
      FROM dnc_numbers d
      LEFT JOIN users u ON d.created_by = u.id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2};
    `;
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM dnc_numbers d
      ${where};
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...params, limitNum, offset]),
      db.query(countQuery, params),
    ]);

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("List DNC Error:", err);
    res.status(500).json({ message: "Server error fetching DNC list" });
  }
};

// POST /api/dnc
const addDnc = async (req, res) => {
  try {
    const { phone, type, source, notes } = req.body || {};
    const dncType = normalizeType(type);
    if (!dncType) {
      return res.status(400).json({ message: "Valid type is required (DNC/SALE)" });
    }

    const normalized = normalizeUsDigits(phone);
    if (!normalized) {
      return res.status(400).json({ message: "Valid phone is required" });
    }

    const result = await db.query(
      `
        INSERT INTO dnc_numbers (phone, dnc_type, source, notes, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (phone) DO UPDATE
        SET dnc_type = EXCLUDED.dnc_type,
            source = COALESCE(EXCLUDED.source, dnc_numbers.source),
            notes = COALESCE(EXCLUDED.notes, dnc_numbers.notes)
        RETURNING *;
      `,
      [normalized, dncType, source || null, notes || null, req.user?.id || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add DNC Error:", err);
    res.status(500).json({ message: "Server error adding DNC" });
  }
};

// POST /api/dnc/import (multipart file + type)
const importDnc = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const dncType = normalizeType(req.body?.type);
    if (!dncType) {
      return res.status(400).json({ message: "Valid type is required (DNC/SALE)" });
    }

    const records = await processFileBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
    );

    const phones = [];
    for (const r of records) {
      const p = normalizeUsDigits(r.phone);
      if (p) phones.push(p);
    }

    const uniquePhones = Array.from(new Set(phones));
    if (uniquePhones.length === 0) {
      return res.status(400).json({ message: "No valid phone numbers found" });
    }

    const BATCH = 1000;
    let upserted = 0;

    for (let i = 0; i < uniquePhones.length; i += BATCH) {
      const chunk = uniquePhones.slice(i, i + BATCH);
      const valueStrings = [];
      const values = [];
      let idx = 1;
      for (const p of chunk) {
        valueStrings.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
        values.push(p, dncType, req.user?.id || null);
        idx += 3;
      }

      const q = `
        INSERT INTO dnc_numbers (phone, dnc_type, created_by)
        VALUES ${valueStrings.join(",")}
        ON CONFLICT (phone) DO UPDATE
        SET dnc_type = EXCLUDED.dnc_type
        RETURNING phone;
      `;
      const r = await db.query(q, values);
      upserted += r.rowCount;
    }

    res.json({
      message: "DNC import completed",
      type: dncType,
      total_found: uniquePhones.length,
      upserted,
    });
  } catch (err) {
    console.error("Import DNC Error:", err);
    res.status(500).json({ message: "Server error importing DNC" });
  }
};

// DELETE /api/dnc/:id
const deleteDnc = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("DELETE FROM dnc_numbers WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "DNC entry not found" });
    }
    res.json({ message: "DNC deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Delete DNC Error:", err);
    res.status(500).json({ message: "Server error deleting DNC" });
  }
};

module.exports = {
  listDnc,
  addDnc,
  importDnc,
  deleteDnc,
};

