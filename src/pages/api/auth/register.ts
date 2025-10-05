import { UserService } from "@/lib/services/user";
import type { Rank } from "@/lib/types";

const SESSION_COOKIE = "lumio_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ALLOWED_RANKS = ["Staff", "Senior", "Manager", "Admin"] as const;
const SIGNUP_ALLOWED_RANKS = ["Staff", "Senior", "Manager"] as const;

function sanitizeRank(rank: string | undefined): Rank {
  if (rank && ALLOWED_RANKS.includes(rank as Rank)) {
    return rank as Rank;
  }
  return "Staff";
}

function sanitizeSignupRank(rank: string | undefined): Rank {
  if (rank && SIGNUP_ALLOWED_RANKS.includes(rank as Rank)) {
    return rank as Rank;
  }
  return "Staff";
}

export async function POST({ request, locals, cookies }) {
  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedRank = typeof body.rank === "string" ? body.rank.trim() : undefined;
    const rank = sanitizeSignupRank(requestedRank);

    if (!name || !email || !password) {
      return Response.json({ message: "Nome, email e password são obrigatórios" }, { status: 400 });
    }

    const user = await userService.createUser({ name, email, password, rank });
    const session = await userService.createSession(user.id);

    cookies.set(SESSION_COOKIE, session.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: !import.meta.env.DEV,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return Response.json({
      user: {
        ...user,
        rank: sanitizeRank(user.rank),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a conta";
    const status = message.includes("Email") ? 409 : 500;
    return Response.json({ message }, { status });
  }
}
