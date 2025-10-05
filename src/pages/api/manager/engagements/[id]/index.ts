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

function parseEngagementId(params: Record<string, string>) {
  const rawId = params.id;
  const parsed = Number.parseInt(rawId, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function PATCH({ params, locals, request }) {
  const auth = ensureManagerOrAdmin(locals);
  if (auth.response) return auth.response;

  const engagementId = parseEngagementId(params);
  if (!engagementId) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

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

    const engagement = await service.updateManagerEngagement(managerId, engagementId, {
      engagement_code,
      engagement_name,
      eligible_engagement_id: Number.isFinite(eligible_engagement_id) && eligible_engagement_id! > 0 ? eligible_engagement_id : null,
      tasks,
      deliverables,
    });

    return Response.json({ success: true, engagement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o engagement";
    const status = message.includes("Engagement not found") ? 404 : message.includes("manager") ? 400 : 500;
    return Response.json({ success: false, message }, { status });
  }
}

export async function DELETE({ params, locals, request }) {
  const auth = ensureManagerOrAdmin(locals);
  if (auth.response) return auth.response;

  const engagementId = parseEngagementId(params);
  if (!engagementId) {
    return Response.json({ message: "ID inválido" }, { status: 400 });
  }

  const { DB } = locals.runtime.env;
  const service = new EngagementService(DB);

  try {
    const url = new URL(request.url);
    let managerIdParam: unknown = url.searchParams.get("managerId");
    if (managerIdParam == null) {
      const body = await request.json().catch(() => ({}));
      managerIdParam = body?.managerId;
    }

    const managerId = resolveManagerId(auth.user!, managerIdParam);
    await service.deleteManagerEngagement(managerId, engagementId);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível apagar o engagement";
    const status = message === "Engagement not found" ? 404 : message.includes("manager") ? 400 : 500;
    return Response.json({ success: false, message }, { status });
  }
}
