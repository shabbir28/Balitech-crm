const db = require("../config/db");
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");

// POST /api/dead-numbers/upload
const uploadDeadNumbers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const source = req.file.originalname || "Manual Upload";
        const userId = req.user?.id || null;

        const records = await processFileBuffer(
            req.file.path,
            req.file.mimetype,
            req.file.originalname
        );
        cleanupFile(req.file.path); // remove temp file

        const phones = [];
        for (const r of records) {
            if (r.phone) phones.push(r.phone);
        }

        const uniquePhones = Array.from(new Set(phones));
        if (uniquePhones.length === 0) {
            return res.status(400).json({ message: "No valid phone numbers found in file" });
        }

        const BATCH_SIZE = 1000;
        let deletedCount = 0;
        const campaignBreakdown = {};
        // Track which phones were found in leads (existed in leads db)
        const phonesFoundInLeads = new Set();

        for (let i = 0; i < uniquePhones.length; i += BATCH_SIZE) {
            const chunk = uniquePhones.slice(i, i + BATCH_SIZE);

            // 1. Insert into dead_numbers
            const valueStrings = [];
            const values = [];
            let idx = 1;
            for (const p of chunk) {
                valueStrings.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
                values.push(p, source, userId);
                idx += 3;
            }

            const insertQuery = `
                INSERT INTO dead_numbers (phone, source, created_by)
                VALUES ${valueStrings.join(",")}
                ON CONFLICT (phone) DO NOTHING
            `;
            await db.query(insertQuery, values);

            // 2. Delete from leads (main data)
            const placeholders = chunk.map((_, index) => `$${index + 1}`).join(",");
            const deleteQuery = `
                DELETE FROM leads 
                WHERE phone IN (${placeholders})
                RETURNING phone, campaign_type
            `;
            const deleteResult = await db.query(deleteQuery, chunk);
            deletedCount += deleteResult.rowCount;

            // Count breakdown per campaign & track found phones
            for (const row of deleteResult.rows) {
                phonesFoundInLeads.add(row.phone);
                const cType = row.campaign_type || "Untagged";
                campaignBreakdown[cType] = (campaignBreakdown[cType] || 0) + 1;
            }
        }

        const freshNumbers = uniquePhones.length - phonesFoundInLeads.size;

        res.json({
            message: "Dead numbers processed successfully",
            total_in_file: uniquePhones.length,
            total_found_in_leads: phonesFoundInLeads.size,
            total_fresh_numbers: freshNumbers,
            total_deleted_from_main: deletedCount,
            campaign_breakdown: campaignBreakdown
        });

    } catch (err) {
        console.error("Upload Dead Numbers Error:", err);
        res.status(500).json({ message: "Server error processing dead numbers" });
    }
};

// GET /api/dead-numbers
const listDeadNumbers = async (req, res) => {
    try {
        const { page = 1, limit = 50, search } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const offset = (pageNum - 1) * limitNum;

        const params = [];
        let where = "WHERE 1=1";

        if (search) {
            params.push(`%${search}%`);
            where += ` AND (d.phone ILIKE $${params.length} OR d.source ILIKE $${params.length})`;
        }

        const dataQuery = `
            SELECT d.*, u.username AS created_by_username
            FROM dead_numbers d
            LEFT JOIN users u ON d.created_by = u.id
            ${where}
            ORDER BY d.created_at DESC
            LIMIT $${params.length + 1}
            OFFSET $${params.length + 2};
        `;
        const countQuery = `
            SELECT COUNT(*) AS count
            FROM dead_numbers d
            ${where};
        `;

        const [dataResult, countResult] = await Promise.all([
            db.query(dataQuery, [...params, limitNum, offset]),
            db.query(countQuery, params),
        ]);

        res.json({
            data: dataResult.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page: pageNum,
            limit: limitNum,
        });
    } catch (err) {
        console.error("List Dead Numbers Error:", err);
        res.status(500).json({ message: "Server error fetching dead numbers" });
    }
};

module.exports = {
    uploadDeadNumbers,
    listDeadNumbers
};
