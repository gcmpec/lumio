import type { Rank } from "@/lib/types";

type UserRow = {
  id: number;
  name: string;
  email: string;
  rank: Rank;
  created_at: string;
  updated_at: string;
  password_hash?: string;
};

const PASSWORD_MIN_LENGTH = 8;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hashPassword(password: string) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error("Password must have at least 8 characters");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const salted = new Uint8Array(salt.length + passwordBytes.length);
  salted.set(salt);
  salted.set(passwordBytes, salt.length);

  const hashBuffer = await crypto.subtle.digest("SHA-256", salted);
  const hashHex = bytesToHex(new Uint8Array(hashBuffer));
  return `${bytesToHex(salt)}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) {
    throw new Error("Invalid password hash");
  }

  const salt = hexToBytes(saltHex);
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const salted = new Uint8Array(salt.length + passwordBytes.length);
  salted.set(salt);
  salted.set(passwordBytes, salt.length);

  const hashBuffer = await crypto.subtle.digest("SHA-256", salted);
  const computedHashHex = bytesToHex(new Uint8Array(hashBuffer));
  return constantTimeCompare(hashHex, computedHashHex);
}

async function hashToken(token: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(msAhead: number) {
  return new Date(Date.now() + msAhead).toISOString();
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  rank: Rank;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  sessionId: string;
  user: UserRecord;
  expiresAt: string;
}

export class UserService {
  private DB: D1Database;

  constructor(DB: D1Database) {
    this.DB = DB;
  }

  private static formatUser(row: UserRow): UserRecord {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      rank: row.rank,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async getByEmail(email: string): Promise<(UserRecord & { password_hash: string }) | null> {
    const response = await this.DB.prepare(
      "SELECT id, name, email, rank, created_at, updated_at, password_hash FROM users WHERE email = ?",
    )
      .bind(email.trim().toLowerCase())
      .first();

    if (!response) return null;

    const row = response as UserRow & { password_hash: string };
    return {
      ...UserService.formatUser(row),
      password_hash: row.password_hash,
    };
  }

  async getById(id: number): Promise<UserRecord | null> {
    const response = await this.DB.prepare(
      "SELECT id, name, email, rank, created_at, updated_at FROM users WHERE id = ?",
    )
      .bind(id)
      .first();

    if (!response) return null;
    return UserService.formatUser(response as UserRow);
  }

  async listUsers(): Promise<UserRecord[]> {
    const response = await this.DB.prepare(
      "SELECT id, name, email, rank, created_at, updated_at FROM users ORDER BY name COLLATE NOCASE",
    ).all();

    if (!response.success) {
      throw new Error("Failed to list users");
    }

    return response.results.map((row) => UserService.formatUser(row as UserRow));
  }

  async createUser({
    name,
    email,
    password,
    rank = "Staff",
  }: {
    name: string;
    email: string;
    password: string;
    rank?: Rank;
  }): Promise<UserRecord> {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.getByEmail(normalizedEmail);
    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await hashPassword(password);
    const now = nowIso();

    const response = await this.DB.prepare(
      "INSERT INTO users (name, email, password_hash, rank, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(trimmedName, normalizedEmail, passwordHash, rank, now, now)
      .run();

    if (!response.success) {
      throw new Error("Failed to create user");
    }

    const id = response.meta.last_row_id;
    return {
      id,
      name: trimmedName,
      email: normalizedEmail,
      rank,
      created_at: now,
      updated_at: now,
    };
  }

  async validateCredentials(email: string, password: string): Promise<UserRecord | null> {
    const user = await this.getByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    const { password_hash: _password, ...safeUser } = user;
    return safeUser;
  }

  async createSession(userId: number): Promise<{ sessionId: string; token: string; expiresAt: string }> {
    const sessionId = crypto.randomUUID();
    const rawToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const tokenHash = await hashToken(rawToken);
    const now = nowIso();
    const expiresAt = futureIso(SESSION_TTL_MS);

    const response = await this.DB.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(sessionId, userId, tokenHash, now, expiresAt)
      .run();

    if (!response.success) {
      throw new Error("Failed to create session");
    }

    return {
      sessionId,
      token: rawToken,
      expiresAt,
    };
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    const tokenHash = await hashToken(token);
    const now = nowIso();

    const response = await this.DB.prepare(
      `SELECT s.id as session_id, s.expires_at, u.id, u.name, u.email, u.rank, u.created_at, u.updated_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
      .bind(tokenHash, now)
      .first();

    if (!response) {
      return null;
    }

    const row = response as { session_id: string; expires_at: string } & UserRow;
    return {
      sessionId: row.session_id,
      expiresAt: row.expires_at,
      user: UserService.formatUser(row),
    };
  }

  async deleteSession(token: string) {
    const tokenHash = await hashToken(token);
    await this.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
  }

  async deleteSessionById(sessionId: string) {
    await this.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(sessionId)
      .run();
  }

  async cleanupExpiredSessions() {
    const now = nowIso();
    await this.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .bind(now)
      .run();
  }
}
