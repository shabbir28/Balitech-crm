const express = require("express");
const router = express.Router();
const mixedDownloadController = require("../controllers/mixedDownloadController");
const verifyToken = require("../middleware/auth");
const authorizeRole = require("../middleware/role");

// For super_admin to execute direct download
router.post("/", verifyToken, authorizeRole(["super_admin", "admin"]), mixedDownloadController.downloadMixedData);
router.get("/files/:fileName", verifyToken, authorizeRole(["super_admin", "admin"]), mixedDownloadController.downloadMixedExportFile);

router.get("/already-downloaded", verifyToken, authorizeRole(["super_admin", "admin"]), mixedDownloadController.getAlreadyDownloaded);

router.get("/logs/:id/file", verifyToken, authorizeRole(["super_admin", "admin"]), mixedDownloadController.getDownloadFile);

module.exports = router;
