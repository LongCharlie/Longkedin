// ============================================================
// Tracker Page — Placeholder (Phase 3)
// ============================================================
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Kanban } from "lucide-react";

export default function TrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">申请追踪</h1>
        <p className="text-muted-foreground mt-1">
          Kanban 看板管理你的所有申请
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Kanban className="h-12 w-12 text-muted-foreground/30" />
          <CardTitle className="mt-4">申请看板即将上线</CardTitle>
          <CardDescription className="mt-2">
            Phase 3 将实现 Kanban 视图：Saved → Applied → Interview → Offer
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
