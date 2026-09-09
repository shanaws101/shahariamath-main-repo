import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveCmsContent } from "@/hooks/useCmsContent";
import type { Json } from "@/integrations/supabase/types";
import { AiWriterButton } from "@/components/admin/AiWriterButton";
import { InstructorManager } from "@/components/admin/InstructorManager";
import { SubjectPicker } from "@/components/admin/SubjectPicker";

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  demo_video_url: string | null;
  instructor_avatars: string[] | null;
  original_price: number;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
}

interface FaqItem {
  q: string;
  qEn: string;
  a: string;
  aEn: string;
}

interface FeatureItem {
  text: string;
  textBn: string;
}

export function SubjectCMSPageContent() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // CMS fields
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [courseFeatures, setCourseFeatures] = useState<FeatureItem[]>([]);
  const [whatYoullLearn, setWhatYoullLearn] = useState<FeatureItem[]>([]);
  const [courseDetailsWho, setCourseDetailsWho] = useState("");
  const [courseDetailsWhoBn, setCourseDetailsWhoBn] = useState("");
  const [courseDetailsPrepare, setCourseDetailsPrepare] = useState("");
  const [courseDetailsPrepareBn, setCourseDetailsPrepareBn] = useState("");

  // Subject fields
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  
  const [originalPrice, setOriginalPrice] = useState(0);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("id, name, name_bn, demo_video_url, instructor_avatars, original_price, department, course_type, compatible_years").order("name");
    if (data) setSubjects(data as Subject[]);
  };

  const loadContent = async (subjectId: string) => {
    setIsLoading(true);
    setSelectedSubjectId(subjectId);

    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) {
      setDemoVideoUrl(subject.demo_video_url || "");
      
      setOriginalPrice(subject.original_price || 0);
    }

    const { data } = await supabase
      .from("cms_content")
      .select("content")
      .eq("section", `subject_${subjectId}`)
      .maybeSingle();

    if (data?.content) {
      const content = data.content as any;
      setFaq(content.faq || []);
      setCourseFeatures(content.courseFeatures || []);
      setWhatYoullLearn(content.whatYoullLearn || []);
      setCourseDetailsWho(content.courseDetailsWho || "");
      setCourseDetailsWhoBn(content.courseDetailsWhoBn || "");
      setCourseDetailsPrepare(content.courseDetailsPrepare || "");
      setCourseDetailsPrepareBn(content.courseDetailsPrepareBn || "");
    } else {
      setFaq([]);
      setCourseFeatures([]);
      setWhatYoullLearn([]);
      setCourseDetailsWho("");
      setCourseDetailsWhoBn("");
      setCourseDetailsPrepare("");
      setCourseDetailsPrepareBn("");
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedSubjectId) return;
    setSaving(true);

    // Save CMS content
    const cmsData = {
      faq, courseFeatures, whatYoullLearn,
      courseDetailsWho, courseDetailsWhoBn,
      courseDetailsPrepare, courseDetailsPrepareBn,
    };

    const { error: cmsError } = await saveCmsContent(`subject_${selectedSubjectId}`, cmsData as unknown as Record<string, string>);

    // Save subject fields
    const { error: subjectError } = await supabase
      .from("subjects")
      .update({
        demo_video_url: demoVideoUrl || null,
        
        original_price: originalPrice,
      })
      .eq("id", selectedSubjectId);

    if (cmsError || subjectError) {
      toast({ title: "Error saving", description: (cmsError || subjectError)?.message, variant: "destructive" });
    } else {
      toast({ title: "Saved successfully" });
      fetchSubjects();
    }

    setSaving(false);
  };

  const addFaq = () => setFaq([...faq, { q: "", qEn: "", a: "", aEn: "" }]);
  const removeFaq = (i: number) => setFaq(faq.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, field: keyof FaqItem, value: string) => {
    const updated = [...faq];
    updated[i] = { ...updated[i], [field]: value };
    setFaq(updated);
  };

  const addFeature = (setter: React.Dispatch<React.SetStateAction<FeatureItem[]>>) =>
    setter((prev) => [...prev, { text: "", textBn: "" }]);
  const removeFeature = (setter: React.Dispatch<React.SetStateAction<FeatureItem[]>>, i: number) =>
    setter((prev) => prev.filter((_, idx) => idx !== i));
  const updateFeature = (
    setter: React.Dispatch<React.SetStateAction<FeatureItem[]>>,
    i: number,
    field: keyof FeatureItem,
    value: string
  ) => setter((prev) => { const u = [...prev]; u[i] = { ...u[i], [field]: value }; return u; });


  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subject Content Editor</h1>
          <p className="text-muted-foreground">Customize FAQ, features, and content per subject</p>
        </div>

        <SubjectPicker
          subjects={subjects}
          selectedId={selectedSubjectId}
          onSelect={loadContent}
          emptyHint="Adjust filters to find a subject to edit"
        />

        {selectedSubjectId && !isLoading && (
          <div className="space-y-6">
            {/* Subject Media */}
            <Card>
              <CardHeader><CardTitle className="text-base">Demo Video & Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Demo Video URL (Bunny Stream)</Label>
                  <Input value={demoVideoUrl} onChange={(e) => setDemoVideoUrl(e.target.value)} placeholder="https://player.mediadelivery.net/embed/<libraryId>/<videoId>" />
                </div>
                <div className="space-y-2">
                  <Label>Original Price (for strikethrough, 0 = hide)</Label>
                  <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            {/* Instructors */}
            <Card>
              <CardHeader><CardTitle className="text-base">Instructors</CardTitle></CardHeader>
              <CardContent>
                <InstructorManager subjectId={selectedSubjectId} />
              </CardContent>
            </Card>

            {/* What You'll Learn */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">What You'll Learn</CardTitle>
                    <AiWriterButton
                      type="feature_list"
                      context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}`}
                      placeholder="e.g. Generate 5 learning outcomes for this BBA course"
                      defaultPrompt="Generate 5 concise learning outcomes in English for this university course"
                      label="AI Generate"
                      onApply={(text) => {
                        const lines = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim());
                        const items = lines.map(l => ({ text: l, textBn: '' }));
                        setWhatYoullLearn(prev => [...prev, ...items]);
                      }}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addFeature(setWhatYoullLearn)}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {whatYoullLearn.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input value={item.text} onChange={(e) => updateFeature(setWhatYoullLearn, i, "text", e.target.value)} placeholder="English" />
                      <Input value={item.textBn} onChange={(e) => updateFeature(setWhatYoullLearn, i, "textBn", e.target.value)} placeholder="বাংলা" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFeature(setWhatYoullLearn, i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Course Features (sidebar) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Course Features (Sidebar)</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => addFeature(setCourseFeatures)}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {courseFeatures.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input value={item.text} onChange={(e) => updateFeature(setCourseFeatures, i, "text", e.target.value)} placeholder="English" />
                      <Input value={item.textBn} onChange={(e) => updateFeature(setCourseFeatures, i, "textBn", e.target.value)} placeholder="বাংলা" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFeature(setCourseFeatures, i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Course Details */}
            <Card>
              <CardHeader><CardTitle className="text-base">Course Details (Accordion)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Who is this for (EN)</Label>
                      <AiWriterButton type="course_detail" context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}`} placeholder="Describe target audience" defaultPrompt="Write a 'Who is this course for' section in English for this university course" onApply={setCourseDetailsWho} />
                    </div>
                    <Textarea value={courseDetailsWho} onChange={(e) => setCourseDetailsWho(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Who is this for (BN)</Label>
                      <AiWriterButton type="course_detail" context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}`} defaultPrompt="Write a 'Who is this course for' section in Bangla (বাংলা) for this university course" label="AI বাংলা" onApply={setCourseDetailsWhoBn} />
                    </div>
                    <Textarea value={courseDetailsWhoBn} onChange={(e) => setCourseDetailsWhoBn(e.target.value)} rows={2} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">How will it prepare (EN)</Label>
                      <AiWriterButton type="course_detail" context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}`} defaultPrompt="Write a 'How will this course prepare you' section in English" onApply={setCourseDetailsPrepare} />
                    </div>
                    <Textarea value={courseDetailsPrepare} onChange={(e) => setCourseDetailsPrepare(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">How will it prepare (BN)</Label>
                      <AiWriterButton type="course_detail" context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}`} defaultPrompt="Write a 'How will this course prepare you' section in Bangla (বাংলা)" label="AI বাংলা" onApply={setCourseDetailsPrepareBn} />
                    </div>
                    <Textarea value={courseDetailsPrepareBn} onChange={(e) => setCourseDetailsPrepareBn(e.target.value)} rows={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">FAQ</CardTitle>
                    <AiWriterButton
                      type="faq_generate"
                      context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}\nDescription: ${subjects.find(s => s.id === selectedSubjectId)?.name_bn || ''}`}
                      placeholder="e.g. Generate 5 FAQs about this course"
                      defaultPrompt="Generate 5 common FAQs with questions and answers in both English and Bangla for this university course. Format each as: Q_EN: ...\nQ_BN: ...\nA_EN: ...\nA_BN: ...\n---"
                      label="AI Generate FAQs"
                      onApply={(text) => {
                        const blocks = text.split('---').filter(b => b.trim());
                        const newFaqs: FaqItem[] = blocks.map(block => {
                          const qEn = block.match(/Q_EN:\s*(.+)/i)?.[1]?.trim() || '';
                          const q = block.match(/Q_BN:\s*(.+)/i)?.[1]?.trim() || '';
                          const aEn = block.match(/A_EN:\s*([\s\S]*?)(?=(?:Q_BN:|A_BN:|$))/i)?.[1]?.trim() || '';
                          const a = block.match(/A_BN:\s*([\s\S]*?)(?=(?:Q_EN:|---|$))/i)?.[1]?.trim() || '';
                          return { q, qEn, a, aEn };
                        }).filter(f => f.qEn || f.q);
                        if (newFaqs.length > 0) setFaq(prev => [...prev, ...newFaqs]);
                      }}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={addFaq}><Plus className="h-3 w-3 mr-1" />Add FAQ</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {faq.map((item, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">FAQ #{i + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFaq(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={item.qEn} onChange={(e) => updateFaq(i, "qEn", e.target.value)} placeholder="Question (EN)" />
                      <Input value={item.q} onChange={(e) => updateFaq(i, "q", e.target.value)} placeholder="প্রশ্ন (BN)" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Answer (EN)</Label>
                          <AiWriterButton type="faq_answer" context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}\nQuestion: ${item.qEn}`} defaultPrompt={`Write a concise answer in English for this FAQ question: "${item.qEn}"`} onApply={(text) => updateFaq(i, "aEn", text)} />
                        </div>
                        <Textarea value={item.aEn} onChange={(e) => updateFaq(i, "aEn", e.target.value)} placeholder="Answer (EN)" rows={2} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">উত্তর (BN)</Label>
                          <AiWriterButton type="faq_answer" context={`Subject: ${subjects.find(s => s.id === selectedSubjectId)?.name || ''}\nQuestion: ${item.q || item.qEn}`} defaultPrompt={`Write a concise answer in Bangla (বাংলা) for this FAQ question: "${item.q || item.qEn}"`} label="AI বাংলা" onApply={(text) => updateFaq(i, "a", text)} />
                        </div>
                        <Textarea value={item.a} onChange={(e) => updateFaq(i, "a", e.target.value)} placeholder="উত্তর (BN)" rows={2} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        )}

        {isLoading && <div className="py-8 text-center text-muted-foreground">Loading content...</div>}
      </div>
    </>
  );
}

export default function SubjectCMSPage() {
  return <AdminLayout requiredPermission="can_manage_subject_cms"><SubjectCMSPageContent /></AdminLayout>;
}
