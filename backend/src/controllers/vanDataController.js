const db = require("../config/db");
const { areaCodesMap } = require("../utils/areaCodes");

const getVanData = async (req, res) => {
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
      filters.push(`(d.first_name ILIKE $${idx} OR d.last_name ILIKE $${idx} OR d.phone ILIKE $${idx} OR d.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const dataQuery = `
      SELECT d.id, d.first_name, d.last_name, d.phone, d.email, d.area_code, d.age, d.status, d.uploaded_at,
             v.name as vendor_name
      FROM van_data d
      LEFT JOIN van_vendors v ON d.vendor_id = v.vendor_id
      ${where}
      ORDER BY d.uploaded_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM van_data d ${where}`;

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
    console.error("Error fetching van_data:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getVanData };
