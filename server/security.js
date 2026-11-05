const crypto = require("crypto");
const { logSecurityEvent } = require("./audit");

/* ------------------------------------------------------------
   1. Cryptographic Password Hashing & Constant-Time Verification
   ------------------------------------------------------------ */

function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString("hex");
  }
  const key = crypto.scryptSync(String(password), salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;

  // Modern scrypt format
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedKey = Buffer.from(parts[2], "hex");
    const actualKey = crypto.scryptSync(String(password), salt, 64);
    if (actualKey.length !== expectedKey.length) return false;
    return crypto.timingSafeEqual(actualKey, expectedKey);
  }

  // Fallback for salted SHA-256 (e.g. upgraded from client localStorage)
  if (storedHash.includes(":")) {
    const [salt, expectedHash] = storedHash.split(":");
    const actualHash = crypto.createHash("sha256").update(salt + ":" + String(password)).digest("hex");
    const b1 = Buffer.from(actualHash, "hex");
    const b2 = Buffer.from(expectedHash, "hex");
    if (b1.length !== b2.length) return false;
    return crypto.timingSafeEqual(b1, b2);
  }

  // Legacy SHA-256 fallback
  const actualHash = crypto.createHash("sha256").update(String(password)).digest("hex");
  const b1 = Buffer.from(actualHash, "hex");
  const b2 = Buffer.from(storedHash, "hex");
  if (b1.length !== b2.length) return false;
  return crypto.timingSafeEqual(b1, b2);
}

/* ------------------------------------------------------------
   2. Token Generation
   ------------------------------------------------------------ */

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/* ------------------------------------------------------------
   3. Sliding-Window Rate Limiting (Abuse & Bot Protection)
   ------------------------------------------------------------ */

const rateLimitBuckets = new Map();

function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  let timestamps = rateLimitBuckets.get(key) || [];
  
  // Prune expired timestamps
  timestamps = timestamps.filter(ts => now - ts < windowMs);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    rateLimitBuckets.set(key, timestamps);
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0
    };
  }

  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: maxRequests - timestamps.length
  };
}

// Clean up stale buckets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitBuckets.entries()) {
    const active = timestamps.filter(ts => now - ts < 60 * 60 * 1000);
    if (active.length === 0) {
      rateLimitBuckets.delete(key);
    } else {
      rateLimitBuckets.set(key, active);
    }
  }
}, 10 * 60 * 1000).unref();

/* ------------------------------------------------------------
   4. Input Sanitization & Strict Type Validation
   ------------------------------------------------------------ */

function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/\0/g, "") // Remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove <script> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "") // Remove <iframe> tags
    .replace(/javascript\s*:/gi, "") // Remove inline JS protocol
    .trim();
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 12) return null; // Avoid circular/deep recursion
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  if (typeof obj === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanKey = sanitizeString(k);
      clean[cleanKey] = sanitizeObject(v, depth + 1);
    }
    return clean;
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim()) && email.length <= 254;
}

function validateSafeUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  return /^(https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/|#|[a-zA-Z0-9_\-]+\.html)/i.test(trimmed);
}

/* ------------------------------------------------------------
   5. File Upload Inspection & Magic Byte Validation
   ------------------------------------------------------------ */

const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46, 0x38], // GIF8
  webp_riff: [0x52, 0x49, 0x46, 0x46], // RIFF
  webm: [0x1A, 0x45, 0xDF, 0xA3] // EBML Header
};

function validateMagicBytes(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (mimeType === "image/gif") {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  }
  if (mimeType === "image/webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  if (mimeType === "video/mp4") {
    // MP4 usually has 'ftyp' at offset 4
    return buffer.toString("ascii", 4, 8) === "ftyp";
  }
  if (mimeType === "video/webm") {
    return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
  }
  return false;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  checkRateLimit,
  sanitizeString,
  sanitizeObject,
  validateEmail,
  validateSafeUrl,
  validateMagicBytes
};

