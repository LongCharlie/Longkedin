// ============================================================
// @Trace() — Inject trace metadata into span
// ============================================================
import { SetMetadata } from "@nestjs/common";

export const TRACE_KEY = "trace";
export interface TraceMetadata {
  action: string;
  resource?: string;
}
export const Trace = (meta: TraceMetadata) => SetMetadata(TRACE_KEY, meta);
