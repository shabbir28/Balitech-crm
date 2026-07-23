const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filterController");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");

// All filter routes require authentication and admin/super_admin privileges
router.use(authenticate);
// We will not apply authorize at the router level anymore, but rather on each route
router.get("/", authorize(["super_admin", "admin", "data_entry", "dialer_agent"]), filterController.getFilters);
router.post("/", authorize(["super_admin", "admin"]), filterController.createFilter);
router.put("/:id", authorize(["super_admin", "admin"]), filterController.updateFilter);
router.delete("/:id", authorize(["super_admin", "admin"]), filterController.deleteFilter);

module.exports = router;
