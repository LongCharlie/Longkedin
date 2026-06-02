// ============================================================
// Dashboard Layout — Protected by auth, with sidebar
// ============================================================
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Main content offset by sidebar width */}
      <main className="ml-64 flex-1">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
