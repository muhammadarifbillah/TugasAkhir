/**
 * Frontend helper to get CSRF token from cookie and add it to fetch headers.
 */

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Enhanced fetch that automatically includes the CSRF token header
 * for state-changing requests (POST, PUT, PATCH, DELETE).
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  // Only add CSRF token for state-changing methods
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCsrfTokenFromCookie();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
  }

  return fetch(url, { ...options, headers });
}
