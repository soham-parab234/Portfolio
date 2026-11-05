const fs = require("fs");
const config = require("./config");

function logSecurityEvent(eventType, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ip: details.ip || "unknown",
    userAgent: details.userAgent || "unknown",
    userId: details.userId || null,
    targetResource: details.targetResource || null,
    severity: details.severity || "INFO",
    message: details.message || "",
    meta: details.meta || {}
  };

  const line = JSON.stringify(entry) + "\n";
  try {
    fs.appendFileSync(config.auditLogFile, line, "utf8");
  } catch (err) {
    console.error("Failed to write to audit log:", err.message);
  }

  // Also log to console in non-production or for high severity
  if (config.nodeEnv !== "production" || entry.severity === "WARN" || entry.severity === "CRITICAL") {
    console.log(`[AUDIT:${entry.severity}] [${entry.event}] ${entry.message} (IP: ${entry.ip})`);
  }
}

module.exports = {
  logSecurityEvent
};

