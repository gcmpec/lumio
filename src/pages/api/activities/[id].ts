import { ActivityService } from "@/lib/services/activity";

export async function GET({ locals, params }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

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

  const { id } = params;

  try {
    const activity = await activityService.stopActivity(id);
    return Response.json({ success: true, activity });
  } catch (error) {
    return Response.json(
      {
        message: error.message || "Failed to stop activity",
        success: false,
      },
      { status: 400 },
    );
  }
}
