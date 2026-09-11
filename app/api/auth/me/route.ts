import { handle, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";

export const GET = handle(async () => {
  const user = await requireUser();
  return json({ id: user.id, email: user.email, role: user.role, organisationId: user.organisationId });
});
