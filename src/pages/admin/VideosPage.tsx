import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FreeVideo {
  id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  description_bn: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  subject_id: string | null;
  department: string | null;
  compatible_years: number[] | null;
  is_visible: boolean;
  display_order: number;
  subjects?: { name: string } | null;
}

interface Subject {
  id: string;
  name: string;
  department: string | null;
}

const DEPARTMENTS = [
  { value: 'management', label: 'Management' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'finance', label: 'Finance' },
  { value: 'economics', label: 'Economics' },
];

const YEARS = [1, 2, 3, 4];

const defaultVideo: Partial<FreeVideo> = {
  title: '', title_bn: '', description: '', description_bn: '',
  youtube_url: '', thumbnail_url: '', subject_id: null,
  department: null, compatible_years: [1, 2, 3, 4],
  is_visible: true, display_order: 0,
};

export function VideosPageContent() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<FreeVideo[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<FreeVideo>>(defaultVideo);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [videosRes, subjectsRes] = await Promise.all([
      supabase.from('free_videos').select('*, subjects(name)').order('display_order'),
      supabase.from('subjects').select('id, name, department'),
    ]);
    if (videosRes.data) setVideos(videosRes.data as FreeVideo[]);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    setIsLoading(false);
  };

    const filteredSubjects = subjects.filter(
    (s) => !editingVideo.department || s.department === editingVideo.department
  );

  const handleYearToggle = (year: number, checked: boolean) => {
    const current = editingVideo.compatible_years || [];
    const updated = checked ? [...current, year].sort() : current.filter((y) => y !== year);
    setEditingVideo({ ...editingVideo, compatible_years: updated });
  };

  const handleSave = async () => {
    if (!editingVideo.title || !editingVideo.youtube_url) {
      toast({ title: "Error", description: "Title and Bunny Stream URL are required.", variant: "destructive" });
      return;
    }

    const thumbnail = null;

    const videoData = {
      title: editingVideo.title,
      title_bn: editingVideo.title_bn || null,
      description: editingVideo.description || null,
      description_bn: editingVideo.description_bn || null,
      youtube_url: editingVideo.youtube_url,
      thumbnail_url: editingVideo.thumbnail_url || thumbnail,
      subject_id: editingVideo.subject_id || null,
      department: editingVideo.department || null,
      compatible_years: editingVideo.compatible_years?.length ? editingVideo.compatible_years : [1, 2, 3, 4],
      is_visible: editingVideo.is_visible ?? true,
      display_order: editingVideo.display_order || 0,
    };

    if (isEditing && editingVideo.id) {
      const { error } = await supabase.from('free_videos').update(videoData).eq('id', editingVideo.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Video updated" });
    } else {
      const { error } = await supabase.from('free_videos').insert(videoData);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Video added" });
    }

    setIsDialogOpen(false);
    setEditingVideo(defaultVideo);
    setIsEditing(false);
    fetchData();
  };

  const handleEdit = (video: FreeVideo) => {
    setEditingVideo(video);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleToggleVisibility = async (video: FreeVideo) => {
    const { error } = await supabase.from('free_videos').update({ is_visible: !video.is_visible }).eq('id', video.id);
    if (!error) { toast({ title: video.is_visible ? "Video hidden" : "Video visible" }); fetchData(); }
  };

  const handleDelete = async (video: FreeVideo) => {
    if (!confirm('Delete this video?')) return;
    const { error } = await supabase.from('free_videos').delete().eq('id', video.id);
    if (!error) { toast({ title: "Video deleted" }); fetchData(); }
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Free Videos</h1>
            <p className="text-muted-foreground">Manage free video content</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingVideo(defaultVideo); setIsEditing(false); }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Video</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Video' : 'Add Video'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Title EN/BN */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title (English)</Label>
                    <Input value={editingVideo.title || ''} onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (বাংলা)</Label>
                    <Input value={editingVideo.title_bn || ''} onChange={(e) => setEditingVideo({ ...editingVideo, title_bn: e.target.value })} />
                  </div>
                </div>

                {/* Bunny Stream URL */}
                <div className="space-y-2">
                  <Label>Bunny Stream URL</Label>
                  <Input value={editingVideo.youtube_url || ''} onChange={(e) => setEditingVideo({ ...editingVideo, youtube_url: e.target.value })} placeholder="https://player.mediadelivery.net/embed/<libraryId>/<videoId>" />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description (English)</Label>
                  <Textarea value={editingVideo.description || ''} onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })} rows={2} />
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={editingVideo.department || 'none'}
                    onValueChange={(value) => setEditingVideo({
                      ...editingVideo,
                      department: value === 'none' ? null : value,
                      subject_id: value === 'none' ? editingVideo.subject_id : null,
                    })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year checkboxes */}
                <div className="space-y-2">
                  <Label>Target Years</Label>
                  <div className="flex items-center gap-4">
                    {YEARS.map((y) => (
                      <div key={y} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`year-${y}`}
                          checked={editingVideo.compatible_years?.includes(y) ?? true}
                          onCheckedChange={(checked) => handleYearToggle(y, !!checked)}
                        />
                        <Label htmlFor={`year-${y}`} className="text-sm font-normal">Year {y}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subject (filtered by department) */}
                <div className="space-y-2">
                  <Label>Subject (Optional)</Label>
                  <Select
                    value={editingVideo.subject_id || 'none'}
                    onValueChange={(value) => setEditingVideo({ ...editingVideo, subject_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subject</SelectItem>
                      {filteredSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Display Order + Visible */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input type="number" value={editingVideo.display_order || 0} onChange={(e) => setEditingVideo({ ...editingVideo, display_order: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    <Checkbox id="is_visible" checked={editingVideo.is_visible} onCheckedChange={(checked) => setEditingVideo({ ...editingVideo, is_visible: !!checked })} />
                    <Label htmlFor="is_visible">Visible</Label>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {isEditing ? 'Update Video' : 'Add Video'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : videos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No videos yet. Add your first video.</TableCell></TableRow>
                ) : (
                  videos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell className="text-muted-foreground">{video.display_order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-12 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                            {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <Video className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{video.title}</p>
                            {video.title_bn && <p className="text-xs text-muted-foreground truncate">{video.title_bn}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {video.department ? (
                          <Badge variant="outline" className="capitalize">{video.department}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {video.compatible_years?.join(', ') || '1-4'}
                        </span>
                      </TableCell>
                      <TableCell>{video.subjects?.name || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell>
                        {video.is_visible ? <Badge variant="secondary">Visible</Badge> : <Badge variant="outline">Hidden</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(video)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(video)}>
                            {video.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(video)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function VideosPage() {
  return <AdminLayout requiredPermission="can_manage_videos"><VideosPageContent /></AdminLayout>;
}
