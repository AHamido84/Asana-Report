import { getDashboardConfig } from "@/lib/config";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const config = getDashboardConfig();
  return <DashboardClient title={config.title} companyName={config.companyName} />;
}
