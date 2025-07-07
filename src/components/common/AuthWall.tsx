import { SignInButton } from "@/components/common/SignInButton.tsx";

export function AuthWall({ signInRedirect }: { signInRedirect?: string }) {
  return (
    <div className="px-4">
      <h2 className="my-4 text-3xl font-medium">Sign in to get access</h2>
      <p className="mb-4 text-lg text-contrast/75">
        Use your Innopolis account to access InNoHassle services.
      </p>
      <SignInButton signInRedirect={signInRedirect} />
    </div>
  );
}
