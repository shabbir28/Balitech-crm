const express = require("express");
const router = express.Router();
const { createSession, getSessions, getSession, deleteSession } = require("../controllers/safeQuoteRefineSessionController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/role");

router.use(auth);
const roles = ["super_admin", "admin", "data_entry", "dialer_agent"];

router.post("/", authorizeRole(roles), createSession);
router.get("/", authorizeRole(roles), getSessions);
router.get("/:id", authorizeRole(roles), getSession);
router.delete("/:id", authorizeRole(["super_admin", "admin"]), deleteSession);

module.exports = router;
