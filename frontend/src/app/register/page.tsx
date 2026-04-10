"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get("next") ?? "/";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerUser({ email, password, name: name || undefined });
      // Auto-login so AuthContext + navbar update immediately
      await login(email, password);
      router.push(next);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg.includes("400") ? "An account with that email already exists." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Name (optional)</div>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>

        <label className="block">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Email</div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>

        <label className="block">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Password <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>(min 8 chars)</span></div>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>

        {error && <div className="text-sm text-red-400 rounded-lg p-2" style={{ background: "var(--surface)" }}>{error}</div>}

        <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-sm mt-4 text-center" style={{ color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>Sign in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
