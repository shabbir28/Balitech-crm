const db = require("../config/db");
const { areaCodesMap } = require("../utils/areaCodes");

const getWcDbData = async (req, res) => {
  try {
    const { vendor_id, search, page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    const filters = [];
    const params = [];
    let idx = 1;

    if (vendor_id && vendor_id !== "all") {
      filters.push(`d.vendor_id = $${idx++}`);
      params.push(vendor_id);
    }

    if (search) {
      filters.push(`(d.firstname ILIKE $${idx} OR d.lastname ILIKE $${idx} OR d.phone ILIKE $${idx} OR d.city ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const dataQuery = `
      SELECT d.*, v.name as vendor_name
      FROM wc_db_data d
      LEFT JOIN wc_db_vendors v ON d.vendor_id = v.vendor_id
      ${where}
      ORDER BY d.uploaded_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM wc_db_data d ${where}`;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...params, limitNum, offset]),
      db.query(countQuery, params),
    ]);

    const rows = dataResult.rows.map((r) => {
      let stateAbbr = "Unknown";
      if (r.area_code && areaCodesMap[r.area_code]) {
        stateAbbr = areaCodesMap[r.area_code];
      }
      return { ...r, state: stateAbbr };
    });

    res.json({ data: rows, total: countResult.rows[0]?.count || 0, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Error fetching wc_db_data:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getWcDbData };
