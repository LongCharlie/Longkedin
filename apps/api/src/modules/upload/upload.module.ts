// ============================================================
// Upload Module
// ============================================================
import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { FileUploadController } from "./file-upload.controller";

@Module({
  imports: [
    MulterModule.register({
      dest: "../../uploads/resumes",
    }),
  ],
  controllers: [FileUploadController],
})
export class UploadModule {}
