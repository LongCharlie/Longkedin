// ============================================================
// Resume Page — Placeholder (Phase 3)
// ============================================================
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ResumePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">简历管理</h1>
        <p className="text-muted-foreground mt-1">
          AI 驱动的简历编辑和版本管理
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <CardTitle className="mt-4">简历编辑器即将上线</CardTitle>
          <CardDescription className="mt-2">
            Phase 3 将实现富文本编辑器 + AI 关键词高亮 + 技能差距分析
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
