import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { betterAuth } from 'better-auth'
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";

const prisma = new PrismaClient();
export const auth = betterAuth({
     emailAndPassword: {
        enabled: true,
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    plugins: [
        nextCookies(),
        organization(),
    ]
});