import { AdminLayout } from "@/components/layout/AdminLayout";
import { AnalyticsPageContent } from "./AnalyticsPage";

export default function AnalyticsMonitoringPage() {
  return (
    <AdminLayout requiredPermission="can_manage_analytics">
      <AnalyticsPageContent />
    </AdminLayout>
  );
}
