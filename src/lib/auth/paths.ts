export function getSignInUrl(redirectTo?: string) {
  const loginEndpoint = `${import.meta.env.VITE_ACCOUNTS_API_URL}/providers/${import.meta.env.VITE_AUTH_PROVIDER}/login`;
  const signInURL = new URL(loginEndpoint);
  signInURL.searchParams.append(
    "redirect_uri",
    new URL(redirectTo || "/dashboard", window.location.href).toString(),
  );
  return signInURL.toString();
}

export function getSignOutUrl(redirectTo?: string) {
  const logoutEndpoint = `${import.meta.env.VITE_ACCOUNTS_API_URL}/logout`;
  const signOutURL = new URL(logoutEndpoint);
  signOutURL.searchParams.append(
    "redirect_uri",
    new URL(redirectTo ?? "", window.location.href).toString(),
  );
  return signOutURL.toString();
}
