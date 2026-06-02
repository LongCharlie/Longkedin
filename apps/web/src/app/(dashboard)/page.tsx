// ============================================================
// Dashboard Home → redirect to /jobs
// ============================================================
import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/jobs");
}
