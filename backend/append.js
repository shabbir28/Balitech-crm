const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src', 'controllers', 'mixedDownloadController.js');
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/module\.exports\s*=\s*\{[^}]+\};/s, '');

content += `
const { createNotification } = require('../utils/notifications');

// Added for request handling
const createMixedDownloadRequest = async (req, res) => {
  try {
    const { quantity, states, min_age, max_age, min_duration, max_duration, include_downloaded, van_percentage, refine_percentage, premium_percentage } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required." });
    }

    const result = await db.query(
      \`INSERT INTO mixed_download_requests
               (admin_id, quantity, van_percentage, refine_percentage, premium_percentage, states, min_age, max_age, min_duration, max_duration, include_downloaded)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *\`,
      [
        req.user.id,
        quantity,
        van_percentage || 0,
        refine_percentage || 0,
        premium_percentage || 0,
        states && states.length ? JSON.stringify(states) : null,
        min_age || null,
        max_age || null,
        min_duration || null,
        max_duration || null,
        include_downloaded === true || include_downloaded === "true",
      ],
    );

    const newRequest = result.rows[0];

    // Notify all super_admins
    const superAdmins = await db.query(\`SELECT id FROM users WHERE role='super_admin'\`);
    const adminDisplayName = req.user.first_name
      ? \`\${req.user.first_name} \${req.user.last_name || ""}\`.trim()
      : req.user.username;

    for (const sa of superAdmins.rows) {
      await createNotification(
        sa.id,
        "download_request_new",
        "📥 New Mixed Download Request",
        \`\${adminDisplayName} has requested to download \${quantity.toLocaleString()} mixed leads.\`,
        newRequest.id,
      );
    }

    return res.status(201).json({
      message: "Download request submitted successfully. Awaiting SuperAdmin approval.",
      request: newRequest,
    });
  } catch (err) {
    console.error("Create Mixed Download Request Error:", err);
    return res.status(500).json({ message: "Server error creating request" });
  }
};

const getDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(\`
            SELECT
                dr.*,
                u.username as admin_username,
                u.first_name as admin_first_name,
                u.last_name as admin_last_name
            FROM mixed_download_requests dr
            LEFT JOIN users u ON dr.admin_id = u.id
            ORDER BY dr.requested_at DESC
        \`);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Get Mixed Download Requests Error:", err);
    return res.status(500).json({ message: "Server error fetching requests" });
  }
};

const getMyDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(
      \`
            SELECT dr.*
            FROM mixed_download_requests dr
            WHERE dr.admin_id = $1
            ORDER BY dr.requested_at DESC
        \`,
      [req.user.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Get My Mixed Requests Error:", err);
    return res.status(500).json({ message: "Server error fetching requests" });
  }
};

const reviewDownloadRequest = async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    if (!["accept", "reject"].includes(action)) {
      client.release();
      return res.status(400).json({ message: "Invalid action" });
    }

    const reqRes = await client.query(\`SELECT * FROM mixed_download_requests WHERE id = $1\`, [id]);
    if (reqRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Request not found" });
    }
    const dlReq = reqRes.rows[0];
    if (dlReq.status !== "pending") {
      client.release();
      return res.status(400).json({ message: "Request already processed" });
    }

    if (action === "reject") {
      await client.query(
        \`UPDATE mixed_download_requests SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3\`,
        [rejection_reason || null, req.user.id, id]
      );
      await createNotification(dlReq.admin_id, "download_request_rejected", "❌ Download Request Declined", \`Your mixed download request for \${dlReq.quantity} leads was declined.\`, id);
      client.release();
      return res.status(200).json({ message: "Request rejected" });
    }

    // Accept: fetch data and generate CSV
    await client.query("BEGIN");
    
    let states = [];
    if (dlReq.states) {
        try { states = typeof dlReq.states === 'string' ? JSON.parse(dlReq.states) : dlReq.states; } catch(e){}
    }

    const van_qty = Math.floor(dlReq.quantity * ((dlReq.van_percentage || 0) / 100));
    const refine_qty = Math.floor(dlReq.quantity * ((dlReq.refine_percentage || 0) / 100));
    const premium_qty = dlReq.quantity - van_qty - refine_qty;

    const vanFilters = buildFilters("van_data", { states, min_age: dlReq.min_age, max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded });
    const refineFilters = buildFilters("refine_data", { states, min_age: dlReq.min_age, max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded });
    const premiumFilters = buildFilters("premium_data", { states, min_age: dlReq.min_age, max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded });

    const vanRows = await fetchFromTable(client, "van_data", van_qty, vanFilters);
    const refineRows = await fetchFromTable(client, "refine_data", refine_qty, refineFilters);
    const premiumRows = await fetchFromTable(client, "premium_data", premium_qty, premiumFilters);

    const allRows = [...vanRows, ...refineRows, ...premiumRows];
    if (allRows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "No matching leads found for this request criteria." });
    }

    const phones = allRows.map((r) => r.phone);
    let badPhoneSet = new Set();
    let finalGoodRows = allRows;
    let finalBadRows = [];
    
    // We skip async scrub for this mixed request to keep it simple, or run standard scrub
    const scrubResult = await scrubPhones(phones);
    
    let blacklist = 0, stateDnc = 0, federalDnc = 0, badPhone = 0;
    if (scrubResult.bad.length > 0) {
      const badPhones = scrubResult.bad.map((b) => b.phone);
      badPhoneSet = new Set(badPhones);
      const scrubInfoByPhone = new Map(scrubResult.bad.map((b) => [b.phone, b]));

      // Update dead numbers
      await upsertDeadNumbersBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });

      finalBadRows = allRows.filter((r) => badPhoneSet.has(normalizePhone(r.phone))).map(r => {
        const info = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
        const typeLower = String(info.type || "").toLowerCase();
        if (typeLower.includes("federal")) federalDnc++;
        else if (typeLower.includes("state")) stateDnc++;
        else if (typeLower.includes("invalid") || typeLower.includes("bad")) badPhone++;
        else blacklist++;
        return {
          ...r,
          dnc_type: info.type || "DNC",
          reason: info.reason || "Blacklist Alliance Match"
        };
      });
      finalGoodRows = allRows.filter((r) => !badPhoneSet.has(normalizePhone(r.phone)));
    }

    const parserGood = new Parser({ fields: CSV_GOOD_FIELDS });
    const parserBad = new Parser({ fields: CSV_BAD_FIELDS });

    const goodCsv = finalGoodRows.length > 0 ? parserGood.parse(finalGoodRows) : "";
    const badCsv = finalBadRows.length > 0 ? parserBad.parse(finalBadRows) : "";
    
    const summary = {
      fileName: \`approved_mixed_\${id}.csv\`,
      scrubDate: new Date().toLocaleString(),
      total: allRows.length,
      blacklist, suppress: 0, stateDnc, federalDnc, wireless: 0, landline: 0,
      good: finalGoodRows.length, errors: 0, badPhone
    };

    const payloadObj = {
      isScrubbed: true,
      goodCsv,
      badCsv,
      summary
    };

    const csvDataString = JSON.stringify(payloadObj);

    await client.query(
      \`UPDATE mixed_download_requests SET status = 'accepted', reviewed_at = NOW(), reviewed_by = $1, csv_data = $2 WHERE id = $3\`,
      [req.user.id, csvDataString, id]
    );

    // Save download log
    await client.query(
      \`INSERT INTO mixed_download_logs (user_id, quantity, states, min_age, max_age, csv_payload, approved_by) VALUES ($1, $2, $3, $4, $5, $6, $7)\`,
      [
        dlReq.admin_id,
        finalGoodRows.length,
        dlReq.states ? (typeof dlReq.states === 'string' ? dlReq.states : JSON.stringify(dlReq.states)) : null,
        dlReq.min_age || null,
        dlReq.max_age || null,
        csvDataString,
        req.user.id
      ]
    );

    await client.query("COMMIT");
    client.release();

    await createNotification(dlReq.admin_id, "download_request_accepted", "✅ Download Request Approved", \`Your mixed download request has been approved.\`, id);

    return res.status(200).json({ message: \`Request approved. \${finalGoodRows.length} leads are ready for the admin to download.\`, lead_count: finalGoodRows.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("Review Mixed Request Error:", err);
    return res.status(500).json({ message: "Server error reviewing request" });
  }
};

const executeApprovedDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(\`SELECT * FROM mixed_download_requests WHERE id=$1 AND admin_id=$2\`, [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Request not found." });
    
    const dlReq = result.rows[0];
    if (dlReq.status !== "accepted") return res.status(400).json({ message: \`Request is \${dlReq.status}\` });
    if (!dlReq.csv_data) return res.status(400).json({ message: "CSV data not available." });

    if (typeof dlReq.csv_data === 'string' && dlReq.csv_data.trim().startsWith("{")) {
        return res.status(200).json(JSON.parse(dlReq.csv_data));
    } else if (typeof dlReq.csv_data === 'object') {
        return res.status(200).json(dlReq.csv_data);
    }
    
    return res.status(400).json({ message: "Invalid CSV payload." });
  } catch (err) {
    console.error("Execute Approved Download Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  downloadMixedData,
  getAlreadyDownloaded,
  getDownloadFile,
  createMixedDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload
};
`;

fs.writeFileSync(filepath, content);
console.log('Appended successfully');
