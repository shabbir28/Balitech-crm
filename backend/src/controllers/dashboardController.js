const db = require("../config/db");

const EMPTY_STATS = {
  totals: {},
  vendorDistribution: [],
  campaignStats: [],
  dncStats: [],
  leadStatusBreakdown: [],
  recentSessions: [],
  refineCampaignStats: [],
  premiumCampaignStats: [],
  vanCampaignStats: [],
  separationCampaignStats: [],
  wcDbCampaignStats: [],
  cachedAt: null,
};

const getStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT data, updated_at
      FROM dashboard_stats_cache
      WHERE cache_key = 'dashboard_stats'
      LIMIT 1
    `);

    if (!result.rows.length) {
      return res.json({
        ...EMPTY_STATS,
        cacheStatus: "empty",
        message: "Dashboard cache is not ready yet. Please refresh cache.",
      });
    }

    const data = result.rows[0].data || EMPTY_STATS;

    res.json({
      ...data,
      cacheStatus: "ready",
      cacheUpdatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error("Dashboard Stats Cache Error:", err);
    res.status(500).json({
      message: "Server error fetching dashboard stats cache",
      error: err.message,
    });
  }
};

module.exports = { getStats };
