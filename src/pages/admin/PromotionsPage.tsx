import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Link2 } from "lucide-react";
import { DiscountCodesPageContent } from "./DiscountCodesPage";
import { ReferralManagementPageContent } from "./ReferralManagementPage";
import { usePersistedTab } from "@/hooks/usePersistedTab";

export default function PromotionsPage() {
  const [tab, setTab] = usePersistedTab('admin-promotions-tab', 'discount-codes');

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground">Manage discount codes and referral campaigns</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-muted/60 rounded-xl p-1 h-auto">
            <TabsTrigger value="discount-codes" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-3 py-2">
              <Ticket className="h-3.5 w-3.5" />
              Discount Codes
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-3 py-2">
              <Link2 className="h-3.5 w-3.5" />
              Referrals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="discount-codes">
            <DiscountCodesPageContent />
          </TabsContent>
          <TabsContent value="referrals">
            <ReferralManagementPageContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
