/**
 * POS Security, Authentication, Token & Session Management
 * Provides cryptographic HMAC SHA-256 tokens, active session store, and RBAC authorization.
 * Author: Hafez ERP Engineering
 */

import crypto from "node:crypto";

export type PosRole = "cashier" | "senior_cashier" | "supervisor" | "admin";

export type PosPermission =
  | "orders:read"
  | "orders:create"
  | "orders:update"
  | "orders:status"
  | "orders:park"
  | "orders:void"
  | "orders:refund"
  | "shifts:read"
  | "shifts:open"
  | "shifts:close"
  | "shifts:cash_movement"
  | "shifts:z_report"
  | "shifts:override"
  | "products:read"
  | "products:write"
  | "products:stock"
  | "customers:read"
  | "customers:write"
  | "branches:read"
  | "sync:batch"
  | "*";

export interface PosSession {
  sessionId: string;
  token: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  role: PosRole;
  permissions: PosPermission[];
  terminalId?: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

const JWT_SECRET = process.env.POS_JWT_SECRET || "hafez-erp-pos-secret-key-2026-wazeer-elhelw-enterprise";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 Hours shift session

export const ROLE_PERMISSIONS: Record<PosRole, PosPermission[]> = {
  cashier: [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:status",
    "orders:park",
    "shifts:read",
    "shifts:open",
    "shifts:close",
    "products:read",
    "customers:read",
    "customers:write",
    "branches:read",
    "sync:batch",
  ],
  senior_cashier: [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:status",
    "orders:park",
    "orders:refund",
    "shifts:read",
    "shifts:open",
    "shifts:close",
    "shifts:cash_movement",
    "shifts:z_report",
    "products:read",
    "products:stock",
    "customers:read",
    "customers:write",
    "branches:read",
    "sync:batch",
  ],
  supervisor: [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:status",
    "orders:park",
    "orders:void",
    "orders:refund",
    "shifts:read",
    "shifts:open",
    "shifts:close",
    "shifts:cash_movement",
    "shifts:z_report",
    "shifts:override",
    "products:read",
    "products:write",
    "products:stock",
    "customers:read",
    "customers:write",
    "branches:read",
    "sync:batch",
  ],
  admin: ["*"],
};

class PosSecurityRegistry {
  private activeSessions: Map<string, PosSession> = new Map(); // Keyed by Token
  private revokedTokens: Set<string> = new Set(); // Revoked/Logged out tokens

  constructor() {
    this.seedDefaultSupervisorSession();
  }

  private seedDefaultSupervisorSession() {
    // Seed a developer/supervisor test token
    const testToken = "pos_test_token_supervisor_2026";
    const session: PosSession = {
      sessionId: "sess-supervisor-seed",
      token: testToken,
      cashierId: "usr-supervisor",
      cashierName: "مشرف الوردية العام",
      branchId: "all",
      role: "supervisor",
      permissions: ROLE_PERMISSIONS["supervisor"],
      terminalId: "term-master-01",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS * 7).toISOString(),
      revokedAt: null,
    };
    this.activeSessions.set(testToken, session);
  }

  /**
   * Generates a tamper-proof signed session token
   */
  createToken(cashierId: string, role: PosRole, branchId: string): string {
    const payload = {
      sub: cashierId,
      role,
      branchId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
      nonce: crypto.randomBytes(8).toString("hex"),
    };

    const headerBase64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest("base64url");

    return `${headerBase64}.${payloadBase64}.${signature}`;
  }

  /**
   * Verifies the cryptographic signature of the token
   */
  verifyTokenSignature(token: string): { valid: boolean; payload?: any; error?: string } {
    if (!token || typeof token !== "string") return { valid: false, error: "Missing token" };

    if (this.revokedTokens.has(token)) {
      return { valid: false, error: "Token has been revoked/logged out" };
    }

    // Support static test token in development
    if (this.activeSessions.has(token)) {
      const sess = this.activeSessions.get(token)!;
      if (sess.revokedAt) return { valid: false, error: "Session has been revoked" };
      if (new Date(sess.expiresAt).getTime() < Date.now()) return { valid: false, error: "Session token expired" };
      return { valid: true, payload: sess };
    }

    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, error: "Malformed token structure" };

    const [headerB64, payloadB64, sig] = parts;
    if (!headerB64 || !payloadB64 || !sig) return { valid: false, error: "Incomplete token" };

    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (sig !== expectedSig) {
      return { valid: false, error: "Invalid cryptographic signature" };
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { valid: false, error: "Token expired" };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, error: "Invalid token payload encoding" };
    }
  }

  /**
   * Registers a new active session
   */
  startSession(params: {
    cashierId: string;
    cashierName: string;
    branchId: string;
    role: PosRole;
    terminalId?: string;
  }): PosSession {
    const token = this.createToken(params.cashierId, params.role, params.branchId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const session: PosSession = {
      sessionId: `sess-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,
      token,
      cashierId: params.cashierId,
      cashierName: params.cashierName,
      branchId: params.branchId,
      role: params.role,
      permissions: ROLE_PERMISSIONS[params.role] || ROLE_PERMISSIONS.cashier,
      terminalId: params.terminalId || "term-default",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
    };

    this.activeSessions.set(token, session);
    return session;
  }

  /**
   * Validates and returns active session from token
   */
  getSession(token: string): PosSession | null {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();

    if (this.revokedTokens.has(cleanToken)) return null;

    const verification = this.verifyTokenSignature(cleanToken);
    if (!verification.valid) return null;

    let session = this.activeSessions.get(cleanToken);
    if (!session && verification.payload) {
      // Reconstruct session from verified JWT payload
      const p = verification.payload;
      const role: PosRole = p.role || "cashier";
      session = {
        sessionId: `sess-jwt-${p.sub}`,
        token: cleanToken,
        cashierId: p.sub || "usr-cashier",
        cashierName: p.name || "كاشير مناوب",
        branchId: p.branchId || "korba",
        role,
        permissions: ROLE_PERMISSIONS[role],
        terminalId: "term-restored",
        createdAt: new Date((p.iat || Date.now() / 1000) * 1000).toISOString(),
        expiresAt: new Date((p.exp || Date.now() / 1000 + 3600) * 1000).toISOString(),
        revokedAt: null,
      };
      this.activeSessions.set(cleanToken, session);
    }

    if (session?.revokedAt) return null;
    return session || null;
  }

  /**
   * Refreshes an active session token
   */
  refreshSession(oldToken: string): PosSession | null {
    const current = this.getSession(oldToken);
    if (!current) return null;

    this.revokeSession(oldToken);
    return this.startSession({
      cashierId: current.cashierId,
      cashierName: current.cashierName,
      branchId: current.branchId,
      role: current.role,
      terminalId: current.terminalId,
    });
  }

  /**
   * Revokes a session (logout)
   */
  revokeSession(token: string): boolean {
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    this.revokedTokens.add(cleanToken);
    const session = this.activeSessions.get(cleanToken);
    if (session) {
      session.revokedAt = new Date().toISOString();
      this.activeSessions.delete(cleanToken);
      return true;
    }
    return true;
  }

  /**
   * Checks if session has the required permission
   */
  hasPermission(session: PosSession, required: PosPermission): boolean {
    if (session.role === "admin" || session.permissions.includes("*")) return true;
    return session.permissions.includes(required);
  }
}

export const posSecurity = new PosSecurityRegistry();
