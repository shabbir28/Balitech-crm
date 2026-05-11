const multer = require('multer');
const path = require('path');

// Configure memory storage
const storage = multer.memoryStorage();

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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    fileFilter
});

module.exports = upload;
