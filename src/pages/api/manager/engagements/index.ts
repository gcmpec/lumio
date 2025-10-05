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

function resolveManagerId(currentUser: { id: number; rank: AllowedRank }, provided?: unknown) {
  if (currentUser.rank === "Admin" && provided != null) {
    const parsed = Number.parseInt(String(provided), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Identificador de manager inválido");
    }
    return parsed;
  }
  return currentUser.id;
}

function parseItems(value: unknown): Array<{ label: string; eligible_task_id?: number | null; eligible_deliverable_id?: number | null }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (entry && typeof entry === "object" && "label" in entry && typeof entry.label === "string") {
        const item: { label: string; eligible_task_id?: number | null; eligible_deliverable_id?: number | null } = {
          label: entry.label,
        };
        if ("eligible_task_id" in entry && entry.eligible_task_id != null) {
          const parsed = Number.parseInt(String(entry.eligible_task_id), 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            item.eligible_task_id = parsed;
          }
        }
        if ("eligible_deliverable_id" in entry && entry.eligible_deliverable_id != null) {
          const parsed = Number.parseInt(String(entry.eligible_deliverable_id), 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            item.eligible_deliverable_id = parsed;
          }
        }
        return item;
      }
      return null;
    })
    .filter((entry): entry is { label: string; eligible_task_id?: number | null; eligible_deliverable_id?: number | null } => entry !== null);
}

export async function GET({ locals, request }) {
  const auth = ensureManagerOrAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const url = new URL(request.url);
    const managerId = resolveManagerId(auth.user!, url.searchParams.get("managerId"));
    const engagements = await service.listManagerEngagements(managerId);
    return Response.json({ success: true, engagements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os engagements";
    const status = message.includes("manager") ? 400 : 500;
    return Response.json({ success: false, message }, { status });
  }
}

export async function POST({ locals, request }) {
  const auth = ensureManagerOrAdmin(locals);
  if (auth.response) return auth.response;

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const body = await request.json();
    const managerId = resolveManagerId(auth.user!, body.managerId);

    const engagement_code = typeof body.engagement_code === "string" ? body.engagement_code : "";
    const engagement_name = typeof body.engagement_name === "string" ? body.engagement_name : "";
    const eligible_engagement_id = body.eligible_engagement_id != null
      ? Number.parseInt(String(body.eligible_engagement_id), 10)
      : null;

    const tasks = parseItems(body.tasks).map((item) => ({
      label: item.label,
      eligible_task_id: item.eligible_task_id ?? null,
    }));

    const deliverables = parseItems(body.deliverables).map((item) => ({
      label: item.label,
      eligible_deliverable_id: item.eligible_deliverable_id ?? null,
    }));

    const engagement = await service.createManagerEngagement(managerId, {
      engagement_code,
      engagement_name,
      eligible_engagement_id: Number.isFinite(eligible_engagement_id) && eligible_engagement_id! > 0 ? eligible_engagement_id : null,
      tasks,
      deliverables,
    });

    return Response.json({ success: true, engagement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível guardar o engagement";
    const status = message.includes("Engagement code") || message.includes("manager") ? 400 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
