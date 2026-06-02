// @ts-nocheck — tRPC type issue, resolved in Phase 4
// ============================================================
// Jobs Page — Search, list, create, save jobs
// ============================================================
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Bookmark,
  ExternalLink,
  Building2,
  MapPin,
  Briefcase,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function JobsPage() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.job.search.useQuery({
    query: query || undefined,
    page,
    pageSize: 20,
  });
  const saveMut = trpc.job.save.useMutation({
    onSuccess: () => toast.success("已保存到追踪列表"),
  });
  const createMut = trpc.job.create.useMutation({
    onSuccess: () => {
      utils.job.search.invalidate();
      toast.success("岗位已添加");
      setShowCreate(false);
    },
  });

  // Create job dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newCompany) return;
    await createMut.mutateAsync({
      title: newTitle,
      company: newCompany,
      location: newLocation || undefined,
    });
    setNewTitle("");
    setNewCompany("");
    setNewLocation("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">岗位搜索</h1>
          <p className="text-muted-foreground mt-1">搜索和管理岗位信息</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              添加岗位
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新岗位</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>职位名称 *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="如：前端开发工程师"
                />
              </div>
              <div className="space-y-2">
                <Label>公司 *</Label>
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="如：Google"
                />
              </div>
              <div className="space-y-2">
                <Label>地点</Label>
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="如：远程 / 北京"
                />
              </div>
              <Button
                type="submit"
                disabled={!newTitle || !newCompany}
                className="w-full"
              >
                添加
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="搜索岗位、公司、技能..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !data?.jobs?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">暂无岗位，添加第一个吧</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.jobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{job.title}</h3>
                    {job.remote && <Badge variant="secondary">远程</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                  </div>
                  {(job.salaryMin || job.salaryMax) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      💰{" "}
                      {job.salaryMin
                        ? `$${job.salaryMin.toLocaleString()}`
                        : ""}
                      {job.salaryMin && job.salaryMax ? " - " : ""}
                      {job.salaryMax
                        ? `$${job.salaryMax.toLocaleString()}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => saveMut.mutate({ jobId: job.id })}
                  >
                    <Bookmark className="h-3 w-3" />
                    保存
                  </Button>
                  {job.sourceUrl && (
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Pagination */}
          {data.total > data.pageSize && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                第 {page} 页 / 共 {Math.ceil(data.total / data.pageSize)} 页
              </span>
              <Button
                variant="outline"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
