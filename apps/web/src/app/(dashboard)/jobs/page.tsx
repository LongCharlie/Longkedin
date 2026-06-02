// ============================================================
// Jobs Page — Placeholder (implemented in Phase 3)
// ============================================================
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Briefcase, Search } from "lucide-react";

export default async function JobsPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">岗位搜索</h1>
        <p className="text-muted-foreground mt-1">
          搜索、筛选和浏览来自多个平台的岗位信息
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              可投岗位
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">等待探索</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              匹配度最高
            </CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">上传简历后显示</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本周新增
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">岗位</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/30" />
          <CardTitle className="mt-4">岗位管理即将上线</CardTitle>
          <CardDescription className="mt-2">
            Phase 3 将实现多源岗位聚合、AI 匹配评分和智能筛选
          </CardDescription>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        当前用户: {session?.user?.name} ({session?.user?.email})
      </p>
    </div>
  );
}
