// ============================================================
// Root Layout
// ============================================================
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Longkedin — 智能求职全链路工作台",
    template: "%s | Longkedin",
  },
  description:
    "AI 驱动的求职管理平台：多源岗位聚合、简历匹配分析、语音模拟面试、全链路状态追踪",
  keywords: ["求职", "简历", "AI面试", "岗位管理", "留学生"],
  authors: [{ name: "Longkedin Team" }],
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
