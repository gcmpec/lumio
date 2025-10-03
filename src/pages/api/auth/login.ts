import { UserService } from "@/lib/services/user";
import type { Rank } from "@/lib/types";

const SESSION_COOKIE = "lumio_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sanitizeRank(rank: string | undefined): Rank {
  if (rank === "Staff" || rank === "Senior" || rank === "Manager" || rank === "Admin") {
    return rank;
  }
  return "Staff";
}

export async function POST({ request, locals, cookies }) {
  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return Response.json({ message: "Email e password sao obrigatorios" }, { status: 400 });
    }

    const user = await userService.validateCredentials(email, password);
    if (!user) {
      return Response.json({ message: "Credenciais invalidas" }, { status: 401 });
    }

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
    });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel iniciar sessao" },
      { status: 500 },
    );
  }
}
