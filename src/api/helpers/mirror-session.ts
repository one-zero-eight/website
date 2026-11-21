/**
 * The mirror host (see src/service-worker/proxy-fallback.ts) lives on another
 * site, so it can't use the session cookie of the main API host: the browser
 * never sends that one to it. Accounts keeps a session of its own there, a
 * cross-site partitioned cookie, and hands it out for a short-lived transfer
 * token from the main host.
 *
 * The exchange runs once per page load, while the main host still answers:
 * once it stops answering, the worker can only fall back to the mirror if the
 * mirror already knows the user.
 */
import { mirrorUrl } from "@/service-worker/proxy-fallback.ts";

const accountsApiUrl = import.meta.env.VITE_ACCOUNTS_API_URL;

function mirrorAccountsUrl() {
  return mirrorUrl(new URL(accountsApiUrl));
}

/** Shared by every caller, so a page load exchanges at most once. */
let sessionAttempt: Promise<void> | null = null;

export function ensureMirrorSession() {
  sessionAttempt ??= exchangeSession().catch((error) =>
    console.info("[mirror] No session on the mirror host:", error),
  );
  return sessionAttempt;
}

async function exchangeSession() {
  const mirror = mirrorAccountsUrl();
  if (!mirror) return;

  const token = await fetch(`${accountsApiUrl}/session/mirror/transfer-token`, {
    method: "POST",
    credentials: "include",
  });
  // Not signed in on the main host: there is no session to copy.
  if (!token.ok) return;

  const response = await fetch(`${mirror}/session/mirror`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transfer_token: (await token.json()).transfer_token,
    }),
  });
  if (!response.ok)
    throw new Error(`The mirror host answered ${response.status}`);
}

/** Clear the mirror session on sign out, so it can't outlive the main one. */
export async function clearMirrorSession() {
  const mirror = mirrorAccountsUrl();
  if (!mirror) return;
  await fetch(`${mirror}/session/mirror`, {
    method: "DELETE",
    credentials: "include",
  });
}
