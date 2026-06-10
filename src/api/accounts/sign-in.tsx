import { useMe } from "@/api/accounts/user.ts";

export function AutoSignIn() {
  const { me } = useMe();

  if (me) {
    return null;
  }

  if (!shouldAutoSignIn()) {
    return null;
  }

  console.log("AutoSignIn enabled");
  const signInURL = buildSignInURL("", "none");
  return <iframe src={signInURL.toString()} style={{ display: "none" }} />;
}

export function navigateToSignIn(
  redirectTo: string = "",
  prompt?: "none" | undefined,
) {
  const signInURL = buildSignInURL(redirectTo, prompt);

  // Record the login time (to prevent immediate automatic re-login)
  localStorage.setItem("lastLogin", Date.now().toString());

  // Navigate to the sign-in endpoint
  window.location.assign(signInURL.toString());
}

export function buildSignInURL(
  redirectTo: string = "",
  prompt?: "none" | undefined,
) {
  // Build the sign-in URL
  const loginEndpoint = `${import.meta.env.VITE_ACCOUNTS_API_URL}/providers/${import.meta.env.VITE_AUTH_PROVIDER}/login`;
  const signInURL = new URL(loginEndpoint);
  signInURL.searchParams.append(
    "redirect_uri",
    new URL(redirectTo, window.location.href).toString(),
  );
  if (prompt) {
    signInURL.searchParams.append("prompt", prompt);
  }

  return signInURL;
}

export function shouldAutoSignIn() {
  // Try to log in without interaction
  const lastLogin = localStorage.getItem("lastLogin");
  const isOnTvPage = window.location.pathname.startsWith("/tv");
  return (
    (lastLogin === null || Date.now() - Number(lastLogin) > 30 * 60 * 1000) && // 30 minutes
    !isOnTvPage
  );
}

export function navigateToSignOut(redirectTo?: string) {
  // Build the sign-out URL
  const logoutEndpoint = `${import.meta.env.VITE_ACCOUNTS_API_URL}/logout`;
  const signOutURL = new URL(logoutEndpoint);
  signOutURL.searchParams.append(
    "redirect_uri",
    new URL(redirectTo ?? "", window.location.href).toString(),
  );

  // Record the login time (to prevent immediate automatic re-login)
  localStorage.setItem("lastLogin", Date.now().toString());

  // Navigate to the sign-out endpoint
  window.location.assign(signOutURL.toString());
}
