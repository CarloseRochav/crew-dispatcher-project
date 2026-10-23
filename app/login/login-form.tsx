"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        errors={state.fieldErrors?.email}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />

      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="size-4" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

type FieldProps = {
  id: "email" | "password";
  label: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  errors?: string[];
};

function Field({ id, label, type, autoComplete, defaultValue, errors }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="h-11 text-base"
      />
      {errors && (
        <p id={errorId} className="text-sm text-destructive">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
