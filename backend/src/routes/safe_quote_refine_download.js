const express = require("express");
const router = express.Router();
const {
  downloadData,
  getDownloadOptions,
  getStateCounts,
  previewScrub,
  createDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload,
} = require("../controllers/safeQuoteRefineDownloadController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/role");

router.use(auth);
const roles = ["super_admin", "admin", "data_entry", "dialer_agent"];
router.get("/options", authorizeRole(roles), getDownloadOptions);
router.post("/state-counts", authorizeRole(roles), getStateCounts);
router.post("/preview-scrub", authorizeRole(["admin", "data_entry", "dialer_agent"]), previewScrub);
router.post("/request", authorizeRole(["admin", "data_entry", "dialer_agent"]), createDownloadRequest);
router.get("/requests/mine", authorizeRole(["admin", "data_entry", "dialer_agent"]), getMyDownloadRequests);
router.get("/requests", authorizeRole(["super_admin"]), getDownloadRequests);
router.patch("/requests/:id", authorizeRole(["super_admin"]), reviewDownloadRequest);
router.get("/requests/:id/file", authorizeRole(["admin", "data_entry", "dialer_agent"]), executeApprovedDownload);
router.post("/", authorizeRole(["super_admin"]), downloadData);

module.exports = router;
