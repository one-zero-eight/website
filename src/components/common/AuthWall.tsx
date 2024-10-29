import { SignInButton } from "@/components/common/SignInButton.tsx";
import React from "react";

export function AuthWall() {
  return (
    <div className="px-4">
      <h2 className="my-4 text-3xl font-medium">Sign in to get access</h2>
      <p className="mb-4 text-lg text-text-secondary/75">
        Use your Innopolis account to access InNoHassle services.
      </p>
      <SignInButton />
    </div>
  );
}
