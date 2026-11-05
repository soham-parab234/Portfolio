const fs = require("fs");
const path = require("path");
const config = require("./config");
const { hashPassword, verifyPassword, generateToken } = require("./security");
const { logSecurityEvent } = require("./audit");

class Database {
  constructor() {
    this.filePath = config.dbFile;
    this.data = {
      users: [],
      sessions: [],
      portfolios: []
    };
    this.init();
  }

  init() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf8");
        this.data = JSON.parse(raw);
        if (!Array.isArray(this.data.users)) this.data.users = [];
        if (!Array.isArray(this.data.sessions)) this.data.sessions = [];
        if (!Array.isArray(this.data.portfolios)) this.data.portfolios = [];
      } catch (err) {
        console.error("Database read error, reinitializing:", err.message);
        this.persist();
      }
    } else {
      this.seedDefaults();
      this.persist();
    }
  }

  seedDefaults() {
    // Seed initial admin user if not present
    const defaultUserId = "user_admin_01";
    const initialPass = "AlexStone2026";
    const passHash = hashPassword(initialPass);

    this.data.users = [
      {
        id: defaultUserId,
        email: config.adminEmail,
        passwordHash: passHash,
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpires: null,
        resetToken: null,
        resetTokenExpires: null,
        createdAt: new Date().toISOString()
      }
    ];

    // Seed initial portfolio owned by default admin user
    const defaultPortfolio = {
      id: "portfolio_default",
      ownerId: defaultUserId,
      published: true,
      updatedAt: new Date().toISOString()
    };

    this.data.portfolios = [defaultPortfolio];
    logSecurityEvent("DATABASE_INIT", { message: "Database seeded with secure default owner account" });
  }

  persist() {
    try {
      const json = JSON.stringify(this.data, null, 2);
      const tempPath = this.filePath + ".tmp";
      fs.writeFileSync(tempPath, json, "utf8");
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error("Critical: Database persistence error:", err.message);
    }
  }

  /* ------------------------------------------------------------
     User & Authentication Methods
     ------------------------------------------------------------ */

  getUserByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    return this.data.users.find(u => u.email.toLowerCase() === clean) || null;
  }

  getUserById(id) {
    if (!id) return null;
    return this.data.users.find(u => u.id === id) || null;
  }

  createUser(email, password) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (this.getUserByEmail(cleanEmail)) {
      throw new Error("An account with this email already exists");
    }

    const userId = "usr_" + generateToken(8);
    const verifyToken = generateToken(24);
    const verifyExpires = Date.now() + config.tokenTtl.emailVerificationMs;

    const user = {
      id: userId,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      isEmailVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyTokenExpires: verifyExpires,
      resetToken: null,
      resetTokenExpires: null,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(user);
    
    // Create initial portfolio owned by this user
    this.data.portfolios.push({
      id: "port_" + generateToken(8),
      ownerId: userId,
      published: true,
      updatedAt: new Date().toISOString()
    });

    this.persist();
    return { user, verifyToken };
  }

  verifyEmail(token) {
    if (!token) return { success: false, message: "Token required" };
    const now = Date.now();
    const user = this.data.users.find(u => u.emailVerifyToken === token);
    
    if (!user) {
      return { success: false, message: "Invalid verification token" };
    }
    if (user.emailVerifyTokenExpires && now > user.emailVerifyTokenExpires) {
      return { success: false, message: "Verification token has expired" };
    }

    user.isEmailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyTokenExpires = null;
    this.persist();
    return { success: true, message: "Email successfully verified", user };
  }

  createPasswordResetToken(email) {
    const user = this.getUserByEmail(email);
    if (!user) {
      // Don't disclose whether email exists
      return null;
    }
    const token = generateToken(24);
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + config.tokenTtl.passwordResetMs;
    this.persist();
    return { token, email: user.email };
  }

  resetPasswordWithToken(token, newPassword) {
    if (!token || !newPassword) return { success: false, message: "Invalid parameters" };
    const now = Date.now();
    const user = this.data.users.find(u => u.resetToken === token);
    
    if (!user) {
      return { success: false, message: "Invalid or expired reset token" };
    }
    if (user.resetTokenExpires && now > user.resetTokenExpires) {
      return { success: false, message: "Reset token has expired (15m window passed)" };
    }

    user.passwordHash = hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpires = null;
    // Invalidate all active sessions for this user across all devices
    this.invalidateUserSessions(user.id);
    this.persist();
    return { success: true, message: "Password reset successful" };
  }

  updatePassword(userId, currentPassword, newPassword) {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: "User not found" };

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { success: false, message: "Current password is incorrect" };
    }

    user.passwordHash = hashPassword(newPassword);
    // Invalidate other sessions
    this.invalidateUserSessions(userId);
    this.persist();
    return { success: true, message: "Password successfully updated" };
  }

  /* ------------------------------------------------------------
     Session Management (With Expiration & Invalidation)
     ------------------------------------------------------------ */

  createSession(userId) {
    const token = generateToken(32);
    const expiresAt = Date.now() + (config.sessionTtlHours * 60 * 60 * 1000);
    const session = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt
    };
    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  getSession(token) {
    if (!token) return null;
    const now = Date.now();
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return null;

    if (now > session.expiresAt) {
      this.destroySession(token);
      return null;
    }
    return session;
  }

  destroySession(token) {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    if (this.data.sessions.length !== initialLen) {
      this.persist();
    }
  }

  invalidateUserSessions(userId) {
    this.data.sessions = this.data.sessions.filter(s => s.userId !== userId);
    this.persist();
  }

  /* ------------------------------------------------------------
     IDOR Protection: Ownership-Checked Portfolio Operations
     ------------------------------------------------------------ */

  getPortfolioByOwner(userId) {
    return this.data.portfolios.find(p => p.ownerId === userId) || null;
  }

  getPublicPortfolio() {
    // Returns the primary published portfolio
    return this.data.portfolios.find(p => p.published) || this.data.portfolios[0] || null;
  }

  savePortfolioData(userId, portfolioPayload) {
    // STRICT IDOR CHECK: Verify the logged-in user owns this portfolio resource
    let portfolio = this.getPortfolioByOwner(userId);
    
    if (!portfolio) {
      // Create new bound to this verified user
      portfolio = {
        id: "port_" + generateToken(8),
        ownerId: userId,
        published: true,
        data: portfolioPayload,
        updatedAt: new Date().toISOString()
      };
      this.data.portfolios.push(portfolio);
    } else {
      if (portfolio.ownerId !== userId) {
        logSecurityEvent("IDOR_ATTEMPT", {
          severity: "CRITICAL",
          userId,
          targetResource: portfolio.id,
          message: "Attempted to modify portfolio without ownership"
        });
        throw new Error("FORBIDDEN: Insecure Direct Object Reference (IDOR) - You do not own this resource");
      }
      portfolio.data = portfolioPayload;
      portfolio.updatedAt = new Date().toISOString();
    }

    this.persist();
    return portfolio;
  }
}

const db = new Database();
module.exports = db;

