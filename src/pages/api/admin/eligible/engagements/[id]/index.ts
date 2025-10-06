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
    return Response.json({ message: "ID invǭlido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const body = await request.json().catch(() => ({}));
    const engagement_code = typeof body.engagement_code === "string" ? body.engagement_code : "";
    const engagement_name = typeof body.engagement_name === "string" ? body.engagement_name : "";

    if (!engagement_code.trim() || !engagement_name.trim()) {
      return Response.json({ message: "Indica o c��digo e o nome do engagement" }, { status: 400 });
    }

    const engagement = await service.updateEligibleEngagement(id, {
      engagement_code,
      engagement_name,
    });

    return Response.json({ success: true, engagement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nǜo foi poss��vel atualizar o engagement eleg��vel";
    const status = message.includes("already exists") ? 409 : message.includes("not found") ? 404 : 500;
    return Response.json({ success: false, message }, { status });
  }
}

export async function DELETE({ locals, params }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const id = parseId(params.id);
  if (!id) {
    return Response.json({ message: "ID invǭlido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    await service.deleteEligibleEngagement(id);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nǜo foi poss��vel apagar o engagement eleg��vel";
    const status = message.includes("not found") ? 404 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
