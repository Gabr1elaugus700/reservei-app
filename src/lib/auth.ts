import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from 'better-auth'
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";

const prisma = new PrismaClient();

function readEnv(name: string): string | undefined {
    const value = process.env[name];
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOrigin(value: string): string {
    return value.trim().replace(/\/$/, "");
}

function trustedOriginList(): string[] {
    const fromEnv = (readEnv("BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
        .split(",")
        .map(normalizeOrigin)
        .filter((origin) => origin.length > 0);
    const candidates = [
        "http://localhost:3000",
        "http://localhost:3005",
        "https://reservas.app-reservei.com.br",
        "https://app.app-reservei.com.br",
        readEnv("BETTER_AUTH_URL"),
        readEnv("NEXT_PUBLIC_APP_URL"),
        ...fromEnv,
    ];
    const origins: string[] = [];

    for (const candidate of candidates) {
        if (typeof candidate !== "string") continue;
        const origin = normalizeOrigin(candidate);
        if (!origin || origins.includes(origin)) continue;
        origins.push(origin);
    }

    return origins;
}

function crossSubDomainCookies(): { enabled: true; domain: string } | undefined {
    if (readEnv("BETTER_AUTH_CROSS_SUBDOMAIN_COOKIES") !== "true") {
        return undefined;
    }

    const domain = (readEnv("BETTER_AUTH_COOKIE_DOMAIN") ?? readEnv("NEXT_PUBLIC_BASE_DOMAIN") ?? "")
        .replace(/^\./, "");

    if (!domain) return undefined;

    return { enabled: true, domain };
}

const sharedCookies = crossSubDomainCookies();

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || "default-secret-key-change-in-production",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    emailAndPassword: {
        enabled: true,
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
    plugins: [
        organization(),
        nextCookies(),
    ],
    trustedOrigins: trustedOriginList(),
    ...(sharedCookies
        ? { advanced: { crossSubDomainCookies: sharedCookies } }
        : {}),
});