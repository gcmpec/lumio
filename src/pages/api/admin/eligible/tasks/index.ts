import { EngagementService } from "@/lib/services/engagement";

function ensureAdmin(locals: any): { user?: { id: number }; response?: Response } {
  if (!locals.user) {
    return { response: Response.json({ message: "Nǜo autenticado" }, { status: 401 }) };
  }
  if (locals.user.rank !== "Admin") {
    return { response: Response.json({ message: "Sem permissǜo" }, { status: 403 }) };
  }
  return { user: locals.user };
}

export async function GET({ locals }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const tasks = await service.listEligibleTasks();
    return Response.json({ success: true, items: tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nǜo foi poss��vel carregar as tarefas eleg��veis";
    return Response.json({ success: false, message }, { status: 500 });
  }
}

export async function POST({ locals, request }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

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

    const task = await service.createEligibleTask({ macroprocess, process, label });
    return Response.json({ success: true, task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nǜo foi poss��vel criar a tarefa eleg��vel";
    const status = message.includes("already exists") ? 409 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
