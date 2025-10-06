import { DELIVERABLE_PERIODICITIES } from "@/lib/engagement/catalog";
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

function isValidPeriodicity(value: string): value is (typeof DELIVERABLE_PERIODICITIES)[number] {
  return DELIVERABLE_PERIODICITIES.includes(value as any);
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
      return Response.json({ success: false, message: "Indica pelo menos um deliverable para importar" }, { status: 400 });
    }

    const invalid = items.find((item: any) => typeof item.label !== "string" || !isValidPeriodicity(String(item.periodicity ?? "")));
    if (invalid) {
      return Response.json({ success: false, message: "Cada deliverable deve ter uma descrição e uma periodicidade válida" }, { status: 400 });
    }

    const result = await service.importEligibleDeliverables(items);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível importar os deliverables";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
