import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from 'better-auth'
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";

const prisma = new PrismaClient();
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
    trustedOrigins: [
        "http://localhost:3000",
        "https://reservas.app-reservei.com.br",
        "https://app.app-reservei.com.br",
    ],
});