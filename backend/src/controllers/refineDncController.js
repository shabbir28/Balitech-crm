const db = require("../config/db");
const { Parser } = require("json2csv");
const { normalizeUsDigits } = require("../utils/phoneParser");
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");

const DNC_EXPORT_FIELDS = [
  "phone",
  "dnc_type",
  "campaign",
  "source",
  "notes",
  "created_at",
];

const VALID_TYPES = new Set(["DNC", "SALE"]);

const normalizeType = (value) => {
  const t = String(value || "")
    .trim()
    .toUpperCase();
  // BLA to DNC mapping for backward compatibility if needed,
  // but since we migrated DB, we just ensure we use DNC.
  if (t === "BLA") return "DNC";
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
      where += ` AND d.phone ILIKE $${params.length}`;
    }

    const dataQuery = `
      SELECT d.*, c.name AS campaign_name
      FROM refine_dnc_numbers d
      LEFT JOIN refine_campaigns c ON d.campaign_id = c.campaign_id
      ${where}
      ORDER BY d.upload_date DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2};
    `;
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM refine_dnc_numbers d
      ${where};
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...params, limitNum, offset]),
      db.query(countQuery, params),
    ]);

    const mappedData = dataResult.rows.map((row) => ({
      ...row,
      created_at: row.upload_date,
      source: "Scrubbed/Imported",
      notes: "",
    }));

    res.json({
      data: mappedData,
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
    const { phone, type, campaign_id } = req.body || {};
    const dncType = normalizeType(type);
    if (!dncType) {
      return res
        .status(400)
        .json({ message: "Valid type is required (DNC/SALE)" });
    }

    const normalized = normalizeUsDigits(phone);
    if (!normalized) {
      return res.status(400).json({ message: "Valid phone is required" });
    }

    const result = await db.query(
      `
        INSERT INTO refine_dnc_numbers (phone, dnc_type, campaign_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) DO UPDATE
        SET dnc_type = EXCLUDED.dnc_type,
            campaign_id = COALESCE(EXCLUDED.campaign_id, refine_dnc_numbers.campaign_id)
        RETURNING *;
      `,
      [
        normalized,
        dncType,
        campaign_id || null,
      ],
    );

    const row = result.rows[0];
    res.status(201).json({
      ...row,
      created_at: row.upload_date,
      source: "Manual Entry",
      notes: "",
    });
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
    const campaignId = req.body?.campaign_id || null;

    if (!dncType) {
      return res
        .status(400)
        .json({ message: "Valid type is required (DNC/SALE)" });
    }

    const records = await processFileBuffer(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    cleanupFile(req.file.path); // Temp file delete karo

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
        values.push(p, dncType, campaignId);
        idx += 3;
      }

      const q = `
        INSERT INTO refine_dnc_numbers (phone, dnc_type, campaign_id)
        VALUES ${valueStrings.join(",")}
        ON CONFLICT (phone) DO UPDATE
        SET dnc_type = EXCLUDED.dnc_type,
            campaign_id = COALESCE(EXCLUDED.campaign_id, refine_dnc_numbers.campaign_id)
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

const buildDncExportFilters = ({ campaign_id, type }) => {
  const params = [];
  let where = "WHERE 1=1";

  if (!campaign_id || campaign_id === "") {
    return { error: "Campaign is required" };
  }

  if (campaign_id === "unassigned") {
    where += " AND d.campaign_id IS NULL";
  } else if (campaign_id !== "all") {
    params.push(campaign_id);
    where += ` AND d.campaign_id = $${params.length}`;
  }

  const t = type && type !== "ALL" ? normalizeType(type) : null;
  if (type && type !== "ALL" && !t) {
    return { error: "Valid type is required (DNC, SALE, or ALL)" };
  }
  if (t) {
    params.push(t);
    where += ` AND d.dnc_type = $${params.length}`;
  }

  return { where, params, type: t };
};

// GET /api/dnc/export-count?campaign_id=&type=
const getDncExportCount = async (req, res) => {
  try {
    const { campaign_id, type = "ALL" } = req.query;
    const built = buildDncExportFilters({ campaign_id, type });
    if (built.error) {
      return res.status(400).json({ message: built.error });
    }

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM refine_dnc_numbers d
      ${built.where};
    `;
    const result = await db.query(countQuery, built.params);
    res.json({ count: result.rows[0]?.count || 0 });
  } catch (err) {
    console.error("DNC export count error:", err);
    res.status(500).json({ message: "Server error counting DNC records" });
  }
};

// POST /api/dnc/download — export DNC/SALE numbers as CSV
const downloadDnc = async (req, res) => {
  try {
    const { campaign_id, type = "ALL", quantity } = req.body || {};

    const built = buildDncExportFilters({ campaign_id, type });
    if (built.error) {
      return res.status(400).json({ message: built.error });
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }
    if (qty > 500000) {
      return res.status(400).json({ message: "Maximum 500,000 records per download" });
    }

    const dataQuery = `
      SELECT
        d.phone,
        d.dnc_type,
        COALESCE(c.name, 'Untagged') AS campaign,
        'Imported/Scrubbed' AS source,
        '' AS notes,
        d.upload_date AS created_at
      FROM refine_dnc_numbers d
      LEFT JOIN refine_campaigns c ON d.campaign_id = c.campaign_id
      ${built.where}
      ORDER BY d.upload_date DESC
      LIMIT $${built.params.length + 1};
    `;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM refine_dnc_numbers d ${built.where}`,
      built.params,
    );
    const available = countResult.rows[0]?.count || 0;
    if (available === 0) {
      return res.status(400).json({
        message:
          "No DNC/SALE records for this campaign and type. Try “All Campaigns” or “No campaign linked” if numbers were imported without a campaign.",
        available: 0,
      });
    }

    const result = await db.query(dataQuery, [...built.params, qty]);
    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "No records returned. Check quantity and filters.",
        available,
      });
    }

    const rows = result.rows.map((r) => ({
      ...r,
      created_at: r.created_at
        ? new Date(r.created_at).toISOString()
        : "",
    }));

    const csv = new Parser({ fields: DNC_EXPORT_FIELDS }).parse(rows);
    const typeLabel =
      type === "ALL" ? "dnc_sale" : String(type).toLowerCase();
    const campLabel =
      campaign_id === "all" ? "all_campaigns" : "campaign";
    const fileName = `${typeLabel}_${campLabel}_${Date.now()}.csv`;

    res.json({
      csv,
      fileName,
      count: rows.length,
      type: type === "ALL" ? "ALL" : built.type,
    });
  } catch (err) {
    console.error("DNC download error:", err);
    res.status(500).json({ message: "Server error exporting DNC data" });
  }
};

// DELETE /api/dnc/:id
const deleteDnc = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM refine_dnc_numbers WHERE id = $1 RETURNING id",
      [id],
    );
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
  getDncExportCount,
  downloadDnc,
};
