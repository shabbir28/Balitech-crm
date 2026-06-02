/**
 * DB helpers for bulk uploads: shorter locks, consistent row order, deadlock retry.
 */

const RETRYABLE_PG_CODES = new Set(["40P01", "40001", "55P03"]);

const isRetryableDbError = (err) => {
  if (!err) return false;
  if (RETRYABLE_PG_CODES.has(err.code)) return true;
  const msg = String(err.message || "").toLowerCase();
  return msg.includes("deadlock") || msg.includes("could not serialize");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withDeadlockRetry = async (
  fn,
  { maxAttempts = 5, baseDelayMs = 40 } = {},
) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (!isRetryableDbError(err) || attempt >= maxAttempts) throw err;
      const delay =
        baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 40);
      await sleep(delay);
    }
  }
  throw lastErr;
};

const chunkArray = (arr, size) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/** Stable int key for pg_advisory_lock (one upload per session at a time) */
const sessionLockKey = (sessionId) => {
  const s = String(sessionId || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
};

/**
 * Serialize uploads per session on one connection (pg_advisory_lock is per-connection).
 * @param {Function} fn - receives `exec` with `.query()` bound to the lock connection
 */
const withSessionUploadLock = async (db, sessionId, fn) => {
  const client = await db.getClient();
  const key = sessionLockKey(sessionId);
  const exec = {
    query: (text, params) => client.query(text, params),
  };
  try {
    await client.query("SELECT pg_advisory_lock($1)", [key]);
    return await fn(exec);
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    } catch {
      /* ignore */
    }
    client.release();
  }
};

const lookupDncPhones = async (exec, phones) => {
  const dncSet = new Set();
  let dncSkippedDnc = 0;
  let dncSkippedSale = 0;

  for (const chunk of chunkArray(phones, 5000)) {
    await new Promise((resolve) => setImmediate(resolve));
    const dncRes = await exec.query(
      "SELECT phone, dnc_type FROM dnc_numbers WHERE phone = ANY($1::text[])",
      [chunk],
    );
    for (const row of dncRes.rows) {
      dncSet.add(row.phone);
      if (row.dnc_type === "DNC") dncSkippedDnc += 1;
      if (row.dnc_type === "SALE") dncSkippedSale += 1;
    }
  }

  return { dncSet, dncSkippedDnc, dncSkippedSale };
};

const lookupExistingLeads = async (exec, phones) => {
  const existingSet = new Set();
  const existingBreakdown = {};

  for (const chunk of chunkArray(phones, 5000)) {
    await new Promise((resolve) => setImmediate(resolve));
    const existingRes = await exec.query(
      "SELECT phone, COALESCE(campaign_type, 'Unknown Campaign') AS vendor_name FROM leads WHERE phone = ANY($1::text[])",
      [chunk],
    );
    for (const row of existingRes.rows) {
      if (!existingSet.has(row.phone)) {
        existingSet.add(row.phone);
        const vName = row.vendor_name || "Unknown Campaign";
        existingBreakdown[vName] = (existingBreakdown[vName] || 0) + 1;
      }
    }
  }

  return { existingSet, existingBreakdown };
};

const safeRollback = async (client) => {
  if (!client) return;
  try {
    await client.query("ROLLBACK");
  } catch {
    /* connection may already be aborted */
  }
};

module.exports = {
  isRetryableDbError,
  withDeadlockRetry,
  chunkArray,
  sessionLockKey,
  withSessionUploadLock,
  lookupDncPhones,
  lookupExistingLeads,
  safeRollback,
};
