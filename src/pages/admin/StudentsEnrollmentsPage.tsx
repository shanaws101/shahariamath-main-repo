import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard } from "lucide-react";
import { StudentsPageContent } from "./StudentsPage";
import { EnrollmentsPageContent } from "./EnrollmentsPage";

export default function StudentsEnrollmentsPage() {
  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Students & Enrollments</h1>
          <p className="text-sm text-muted-foreground">Manage student accounts and course enrollments</p>
        </div>
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="bg-muted/60 rounded-xl p-1 h-auto">
            <TabsTrigger value="students" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-3 py-2">
              <Users className="h-3.5 w-3.5" />
              Students
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-3 py-2">
              <CreditCard className="h-3.5 w-3.5" />
              Enrollments
            </TabsTrigger>
          </TabsList>
          <TabsContent value="students">
            <StudentsPageContent />
          </TabsContent>
          <TabsContent value="enrollments">
            <EnrollmentsPageContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
