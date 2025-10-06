import { EngagementService } from "@/lib/services/engagement";

function ensureAdmin(locals: any): { user?: { id: number }; response?: Response } {
  if (!locals.user) {
    return { response: Response.json({ message: "Não autenticado" }, { status: 401 }) };
  }
  if (locals.user.rank !== "Admin") {
    return { response: Response.json({ message: "Sem permissão" }, { status: 403 }) };
  }
  return { user: locals.user };
}

function parseId(value: string | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function PATCH({ locals, params, request }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const id = parseId(params.id);
  if (!id) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const body = await request.json().catch(() => ({}));
    const macroprocess = typeof body.macroprocess === "string" ? body.macroprocess : "";
    const process = typeof body.process === "string" ? body.process : "";
    const label = typeof body.label === "string" ? body.label : "";

    if (!macroprocess.trim() || !process.trim() || !label.trim()) {
      return Response.json({ message: "Indica o macroprocesso, processo e tarefa" }, { status: 400 });
    }

    const task = await service.updateEligibleTask(id, { macroprocess, process, label });
    return Response.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar a tarefa elegível";
    const status = message.includes("already exists") ? 409 : message.includes("not found") ? 404 : 500;
    return Response.json({ success: false, message }, { status });
  }
}

export async function DELETE({ locals, params }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const id = parseId(params.id);
  if (!id) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    await service.deleteEligibleTask(id);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível apagar a tarefa elegível";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
