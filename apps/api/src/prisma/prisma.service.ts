// ============================================================
// PrismaService — Database connection lifecycle
// Extends PrismaClient with NestJS lifecycle hooks
// ============================================================
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "info" },
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ],
      errorFormat: "pretty",
    });
  }

  async onModuleInit() {
    this.logger.log("Connecting to PostgreSQL...");
    await this.$connect();
    this.logger.log("PostgreSQL connected");

    // ---- Soft-delete middleware: auto-filter deleted records ----
    this.$use(async (params, next) => {
      // Intercept findMany / findFirst / findUnique / count
      if (
        ["findMany", "findFirst", "findUnique"].includes(params.action) &&
        params.model != null &&
        this._hasDeletedAt(params.model)
      ) {
        // If not explicitly asking for deleted records...
        if (!params.args?.where?.deletedAt) {
          params.args = { ...params.args };
          params.args.where = {
            ...(params.args.where || {}),
            deletedAt: null,
          };
        }
      }

      // Intercept delete → soft delete
      if (
        params.action === "delete" &&
        params.model != null &&
        this._hasDeletedAt(params.model)
      ) {
        params.action = "update";
        params.args = {
          where: params.args.where,
          data: { deletedAt: new Date() },
        };
      }

      // Intercept deleteMany → soft delete
      if (
        params.action === "deleteMany" &&
        params.model != null &&
        this._hasDeletedAt(params.model)
      ) {
        params.action = "updateMany";
        params.args = {
          where: params.args.where,
          data: { deletedAt: new Date() },
        };
      }

      return next(params);
    });
  }

  async onModuleDestroy() {
    this.logger.log("Disconnecting from PostgreSQL...");
    await this.$disconnect();
    this.logger.log("PostgreSQL disconnected");
  }

  /**
   * Check if a model has a `deletedAt` field (i.e., supports soft delete).
   */
  private _hasDeletedAt(model: string): boolean {
    const softDeleteModels = ["User", "Resume"];
    return softDeleteModels.includes(model);
  }
}
