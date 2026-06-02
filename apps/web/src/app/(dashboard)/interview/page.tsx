// ============================================================
// Interview Page — Placeholder (Phase 4)
// ============================================================
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Mic } from "lucide-react";

export default function InterviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">模拟面试</h1>
        <p className="text-muted-foreground mt-1">
          AI 语音面试模拟 + STAR 框架评分
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Mic className="h-12 w-12 text-muted-foreground/30" />
          <CardTitle className="mt-4">语音面试舱即将上线</CardTitle>
          <CardDescription className="mt-2">
            Phase 4 将实现 WebRTC 录音 + Whisper 实时转写 + AI 追问 + 结构化反馈
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
