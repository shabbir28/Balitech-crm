const csvParser = require('csv-parser');
const xlsx = require('xlsx');
const stream = require('stream');

const processFileBuffer = async (buffer, mimetype, originalname) => {
    const records = [];

    const isExcel = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    mimetype === 'application/vnd.ms-excel' || 
                    originalname.endsWith('.xlsx') || 
                    originalname.endsWith('.xls');

    if (isExcel) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '', header: 1 }); // read as array of arrays
        
        // Check if first row is a header row (contains text)
        let startIndex = 0;
        if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            const firstVal = String(firstRow[0]).toLowerCase();
            if (firstVal.includes('phone') || firstVal.includes('number') || isNaN(parseInt(firstVal.replace(/\D/g,'')))) {
                // looks like a header, skip it
                startIndex = 1;
            }
        }

        for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            // If it's just a single column, assume it's the phone
            let phone = '';
            let name = '';
            let email = '';

            if (row.length === 1) {
                phone = String(row[0]).trim();
            } else {
                // If multiple columns, try to guess or use index.
                // Assuming standard format if no header: [Phone, Name, Email] or [Name, Phone, Email]
                // Let's look for the one that looks most like a phone number
                const col1 = String(row[0] || '').trim();
                const col2 = String(row[1] || '').trim();
                
                // Very basic guess: the one with more numbers is the phone
                const digits1 = (col1.match(/\d/g) || []).length;
                const digits2 = (col2.match(/\d/g) || []).length;
                
                if (digits1 > digits2) {
                    phone = col1;
                    name = col2;
                } else {
                    name = col1;
                    phone = col2;
                }
                email = String(row[2] || '').trim();
            }

            if (phone) {
                records.push({ name, phone, email });
            }
        }
        return records;
    } else {
        // CSV Uploads
        return new Promise((resolve, reject) => {
            const bufferStream = new stream.PassThrough();
            bufferStream.end(buffer);
            bufferStream
                .pipe(csvParser({ headers: false })) // read as arrays
                .on('data', (row) => {
                    const values = Object.values(row);
                    if (values.length === 0) return;

                    let phone = '';
                    let name = '';
                    let email = '';

                    // Skip header row if it exists
                    if (records.length === 0) {
                        const firstVal = String(values[0]).toLowerCase();
                        if (firstVal.includes('phone') || firstVal.includes('number') || isNaN(parseInt(firstVal.replace(/\D/g,'')))) {
                            return; // skip header
                        }
                    }

                    if (values.length === 1) {
                        phone = String(values[0]).trim();
                    } else {
                        const col1 = String(values[0] || '').trim();
                        const col2 = String(values[1] || '').trim();
                        
                        const digits1 = (col1.match(/\d/g) || []).length;
                        const digits2 = (col2.match(/\d/g) || []).length;
                        
                        if (digits1 > digits2) {
                            phone = col1;
                            name = col2;
                        } else {
                            name = col1;
                            phone = col2;
                        }
                        email = String(values[2] || '').trim();
                    }

                    if (phone) {
                        records.push({ name, phone, email });
                    }
                })
                .on('end', () => resolve(records))
                .on('error', (err) => reject(err));
        });
    }
};

module.exports = { processFileBuffer };
