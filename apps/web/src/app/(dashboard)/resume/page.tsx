// ============================================================
// Resume Page — Upload & Version Management
// ============================================================
// @ts-nocheck
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

const statusConfig: Record<
  string,
  {
    icon: typeof CheckCircle;
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  UPLOADING: { icon: Clock, label: "上传中", variant: "secondary" },
  PENDING: { icon: Clock, label: "等待解析", variant: "secondary" },
  PARSING: { icon: Clock, label: "解析中", variant: "secondary" },
  PARSED: { icon: CheckCircle, label: "已解析", variant: "default" },
  PARSE_FAILED: { icon: AlertCircle, label: "失败", variant: "destructive" },
};

export default function ResumePage() {
  const utils = trpc.useUtils();
  const { data: resumes, isLoading } = trpc.resume.list.useQuery();
  const initiateMut = trpc.resume.initiateUpload.useMutation();
  const confirmMut = trpc.resume.confirmUpload.useMutation();
  const deleteMut = trpc.resume.delete.useMutation({
    onSuccess: () => {
      utils.resume.list.invalidate();
      toast.success("已删除");
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const { resumeId } = await initiateMut.mutateAsync({
        fileName: file.name,
        fileType: file.name.endsWith(".pdf") ? "pdf" : "docx",
        fileSize: file.size,
      });
      await new Promise((r) => setTimeout(r, 500)); // simulate S3 upload
      await confirmMut.mutateAsync({ resumeId });
      toast.success(`${file.name} 上传成功`);
      utils.resume.list.invalidate();
      setFile(null);
    } catch (e: any) {
      toast.error(e?.message || "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">简历管理</h1>
        <p className="text-muted-foreground mt-1">
          上传和管理简历，AI 自动解析技能和经历
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            上传新简历
          </CardTitle>
          <CardDescription>PDF / DOCX，最大 10MB</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">选择文件</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </div>
            <Button type="submit" disabled={!file || uploading}>
              {uploading && <Spinner className="mr-2" />}
              {uploading ? "上传中..." : "上传并解析"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            我的简历
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !resumes?.length ? (
            <p className="text-center py-8 text-muted-foreground">暂无简历</p>
          ) : (
            <div className="space-y-3">
              {resumes.map((r: any) => {
                const s = statusConfig[r.status] || statusConfig.PENDING;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{r.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          v{r.version} · {timeAgo(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={s.variant}>
                        <s.icon className="mr-1 h-3 w-3" />
                        {s.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMut.mutate({ id: r.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
