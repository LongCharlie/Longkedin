// ============================================================
// Landing Page (Public)
// ============================================================
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Briefcase,
  FileText,
  Mic,
  BarChart3,
  ArrowRight,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Briefcase,
    title: "多源岗位聚合",
    description:
      "LinkedIn / Indeed / 公司官网岗位一站管理，Kanban 视角追踪申请全流程",
  },
  {
    icon: FileText,
    title: "AI 简历匹配",
    description:
      "GPT-4o 驱动的技能差距分析，精准定位简历优化方向，一键生成 Cover Letter",
  },
  {
    icon: Mic,
    title: "语音面试模拟",
    description:
      "WebRTC 录音 + AI 实时转写 + STAR 框架评分，专业的 Behavioral 面试训练",
  },
  {
    icon: BarChart3,
    title: "数据驱动决策",
    description: "转化漏斗、技能趋势、Offer 对比，用数据指导你的求职策略",
  },
];

const highlights = [
  { icon: Zap, text: "申请转化率提升 20%~35%" },
  { icon: Shield, text: "GDPR / CCPA 隐私合规" },
  { icon: Globe, text: "全链路可观测：Trace + Metrics + Logs" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              L
            </div>
            Longkedin
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">登录</Button>
            </Link>
            <Link href="/login">
              <Button>免费开始</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <main className="flex-1">
        <section className="container flex flex-col items-center py-20 text-center">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-6">
            🎯 AI 驱动的智能求职平台
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            求职不靠运气，
            <span className="text-primary"> 靠数据 </span>和
            <span className="text-primary"> AI</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            告别碎片化的 Excel 追踪和盲目的海投。Longkedin 用 AI
            分析你的简历差距、
            模拟真实面试、追踪每一次申请，让你在求职中掌握主动权。
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                立即开始 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                了解更多
              </Button>
            </Link>
          </div>
        </section>

        {/* ---- Highlights ---- */}
        <section className="container pb-8">
          <div className="flex justify-center gap-8 text-sm text-muted-foreground">
            {highlights.map((h) => (
              <div key={h.text} className="flex items-center gap-2">
                <h.icon className="h-4 w-4 text-primary" />
                {h.text}
              </div>
            ))}
          </div>
        </section>

        {/* ---- Features ---- */}
        <section id="features" className="container py-20">
          <h2 className="text-center text-3xl font-bold">核心功能</h2>
          <p className="mt-4 text-center text-muted-foreground">
            覆盖求职全流程，从信息收集到面试准备
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="mt-3">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className="container py-20">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <h2 className="text-3xl font-bold">
                准备好提升你的求职效率了吗？
              </h2>
              <p className="mt-4 max-w-lg text-primary-foreground/80">
                免费注册，立即体验 AI 简历分析和智能岗位追踪
              </p>
              <Link href="/login" className="mt-8">
                <Button size="lg" variant="secondary" className="gap-2">
                  免费开始使用 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 Longkedin. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground">
              隐私政策
            </Link>
            <Link href="#" className="hover:text-foreground">
              服务条款
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
