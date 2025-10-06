import { DELIVERABLE_PERIODICITIES } from "@/lib/engagement/catalog";
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

function isValidPeriodicity(value: string): value is (typeof DELIVERABLE_PERIODICITIES)[number] {
  return DELIVERABLE_PERIODICITIES.includes(value as any);
}

export async function GET({ locals }) {
  const auth = ensureAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const deliverables = await service.listEligibleDeliverables();
    return Response.json({ success: true, items: deliverables });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nǜo foi poss��vel carregar os deliverables eleg��veis";
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
    const label = typeof body.label === "string" ? body.label : "";
    const periodicityRaw = typeof body.periodicity === "string" ? body.periodicity : "";

    if (!label.trim()) {
      return Response.json({ message: "Indica a descri��ǜo do deliverable" }, { status: 400 });
    }

    if (!isValidPeriodicity(periodicityRaw)) {
      return Response.json({ message: "Indica uma periodicidade v��lida" }, { status: 400 });
    }

    const deliverable = await service.createEligibleDeliverable({ label, periodicity: periodicityRaw });
    return Response.json({ success: true, deliverable }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nǜo foi poss��vel criar o deliverable eleg��vel";
    const status = message.includes("already exists") ? 409 : message.includes("Invalid deliverable periodicity") ? 400 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
