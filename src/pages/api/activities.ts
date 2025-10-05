import { ActivityService } from "@/lib/services/activity";
import { EngagementService } from "@/lib/services/engagement";
import { UserService } from "@/lib/services/user";

export async function GET({ locals }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  if (!locals.user) {
    return Response.json({ message: "Não autenticado" }, { status: 401 });
  }

  if (locals.user.rank !== "Admin") {
    return Response.json({ message: "Sem permissão" }, { status: 403 });
  }

  try {
    const activities = await activityService.getAll();
    return Response.json({ activities });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Could not load activities" },
      { status: 500 },
    );
  }
}

export async function POST({ locals, request }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);
  const engagementService = new EngagementService(DB);
  const userService = new UserService(DB);

  if (!locals.user) {
    return Response.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const managerIdRaw = body.managerId;
    const engagementIdRaw = body.engagementId;
    const taskIdRaw = body.taskId;
    const deliverableIdRaw = body.deliverableId;
    const isReview = Boolean(body.isReview);
    const reviewTargetRaw = typeof body.reviewTarget === "string" ? body.reviewTarget.trim() : null;

    const managerId = Number.parseInt(String(managerIdRaw), 10);
    if (!Number.isFinite(managerId) || managerId <= 0) {
      return Response.json({ message: "Manager inválido" }, { status: 400 });
    }

    const engagementId = Number.parseInt(String(engagementIdRaw), 10);
    if (!Number.isFinite(engagementId) || engagementId <= 0) {
      return Response.json({ message: "Engagement inválido" }, { status: 400 });
    }

    const engagement = await engagementService.getManagerEngagement(managerId, engagementId);
    if (!engagement) {
      return Response.json({ message: "Engagement não encontrado" }, { status: 404 });
    }

    const manager = await userService.getById(managerId);
    if (!manager) {
      return Response.json({ message: "Manager não encontrado" }, { status: 404 });
    }

    const taskId = taskIdRaw != null ? Number.parseInt(String(taskIdRaw), 10) : null;
    const deliverableId = deliverableIdRaw != null ? Number.parseInt(String(deliverableIdRaw), 10) : null;

    const selectedTask = taskId != null ? engagement.tasks.find((task) => task.id === taskId) : null;
    const selectedDeliverable = deliverableId != null
      ? engagement.deliverables.find((item) => item.id === deliverableId)
      : null;

    if (engagement.tasks.length > 0 && !selectedTask) {
      return Response.json({ message: "Seleciona uma tarefa válida" }, { status: 400 });
    }

    if (engagement.deliverables.length > 0 && deliverableId != null && !selectedDeliverable) {
      return Response.json({ message: "Seleciona um deliverable válido" }, { status: 400 });
    }

    if (isReview && (reviewTargetRaw !== "Staff" && reviewTargetRaw !== "GDS")) {
      return Response.json({ message: "Indica o alvo da revisão (Staff ou GDS)" }, { status: 400 });
    }

    const activity = await activityService.createActivity({
      user_name: locals.user.name,
      user_email: locals.user.email,
      engagement_name: engagement.engagement_name,
      engagement_code: engagement.engagement_code ?? null,
      manager_id: manager.id,
      manager_name: manager.name,
      manager_email: manager.email,
      manager_engagement_id: engagement.id,
      manager_engagement_task_id: selectedTask?.id ?? null,
      manager_engagement_deliverable_id: selectedDeliverable?.id ?? null,
      task_label: selectedTask?.label ?? null,
      deliverable_label: selectedDeliverable?.label ?? null,
      is_review: isReview,
      review_target: isReview ? (reviewTargetRaw === "GDS" ? "GDS" : "Staff") : null,
    });

    return Response.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    return Response.json({
      success: false,
      message: error instanceof Error ? error.message : "Não foi possível criar a atividade",
    }, { status: 500 });
  }
}
