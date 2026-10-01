const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/role");
const upload = require("../middleware/upload");
const { listSeparation, importSeparation, deleteSeparation } = require("../controllers/safeQuoteSeparationController");

router.use(auth);
router.get("/", authorizeRole(["super_admin", "admin", "data_entry"]), listSeparation);
router.post("/import", authorizeRole(["super_admin", "admin", "data_entry"]), upload.single("file"), importSeparation);
router.delete("/:id", authorizeRole(["super_admin", "admin"]), deleteSeparation);

module.exports = router;
