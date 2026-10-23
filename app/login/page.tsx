import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Crew Dispatch",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold text-ink">Crew Dispatch</h1>
        <p className="mt-1 mb-6 text-muted-foreground">Sign in with your work email.</p>
        <LoginForm />
      </div>
    </main>
  );
}
