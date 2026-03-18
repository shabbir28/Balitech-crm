const db = require('./src/config/db');
const { parsePhone } = require('./src/utils/phoneParser');

async function updateExistingLeads() {
    try {
        const result = await db.query("SELECT id, phone FROM leads WHERE area_code = 'Unknown'");
        console.log(`Found ${result.rows.length} leads with Unknown area code.`);

        for (const lead of result.rows) {
            const { countryCode, areaCode } = parsePhone(lead.phone);
            if (areaCode !== 'Unknown') {
                await db.query("UPDATE leads SET country_code = $1, area_code = $2 WHERE id = $3", [countryCode, areaCode, lead.id]);
            }
        }
        console.log('Update completed.');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        process.exit();
    }
}

updateExistingLeads();
