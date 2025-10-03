import { defineMiddleware } from "astro:middleware";
import { UserService } from "@/lib/services/user";

const SESSION_COOKIE = "lumio_session";
const PUBLIC_PATHS = new Set([
  "/",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_astro") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/public")
  );
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) {
    return PUBLIC_PATHS.has(pathname);
  }
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (isStaticAsset(path)) {
    return next();
  }

  const { locals, cookies } = context;
  const { DB } = locals.runtime.env;
  const userService = new UserService(DB);

  locals.user = null;
  locals.sessionToken = null;

  const sessionCookie = cookies.get(SESSION_COOKIE);
  if (sessionCookie?.value) {
    const session = await userService.getSession(sessionCookie.value);
    if (session) {
      locals.user = session.user;
      locals.sessionToken = sessionCookie.value;
    } else {
      cookies.delete(SESSION_COOKIE, { path: "/" });
    }
  }

  if (!locals.user && !isPublicPath(path)) {
    return context.redirect("/");
  }

  if (locals.user && path === "/") {
    return context.redirect("/app");
  }

  if (locals.user && path.startsWith("/admin") && locals.user.rank !== "Admin") {
    return context.redirect("/app");
  }

  return next();
});
