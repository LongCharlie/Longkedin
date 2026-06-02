// ============================================================
// tRPC Context Type — Mirror for frontend
// ============================================================
export interface TrpcContext {
  user: {
    id: string;
    email: string;
    name?: string;
    role: "user" | "premium" | "admin";
  } | null;
  traceId: string;
}
