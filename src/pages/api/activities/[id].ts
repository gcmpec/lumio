import { ActivityService } from "@/lib/services/activity";

export async function GET({ locals, params }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  if (!locals.user) {
    return Response.json({ message: "Nao autenticado" }, { status: 401 });
  }

  if (locals.user.rank !== "Admin") {
    return Response.json({ message: "Sem permissao" }, { status: 403 });
  }

  const { id } = params;

  try {
    const activity = await activityService.getById(id);
    if (!activity) {
      return Response.json({ message: "Activity not found" }, { status: 404 });
    }
    return Response.json({ activity });
  } catch (error) {
    return Response.json(
      { message: "Could not load activity" },
      { status: 500 },
    );
  }
}

export async function PATCH({ locals, params }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  if (!locals.user) {
    return Response.json({ message: "Nao autenticado" }, { status: 401 });
  }

  const { id } = params;

  try {
    const activity = await activityService.getById(id);
    if (!activity) {
      return Response.json({ message: "Activity not found" }, { status: 404 });
    }

    const canManage =
      locals.user.rank === "Admin" || activity.user_email.toLowerCase() === locals.user.email.toLowerCase();

    if (!canManage) {
      return Response.json({ message: "Sem permissao" }, { status: 403 });
    }

    const updatedActivity = await activityService.stopActivity(id);
    return Response.json({ success: true, activity: updatedActivity });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Failed to stop activity",
        success: false,
      },
      { status: 400 },
    );
  }
}
