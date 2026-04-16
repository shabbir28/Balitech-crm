const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/verify-ip
router.get("/verify-ip", (req, res) => res.status(200).json({ success: true }));

module.exports = router;
