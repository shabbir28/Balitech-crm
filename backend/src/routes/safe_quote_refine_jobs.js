const express = require("express");
const router = express.Router();
const { createJob, getJobStatus, compareJob } = require("../controllers/safeQuoteRefineJobController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/role");
const upload = require("../middleware/upload");

router.use(auth);
const roles = ["super_admin", "admin", "data_entry", "dialer_agent"];

router.post("/", authorizeRole(roles), upload.single("file"), createJob);
router.post("/compare", authorizeRole(roles), upload.single("file"), compareJob);
router.get("/:jobId/status", authorizeRole(roles), getJobStatus);

module.exports = router;
