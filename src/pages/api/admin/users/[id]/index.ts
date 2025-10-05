import { UserService } from "@/lib/services/user";
import type { Rank } from "@/lib/types";

const ADMIN_ALLOWED_RANKS = ["Staff", "Senior", "Manager", "Admin"] as const;

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

export async function PATCH({ params, locals, request }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const userId = parseUserId(params);
  if (!userId) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  try {
    const body = await request.json().catch(() => ({}));
    const updates: { name?: string; email?: string; rank?: Rank } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return Response.json({ message: "Indica um nome válido" }, { status: 400 });
      }
      updates.name = trimmed;
    }

    if (typeof body.email === "string") {
      const lowered = body.email.trim().toLowerCase();
      if (!lowered) {
        return Response.json({ message: "Indica um e-mail válido" }, { status: 400 });
      }
      updates.email = lowered;
    }

    if (typeof body.rank === "string") {
      if (!ADMIN_ALLOWED_RANKS.includes(body.rank as Rank)) {
        return Response.json({ message: "Rank inválido" }, { status: 400 });
      }
      updates.rank = body.rank as Rank;
    }

    if (!Object.keys(updates).length) {
      return Response.json({ message: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const user = await userService.updateUser(userId, updates);
    return Response.json({ success: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o utilizador";
    const status = message.includes("Email") ? 409 : 500;
    return Response.json({ success: false, message }, { status });
  }
}

export async function DELETE({ params, locals }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const userId = parseUserId(params);
  if (!userId) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

  if (userId === auth.user.id) {
    return Response.json({ message: "Não podes apagar o teu próprio utilizador" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  try {
    await userService.deleteUser(userId);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível apagar o utilizador";
    const status = message === "User not found" ? 404 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
