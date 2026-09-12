import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Shell } from "@/components/shell";
import { Toast } from "@/components/toast";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Le fournisseur de notifications enveloppe le contenu de `Shell`, et non `Shell` lui-même : la
  // barre bleue et le pied de page restent des éléments serveur, seules les pages en ont besoin.
  return (
    <Shell user={session}>
      <Toast>{children}</Toast>
    </Shell>
  );
}
