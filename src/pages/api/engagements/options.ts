import { EngagementService } from "@/lib/services/engagement";

export async function GET({ locals }) {
  if (!locals.user) {
    return Response.json({ message: "Não autenticado" }, { status: 401 });
  }

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const managers = await service.listManagersWithEngagements();
    return Response.json({ success: true, managers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar as opções";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
