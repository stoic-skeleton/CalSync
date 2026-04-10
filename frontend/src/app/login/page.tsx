"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get("next") ?? "/";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // useAuth().login calls loginUser + refresh() so the navbar updates immediately
      await login(email, password);
      router.push(next);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg.includes("401") || msg.toLowerCase().includes("invalid") ? "Invalid email or password." : msg);
    } finally {
      setLoading(false);
    }
  }

  function goGoogle() {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/auth/google`;
  }

  return (
    <div className="mx-auto max-w-md p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6">Sign in</h1>
      <button className="mb-4 w-full btn" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={goGoogle}>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 border-t" style={{ borderColor: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--muted)" }}>or</span>
        <div className="flex-1 border-t" style={{ borderColor: "var(--border)" }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Email</div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>

        <label className="block">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Password</div>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>

        {error && <div className="text-sm text-red-400 rounded-lg p-2" style={{ background: "var(--surface)" }}>{error}</div>}

        <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm mt-4 text-center" style={{ color: "var(--muted)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium" style={{ color: "var(--accent)" }}>Create one</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
