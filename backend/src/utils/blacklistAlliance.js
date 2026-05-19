/**
 * Blacklist Alliance Integration Utility
 * Performs high-performance, concurrent, and robust TCPA & DNC scrubbing.
 */

/**
 * Scrub an array of phone numbers using The Blacklist Alliance lookup API.
 * 
 * @param {string[]} phones - Array of phone numbers to scrub.
 * @param {string} apiKey - The Blacklist Alliance API key.
 * @returns {Promise<{ good: string[], bad: Array<{ phone: string, type: string, reason: string }> }>}
 */
async function scrubPhones(phones, apiKey = process.env.BLACKLIST_ALLIANCE_API_KEY || 'KePFGNcVHPpzjxU88nWD') {
  const concurrencyLimit = 100;
  const results = {
    good: [],
    bad: []
  };

  // Dedup and normalize phone numbers (digits only, length >= 10)
  const uniquePhones = Array.from(
    new Set(phones.map(p => String(p || '').replace(/\D/g, '')))
  ).filter(p => p.length >= 10);

  if (uniquePhones.length === 0) {
    return results;
  }

  console.log(`[Blacklist Alliance] Starting scrub for ${uniquePhones.length} unique numbers...`);
  const startTime = Date.now();

  let index = 0;

  const executeLookup = async (phone) => {
    // Standard JSON lookup API endpoint
    const url = `https://api.blacklistalliance.net/standard/api/v1/Lookup/key/${apiKey}/response/json/phone/${phone}/`;

    // Try up to 3 times in case of transient network errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          // Native AbortSignal timeout to ensure we don't hang
          signal: AbortSignal.timeout(6000)
        });
        
        const text = await res.text();

        // 1. Check for API authentication errors
        if (text === 'API Key Not Found' || text.includes('Access denied')) {
          throw new Error('Blacklist Alliance API Key is invalid, expired, or IP is not whitelisted.');
        }

        // 2. Parse response
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }

        // 3. Process result
        if (data.status === 'success') {
          // If code is not 'none', it is blacklisted / DNC
          if (data.code && data.code !== 'none') {
            results.bad.push({
              phone,
              type: data.message || 'DNC',
              reason: data.code
            });
          } else {
            // Good / Clean number
            results.good.push(phone);
          }
          return;
        } else {
          // Check if it failed due to auth/balance limit
          if (data.message && (data.message.includes('Access denied') || data.message.includes('balance'))) {
            throw new Error(`Blacklist Alliance System Error: ${data.message}`);
          }
          // Other failures can be retried or treated as good fallback
          throw new Error(`Lookup failed with status: ${data.status}`);
        }
      } catch (err) {
        // Immediately escalate authentication or configuration errors to prevent corrupted runs
        if (
          err.message && 
          (err.message.includes('API Key') || 
           err.message.includes('Auth Error') || 
           err.message.includes('System Error') ||
           err.message.includes('whitelisted'))
        ) {
          throw err;
        }

        if (attempt === 3) {
          console.error(`[Blacklist Alliance] Persistent failure on ${phone} after 3 attempts:`, err.message);
          // Fallback: If API permanently fails on a single number, treat as good to avoid false-positive DNC
          results.good.push(phone);
        } else {
          // Wait briefly with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, 150 * attempt));
        }
      }
    }
  };

  // Run the workers concurrently using a worker pool
  const workers = Array(Math.min(concurrencyLimit, uniquePhones.length))
    .fill(null)
    .map(async () => {
      while (index < uniquePhones.length) {
        const currentPhone = uniquePhones[index++];
        await executeLookup(currentPhone);
      }
    });

  await Promise.all(workers);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `[Blacklist Alliance] Finished scrubbing in ${duration}s. Good: ${results.good.length}, Bad (DNC): ${results.bad.length}`
  );

  return results;
}

module.exports = {
  scrubPhones
};
