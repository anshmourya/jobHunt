"use client";

import React from "react";
import { FileText, Link as LinkIcon, User } from "lucide-react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { JobDescriptionDialog } from "./job-description-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import Link from "next/link";

const Header = () => {
  const { user } = useUser();
  const userInitials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <Logo />

        <div className="flex items-center space-x-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full p-0 hover:bg-muted"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.fullName ?? "User"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {userInitials ?? <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end" sideOffset={8}>
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">
                  {user?.fullName ?? "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress ?? "User"}
                </p>
              </div>

              <Separator className="my-1" />

              <div className="space-y-1">
                <JobDescriptionDialog
                  trigger={
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal px-2 h-8"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Generate Resume</span>
                    </Button>
                  }
                />
              </div>

              <Link
                href="/profile"
                className="w-full justify-start text-sm font-normal px-2 h-8 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
              >
                <LinkIcon className="h-4 w-4" />
                <span>Profile</span>
              </Link>

              <Separator className="my-1" />

              <div className="p-2">
                <SignOutButton>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm font-normal px-2 h-8 text-destructive hover:text-destructive"
                  >
                    Sign out
                  </Button>
                </SignOutButton>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
};

export default Header;
