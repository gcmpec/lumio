import { UserService } from "@/lib/services/user";

const SESSION_COOKIE = "lumio_session";

export async function POST({ locals, cookies }) {
  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  const sessionCookie = cookies.get(SESSION_COOKIE);
  if (sessionCookie?.value) {
    await userService.deleteSession(sessionCookie.value);
    cookies.delete(SESSION_COOKIE, { path: "/" });
  }

  return Response.json({ success: true });
}
