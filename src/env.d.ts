import type { Runtime } from "@astrojs/cloudflare";
import type { AuthenticatedUser } from "@/lib/types";

type CloudflareRuntime = Runtime<Env>;

declare namespace App {
  interface Locals extends CloudflareRuntime {
    CUSTOMER_WORKFLOW: Workflow;
    DB: D1Database;
    user?: AuthenticatedUser | null;
    sessionToken?: string | null;
  }
}
