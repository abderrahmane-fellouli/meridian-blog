"use client";

import { useEffect, useId, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";

import { ownerLogin } from "@/lib/actions/auth";
import type { AuthFormState } from "@/lib/actions/types";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

export function LoginForm({ locked }: { locked: boolean }) {
  const router = useRouter();
  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(ownerLogin, {});

  const emailError = state.error ? undefined : fieldErrors.email;
  const passwordError = state.error ? undefined : fieldErrors.password;
  const showServerError = state.error && !locked;

  useEffect(() => {
    if (state.ok) router.replace("/admin/dashboard");
  }, [state.ok, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const errors: FieldErrors = {};
    if (!email) errors.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";

    if (errors.email || errors.password) {
      e.preventDefault();
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setShowPassword(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--tx-1)]" style={{ fontFamily: "var(--font-display)" }}>
          {site.name}
        </h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
          {site.tagline}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--tx-2)]">Sign in to the admin console.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-7">
        {locked ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
          >
            <Lock size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Temporarily locked</p>
              <p className="mt-0.5">Too many failed attempts. Wait about 15 minutes before trying again.</p>
            </div>
          </div>
        ) : (
          <>
            {showServerError && (
              <div
                id={`${uid}-auth-error`}
                role="alert"
                aria-live="polite"
                className="mb-4 flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
              >
                <AlertCircle size={16} className="mr-2.5 shrink-0" aria-hidden="true" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="flex flex-col gap-1">
                <label htmlFor={emailId} className="text-xs font-medium text-[var(--tx-2)] uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    disabled={pending}
                    aria-invalid={!!emailError || undefined}
                    aria-describedby={emailError ? `${emailId}-error` : undefined}
                    className="h-11 w-full bg-[var(--surface)] px-3 text-sm placeholder:text-[var(--tx-3)]"
                    placeholder="you@example.com"
                  />
                </div>
                <p
                  id={`${emailId}-error`}
                  role="alert"
                  aria-live="polite"
                  className="flex min-h-5 items-center pt-0.5 text-xs leading-tight text-red-500"
                >
                  {emailError}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={passwordId} className="text-xs font-medium text-[var(--tx-2)] uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    disabled={pending}
                    aria-invalid={!!passwordError || undefined}
                    aria-describedby={passwordError ? `${passwordId}-error` : undefined}
                    className="h-11 w-full bg-[var(--surface)] pr-11 pl-3 text-sm placeholder:text-[var(--tx-3)]"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={pending}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--tx-3)] transition-colors hover:text-[var(--tx-1)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <p
                  id={`${passwordId}-error`}
                  role="alert"
                  aria-live="polite"
                  className="flex min-h-5 items-center pt-0.5 text-xs leading-tight text-red-500"
                >
                  {passwordError}
                </p>
              </div>

              <Button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className="mt-1 h-11 w-full justify-center rounded-lg text-sm"
              >
                {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-[var(--tx-3)] text-center">
        <Link href="/" className="hover:text-[var(--accent)] transition-colors">
          ← Back to {site.name}
        </Link>
      </p>
    </div>
  );
}
