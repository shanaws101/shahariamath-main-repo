import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StudentCalendarWidget } from "@/components/dashboard/StudentCalendarWidget";

export default function CalendarPage() {
  return (
    <DashboardLayout>
      <StudentCalendarWidget />
    </DashboardLayout>
  );
}
