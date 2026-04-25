"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to login right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Authentication
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Login</h1>
        <p className="text-sm text-slate-600">
          Click login to enter the authenticated section layout.
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
