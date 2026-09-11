"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground-dim)] transition hover:bg-[var(--card-soft)] hover:text-[var(--foreground)] disabled:opacity-50"
    >
      <span aria-hidden className="grid w-4 place-items-center">⏻</span>
      <span>Se déconnecter</span>
    </button>
  );
}
