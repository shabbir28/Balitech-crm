const db = require('../config/db');

/**
 * Retrieves campaign access constraints for a user.
 * Returns: {
 *   isRestricted: boolean,
 *   campaignIds: string[],
 *   campaignNames: string[],
 *   campaignNamesLower: string[]
 * }
 */
const getUserCampaignAccess = async (user, campaignTable = 'campaigns') => {
  if (!user || user.role === 'super_admin') {
    return { isRestricted: false, campaignIds: [], campaignNames: [], campaignNamesLower: [] };
  }

  let accessible = user.accessible_campaigns;
  try {
    const userRes = await db.query('SELECT accessible_campaigns FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length > 0 && userRes.rows[0].accessible_campaigns) {
      accessible = userRes.rows[0].accessible_campaigns;
    }
  } catch (e) {
    // fallback to token accessible_campaigns
  }

  if (typeof accessible === 'string') {
    try { accessible = JSON.parse(accessible); } catch { accessible = []; }
  }

  if (!Array.isArray(accessible) || accessible.length === 0) {
    return { isRestricted: false, campaignIds: [], campaignNames: [], campaignNamesLower: [] };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawIds = accessible.map(String).map(s => s.trim()).filter(Boolean);
  const uuidIds = rawIds.filter(id => uuidRegex.test(id));

  let names = [];
  let tableCampaignIds = [];
  try {
    if (uuidIds.length > 0) {
      const res = await db.query(
        `SELECT DISTINCT campaign_id::text, name FROM campaigns WHERE campaign_id::text = ANY($1::text[])`,
        [uuidIds]
      );
      names = res.rows.map(r => r.name.trim());
      tableCampaignIds = res.rows.map(r => r.campaign_id.toString());
    }

    if (campaignTable && campaignTable !== 'campaigns') {
      const query = uuidIds.length > 0
        ? `SELECT DISTINCT campaign_id::text, name FROM ${campaignTable} WHERE name = ANY($1) OR campaign_id::text = ANY($2::text[])`
        : `SELECT DISTINCT campaign_id::text, name FROM ${campaignTable} WHERE name = ANY($1)`;
      const params = uuidIds.length > 0 ? [names, rawIds] : [names];
      const modRes = await db.query(query, params);
      names = [...new Set([...names, ...modRes.rows.map(r => r.name.trim())])];
      tableCampaignIds = [...new Set([...tableCampaignIds, ...modRes.rows.map(r => r.campaign_id.toString())])];
    }
  } catch (err) {
    console.error('Error fetching campaign names for access check:', err);
  }

  const allAllowedIds = [...new Set([...uuidIds, ...rawIds, ...tableCampaignIds])];

  return {
    isRestricted: true,
    campaignIds: allAllowedIds,
    rawCampaignIds: rawIds,
    campaignNames: names,
    campaignNamesLower: names.map(n => n.toLowerCase())
  };
};

module.exports = {
  getUserCampaignAccess,
};
