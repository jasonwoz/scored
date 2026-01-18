"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/client/auth-client";

export default function HomePage() {
  const { data: session, isPending, error } = authClient.useSession();

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        // User is authenticated, redirect to friends feed
        window.location.href = "/friends-feed";
      } else if (error || !session) {
        // User is not authenticated or there's an error, redirect to sign-in
        window.location.href = "/signin";
      }
    }
  }, [session, isPending, error]);

  // Show loading while checking authentication
  if (isPending) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Scored</h1>
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // This component will redirect before rendering
  return null;
}