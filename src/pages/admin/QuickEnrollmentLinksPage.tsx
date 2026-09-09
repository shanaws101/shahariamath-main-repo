import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Link, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  slug: string;
  price: number;
  is_visible: boolean;
}

export function QuickEnrollmentLinksPageContent() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('subjects')
      .select('id, name, name_bn, slug, price, is_visible')
      .order('name');
    if (data) setSubjects(data);
    setIsLoading(false);
  };

  const copyLink = (slug: string) => {
    const link = `https://olisaharacademy.com/subjects/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: link });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              Quick Enrollment Links
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Click any subject to copy its enrollment link to clipboard
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSubjects}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map(subject => (
              <Card
                key={subject.id}
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => copyLink(subject.slug)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{subject.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{subject.name_bn}</p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                        olisaharacademy.com/subjects/{subject.slug}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); copyLink(subject.slug); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                      ৳{subject.price}
                    </span>
                    {!subject.is_visible && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Hidden</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && subjects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No subjects found. Create subjects first to generate enrollment links.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

export default function QuickEnrollmentLinksPage() {
  return <AdminLayout><QuickEnrollmentLinksPageContent /></AdminLayout>;
}
