/**
 * Blacklist Alliance Integration Utility
 * Performs bulk TCPA & DNC scrubbing.
 */

const { BlacklistAlliance } = require("blacklist-alliance-client");

function normalizePhone(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

/**
 * Scrub an array of phone numbers using The Blacklist Alliance lookup API.
 *
 * @param {string[]} phones - Array of phone numbers to scrub.
 * @param {string} [apiKey] - The Blacklist Alliance API key.
 * @returns {Promise<{ good: string[], bad: Array<{ phone: string, type: string, reason: string }> }>}
 */
async function scrubPhones(
  phones,
  apiKey = process.env.BLACKLIST_ALLIANCE_API_KEY,
) {
  const key = apiKey || process.env.BLACKLIST_ALLIANCE_API_KEY;
  if (!key) {
    throw new Error("BLACKLIST_ALLIANCE_API_KEY is not set in server .env");
  }

  const baseTimeout = Math.max(
    1000,
    parseInt(process.env.BLA_TIMEOUT_MS || "60000", 10),
  );
  const requestTimeoutMs = Math.max(
    baseTimeout,
    15000 + Math.ceil(Math.max(0, phones.length - 1) / 500) * 5000,
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
    new Set(phones.map((p) => normalizePhone(p))),
  ).filter((p) => p.length === 10);

  if (uniquePhones.length === 0) {
    return results;
  }

  console.log(
    `[Blacklist Alliance] Starting BULK scrub for ${uniquePhones.length} numbers ` +
      `(timeout=${requestTimeoutMs}ms, retries=${maxRetries})...`,
  );
  const startTime = Date.now();
  const client = new BlacklistAlliance(key, {
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

  const rawSuppressed = bulkResult?.supression ?? bulkResult?.suppression ?? [];
  const suppressed = Array.isArray(rawSuppressed) ? rawSuppressed : [];
  const cleanList = Array.isArray(bulkResult?.phones) ? bulkResult.phones : [];
  const reasons = bulkResult?.reasons || {};
  const suppressedSet = new Set(
    suppressed.map((p) => normalizePhone(p)),
  );
  const cleanSet = new Set(cleanList.map((p) => normalizePhone(p)));
  const hasCleanList = cleanSet.size > 0;

  for (const phone of uniquePhones) {
    if (suppressedSet.has(phone)) {
      results.bad.push({
        phone,
        type: "DNC",
        reason: reasons[phone] || reasons[`1${phone}`] || "blacklisted",
      });
    } else if (hasCleanList) {
      if (cleanSet.has(phone)) {
        results.good.push(phone);
      } else {
        results.bad.push({
          phone,
          type: "DNC",
          reason: "not in API clean list",
        });
      }
    } else {
      results.good.push(phone);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const badPct =
    uniquePhones.length > 0
      ? Math.round((results.bad.length / uniquePhones.length) * 100)
      : 0;
  console.log(
    `[Blacklist Alliance] Finished BULK scrubbing in ${duration}s. Good: ${results.good.length}, Bad (DNC): ${results.bad.length} (${badPct}%)`,
  );
  if (badPct >= 95 && uniquePhones.length >= 100) {
    console.warn(
      `[Blacklist Alliance] Suspicious scrub: ${badPct}% flagged DNC. Verify BLACKLIST_ALLIANCE_API_KEY on this server.`,
    );
  }
  return results;
}

module.exports = {
  scrubPhones,
  normalizePhone,
};
