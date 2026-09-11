import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen md:pl-[248px]">
      <Sidebar userId={session.id} />
      <div className="flex min-h-screen flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 md:px-8 md:py-8">
          <div className="rise">{children}</div>
        </main>
      </div>
    </div>
  );
}
