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

export async function GET({ locals }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const engagements = await service.listEligibleEngagements();
    return Response.json({ success: true, items: engagements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os engagements elegíveis";
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
    const engagement_code = typeof body.engagement_code === "string" ? body.engagement_code : "";
    const engagement_name = typeof body.engagement_name === "string" ? body.engagement_name : "";

    if (!engagement_code.trim() || !engagement_name.trim()) {
      return Response.json({ message: "Indica o código e o nome do engagement" }, { status: 400 });
    }

    const engagement = await service.createEligibleEngagement({ engagement_code, engagement_name });
    return Response.json({ success: true, engagement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o engagement elegível";
    const status = message.includes("already exists") ? 409 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
