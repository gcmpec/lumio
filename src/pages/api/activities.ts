import { ActivityService } from "@/lib/services/activity";

export async function GET({ locals }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  if (!locals.user) {
    return Response.json({ message: "Nao autenticado" }, { status: 401 });
  }

  if (locals.user.rank !== "Admin") {
    return Response.json({ message: "Sem permissao" }, { status: 403 });
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

  if (!locals.user) {
    return Response.json({ message: "Nao autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const engagement = typeof body.engagement === "string" ? body.engagement.trim() : "";
    const managerEmail = typeof body.manager_email === "string" ? body.manager_email.trim() : null;
    const process = typeof body.process === "string" ? body.process.trim() : null;
    const deliverable = typeof body.deliverable === "string" ? body.deliverable.trim() : null;

    if (!engagement) {
      return Response.json(
        { message: "Engagement e obrigatorio" },
        { status: 400 },
      );
    }

    const activity = await activityService.createActivity({
      user_name: locals.user.name,
      user_email: locals.user.email,
      engagement,
      manager_email: managerEmail || null,
      process: process || null,
      deliverable: deliverable || null,
    });

    return Response.json(
      {
        success: true,
        activity,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Failed to create activity",
        success: false,
      },
      { status: 500 },
    );
  }
}
