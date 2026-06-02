// ============================================================
// AppRouter Type — Mirror of the API's app router
// This avoids cross-package runtime imports.
// The backend's app.router.ts is the source of truth.
// ============================================================
import type { TrpcContext } from "./context";

/**
 * Type-only mirror of the tRPC AppRouter.
 * Must be kept in sync with apps/api/src/trpc/app.router.ts
 */
export interface AppRouter {
  health: {
    ping: {
      input: void;
      output: { pong: boolean; timestamp: string };
    };
  };
  auth: {
    devLogin: {
      input: { userId?: string };
      output: {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name?: string; role: string };
      };
    };
    refreshToken: {
      input: { refreshToken: string };
      output: {
        accessToken: string;
        user: { id: string; email: string; name?: string; role: string };
      };
    };
    me: {
      input: void;
      output: { id: string; email: string; name?: string; role: string };
    };
  };
  user: {
    getProfile: {
      input: void;
      output: Record<string, unknown>;
    };
    updateProfile: {
      input: Record<string, unknown>;
      output: Record<string, unknown>;
    };
    deleteAccount: {
      input: void;
      output: { success: boolean };
    };
  };
}

export type { TrpcContext };
