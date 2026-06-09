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

  process.exit(1);

});
 
process.on("unhandledRejection", (reason) => {

  console.error("💥 Unhandled Rejection:", reason);

  process.exit(1);

});
 