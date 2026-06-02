// ============================================================
// Analytics Page — Placeholder (Phase 5)
// ============================================================
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">数据看板</h1>
        <p className="text-muted-foreground mt-1">
          转化漏斗、技能趋势、Offer 对比
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
          <CardTitle className="mt-4">数据分析即将上线</CardTitle>
          <CardDescription className="mt-2">
            Phase 5 将实现个人数据看板、转化漏斗和趋势分析
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
