import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PaymentHistoryWidget } from "@/components/dashboard/PaymentHistoryWidget";

export default function PaymentHistoryPage() {
  return (
    <DashboardLayout>
      <PaymentHistoryWidget />
    </DashboardLayout>
  );
}
