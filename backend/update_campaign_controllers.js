const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    { file: 'campaignController.js', table: 'campaigns', getC: 'const getCampaigns = async (req, res) => {' },
    { file: 'premiumCampaignController.js', table: 'premium_campaigns', getC: 'const getCampaigns = async (req, res) => {' },
    { file: 'refineCampaignController.js', table: 'refine_campaigns', getC: 'const getCampaigns = async (req, res) => {' },
    { file: 'vanCampaignController.js', table: 'van_campaigns', getC: 'const getCampaigns = async (req, res) => {' },
];

filesToUpdate.forEach(({ file, table, getC }) => {
    const filePath = path.join(__dirname, 'src', 'controllers', file);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Find where getCampaigns starts and the next function starts.
    const startIdx = content.indexOf(getC);
    if (startIdx === -1) {
        console.error(`Could not find getCampaigns in ${file}`);
        return;
    }

    const nextFuncIdx1 = content.indexOf('const getCampaignById', startIdx);
    const nextFuncIdx2 = content.indexOf('// GET', startIdx + 10);
    const endIdx = Math.min(
        nextFuncIdx1 !== -1 ? nextFuncIdx1 : Infinity,
        nextFuncIdx2 !== -1 ? nextFuncIdx2 : Infinity
    );

    if (endIdx === Infinity) {
        console.error(`Could not find end of getCampaigns in ${file}`);
        return;
    }

    const newGetCampaigns = `${getC}
  try {
    let result;
    if (req.user && req.user.role === 'dialer_agent') {
        const accessible = req.user.accessible_campaigns || [];
        if (accessible.length === 0) {
            return res.json([]);
        }
        result = await db.query(
            \`SELECT * FROM ${table} WHERE campaign_id = ANY($1::int[]) ORDER BY created_at DESC\`,
            [accessible]
        );
    } else {
        result = await db.query(
            \`SELECT * FROM ${table} ORDER BY created_at DESC\`
        );
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching ${table}:", err);
    res.status(500).json({ message: "Server error fetching ${table}" });
  }
};

`;

    content = content.substring(0, startIdx) + newGetCampaigns + content.substring(endIdx);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
});
