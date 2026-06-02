// ============================================================
// Settings Page — Placeholder (Phase 5)
// ============================================================
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-1">
          个人资料、OAuth 绑定、通知偏好
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground/30" />
          <CardTitle className="mt-4">设置页面即将上线</CardTitle>
          <CardDescription className="mt-2">
            Phase 5 将实现个人资料编辑和 OAuth 账号绑定
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
