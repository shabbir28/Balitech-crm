/**
 * Blacklist Alliance Integration Utility
 * Performs bulk TCPA & DNC scrubbing.
 */

const { BlacklistAlliance } = require("blacklist-alliance-client");

/**
 * Scrub an array of phone numbers using The Blacklist Alliance lookup API.
 * 
 * @param {string[]} phones - Array of phone numbers to scrub.
 * @param {string} apiKey - The Blacklist Alliance API key.
 * @returns {Promise<{ good: string[], bad: Array<{ phone: string, type: string, reason: string }> }>}
 */
async function scrubPhones(
  phones,
  apiKey = process.env.BLACKLIST_ALLIANCE_API_KEY || "KePFGNcVHPpzjxU88nWD",
) {
  const requestTimeoutMs = Math.max(
    1000,
    parseInt(process.env.BLA_TIMEOUT_MS || "10000", 10),
  );
  const maxRetries = Math.max(
    1,
    parseInt(process.env.BLA_MAX_RETRIES || "2", 10),
  );
  const results = {
    good: [],
    bad: [],
  };

  const uniquePhones = Array.from(
    new Set(phones.map((p) => String(p || "").replace(/\D/g, ""))),
  ).filter((p) => p.length >= 10);

  if (uniquePhones.length === 0) {
    return results;
  }

  console.log(
    `[Blacklist Alliance] Starting BULK scrub for ${uniquePhones.length} numbers ` +
      `(timeout=${requestTimeoutMs}ms, retries=${maxRetries})...`,
  );
  const startTime = Date.now();
  const client = new BlacklistAlliance(apiKey, {
    timeout: requestTimeoutMs,
    retries: maxRetries,
    logger: null,
  });

  const bulkResult = await client.bulkLookupSimple(uniquePhones, {
    responseFormat: "json",
    autoBatch: true,
    onProgress: (info) => {
      if (info?.completed && info?.total) {
        const pct = Math.round((info.completed / info.total) * 100);
        console.log(
          `[Blacklist Alliance] Bulk progress: ${info.completed}/${info.total} (${pct}%)`,
        );
      }
    },
  });

  const suppressed = Array.isArray(bulkResult?.supression)
    ? bulkResult.supression
    : [];
  const reasons = bulkResult?.reasons || {};
  const suppressedSet = new Set(
    suppressed.map((p) => String(p || "").replace(/\D/g, "")),
  );

  for (const phone of uniquePhones) {
    if (suppressedSet.has(phone)) {
      results.bad.push({
        phone,
        type: "DNC",
        reason: reasons[phone] || "blacklisted",
      });
    } else {
      results.good.push(phone);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `[Blacklist Alliance] Finished BULK scrubbing in ${duration}s. Good: ${results.good.length}, Bad (DNC): ${results.bad.length}`,
  );
  return results;
}

module.exports = {
  scrubPhones
};
