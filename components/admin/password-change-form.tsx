"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { changePassword } from "@/lib/actions/auth";
import type { AuthFormState } from "@/lib/actions/types";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";

export function PasswordChangeForm({ email }: { email: string }) {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(changePassword, {});

  useEffect(() => {
    if (state.ok) router.replace("/admin/dashboard");
  }, [state.ok, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const next = String((form.elements.namedItem("password") as HTMLInputElement | null)?.value ?? "");
    const confirm = String((form.elements.namedItem("confirmPassword") as HTMLInputElement | null)?.value ?? "");
    if (next !== confirm) {
      e.preventDefault();
      setClientError("The passwords do not match.");
      return;
    }
    setClientError(null);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <p className="font-display text-2xl font-semibold text-[var(--tx-1)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {site.name}
        </p>
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)] mb-6">Set a new password</p>
        <p className="text-sm text-[var(--tx-2)] leading-relaxed">
          This is your first sign-in. Choose a strong password (at least 12 characters) before continuing.
        </p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[var(--tx-3)] -mt-2">Signed in as {email}</p>

        <div>
          <label htmlFor="currentPassword" className="block text-xs font-medium text-[var(--tx-2)] mb-1.5">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[var(--tx-2)] mb-1.5">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
          <p className="mt-1 text-xs text-[var(--tx-3)]">At least 12 characters.</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-[var(--tx-2)] mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-500" role="alert">
            {state.error}
          </p>
        )}
        {clientError && (
          <p className="text-sm text-red-500" role="alert">
            {clientError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full justify-center" size="lg">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          Set password
        </Button>
      </form>
    </div>
  );
}