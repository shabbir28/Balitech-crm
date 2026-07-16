const express = require("express");
const router = express.Router();
const deadNumberController = require("../controllers/deadNumberController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(authMiddleware);

router.post("/upload", upload.single("file"), deadNumberController.uploadDeadNumbers);
router.get("/download", deadNumberController.downloadDeadNumbers);
router.get("/", deadNumberController.listDeadNumbers);

module.exports = router;
