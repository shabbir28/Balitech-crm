/**
 * Extracts phone information.
 * Simple implementation for demonstration. Needs more robust logic for standard parsing.
 * Assuming format like +[countryode] [areacode] [number] or simple numbers
 */
const parsePhone = (rawPhone) => {
    if (!rawPhone) return { phone: null, countryCode: null, areaCode: null };
    
    // Clean all non-digit and non-plus characters
    let cleaned = rawPhone.toString().replace(/[^\d+]/g, '');
    
    // If no plus, assume US standard for now or just take raw as phone
    // Real implementation would use Google's libphonenumber or similar
    let countryCode = null;
    let areaCode = null;

    if (cleaned.startsWith('+')) {
        // e.g. +1234567890 (US) or +44... (UK)
        // Simplification: assume +1
        if (cleaned.startsWith('+1')) {
            countryCode = '1';
            if (cleaned.length >= 5) {
                areaCode = cleaned.substring(2, 5);
            }
        } else {
            // General extraction (take first 2-3 digits as country code, then next 2-3 as area)
            // Highly inaccurate for all global numbers without proper library
            const match = cleaned.match(/^\+(\d{1,3})(\d{1,3})/);
            if (match) {
                countryCode = match[1];
                areaCode = match[2];
            }
        }
    } else if (cleaned.length === 10) {
       // Assume US 10-digit number
       countryCode = '1';
       areaCode = cleaned.substring(0, 3);
    }

    return {
        phone: cleaned,
        countryCode: countryCode || 'Unknown',
        areaCode: areaCode || 'Unknown'
    };
};

module.exports = { parsePhone };
