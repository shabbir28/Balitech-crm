const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/role");
const upload = require("../middleware/upload");

const {
  listDnc,
  addDnc,
  importDnc,
  deleteDnc,
  getDncExportCount,
  downloadDnc,
} = require("../controllers/refineDncController");

// super_admin, admin can manage DNC
router.get("/", auth, authorizeRole(["super_admin", "admin"]), listDnc);
router.post("/", auth, authorizeRole(["super_admin", "admin"]), addDnc);
router.post(
  "/import",
  auth,
  authorizeRole(["super_admin", "admin"]),
  upload.single("file"),
  importDnc,
);
router.get(
  "/export-count",
  auth,
  authorizeRole(["super_admin", "admin"]),
  getDncExportCount,
);
router.post(
  "/download",
  auth,
  authorizeRole(["super_admin", "admin"]),
  downloadDnc,
);
router.delete("/:id", auth, authorizeRole(["super_admin", "admin"]), deleteDnc);

module.exports = router;

