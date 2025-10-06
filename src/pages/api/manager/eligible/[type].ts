import { formatEligibleDeliverableDisplay, formatEligibleTaskDisplay, DELIVERABLE_PERIODICITY_LABELS } from "@/lib/engagement/catalog";
import { EngagementService } from "@/lib/services/engagement";
import type { Rank } from "@/lib/types";

type AllowedRank = Extract<Rank, "Manager" | "Admin">;

function ensureManagerOrAdmin(locals: any): { user?: { id: number; rank: AllowedRank }; response?: Response } {
  if (!locals.user) {
    return { response: Response.json({ message: "Não autenticado" }, { status: 401 }) };
  }
  if (locals.user.rank !== "Manager" && locals.user.rank !== "Admin") {
    return { response: Response.json({ message: "Sem permissão" }, { status: 403 }) };
  }
  return { user: locals.user as { id: number; rank: AllowedRank } };
}

export async function GET({ params, request, locals }) {
  const auth = ensureManagerOrAdmin(locals);
  if (auth.response) return auth.response;

  const { type } = params;
  if (!type) {
    return Response.json({ message: "Tipo inválido" }, { status: 400 });
  }

  const search = new URL(request.url).searchParams.get("q") ?? "";
  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    if (type === "engagements") {
      const engagements = await service.searchEligibleEngagements(search);
      return Response.json({ success: true, items: engagements });
    }

    if (type === "tasks") {
      const tasks = await service.searchEligibleTasks(search);
      return Response.json({
        success: true,
        items: tasks.map((task) => ({
          ...task,
          display_label: formatEligibleTaskDisplay(task),
        })),
      });
    }

    if (type === "deliverables") {
      const deliverables = await service.searchEligibleDeliverables(search);
      return Response.json({
        success: true,
        items: deliverables.map((deliverable) => ({
          ...deliverable,
          periodicity_label: DELIVERABLE_PERIODICITY_LABELS[deliverable.periodicity],
          display_label: formatEligibleDeliverableDisplay(deliverable),
        })),
      });
    }

    return Response.json({ message: "Tipo desconhecido" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar as opções";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
