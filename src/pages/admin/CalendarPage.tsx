import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Plus, Edit, Trash2, X, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClassSchedule {
  id: string;
  subject_id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  is_free: boolean;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled';
  stream_url: string | null;
  demo_video_url: string | null;
  department: string | null;
  target_years: number[] | null;
  subjects?: { name: string };
}

interface Subject {
  id: string;
  name: string;
}

const defaultClass: Partial<ClassSchedule> = {
  title: '',
  title_bn: '',
  description: '',
  scheduled_date: '',
  start_time: '',
  end_time: '',
  is_free: false,
  status: 'upcoming',
  stream_url: '',
  demo_video_url: '',
  department: null,
  target_years: [1, 2, 3, 4],
};

export function CalendarPageContent() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassSchedule>>(defaultClass);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [classesRes, subjectsRes] = await Promise.all([
      supabase
        .from('class_schedules')
        .select('*, subjects(name)')
        .order('scheduled_date', { ascending: true }),
      supabase.from('subjects').select('id, name'),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!editingClass.subject_id || !editingClass.title || !editingClass.scheduled_date) {
      toast({
        title: "Error",
        description: "Subject, title, and date are required.",
        variant: "destructive",
      });
      return;
    }

    const classData = {
      subject_id: editingClass.subject_id,
      title: editingClass.title,
      title_bn: editingClass.title_bn || null,
      description: editingClass.description || null,
      scheduled_date: editingClass.scheduled_date,
      start_time: editingClass.start_time || '00:00',
      end_time: editingClass.end_time || '00:00',
      is_free: editingClass.is_free ?? false,
      status: editingClass.status || 'upcoming',
      stream_url: editingClass.stream_url || null,
      demo_video_url: editingClass.demo_video_url || null,
      department: editingClass.department || null,
      target_years: editingClass.target_years || [1, 2, 3, 4],
    };

    if (isEditing && editingClass.id) {
      const { error } = await supabase
        .from('class_schedules')
        .update(classData)
        .eq('id', editingClass.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Class updated" });
    } else {
      const { error } = await supabase
        .from('class_schedules')
        .insert(classData);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Class created" });
    }

    setIsDialogOpen(false);
    setEditingClass(defaultClass);
    setIsEditing(false);
    fetchData();
  };

  const handleEdit = (cls: ClassSchedule) => {
    setEditingClass(cls);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleCancel = async (cls: ClassSchedule) => {
    const { error } = await supabase
      .from('class_schedules')
      .update({ status: 'cancelled' })
      .eq('id', cls.id);

    if (!error) {
      toast({ title: "Class cancelled" });
      fetchData();
    }
  };

  const handleDelete = async (cls: ClassSchedule) => {
    if (!confirm('Delete this class?')) return;

    const { error } = await supabase
      .from('class_schedules')
      .delete()
      .eq('id', cls.id);

    if (!error) {
      toast({ title: "Class deleted" });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500">Live</Badge>;
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'finished':
        return <Badge variant="outline">Finished</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Group classes by date
  const groupedClasses = classes.reduce((acc, cls) => {
    const date = cls.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(cls);
    return acc;
  }, {} as Record<string, ClassSchedule[]>);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground">Manage class schedules</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingClass(defaultClass);
              setIsEditing(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Class' : 'Add Class'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={editingClass.subject_id}
                    onValueChange={(value) => setEditingClass({ ...editingClass, subject_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title (English)</Label>
                    <Input
                      value={editingClass.title || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (বাংলা)</Label>
                    <Input
                      value={editingClass.title_bn || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, title_bn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingClass.description || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editingClass.scheduled_date || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, scheduled_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={editingClass.start_time || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={editingClass.end_time || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Stream URL</Label>
                  <Input
                    value={editingClass.stream_url || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, stream_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    Demo Video URL (Bunny Stream)
                  </Label>
                  <Input
                    value={editingClass.demo_video_url || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, demo_video_url: e.target.value })}
                    placeholder="https://player.mediadelivery.net/embed/<libraryId>/<videoId>"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a Bunny Stream URL to show a playable demo thumbnail on the landing page (free classes only)
                  </p>
                </div>

                {/* Department & Year Targeting */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department (optional)</Label>
                    <Select
                      value={editingClass.department || "all"}
                      onValueChange={(v) => setEditingClass({ ...editingClass, department: v === "all" ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="economics">Economics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Years</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((y) => {
                        const years = editingClass.target_years || [1, 2, 3, 4];
                        const active = years.includes(y);
                        return (
                          <Button
                            key={y}
                            type="button"
                            size="sm"
                            variant={active ? "default" : "outline"}
                            className="w-10 h-8"
                            onClick={() => {
                              const next = active ? years.filter((v) => v !== y) : [...years, y];
                              setEditingClass({ ...editingClass, target_years: next.length > 0 ? next : [y] });
                            }}
                          >
                            {y}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_free"
                      checked={editingClass.is_free}
                      onCheckedChange={(checked) => setEditingClass({ ...editingClass, is_free: !!checked })}
                    />
                    <Label htmlFor="is_free">Free class</Label>
                  </div>
                  <Select
                    value={editingClass.status}
                    onValueChange={(value: any) => setEditingClass({ ...editingClass, status: value })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {isEditing ? 'Update Class' : 'Create Class'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar View */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-8">
                  <div className="h-6 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedClasses).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No classes scheduled yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedClasses).map(([date, dateClasses]) => (
              <Card key={date}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dateClasses.map(cls => (
                    <div
                      key={cls.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        cls.status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-mono text-muted-foreground">
                          {cls.start_time} - {cls.end_time}
                        </div>
                        <div>
                          <p className="font-medium">{cls.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {cls.subjects?.name}
                            </p>
                            {cls.is_free && <Badge variant="outline" className="text-xs">Free</Badge>}
                            {cls.demo_video_url && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Video className="h-3 w-3" />
                                Demo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(cls.status)}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cls)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {cls.status === 'upcoming' && (
                          <Button variant="ghost" size="icon" onClick={() => handleCancel(cls)}>
                            <X className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cls)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function CalendarPage() {
  return <AdminLayout requiredPermission="can_manage_calendar"><CalendarPageContent /></AdminLayout>;
}
