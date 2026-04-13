"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredToken } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();

  useEffect(() => {
    const token = params?.get("token");
    if (token) {
      setStoredToken(token);
      // Refresh auth context so navbar/user state updates immediately
      refresh().finally(() => router.replace("/"));
    } else {
      router.replace("/");
    }
  }, [params, refresh, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p style={{ color: "var(--muted)" }}>Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
