const express = require("express");
const router = express.Router();
const { getLeads } = require("../controllers/safeQuoteRefineDataController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/role");

router.use(auth);
router.get("/", authorizeRole(["super_admin", "admin", "data_entry", "dialer_agent"]), getLeads);

module.exports = router;
