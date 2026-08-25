export function publicUrl(request: Request, pathname: string) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === requestUrl.host) {
        return new URL(pathname, originUrl);
      }
    } catch {
      // Ignore malformed Origin and fall back to trusted proxy headers.
    }
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost) requestUrl.host = forwardedHost;
  if (forwardedProtocol === "http" || forwardedProtocol === "https") {
    requestUrl.protocol = `${forwardedProtocol}:`;
  }

  return new URL(pathname, requestUrl);
}
