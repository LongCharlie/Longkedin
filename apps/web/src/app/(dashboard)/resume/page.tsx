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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

const API = ""; // use Next.js proxy

const statusConfig = {
  UPLOADING: { icon: Clock, label: "上传中", variant: "secondary" as const },
  PENDING: { icon: Clock, label: "等待解析", variant: "secondary" as const },
  PARSING: { icon: Clock, label: "解析中", variant: "secondary" as const },
  PARSED: { icon: CheckCircle, label: "已解析", variant: "default" as const },
  PARSE_FAILED: {
    icon: AlertCircle,
    label: "失败",
    variant: "destructive" as const,
  },
};

export default function ResumePage() {
  const utils = trpc.useUtils();
  const { data: resumes, isLoading } = trpc.resume.list.useQuery();
  const deleteMut = trpc.resume.delete.useMutation({
    onSuccess: () => {
      utils.resume.list.invalidate();
      toast.success("已删除");
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  // ── Real upload via FormData to REST endpoint ──
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/rest/files/upload-resume`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      toast.success(`${data.data.fileName} 上传成功`);
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

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            上传新简历
          </CardTitle>
          <CardDescription>支持 PDF 格式，最大 10MB</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">选择文件</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
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

      {/* Resume list */}
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
                          v{r.version} · {timeAgo(r.createdAt)} ·{" "}
                          {(r.fileSize / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.variant}>
                        <s.icon className="mr-1 h-3 w-3" />
                        {s.label}
                      </Badge>
                      {/* View PDF button */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewing(r.id)}
                        title="查看PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteMut.mutate({ id: r.id })}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {resumes?.find((r: any) => r.id === viewing)?.fileName ||
                "PDF 预览"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewing && (
              <iframe
                src={`${API}/api/rest/files/resume/${viewing}`}
                className="w-full h-full rounded border"
                title="PDF Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
