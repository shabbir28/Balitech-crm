const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filterController");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/role");

// All filter routes require authentication and admin/super_admin privileges
router.use(authenticate);
router.use(authorize(["super_admin", "admin"]));

router.get("/", filterController.getFilters);
router.post("/", filterController.createFilter);
router.put("/:id", filterController.updateFilter);
router.delete("/:id", filterController.deleteFilter);

module.exports = router;
