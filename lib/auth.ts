import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";

import { account, session, user, verification } from "@/db/schema";
import { db } from "@/lib/db";

export const auth = betterAuth({
  appName: "Meridian",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: false,
    schema: { user, session, account, verification },
  }),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24 * 7,
  },
  user: {
    additionalFields: {
      isOwner: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      passwordChangedAt: {
        type: "date",
        required: false,
        input: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
});

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isOwner: boolean;
  mustChangePassword: boolean;
};

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}