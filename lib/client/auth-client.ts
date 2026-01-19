import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    /** Automatically uses the current origin for both local and production */
})