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
const refineSessionRoutes = require("./routes/refine_sessions");
const refineJobRoutes = require("./routes/refine_jobs");
const refineDataRoutes = require("./routes/refine_data");
const refineDownloadRoutes = require("./routes/refine_download");
const refineDncRoutes = require("./routes/refine_dnc");
const refineVendorRoutes = require("./routes/refine_vendors");
const refineCampaignRoutes = require("./routes/refine_campaigns");
const dncCheckerRoutes    = require("./routes/dnc_checker");
const filterRoutes = require("./routes/filters");
const deadNumberRoutes = require("./routes/deadNumberRoutes");

const premiumVendorRoutes = require("./routes/premium_vendors");
const premiumCampaignRoutes = require("./routes/premium_campaigns");
const premiumSessionRoutes = require("./routes/premium_sessions");
const premiumJobRoutes = require("./routes/premium_jobs");
const premiumDataRoutes = require("./routes/premium_data");
const premiumDownloadRoutes = require("./routes/premium_download");
const premiumDncRoutes = require("./routes/premium_dnc");

// Van Desk
const vanVendorRoutes = require("./routes/van_vendors");
const vanCampaignRoutes = require("./routes/van_campaigns");
const vanSessionRoutes = require("./routes/van_sessions");
const vanJobRoutes = require("./routes/van_jobs");
const vanDataRoutes = require("./routes/van_data");
const vanDownloadRoutes = require("./routes/van_download");
const mixedDownloadRoutes = require("./routes/mixed_download");

const clientRoutes = require("./routes/clientRoutes");
const separationRoutes = require("./routes/separationRoutes");

const enforceIPWhitelist = require("./middleware/ipWhitelist");
 
if (!process.env.JWT_SECRET) {

  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");

  process.exit(1);

}
 
const app = express();
 
// =========================

// CORS

// =========================

app.use(cors());
 
// =========================

// BODY PARSING

// =========================

app.use(express.json({ limit: "300mb" }));

app.use(express.urlencoded({ extended: true, limit: "300mb" }));
 
// =========================

// REQUEST LOGGER

// =========================

app.use((req, res, next) => {

  const start = Date.now();

  console.log(`➡️  ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {

    const duration = Date.now() - start;

    const flag = duration > 5000 ? "⚠️ SLOW" : "✅";

    console.log(`${flag} ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);

  });

  next();

});
 
// =========================

// REQUEST TIMEOUT (270s)

// Slightly under Nginx's proxy_read_timeout of 300s

// so Node responds with 503 instead of Nginx cutting with 504

// =========================

app.use((req, res, next) => {

  req.setTimeout(270 * 1000, () => {

    console.error(`⏱️  Request timeout: ${req.method} ${req.originalUrl}`);

    if (!res.headersSent) {

      res.status(503).json({ error: "Request timed out. Please try again." });

    }

  });

  next();

});
 
// =========================

// STATIC FILES

// =========================

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
 
// =========================

// IP WHITELIST

// =========================

app.use("/api", enforceIPWhitelist);
 
// =========================

// ROUTES

// =========================

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

app.use("/api/refine-sessions", refineSessionRoutes);
app.use("/api/refine-jobs", refineJobRoutes);
app.use("/api/refine-data", refineDataRoutes);
app.use("/api/refine-download", refineDownloadRoutes);
app.use("/api/refine-dnc", refineDncRoutes);
app.use("/api/refine-vendors", refineVendorRoutes);
app.use("/api/refine-campaigns", refineCampaignRoutes);
app.use("/api/dnc-checker",     dncCheckerRoutes);
app.use("/api/filters", filterRoutes);
app.use("/api/dead-numbers", deadNumberRoutes);

app.use("/api/premium-vendors", premiumVendorRoutes);
app.use("/api/premium-campaigns", premiumCampaignRoutes);
app.use("/api/premium-sessions", premiumSessionRoutes);
app.use("/api/premium-jobs", premiumJobRoutes);
app.use("/api/premium-data", premiumDataRoutes);
app.use("/api/premium-download", premiumDownloadRoutes);
app.use("/api/premium-dnc", premiumDncRoutes);

// Van Desk
app.use("/api/van-vendors", vanVendorRoutes);
app.use("/api/van-campaigns", vanCampaignRoutes);
app.use("/api/van-sessions", vanSessionRoutes);
app.use("/api/van-jobs", vanJobRoutes);
app.use("/api/van-data", vanDataRoutes);
app.use("/api/van-download", vanDownloadRoutes);
app.use("/api/mixed-download", mixedDownloadRoutes);

// Clients and Separation
app.use("/api/clients", clientRoutes);
app.use("/api/separation", separationRoutes);
 
// =========================

// HEALTH CHECK

// =========================

app.get("/health", (req, res) => {

  res.json({ status: "ok", timestamp: new Date() });

});
 
// =========================

// GLOBAL ERROR HANDLER

// =========================

app.use((err, req, res, next) => {

  console.error(`❌ Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  if (!res.headersSent) {

    res.status(500).json({ error: "Internal server error." });

  }

});
 
// =========================

// START SERVER

// =========================

const PORT = process.env.PORT || 5000;
 
const server = app.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`);

});
 
// Nginx proxy_read_timeout is 300s — Node timeouts must be HIGHER

// to prevent Nginx from cutting the connection first on keep-alive

server.keepAliveTimeout = 120 * 1000; // 120 seconds

server.headersTimeout = 125 * 1000;   // must be > keepAliveTimeout
 
// =========================

// GRACEFUL SHUTDOWN

// =========================

process.on("SIGTERM", () => {

  console.log("🛑 SIGTERM received. Shutting down gracefully...");

  server.close(() => {

    console.log("✅ Server closed.");

    process.exit(0);

  });

});
 
process.on("uncaughtException", (err) => {

  console.error("💥 Uncaught Exception:", err);

  // Only exit for truly fatal errors (e.g. port already in use)
  if (err.code === "EADDRINUSE" || err.code === "EACCES") {
    process.exit(1);
  }

  // For other uncaught exceptions, log but keep running
  console.error("⚠️  Server continuing after uncaught exception...");

});
 
process.on("unhandledRejection", (reason) => {

  // Log the rejection but do NOT kill the process — transient DB errors
  // (e.g. during IP whitelist cache refresh on first request) were crashing
  // the entire server. Route-level handlers and middleware already have
  // try/catch; this is a safety net for any that slip through.
  console.error("💥 Unhandled Rejection (non-fatal):", reason);

});


