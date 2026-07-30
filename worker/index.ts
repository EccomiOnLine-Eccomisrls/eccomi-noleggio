/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { installRuntimeEnv } from "../app/lib/server/runtime";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: unknown;
  BUCKET: unknown;
  PUBLIC_SHOWROOM_BASE_URL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const PUBLIC_STOREFRONT_HOSTS = new Set([
  "noleggio.eccomionline.com",
  "www.noleggio.eccomionline.com",
]);

function publicStorefrontRedirect(url: URL) {
  if (!PUBLIC_STOREFRONT_HOSTS.has(url.hostname.toLowerCase())) return null;

  // La home del sottodominio deve aprire la vetrina interna.
  // Non si usa PUBLIC_SHOWROOM_BASE_URL qui: se contiene lo stesso dominio
  // genererebbe un ciclo infinito di redirect.
  if (url.pathname === "/") {
    return Response.redirect(new URL("/offerte", url.origin).toString(), 302);
  }

  return null;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
const worker = {
  async fetch(request: Request, env?: Env, ctx?: ExecutionContext): Promise<Response> {
    if (env) installRuntimeEnv(env);
    const url = new URL(request.url);

    const storefrontRedirect = publicStorefrontRedirect(url);
    if (storefrontRedirect) return storefrontRedirect;

    if (url.pathname === "/_vinext/image" && env?.ASSETS && env?.IMAGES) {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env as Env, ctx as ExecutionContext);
  },
};

export default worker;
