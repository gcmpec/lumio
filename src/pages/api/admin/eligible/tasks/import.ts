import { EngagementService } from "@/lib/services/engagement";

function ensureAdmin(locals: any): { response?: Response } {
  if (!locals.user) {
    return { response: Response.json({ message: "Não autenticado" }, { status: 401 }) };
  }
  if (locals.user.rank !== "Admin") {
    return { response: Response.json({ message: "Sem permissão" }, { status: 403 }) };
  }
  return {};
}

export async function POST({ locals, request }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : Array.isArray(body) ? body : [];
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ success: false, message: "Indica pelo menos uma tarefa para importar" }, { status: 400 });
    }

    const result = await service.importEligibleTasks(items);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível importar as tarefas";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
