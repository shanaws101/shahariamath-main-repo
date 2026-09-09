import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Upload, GripVertical, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Instructor {
  id: string;
  subject_id: string;
  name: string;
  name_bn: string | null;
  position: string | null;
  position_bn: string | null;
  education: string | null;
  education_bn: string | null;
  avatar_url: string | null;
  display_order: number;
}

interface InstructorManagerProps {
  subjectId: string;
}

export function InstructorManager({ subjectId }: InstructorManagerProps) {
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructors();
  }, [subjectId]);

  const fetchInstructors = async () => {
    const { data, error } = await supabase
      .from("instructors")
      .select("*")
      .eq("subject_id", subjectId)
      .order("display_order");
    if (!error && data) setInstructors(data);
    setIsLoading(false);
  };

  const addInstructor = async () => {
    const { error } = await supabase.from("instructors").insert({
      subject_id: subjectId,
      name: "",
      display_order: instructors.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    fetchInstructors();
  };

  const updateInstructor = async (id: string, updates: Partial<Instructor>) => {
    const { error } = await supabase
      .from("instructors")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setInstructors((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  const deleteInstructor = async (id: string) => {
    const { error } = await supabase.from("instructors").delete().eq("id", id);
    if (!error) {
      setInstructors((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Instructor removed" });
    }
  };

  const handlePhotoUpload = async (id: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5MB", variant: "destructive" });
      return;
    }

    setUploading(id);
    const ext = file.name.split(".").pop();
    const path = `instructors/${subjectId}/${id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateInstructor(id, { avatar_url: urlData.publicUrl });
    setUploading(null);
    toast({ title: "Photo uploaded" });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading instructors...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Instructors</Label>
        <Button type="button" variant="outline" size="sm" onClick={addInstructor} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Instructor
        </Button>
      </div>

      {instructors.length === 0 && (
        <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No instructors added yet</p>
          <p className="text-xs mt-1">Click "Add Instructor" to get started</p>
        </div>
      )}

      {instructors.map((inst) => (
        <Card key={inst.id} className="border border-border">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Photo Upload */}
              <div className="flex-shrink-0">
                <label className="cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(inst.id, file);
                    }}
                  />
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-dashed border-border group-hover:border-primary transition-colors">
                      {inst.avatar_url ? (
                        <AvatarImage src={inst.avatar_url} alt={inst.name} />
                      ) : null}
                      <AvatarFallback className="bg-muted">
                        {uploading === inst.id ? (
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                      {inst.avatar_url && (
                        <Upload className="h-4 w-4 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                </label>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name (English)"
                    value={inst.name}
                    onChange={(e) => updateInstructor(inst.id, { name: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="নাম (বাংলা)"
                    value={inst.name_bn || ""}
                    onChange={(e) => updateInstructor(inst.id, { name_bn: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Position (e.g. Senior Lecturer)"
                    value={inst.position || ""}
                    onChange={(e) => updateInstructor(inst.id, { position: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="পদবী (বাংলা)"
                    value={inst.position_bn || ""}
                    onChange={(e) => updateInstructor(inst.id, { position_bn: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Education (e.g. MBA, DU)"
                    value={inst.education || ""}
                    onChange={(e) => updateInstructor(inst.id, { education: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="শিক্ষাগত যোগ্যতা (বাংলা)"
                    value={inst.education_bn || ""}
                    onChange={(e) => updateInstructor(inst.id, { education_bn: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Delete */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8 flex-shrink-0 self-start"
                onClick={() => deleteInstructor(inst.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}