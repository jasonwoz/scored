import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const pool = new Pool({
    connectionString: "postgres://woz:password@localhost:5432/woz",
});

export const auth = betterAuth({
    database: pool,
    //...other options
    trustedOrigins: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://scored-ashy.vercel.app",
    ],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        // github: {
        //     clientId: process.env.GITHUB_CLIENT_ID as string,
        //     clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        // },
    },
    // OAuth redirect configuration
    pages: {
        signIn: "/signin",
        signUp: "/signup",
        error: "/signin", // Redirect to signin on auth errors
    },
    // Default redirect after successful authentication
    redirectTo: "/dashboard",
    // Redirect URLs for OAuth flows
    baseURL: process.env.NODE_ENV === "production"
        ? "https://scored-ashy.vercel.app/signup"
        : "http://localhost:3000",
})