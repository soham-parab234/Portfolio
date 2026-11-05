const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Parse .env if it exists without external dependencies
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    raw.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (e) {
    console.warn("Notice: Could not load .env file:", e.message);
  }
}

const config = {
  port: Number(process.env.PORT) || 4173,
  nodeEnv: process.env.NODE_ENV || "development",
  enforceHttps: process.env.ENFORCE_HTTPS === "true" || process.env.NODE_ENV === "production",
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS) || 24,
  adminEmail: process.env.ADMIN_EMAIL || "alex.stone@example.com",
  
  // Rate limiting thresholds
  rateLimits: {
    loginMaxAttempts: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
    loginWindowMs: (Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MINS) || 15) * 60 * 1000,
    apiMaxRequests: Number(process.env.RATE_LIMIT_API_MAX) || 60,
    apiWindowMs: 60 * 1000,
    registerMaxAttempts: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 3,
    registerWindowMs: 60 * 60 * 1000,
    resetMaxAttempts: Number(process.env.RATE_LIMIT_RESET_MAX) || 3,
    resetWindowMs: 60 * 60 * 1000,
    aiMaxRequests: Number(process.env.RATE_LIMIT_AI_MAX) || 10,
    aiWindowMs: 60 * 60 * 1000
  },

  // Token TTLs
  tokenTtl: {
    passwordResetMs: 15 * 60 * 1000, // 15 minutes
    emailVerificationMs: 24 * 60 * 60 * 1000 // 24 hours
  },

  // File paths
  dataDir: path.resolve(__dirname, "data"),
  dbFile: path.resolve(__dirname, "data", "database.json"),
  logDir: path.resolve(__dirname, "logs"),
  auditLogFile: path.resolve(__dirname, "logs", "security_audit.log"),
  uploadsDir: path.resolve(__dirname, "data", "uploads"),
  rootDir: path.resolve(__dirname, "..")
};

// Ensure data and log directories exist
if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
if (!fs.existsSync(config.logDir)) fs.mkdirSync(config.logDir, { recursive: true });
if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });

module.exports = config;

