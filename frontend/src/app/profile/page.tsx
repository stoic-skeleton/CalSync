"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=/profile`);
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      <div className="rounded-xl p-6 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xl font-bold">
            {(user.name || user.email).slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold">{user.name || user.email}</div>
            <div className="text-sm text-[var(--muted)]">{user.email}</div>
            <div className="mt-2">
              <span className="text-xs font-semibold uppercase px-2 py-1 rounded" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>{user.tier}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="mb-3 text-sm text-[var(--muted)]">Email</div>
        <div className="mb-4">{user.email}</div>

        <div className="mb-3 text-sm text-[var(--muted)]">Plan</div>
        <div className="mb-4">
          {user.tier === "freemium" ? "Freemium — up to 3 feeds" : user.tier === "pro" ? "Pro — unlimited feeds" : "Admin — full access"}
        </div>

        <div className="mb-3 text-sm text-[var(--muted)]">Member since</div>
        <div className="mb-6">{new Date(user.created_at).toLocaleDateString()}</div>

        <button
          onClick={async () => { await logout(); router.push("/"); }}
          className="btn w-full"
          style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
