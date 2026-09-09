import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play, Lock, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SecureVideoPlayer } from "@/components/video/SecureYouTubePlayer";

interface ChapterClass {
  id: string;
  chapter_id: string;
  title: string;
  title_bn: string | null;
  youtube_url: string;
  is_free: boolean;
  display_order: number;
}

interface Chapter {
  id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  description_bn: string | null;
  display_order: number;
}

interface ChaptersSectionProps {
  subjectId: string;
  isEnrolled: boolean;
  onEnrollClick: () => void;
}

export function ChaptersSection({ subjectId, isEnrolled, onEnrollClick }: ChaptersSectionProps) {
  const { isEnglish } = useLanguage();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, ChapterClass[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data: chaps } = await supabase
        .from("subject_chapters")
        .select("id, title, title_bn, description, description_bn, display_order")
        .eq("subject_id", subjectId)
        .order("display_order");

      const chapters = (chaps || []) as Chapter[];
      setChapters(chapters);

      if (chapters.length > 0) {
        const { data: classes } = await supabase
          .from("chapter_classes")
          .select("*")
          .in("chapter_id", chapters.map(c => c.id))
          .order("display_order");

        const map: Record<string, ChapterClass[]> = {};
        (classes || []).forEach((cl: ChapterClass) => {
          if (!map[cl.chapter_id]) map[cl.chapter_id] = [];
          map[cl.chapter_id].push(cl);
        });
        setClassesMap(map);
        // Expand first chapter by default
        if (chapters.length > 0) setExpandedChapters(new Set([chapters[0].id]));
      }
      setIsLoading(false);
    };
    load();
  }, [subjectId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (chapters.length === 0) return null;

  const canWatch = (cl: ChapterClass) => cl.is_free || isEnrolled;

  const handleClassClick = (cl: ChapterClass) => {
    if (canWatch(cl)) {
      if (cl.youtube_url) setActiveVideo(cl.youtube_url);
    } else {
      onEnrollClick();
    }
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="space-y-2">
        {chapters.map(ch => {
          const classes = classesMap[ch.id] || [];
          const isExpanded = expandedChapters.has(ch.id);
          const freeCount = classes.filter(c => c.is_free).length;

          return (
            <div key={ch.id} className="border rounded-xl overflow-hidden">
              {/* Chapter header */}
              <button
                onClick={() => toggleChapter(ch.id)}
                className="w-full text-left flex items-center gap-3 p-3 sm:p-4 bg-card hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {isEnglish ? ch.title : ch.title_bn || ch.title}
                  </p>
                  {(ch.description || ch.description_bn) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {isEnglish ? ch.description : ch.description_bn || ch.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {classes.length} {isEnglish ? (classes.length === 1 ? "class" : "classes") : "টি ক্লাস"}
                </Badge>
                {freeCount > 0 && (
                  <Badge variant="outline" className="border-green-300 text-green-600 text-xs shrink-0">
                    {freeCount} Free
                  </Badge>
                )}
              </button>

              {/* Classes list */}
              {isExpanded && classes.length > 0 && (
                <div className="border-t bg-muted/10 divide-y divide-border/50">
                  {classes.map((cl, clIdx) => {
                    const accessible = canWatch(cl);
                    return (
                      <button
                        key={cl.id}
                        onClick={() => handleClassClick(cl)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
                          accessible ? "hover:bg-muted/50 cursor-pointer" : "cursor-pointer opacity-70"
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          accessible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {accessible ? <Play className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${accessible ? "text-foreground" : "text-muted-foreground"}`}>
                            {isEnglish ? cl.title : cl.title_bn || cl.title}
                          </p>
                        </div>
                        {cl.is_free ? (
                          <Badge variant="outline" className="border-green-300 text-green-600 text-xs">Free</Badge>
                        ) : !isEnrolled ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {isExpanded && classes.length === 0 && (
                <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
                  {isEnglish ? "No classes added yet" : "এখনো কোনো ক্লাস যোগ করা হয়নি"}
                </div>
              )}
            </div>
          );
        })}

        {!isEnrolled && (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-2">
              {isEnglish ? "Enroll to unlock all classes" : "সব ক্লাস আনলক করতে এনরোল করুন"}
            </p>
            <Button size="sm" variant="outline" onClick={onEnrollClick}>
              {isEnglish ? "Enroll Now" : "এনরোল করুন"}
            </Button>
          </div>
        )}
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
          <div className="aspect-video w-full">
            {activeVideo && (
              <SecureVideoPlayer url={activeVideo} title="Class Video" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
