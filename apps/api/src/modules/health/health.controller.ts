// ============================================================
// HealthController — Health check endpoints
// Used by: Docker healthcheck, ALB target group, K8s probes
// ============================================================
import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";
import { Public } from "../../common/decorators/public.decorator";

@Controller("rest/health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/rest/health
   * Full health check with all dependencies.
   */
  @Public()
  @Get()
  async check() {
    return this.healthService.check();
  }

  /**
   * GET /api/rest/health/live
   * Liveness probe — "is the process alive?"
   */
  @Public()
  @Get("live")
  live() {
    return this.healthService.liveness();
  }

  /**
   * GET /api/rest/health/ready
   * Readiness probe — "can the app serve traffic?"
   */
  @Public()
  @Get("ready")
  async ready() {
    return this.healthService.readiness();
  }
}
