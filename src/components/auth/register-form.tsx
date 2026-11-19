"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { register, type RegisterState } from "@/lib/auth-actions";

const initialState: RegisterState = { error: null, ok: false };

export function RegisterForm() {
  const [state, formAction] = useFormState(register, initialState);
  const router = useRouter();

  React.useEffect(() => {
    if (state.ok) {
      router.push("/login?registered=1");
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Nome</label>
        <input
          name="name"
          type="text"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Il tuo nome"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Email</label>
        <input
          name="email"
          type="email"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="nome.utente@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Password</label>
        <input
          name="password"
          type="password"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Almeno 8 caratteri"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Conferma Password</label>
        <input
          name="confirmPassword"
          type="password"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Ripeti la password"
          required
        />
      </div>

      {state.error && (
        <div role="alert" className="text-sm text-red-400">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2 px-4 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        Registrati
      </button>

      <p className="text-xs text-white/60">
        Hai già un account?{" "}
        <a href="/login" className="text-red-400 hover:text-red-300 underline">
          Accedi
        </a>
      </p>
    </form>
  );
}
