const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const config = require("./config");
const db = require("./db");
const {
  verifyPassword,
  checkRateLimit,
  sanitizeString,
  sanitizeObject,
  validateEmail,
  validateSafeUrl,
  validateMagicBytes
} = require("./security");
const { logSecurityEvent } = require("./audit");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

// Security Headers applied to every HTTP response
function setSecurityHeaders(res) {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none';"
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "127.0.0.1"
  );
}

function sendJson(res, statusCode, data) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req, maxSize = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error("Payload too large: exceeds maximum permitted size"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw.trim()) return resolve({});
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function extractSessionToken(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookies = req.headers["cookie"];
  if (cookies) {
    const match = cookies.match(/(?:^|;\s*)bp_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function authenticateRequest(req) {
  const token = extractSessionToken(req);
  if (!token) return null;
  const session = db.getSession(token);
  if (!session) return null;
  const user = db.getUserById(session.userId);
  if (!user) return null;
  return { session, user };
}

/* ------------------------------------------------------------
   Request Handler Router
   ------------------------------------------------------------ */

async function handleRequest(req, res) {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";

  // Enforce HTTPS redirection in production environments
  if (config.enforceHttps && req.headers["x-forwarded-proto"] === "http") {
    setSecurityHeaders(res);
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const method = req.method.toUpperCase();

  // 1. Block access to private server directories, database files, and config
  if (
    pathname.startsWith("/server") ||
    pathname.startsWith("/data") ||
    pathname.startsWith("/tools") ||
    pathname.includes(".env") ||
    pathname.includes("..") ||
    pathname.startsWith("/.git")
  ) {
    logSecurityEvent("BLOCKED_DIRECTORY_TRAVERSAL", {
      ip,
      userAgent,
      targetResource: pathname,
      severity: "WARN",
      message: "Probed protected server internal file or directory"
    });
    setSecurityHeaders(res);
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden: Access restricted");
    return;
  }

  // 2. API Endpoints Router
  if (pathname.startsWith("/api/")) {
    // Global API rate limiting
    const apiLimit = checkRateLimit(ip + ":api_global", config.rateLimits.apiMaxRequests, config.rateLimits.apiWindowMs);
    if (!apiLimit.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        ip,
        userAgent,
        targetResource: pathname,
        severity: "WARN",
        message: "General API rate limit exceeded"
      });
      res.setHeader("Retry-After", String(apiLimit.retryAfterSeconds));
      return sendJson(res, 429, {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please retry after ${apiLimit.retryAfterSeconds} seconds.`
      });
    }

    // ---------------- API: Authentication ----------------
    if (pathname === "/api/auth/login" && method === "POST") {
      const loginLimit = checkRateLimit(ip + ":login", config.rateLimits.loginMaxAttempts, config.rateLimits.loginWindowMs);
      if (!loginLimit.allowed) {
        logSecurityEvent("LOGIN_RATE_LIMIT_EXCEEDED", {
          ip,
          userAgent,
          severity: "WARN",
          message: "Exceeded maximum consecutive login attempts"
        });
        res.setHeader("Retry-After", String(loginLimit.retryAfterSeconds));
        return sendJson(res, 429, {
          error: "Account Locked Temporarily",
          message: `Too many login attempts. Locked out for ${Math.ceil(loginLimit.retryAfterSeconds / 60)} minutes.`
        });
      }

      try {
        const body = await parseJsonBody(req);
        const email = sanitizeString(body.email || "");
        const password = String(body.password || "");

        if (!password) {
          return sendJson(res, 400, { error: "Password is required" });
        }

        // Support logging in via email or default owner passcode
        let user = email ? db.getUserByEmail(email) : db.data.users[0];
        if (!user) {
          logSecurityEvent("AUTH_FAILURE", { ip, userAgent, message: `Login failed for non-existent user: ${email}` });
          return sendJson(res, 401, { error: "Invalid credentials" });
        }

        const valid = verifyPassword(password, user.passwordHash);
        if (!valid) {
          logSecurityEvent("AUTH_FAILURE", { ip, userAgent, userId: user.id, message: "Incorrect password attempt" });
          return sendJson(res, 401, { error: "Invalid credentials" });
        }

        const session = db.createSession(user.id);
        logSecurityEvent("AUTH_SUCCESS", { ip, userAgent, userId: user.id, message: "User successfully authenticated" });

        // Set secure, HTTP-only session cookie
        const isSecure = config.nodeEnv === "production";
        const cookieStr = `bp_session=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${config.sessionTtlHours * 3600}${isSecure ? "; Secure" : ""}`;
        res.setHeader("Set-Cookie", cookieStr);

        return sendJson(res, 200, {
          success: true,
          message: "Authentication successful",
          token: session.token,
          expiresAt: session.expiresAt,
          user: {
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified
          }
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      const auth = authenticateRequest(req);
      if (auth) {
        db.destroySession(auth.session.token);
        logSecurityEvent("AUTH_LOGOUT", { ip, userAgent, userId: auth.user.id, message: "User logged out" });
      }
      res.setHeader("Set-Cookie", "bp_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
      return sendJson(res, 200, { success: true, message: "Logged out" });
    }

    if (pathname === "/api/auth/session" && method === "GET") {
      const auth = authenticateRequest(req);
      if (!auth) {
        return sendJson(res, 401, { authenticated: false, error: "Session expired or invalid" });
      }
      return sendJson(res, 200, {
        authenticated: true,
        expiresAt: auth.session.expiresAt,
        user: {
          id: auth.user.id,
          email: auth.user.email,
          isEmailVerified: auth.user.isEmailVerified
        }
      });
    }

    if (pathname === "/api/auth/register" && method === "POST") {
      const regLimit = checkRateLimit(ip + ":register", config.rateLimits.registerMaxAttempts, config.rateLimits.registerWindowMs);
      if (!regLimit.allowed) {
        return sendJson(res, 429, { error: "Account creation rate limit reached. Please try later." });
      }

      try {
        const body = await parseJsonBody(req);
        const email = sanitizeString(body.email || "");
        const password = String(body.password || "");

        if (!validateEmail(email)) {
          return sendJson(res, 400, { error: "Invalid email format" });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { error: "Password must be at least 6 characters" });
        }

        const { user, verifyToken } = db.createUser(email, password);
        logSecurityEvent("AUTH_REGISTER", { ip, userAgent, userId: user.id, message: `Account created: ${email}` });

        return sendJson(res, 201, {
          success: true,
          message: "Registration successful. Please verify your email.",
          userId: user.id,
          emailVerificationToken: config.nodeEnv !== "production" ? verifyToken : undefined
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === "/api/auth/verify-email" && method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const token = sanitizeString(body.token || "");
        const result = db.verifyEmail(token);
        if (!result.success) {
          return sendJson(res, 400, { error: result.message });
        }
        logSecurityEvent("EMAIL_VERIFIED", { ip, userAgent, userId: result.user.id, message: "Email confirmed" });
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === "/api/auth/forgot-password" && method === "POST") {
      const resetLimit = checkRateLimit(ip + ":pwd_reset", config.rateLimits.resetMaxAttempts, config.rateLimits.resetWindowMs);
      if (!resetLimit.allowed) {
        return sendJson(res, 429, { error: "Password reset request limit reached. Please wait." });
      }

      try {
        const body = await parseJsonBody(req);
        const email = sanitizeString(body.email || "");
        const resObj = db.createPasswordResetToken(email);

        logSecurityEvent("PASSWORD_RESET_REQUESTED", { ip, userAgent, message: `Reset requested for: ${email}` });
        return sendJson(res, 200, {
          success: true,
          message: "If an account exists with that email, a password reset link has been dispatched.",
          resetToken: (config.nodeEnv !== "production" && resObj) ? resObj.token : undefined
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === "/api/auth/reset-password" && method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const token = sanitizeString(body.token || "");
        const newPassword = String(body.newPassword || "");

        if (!token || !newPassword) {
          return sendJson(res, 400, { error: "Token and new password are required" });
        }
        const result = db.resetPasswordWithToken(token, newPassword);
        if (!result.success) {
          return sendJson(res, 400, { error: result.message });
        }
        logSecurityEvent("PASSWORD_RESET_COMPLETE", { ip, userAgent, message: "Password reset successfully completed" });
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === "/api/auth/change-password" && method === "POST") {
      const auth = authenticateRequest(req);
      if (!auth) {
        return sendJson(res, 401, { error: "Authentication required" });
      }

      try {
        const body = await parseJsonBody(req);
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");

        const result = db.updatePassword(auth.user.id, currentPassword, newPassword);
        if (!result.success) {
          return sendJson(res, 400, { error: result.message });
        }
        logSecurityEvent("PASSWORD_CHANGED", { ip, userAgent, userId: auth.user.id, message: "Password successfully changed" });
        return sendJson(res, 200, { success: true, message: result.message });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // ---------------- API: Portfolio CRUD (IDOR Protected) ----------------
    if (pathname === "/api/portfolio" && method === "GET") {
      // Public read of active published portfolio
      const portfolio = db.getPublicPortfolio();
      return sendJson(res, 200, {
        success: true,
        data: portfolio ? portfolio.data : null,
        updatedAt: portfolio ? portfolio.updatedAt : null
      });
    }

    if (pathname === "/api/portfolio" && method === "PUT") {
      const auth = authenticateRequest(req);
      if (!auth) {
        return sendJson(res, 401, { error: "Authentication required to update portfolio data" });
      }

      try {
        const body = await parseJsonBody(req);
        const sanitizedData = sanitizeObject(body.data || body);

        // IDOR Check: Ensures the authenticated user can only save to their own portfolio
        const updated = db.savePortfolioData(auth.user.id, sanitizedData);
        logSecurityEvent("PORTFOLIO_UPDATE", { ip, userAgent, userId: auth.user.id, message: "Portfolio updated by owner" });

        return sendJson(res, 200, {
          success: true,
          message: "Portfolio data securely persisted",
          updatedAt: updated.updatedAt
        });
      } catch (err) {
        if (err.message.includes("FORBIDDEN")) {
          return sendJson(res, 403, { error: err.message });
        }
        return sendJson(res, 400, { error: err.message });
      }
    }

    // ---------------- API: Secure File Upload (Ownership & Magic Byte Checked) ----------------
    if (pathname === "/api/portfolio/upload" && method === "POST") {
      const auth = authenticateRequest(req);
      if (!auth) {
        return sendJson(res, 401, { error: "Authentication required for uploads" });
      }

      try {
        const body = await parseJsonBody(req, 55 * 1024 * 1024); // max 55MB
        const dataUrl = body.dataUrl || "";
        const filename = sanitizeString(body.filename || "upload");

        if (!dataUrl.startsWith("data:")) {
          return sendJson(res, 400, { error: "Expected valid Data URI" });
        }

        const mimeMatch = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.\-+]+);base64,(.+)$/);
        if (!mimeMatch) {
          return sendJson(res, 400, { error: "Invalid data URL format or encoding" });
        }

        const mimeType = mimeMatch[1].toLowerCase();
        const base64Data = mimeMatch[2];
        const buffer = Buffer.from(base64Data, "base64");

        // Validate file size bounds
        if (mimeType.startsWith("image/") && buffer.length > 15 * 1024 * 1024) {
          return sendJson(res, 400, { error: "Image file exceeds 15MB limit" });
        }
        if (mimeType.startsWith("video/") && buffer.length > 50 * 1024 * 1024) {
          return sendJson(res, 400, { error: "Video file exceeds 50MB limit" });
        }

        // Validate Magic Bytes against MIME declaration
        const magicValid = validateMagicBytes(buffer, mimeType);
        if (!magicValid) {
          logSecurityEvent("FILE_UPLOAD_BLOCKED", {
            ip,
            userAgent,
            userId: auth.user.id,
            severity: "WARN",
            message: `Magic byte header mismatch for uploaded file: declared ${mimeType}`
          });
          return sendJson(res, 400, { error: "Security violation: File header does not match declared MIME type" });
        }

        // Generate safe unique filename
        const ext = mimeType === "image/png" ? ".png" :
                    mimeType === "image/jpeg" ? ".jpg" :
                    mimeType === "image/gif" ? ".gif" :
                    mimeType === "image/webp" ? ".webp" :
                    mimeType === "video/mp4" ? ".mp4" :
                    mimeType === "video/webm" ? ".webm" : ".bin";

        const safeName = "up_" + crypto.randomBytes(16).toString("hex") + ext;
        const targetPath = path.join(config.uploadsDir, safeName);
        fs.writeFileSync(targetPath, buffer);

        logSecurityEvent("FILE_UPLOAD_SUCCESS", {
          ip,
          userAgent,
          userId: auth.user.id,
          message: `Uploaded file ${safeName} (${buffer.length} bytes)`
        });

        return sendJson(res, 200, {
          success: true,
          url: `/uploads/${safeName}`,
          size: buffer.length,
          mimeType
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // ---------------- API: Abuse Protection & AI Generation Proxy ----------------
    if (pathname === "/api/generate" && method === "POST") {
      const aiLimit = checkRateLimit(ip + ":ai_generate", config.rateLimits.aiMaxRequests, config.rateLimits.aiWindowMs);
      if (!aiLimit.allowed) {
        logSecurityEvent("AI_RATE_LIMIT_EXCEEDED", { ip, userAgent, severity: "WARN", message: "AI generation rate limit hit" });
        res.setHeader("Retry-After", String(aiLimit.retryAfterSeconds));
        return sendJson(res, 429, {
          error: "Rate Limit Exceeded",
          message: `AI generation limit reached. Please wait ${aiLimit.retryAfterSeconds}s.`
        });
      }

      try {
        const body = await parseJsonBody(req);
        const prompt = sanitizeString(body.prompt || "");
        if (!prompt) return sendJson(res, 400, { error: "Prompt is required" });

        logSecurityEvent("AI_REQUEST", { ip, userAgent, message: `Processed generation prompt length: ${prompt.length}` });
        return sendJson(res, 200, {
          success: true,
          response: "Content generated cleanly under secure rate-limited protection."
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    return sendJson(res, 404, { error: "API endpoint not found" });
  }

  // 3. Static File Serving with Traversal Prevention
  if (method !== "GET" && method !== "HEAD") {
    setSecurityHeaders(res);
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  let reqPath = pathname === "/" ? "/index.html" : pathname;

  // Uploads serving
  let filePath;
  if (reqPath.startsWith("/uploads/")) {
    const filename = path.basename(reqPath);
    filePath = path.join(config.uploadsDir, filename);
  } else {
    filePath = path.normalize(path.join(config.rootDir, reqPath));
  }

  // Enforce root directory confinement
  if (!filePath.startsWith(config.rootDir) && !filePath.startsWith(config.uploadsDir)) {
    logSecurityEvent("DIRECTORY_TRAVERSAL_ATTEMPT", {
      ip,
      userAgent,
      targetResource: pathname,
      severity: "WARN",
      message: "Directory traversal attack blocked"
    });
    setSecurityHeaders(res);
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      setSecurityHeaders(res);
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": ext === ".html" ? "no-cache, must-revalidate" : "public, max-age=86400"
    });

    if (method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function startServer(port = config.port) {
  const server = http.createServer(handleRequest);
  server.listen(port, "127.0.0.1", () => {
    console.log(`[SECURE SERVER] Listening securely on http://127.0.0.1:${port}`);
    console.log(`[SECURITY MODE] HTTPS Enforcement: ${config.enforceHttps}, Scrypt Password Hashing, IDOR Checks Active`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  handleRequest
};

