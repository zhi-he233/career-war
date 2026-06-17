import { compareSync, hashSync } from "bcryptjs";
import type { CookieOptions, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import db from "./db.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string;
  username: string;
  passwordHash: string;
  nickname: string;
  avatar: string;
  tutorialCompleted: number; // SQLite stores booleans as 0/1
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
  displayName: string;
  avatar: string;
  tutorialCompleted: boolean;
  createdAt: string;
}

// Augment Express Request to carry currentUser
declare global {
  namespace Express {
    interface Request {
      currentUser?: PublicUser | null;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 6;

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    displayName: row.username,
    avatar: row.avatar,
    tutorialCompleted: row.tutorialCompleted === 1,
    createdAt: row.createdAt,
  };
}

const COOKIE_NAME = "session";
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS,
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw || typeof raw !== "string") {
    req.currentUser = null;
    next();
    return;
  }

  try {
    const tokenHash = hashToken(raw);
    const session = db
      .prepare(
        `SELECT s.userId, s.expiresAt
         FROM sessions s
         WHERE s.tokenHash = ?`,
      )
      .get(tokenHash) as { userId: string; expiresAt: string } | undefined;

    if (!session || new Date(session.expiresAt) < new Date()) {
      req.currentUser = null;
      next();
      return;
    }

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(session.userId) as UserRow | undefined;

    req.currentUser = user ? toPublicUser(user) : null;
  } catch {
    req.currentUser = null;
  }

  next();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const authRouter = Router();

// POST /api/auth/register
authRouter.post("/api/auth/register", (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};

    // Validate username
    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "请输入用户名" });
      return;
    }
    if (!USERNAME_RE.test(username)) {
      res
        .status(400)
        .json({ error: "用户名需3-20位字母、数字或下划线" });
      return;
    }

    // Validate password
    if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: "密码至少需要6位" });
      return;
    }

    // nickname = username (simplified: no separate display name)
    const safeNickname = username;

    // Check duplicate
    const existing = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existing) {
      res.status(409).json({ error: "用户名已存在" });
      return;
    }

    // Create user
    const id = randomUUID();
    const passwordHash = hashSync(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, username, passwordHash, nickname, avatar, tutorialCompleted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, '', 0, ?, ?)`,
    ).run(id, username, passwordHash, safeNickname, now, now);

    // Create session (auto-login after register)
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

    db.prepare(
      `INSERT INTO sessions (id, userId, tokenHash, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(sessionId, id, tokenHash, now, expiresAt);

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json(toPublicUser({
      id, username, passwordHash, nickname: safeNickname,
      avatar: "", tutorialCompleted: 0, createdAt: now, updatedAt: now,
    }));
  } catch (err) {
    console.error("[auth] register error:", err);
    res.status(500).json({ error: "注册失败，请稍后再试" });
  }
});

// POST /api/auth/login
authRouter.post("/api/auth/login", (req: Request, res: Response) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      res.status(400).json({ error: "请输入用户名和密码" });
      return;
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (!user || !compareSync(password, user.passwordHash)) {
      res.status(401).json({ error: "用户名或密码错误" });
      return;
    }

    // Create session
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

    db.prepare(
      `INSERT INTO sessions (id, userId, tokenHash, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(sessionId, user.id, tokenHash, now, expiresAt);

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json(toPublicUser(user));
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "登录失败，请稍后再试" });
  }
});

// POST /api/auth/logout
authRouter.post("/api/auth/logout", (req: Request, res: Response) => {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (raw && typeof raw === "string") {
      const tokenHash = hashToken(raw);
      db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(tokenHash);
    }
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  } catch {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  }
});

// GET /api/me
authRouter.get("/api/me", (req: Request, res: Response) => {
  res.json(req.currentUser ?? null);
});

// PATCH /api/me
authRouter.patch("/api/me", (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      res.status(401).json({ error: "请先登录" });
      return;
    }

    const { avatar, tutorialCompleted } = req.body ?? {};
    const updates: string[] = [];
    const values: unknown[] = [];

    if (avatar !== undefined) {
      const safe = String(avatar).trim().slice(0, 255);
      updates.push("avatar = ?");
      values.push(safe);
    }

    if (tutorialCompleted !== undefined) {
      updates.push("tutorialCompleted = ?");
      values.push(tutorialCompleted ? 1 : 0);
    }

    if (updates.length === 0) {
      res.json(toPublicUser(
        db.prepare("SELECT * FROM users WHERE id = ?").get(req.currentUser.id) as UserRow,
      ));
      return;
    }

    updates.push("updatedAt = ?");
    values.push(new Date().toISOString());
    values.push(req.currentUser.id);

    db.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    ).run(...values);

    const updated = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.currentUser.id) as UserRow;
    res.json(toPublicUser(updated));
  } catch (err) {
    console.error("[auth] update error:", err);
    res.status(500).json({ error: "更新失败" });
  }
});
