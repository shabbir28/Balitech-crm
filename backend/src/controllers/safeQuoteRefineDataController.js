const db = require("../config/db");
const { getAreaCodesForStateSearch } = require("../utils/areaCodes");

const getLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, disposition, quality } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = "SELECT *, 1 AS call_count FROM safe_quote_refine_data WHERE 1=1";
    const params = [];

    if (disposition) {
      params.push(`%${disposition}%`);
      query += ` AND disposition ILIKE $${params.length}`;
    }
    if (quality) {
      params.push(quality);
      query += ` AND quality = $${params.length}`;
    }
    if (search) {
      const searchTerm = `%${search}%`;
      const possibleAreaCodes = getAreaCodesForStateSearch(search);
      let areaCodeClause = "";
      params.push(searchTerm);
      const searchIdx = params.length;
      if (possibleAreaCodes.length > 0) {
        const placeholders = possibleAreaCodes.map((_, i) => `$${params.length + 1 + i}`).join(",");
        areaCodeClause = ` OR area_code IN (${placeholders})`;
      }
      query += ` AND (
        name ILIKE $${searchIdx}
        OR phone ILIKE $${searchIdx}
        OR email ILIKE $${searchIdx}
        OR state ILIKE $${searchIdx}
        OR campaign_type ILIKE $${searchIdx}
        ${areaCodeClause}
      )`;
      if (possibleAreaCodes.length > 0) params.push(...possibleAreaCodes);
    }

    const countQuery = query.replace("SELECT *, 1 AS call_count", "SELECT COUNT(*)");
    query += ` ORDER BY uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [leadsResult, countResult] = await Promise.all([
      db.query(query, [...params, limitNum, offset]),
      db.query(countQuery, params),
    ]);

    res.json({
      data: leadsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Safe Quote Refine data list error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getLeads };
