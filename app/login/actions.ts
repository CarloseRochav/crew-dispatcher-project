"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathFor } from "@/lib/home-path";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "./schema";

export type LoginState = {
  error: string | null;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  const typedEmail = typeof email === "string" ? email : "";

  if (!parsed.success) {
    return { error: null, fieldErrors: z.flattenError(parsed.error).fieldErrors, email: typedEmail };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // One message for a wrong email or password, so the form does not reveal which emails exist.
    const message =
      error.code === "invalid_credentials"
        ? "Email or password is incorrect"
        : "Could not sign in right now. Try again in a minute.";
    return { error: message, email: typedEmail };
  }

  // Same client: it already holds the new session, the cookie store may not yet.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    return { error: "Could not load your account. Try again in a minute.", email: typedEmail };
  }

  redirect(homePathFor(profile.role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
