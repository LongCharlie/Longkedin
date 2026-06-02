// ============================================================
// File Upload Controller — accepts PDF uploads, stores to disk
// ============================================================
import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync, createReadStream } from "fs";
import { v4 as uuidv4 } from "uuid";

import { AuthGuard } from "../../common/guards/auth.guard";
import { PrismaService } from "../../prisma/prisma.service";

const UPLOAD_DIR = join(process.cwd(), "uploads", "resumes");

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller("rest/files")
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /api/rest/files/upload-resume
   * Accepts a PDF file, stores it, creates DB record.
   */
  @Post("upload-resume")
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const id = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${id}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
          cb(new BadRequestException("Only PDF files are allowed"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @Res({ passthrough: true }) _res: Response,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");

    const user = (_res.req as any).user;
    const userId = user?.id || "dev-user-001";

    // Fix Chinese filename encoding: multer may send Latin-1, re-encode to UTF-8
    const safeName = Buffer.from(file.originalname, "latin1").toString("utf8");

    // Find max version (include soft-deleted to avoid unique conflict)
    const maxVersion = await this.prisma.resume.aggregate({
      where: { userId },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version || 0) + 1;

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        version: nextVersion,
        status: "PENDING",
        fileName: safeName,
        fileType: "pdf",
        fileSize: file.size,
        s3Key: file.filename, // local path for now; S3 later
      },
    });

    this.logger.log(`Resume uploaded: ${resume.id} (${file.originalname})`);

    return {
      success: true,
      data: {
        resumeId: resume.id,
        fileName: resume.fileName,
        status: resume.status,
        version: resume.version,
      },
    };
  }

  /**
   * GET /api/rest/files/resume/:id
   * Serve the PDF file for viewing.
   */
  @Get("resume/:id")
  @UseGuards(AuthGuard)
  async getResume(@Param("id") id: string, @Res() res: Response) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume || !resume.s3Key) {
      throw new NotFoundException("Resume not found");
    }

    const filePath = join(UPLOAD_DIR, resume.s3Key);
    if (!existsSync(filePath)) {
      throw new NotFoundException("File not found on disk");
    }

    res.setHeader("Content-Type", "application/pdf");
    // Remove X-Frame-Options to allow iframe embedding from frontend
    res.removeHeader("X-Frame-Options");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(resume.fileName)}`,
    );
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
