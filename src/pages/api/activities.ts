import { ActivityService } from "@/lib/services/activity";

export async function GET({ locals }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  try {
    const activities = await activityService.getAll();
    return Response.json({ activities });
  } catch (error) {
    return Response.json(
      { message: "Could not load activities" },
      { status: 500 },
    );
  }
}

export async function POST({ locals, request }) {
  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  try {
    const body = await request.json();
    const requiredFields = [
      "user_name",
      "user_email",
      "engagement",
    ];

    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== "string") {
        return Response.json(
          { message: `Missing or invalid field: ${field}` },
          { status: 400 },
        );
      }
    }

    const activity = await activityService.createActivity(body);
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
        message: error.message || "Failed to create activity",
        success: false,
      },
      { status: 500 },
    );
  }
}
