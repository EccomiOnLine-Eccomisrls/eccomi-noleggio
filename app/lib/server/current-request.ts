import { headers } from "next/headers";

export async function currentRequest(pathname: string) {
  const incoming = await headers();
  const requestHeaders = new Headers();

  incoming.forEach((value, key) => {
    requestHeaders.set(key, value);
  });

  const host = incoming.get("host")?.trim() || "localhost";
  const forwardedProtocol = incoming
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return new Request(`${protocol}://${host}${normalizedPath}`, {
    headers: requestHeaders,
  });
}
