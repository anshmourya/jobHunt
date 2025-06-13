"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function UserMenu() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign Up Free</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" asChild>
        <Link href="/jobs">Dashboard</Link>
      </Button>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
