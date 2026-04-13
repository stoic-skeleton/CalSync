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
      <button className="mb-4 w-full btn flex items-center justify-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={goGoogle}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.09 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.22l7.08 5.5C12.4 13.67 17.73 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.99-2.22 5.52-4.73 7.22l7.25 5.63C43.44 37.42 46.52 31.4 46.52 24.5z"/>
          <path fill="#FBBC05" d="M10.72 28.28A14.6 14.6 0 0 1 9.5 24c0-1.48.25-2.91.72-4.28l-7.08-5.5A23.94 23.94 0 0 0 0 24c0 3.87.93 7.52 2.56 10.75l8.16-6.47z"/>
          <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.49-4.94l-7.25-5.63c-1.81 1.21-4.13 1.93-6.24 1.93-6.27 0-11.6-4.17-13.28-9.72l-8.16 6.47C7.07 41.52 14.82 47 24 47z"/>
        </svg>
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
