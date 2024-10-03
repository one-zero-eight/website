export function navigateToSignIn(
  redirectTo: string = "/dashboard",
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

  // Record the login time (to prevent immediate automatic re-login)
  localStorage.setItem("lastLogin", Date.now().toString());

  // Navigate to the sign-in endpoint
  window.location.assign(signInURL.toString());
}

export function shouldAutoSignIn() {
  // Try to log in without interaction
  const lastLogin = localStorage.getItem("lastLogin");
  return (
    lastLogin === null || Date.now() - Number(lastLogin) > 30 * 60 * 1000 // 30 minutes
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
