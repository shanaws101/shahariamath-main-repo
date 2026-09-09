import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video } from "lucide-react";
import { PDFManagementPageContent } from "./PDFManagementPage";
import { VideosPageContent } from "./VideosPage";
import { usePersistedTab } from "@/hooks/usePersistedTab";

export default function ResourcesPage() {
  const [tab, setTab] = usePersistedTab('admin-resources-tab', 'pdfs');

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">PDFs and free videos</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-muted/60 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="pdfs" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <FileText className="h-3.5 w-3.5" />
              PDFs
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <Video className="h-3.5 w-3.5" />
              Free Videos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pdfs">
            <PDFManagementPageContent />
          </TabsContent>
          <TabsContent value="videos">
            <VideosPageContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
