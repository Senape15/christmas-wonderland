"use client";

import * as React from "react";
import { signIn } from "@/lib/supabase/auth-client";

export function LoginForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    try {
      const { error: signInError } = await signIn({ email, password });
      if (signInError) throw signInError;
      // Navigazione piena: il cookie di sessione viene letto dal proxy e dal
      // server con la prima richiesta, senza race con il router client.
      window.location.assign(new URL("/dashboard", window.location.origin).href);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore di accesso. Riprova."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium text-white">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="nome.utente@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium text-white">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="••••••••"
          required
        />
      </div>

      {error && <div role="alert" className="text-sm text-red-400">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Accesso in corso..." : "Accedi"}
      </button>

      <p className="text-xs text-white/60">
        Non hai un account?{" "}
        <a href="/register" className="text-red-400 hover:text-red-300 underline">
          Registrati
        </a>
      </p>
    </form>
  );
}
