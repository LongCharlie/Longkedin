// ============================================================
// Tracker Page — Kanban Board with drag-to-update status
// ============================================================
// @ts-nocheck
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Kanban, Building2, MapPin, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = [
  { key: "SAVED", label: "已保存", color: "bg-slate-100 border-slate-300" },
  { key: "APPLIED", label: "已投递", color: "bg-blue-50 border-blue-300" },
  {
    key: "PHONE_SCREEN",
    label: "电话面试",
    color: "bg-purple-50 border-purple-300",
  },
  {
    key: "TECHNICAL_INTERVIEW",
    label: "技术面试",
    color: "bg-indigo-50 border-indigo-300",
  },
  { key: "ONSITE", label: "现场面试", color: "bg-orange-50 border-orange-300" },
  { key: "OFFER", label: "Offer", color: "bg-green-50 border-green-400" },
  { key: "REJECTED", label: "已拒绝", color: "bg-red-50 border-red-300" },
];

const NEXT_STATUS: Record<string, string> = {
  SAVED: "APPLIED",
  APPLIED: "PHONE_SCREEN",
  PHONE_SCREEN: "TECHNICAL_INTERVIEW",
  TECHNICAL_INTERVIEW: "ONSITE",
  ONSITE: "OFFER",
};

export default function TrackerPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.application.list.useQuery();
  const updateMut = trpc.application.updateStatus.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate();
      toast.success("状态已更新");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.application.delete.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate();
      toast.success("已删除");
    },
  });

  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  function handleAdvance(appId: string, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus];
    if (next) updateMut.mutate({ id: appId, targetStatus: next });
  }

  function handleDragStart(e: React.DragEvent, appId: string) {
    setDragging(appId);
    e.dataTransfer.setData("text/plain", appId);
  }

  function handleDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault();
    setDragOverCol(null);
    const appId = e.dataTransfer.getData("text/plain");
    if (appId) updateMut.mutate({ id: appId, targetStatus });
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columns = data?.columns || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">申请追踪</h1>
          <p className="text-muted-foreground mt-1">
            拖拽卡片更新状态，追踪每一次申请
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Kanban className="h-4 w-4" />
          总计 {data?.applications?.length || 0} 个申请
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-7 gap-3 min-w-[1200px]">
        {STATUS_COLUMNS.map((col) => (
          <div
            key={col.key}
            className={cn(
              "rounded-lg border-2 p-2 min-h-[200px] transition-colors",
              col.color,
              dragOverCol === col.key && "ring-2 ring-primary",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                {col.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {columns[col.key]?.length || 0}
              </Badge>
            </div>
            <div className="space-y-2">
              {columns[col.key]?.map((app: any) => (
                <Card
                  key={app.id}
                  className={cn(
                    "cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
                    dragging === app.id && "opacity-50",
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {app.job?.title || "未知岗位"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {app.job?.company || "—"}
                      </p>
                      {app.job?.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.job.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {NEXT_STATUS[app.status] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1"
                          onClick={() => handleAdvance(app.id, app.status)}
                        >
                          推进 <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto"
                        onClick={() => deleteMut.mutate({ id: app.id })}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!columns[col.key] || columns[col.key].length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  拖拽至此
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
