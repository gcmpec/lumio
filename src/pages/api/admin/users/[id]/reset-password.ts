import { UserService } from "@/lib/services/user";

function ensureAdmin(locals: any) {
  if (!locals.user) {
    return { response: Response.json({ message: "Não autenticado" }, { status: 401 }) };
  }
  if (locals.user.rank !== "Admin") {
    return { response: Response.json({ message: "Sem permissão" }, { status: 403 }) };
  }
  return { user: locals.user };
}

function parseUserId(params: Record<string, string>) {
  const rawId = params.id;
  const parsed = Number.parseInt(rawId, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function POST({ params, locals }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const userId = parseUserId(params);
  if (!userId) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  try {
    const { user, temporaryPassword } = await userService.resetPassword(userId);
    return Response.json({ success: true, user, temporaryPassword });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível repor a palavra-passe";
    const status = message === "User not found" ? 404 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
