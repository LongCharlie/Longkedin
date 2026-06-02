// ============================================================
// NextAuth API Route Handler
// Mounted at /api/auth/[...nextauth]
// ============================================================
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
