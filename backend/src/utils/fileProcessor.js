const csvParser = require('csv-parser');
const xlsx = require('xlsx');
const stream = require('stream');

const KNOWN_STATES = new Set(['al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia','ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj','nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt','va','wa','wv','wi','wy', 'california', 'new york', 'texas', 'florida', 'north carolina', 'pennsylvania', 'michigan', 'washington', 'georgia', 'ohio', 'illinois']);

const KNOWN_DISPOSITIONS = new Set(['wrong number', 'voicemail', 'no answer', 'interested', 'not interested', 'callback', 'do not call', 'dnc', 'disconnected', 'busy', 'dead air', 'language barrier', 'sold', 'hung up', 'not eligible']);

const guessIndices = (rowLower) => {
    const phoneIdx = rowLower.findIndex(v => v.includes('phone') || v === 'number' || v.includes('contact'));
    const nameIdx = rowLower.findIndex(v => v.includes('name'));
    const emailIdx = rowLower.findIndex(v => v.includes('email'));
    const dispIdx = rowLower.findIndex(v => v.includes('disp') || v.includes('status') || v.includes('result'));
    return { phoneIdx, nameIdx, emailIdx, dispIdx };
};

const processFileBuffer = async (buffer, mimetype, originalname) => {
    const records = [];
    let isHeaderDetected = false;
    let headerIndices = null;

    const parseDataRow = (values) => {
        if (!values || values.length === 0) return null;

        let phone = '', name = '', email = '', disposition = '';

        if (isHeaderDetected && headerIndices) {
            if (headerIndices.phoneIdx !== -1) phone = String(values[headerIndices.phoneIdx] || '').trim();
            if (headerIndices.nameIdx !== -1) name = String(values[headerIndices.nameIdx] || '').trim();
            if (headerIndices.emailIdx !== -1) email = String(values[headerIndices.emailIdx] || '').trim();
            if (headerIndices.dispIdx !== -1) disposition = String(values[headerIndices.dispIdx] || '').trim();
            
            // Fallback for phone if missing
            if (!phone) {
                for (let i = 0; i < values.length; i++) {
                    const val = String(values[i] || '').trim();
                    if ((val.match(/\d/g) || []).length >= 7 && i !== headerIndices.nameIdx && i !== headerIndices.emailIdx && i !== headerIndices.dispIdx) {
                        phone = val;
                        break;
                    }
                }
            }
        } else {
            // Intelligent per-row Guessing
            let pIdx = -1, nIdx = -1, eIdx = -1, dIdx = -1;
            
            // Pass 1: exact matching
            values.forEach((v, i) => {
                const val = String(v).trim();
                const lower = val.toLowerCase();
                if (!val) return;

                if (val.includes('@') && val.includes('.')) {
                    eIdx = i;
                } else if ((val.match(/\d/g) || []).length >= 7) {
                    if (pIdx === -1) pIdx = i; 
                } else if (KNOWN_DISPOSITIONS.has(lower)) {
                    dIdx = i;
                }
            });

            const used = new Set([pIdx, eIdx, dIdx].filter(x => x !== -1));
            
            // Pass 2: fill blanks
            values.forEach((v, i) => {
                if (used.has(i)) return;
                const val = String(v).trim();
                if (!val) return;
                const lower = val.toLowerCase();

                if (KNOWN_STATES.has(lower)) {
                    return; // Ignore states
                }

                // Strict check: Is this likely a person's name? (Only letters, max 2 words)
                const isNameLikely = /^[a-zA-Z]+( [a-zA-Z]+)?$/.test(val);

                if (nIdx === -1 && isNameLikely && val.length < 30) {
                    nIdx = i;
                    used.add(i);
                } else if (dIdx === -1 && val.length > 1 && val.length < 50) {
                    dIdx = i;
                    used.add(i);
                }
            });

            if (pIdx !== -1) phone = String(values[pIdx] || '').trim();
            if (nIdx !== -1) name = String(values[nIdx] || '').trim();
            if (eIdx !== -1) email = String(values[eIdx] || '').trim();
            if (dIdx !== -1) disposition = String(values[dIdx] || '').trim();
        }

        if (phone) {
            return { name, phone, email, disposition };
        }
        return null;
    };

    const isExcel = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    mimetype === 'application/vnd.ms-excel' || 
                    originalname.endsWith('.xlsx') || 
                    originalname.endsWith('.xls');

    if (isExcel) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '', header: 1 });
        
        for (let i = 0; i < jsonData.length; i++) {
            if (i === 0 && jsonData[i].length > 0) {
                const rowLower = jsonData[i].map(v => String(v).trim().toLowerCase());
                const hasHeader = rowLower.some(v => v === 'phone' || v === 'number' || v === 'name' || v === 'email' || v === 'disposition');
                if (hasHeader) {
                    isHeaderDetected = true;
                    headerIndices = guessIndices(rowLower);
                    continue;
                }
            }
            
            const record = parseDataRow(jsonData[i]);
            if (record) records.push(record);
        }
        return records;
    } else {
        // CSV Uploads
        return new Promise((resolve, reject) => {
            let isFirstRow = true;
            const bufferStream = new stream.PassThrough();
            bufferStream.end(buffer);
            bufferStream
                .pipe(csvParser({ headers: false }))
                .on('data', (row) => {
                    const values = Object.values(row);
                    if (values.length === 0) return;

                    if (isFirstRow) {
                        isFirstRow = false;
                        const rowLower = values.map(v => String(v).trim().toLowerCase());
                        const hasHeader = rowLower.some(v => v === 'phone' || v === 'number' || v === 'name' || v === 'email' || v === 'disposition');
                        if (hasHeader) {
                            isHeaderDetected = true;
                            headerIndices = guessIndices(rowLower);
                            return;
                        }
                    }

                    const record = parseDataRow(values);
                    if (record) records.push(record);
                })
                .on('end', () => resolve(records))
                .on('error', (err) => reject(err));
        });
    }
};

module.exports = { processFileBuffer };
