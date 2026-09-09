/**
 * HTTP Security Headers
 * Applied to all server responses and TanStack Start middleware
 * to prevent clickjacking, MIME sniffing, XSS, and unauthorized framing.
 */

export const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking by denying framing outside same origin
  "X-Frame-Options": "SAMEORIGIN",

  // Prevent MIME-sniffing
  "X-Content-Type-Options": "nosniff",

  // Enforce referrer policy for privacy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Disable sensitive hardware access by default
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",

  // Basic XSS filter for legacy browsers
  "X-XSS-Protection": "1; mode=block",

  // HSTS (1 year)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",

  // Content Security Policy allowing local assets, Google Fonts, and secure WebSockets
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: ws: wss:",
    "frame-ancestors 'self'",
  ].join("; "),
};

/**
 * Clones or wraps an existing Response, ensuring all security headers are set.
 */
export function applySecurityHeaders(response: Response): Response {
  // If response is immutable or headers need extending
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
