export function getAuthToken() {
  return localStorage.getItem("token") || undefined;
}

export function setAuthToken(token: string) {
  localStorage.setItem("token", token);
}

export function unsetAuthToken() {
  localStorage.removeItem("token");
}
