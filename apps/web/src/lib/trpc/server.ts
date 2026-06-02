// ============================================================
// tRPC Server-Side Caller (Server Components)
// Phase 2: any-typed — full type safety comes when we
//          export AppRouter from a shared package
// ============================================================
import "server-only";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import { headers } from "next/headers";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXTAUTH_URL) return `${process.env.NEXTAUTH_URL}/api/trpc`;
  return `http://localhost:${process.env.API_PORT || 4000}/api/trpc`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = createTRPCClient<any>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: getBaseUrl(),
      transformer: superjson,
      async headers() {
        const h = await headers();
        return {
          "x-trace-id": h.get("x-trace-id") ?? crypto.randomUUID(),
          cookie: h.get("cookie") ?? "",
        };
      },
    }),
  ],
});
