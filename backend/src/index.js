const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const vendorRoutes = require("./routes/vendors");
const leadRoutes = require("./routes/leads");
const dashboardRoutes = require("./routes/dashboard");
const downloadRoutes = require("./routes/download");
const sessionRoutes = require("./routes/sessions");
const jobRoutes = require("./routes/jobs");
const userRoutes = require("./routes/users");
const campaignRoutes = require("./routes/campaigns");
const dncRoutes = require("./routes/dnc");
const securityRoutes = require("./routes/security");
const notificationRoutes = require("./routes/notifications");
const enforceIPWhitelist = require("./middleware/ipWhitelist");

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Global IP Whitelist Enforcement for ALL APIs
app.use("/api", enforceIPWhitelist);

app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/dnc", dncRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
