const express = require("express");
const router = express.Router();
const mixedDownloadController = require("../controllers/mixedDownloadController");
const verifyToken = require("../middleware/auth");
const authorizeRole = require("../middleware/role");

// For super_admin to execute direct download
router.post("/", verifyToken, authorizeRole(["super_admin"]), mixedDownloadController.downloadMixedData);

router.post("/request", verifyToken, authorizeRole(["admin", "data_entry", "dialer_agent"]), mixedDownloadController.createMixedDownloadRequest);
router.get("/requests", verifyToken, authorizeRole(["super_admin"]), mixedDownloadController.getDownloadRequests);
router.get("/requests/mine", verifyToken, authorizeRole(["admin", "data_entry", "dialer_agent"]), mixedDownloadController.getMyDownloadRequests);
router.patch("/requests/:id", verifyToken, authorizeRole(["super_admin"]), mixedDownloadController.reviewDownloadRequest);
router.get("/requests/:id/file", verifyToken, authorizeRole(["admin", "data_entry", "dialer_agent"]), mixedDownloadController.executeApprovedDownload);

router.get("/already-downloaded", verifyToken, authorizeRole(["super_admin", "admin", "data_entry", "dialer_agent"]), mixedDownloadController.getAlreadyDownloaded);
router.get("/logs/:id/file", verifyToken, authorizeRole(["super_admin", "admin", "data_entry", "dialer_agent"]), mixedDownloadController.getDownloadFile);

module.exports = router;
