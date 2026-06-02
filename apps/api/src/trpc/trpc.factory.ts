// ============================================================
// tRPC Factory — Creates the tRPC instance with context type
// ============================================================
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { TrpcContext } from "./trpc.context";

/**
 * tRPC instance with:
 * - superjson transformer (handles Date, Map, Set serialization)
 * - Zod error formatting
 */
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ---- Exports ----
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
