import { ActivityService } from "@/lib/services/activity";

export async function GET({ locals }) {
  if (!locals.user) {
    return Response.json({ success: false, message: "Nao autenticado" }, { status: 401 });
  }

  const { DB } = locals.runtime.env;
  const activityService = new ActivityService(DB);

  try {
    const activity = await activityService.getActiveActivityForUser(locals.user.email);
    return Response.json({ success: true, activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel carregar a atividade em curso";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
