/**
 * WARNING: Storing authentication tokens in localStorage makes them vulnerable
 * to Cross-Site Scripting (XSS) attacks. While acceptable for a simple internal admin panel,
 * a production-hardened implementation should migrate to httpOnly cookies (reusing
 * the getSessionCookieOptions pattern from server/lib/cookies.ts).
 */
const ADMIN_TOKEN_KEY = "admin_access_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function removeAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

