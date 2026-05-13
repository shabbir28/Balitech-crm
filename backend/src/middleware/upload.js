const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─── Disk Storage (RAM save karo — file disk par jayegi) ───────────────────
// Pehle: memoryStorage() → puri file RAM mein → OOM crash with big files
// Ab:    diskStorage()   → file /tmp mein save → RAM safe rehti hai
const UPLOAD_TMP_DIR = path.join(os.tmpdir(), 'crm-uploads');
if (!fs.existsSync(UPLOAD_TMP_DIR)) {
    fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_TMP_DIR),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

// Accept only CSV, Excel (.xlsx, .xls) and Text (.txt) files
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls' || ext === '.txt') {
        cb(null, true);
    } else {
        cb(new Error('Only CSV, Excel or TXT files are allowed'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 300 * 1024 * 1024 }, // 300MB max file size
    fileFilter,
});

// Helper: temp file delete karo processing ke baad
const cleanupFile = (filePath) => {
    if (filePath) {
        fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                console.error('Temp file cleanup error:', err.message);
            }
        });
    }
};

module.exports = upload;
module.exports.cleanupFile = cleanupFile;
