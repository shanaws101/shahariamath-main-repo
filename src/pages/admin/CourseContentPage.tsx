import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Layers, Package, Sparkles } from "lucide-react";
import { SubjectsManagementPageContent } from "./SubjectsManagementPage";
import { SubjectCMSPageContent } from "./SubjectCMSPage";
import { ChapterManagementPageContent } from "./ChapterManagementPage";
import { BundleManagementPageContent } from "./BundleManagementPage";
import { PDFSuggestionsManagementPageContent } from "./PDFSuggestionsManagementPage";
import { usePersistedTab } from "@/hooks/usePersistedTab";

export default function CourseContentPage() {
  const [tab, setTab] = usePersistedTab('admin-course-content-tab', 'subjects');

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Course Content</h1>
          <p className="text-sm text-muted-foreground">Manage subjects, chapters, CMS content, bundles, and PDF suggestions</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-muted/60 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="subjects" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <BookOpen className="h-3.5 w-3.5" />
              Subjects
            </TabsTrigger>
            <TabsTrigger value="pdf-suggestions" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              PDF Suggestions
            </TabsTrigger>
            <TabsTrigger value="subject-content" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <FileText className="h-3.5 w-3.5" />
              Subject Content
            </TabsTrigger>
            <TabsTrigger value="chapters" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <Layers className="h-3.5 w-3.5" />
              Chapters
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm px-2.5 py-2">
              <Package className="h-3.5 w-3.5" />
              Bundles
            </TabsTrigger>
          </TabsList>
          <TabsContent value="subjects">
            <SubjectsManagementPageContent />
          </TabsContent>
          <TabsContent value="pdf-suggestions">
            <PDFSuggestionsManagementPageContent />
          </TabsContent>
          <TabsContent value="subject-content">
            <SubjectCMSPageContent />
          </TabsContent>
          <TabsContent value="chapters">
            <ChapterManagementPageContent />
          </TabsContent>
          <TabsContent value="bundles">
            <BundleManagementPageContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
