import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, PenSquare } from "lucide-react";
import { CMSPageContent } from "./CMSPage";
import { BlogCMSPageContent } from "./BlogCMSPage";
import { usePersistedTab } from "@/hooks/usePersistedTab";

export default function ContentManagementPage() {
  const [tab, setTab] = usePersistedTab('admin-content-tab', 'cms');

  return (
    <AdminLayout requiredPermission="can_manage_cms">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Content & Blog</h1>
          <p className="text-sm text-muted-foreground">Manage CMS pages and blog posts</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-muted/60 rounded-xl p-1 h-auto">
            <TabsTrigger value="cms" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-3 py-2">
              <FileText className="h-3.5 w-3.5" />
              CMS
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-3 py-2">
              <PenSquare className="h-3.5 w-3.5" />
              Blog
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cms">
            <CMSPageContent />
          </TabsContent>
          <TabsContent value="blog">
            <BlogCMSPageContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
