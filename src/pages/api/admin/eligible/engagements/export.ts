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

export async function GET({ locals }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const items = await service.listEligibleEngagements();
    return new Response(JSON.stringify({ success: true, items }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="eligible-engagements-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível exportar os engagements";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
