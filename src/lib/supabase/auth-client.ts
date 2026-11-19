"use client";

import { createBrowserClient } from "@supabase/ssr";

export function supabaseAuth() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function signIn({ email, password }: { email: string; password: string }) {
  const supabase = supabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, error };
}

export async function signOut() {
  const supabase = supabaseAuth();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const supabase = supabaseAuth();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const supabase = supabaseAuth();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const supabase = supabaseAuth();
  return supabase.auth.onAuthStateChange(callback);
}
