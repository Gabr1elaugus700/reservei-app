import { createAuthClient } from "better-auth/react";
import { organization } from "better-auth/plugins/organization";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth`
        : typeof window !== "undefined" 
            ? `${window.location.origin}/api/auth`
            : "/api/auth",
    plugins: [organization()],
});

export const {
    signIn,
    signOut,
    signUp,
    useSession
} = authClient;