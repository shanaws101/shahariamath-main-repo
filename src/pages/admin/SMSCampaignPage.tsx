import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Users, MessageSquare, Clock, CheckCircle, XCircle, Loader2, Save, FileText, CalendarIcon, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AiWriterButton } from "@/components/admin/AiWriterButton";

interface Profile {
  phone: string;
  full_name: string;
  department: string | null;
  year: number | null;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  recipient_filter: any;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
  scheduled_for: string | null;
}

interface SmsTemplate {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export default function SMSCampaignPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [customPhones, setCustomPhones] = useState("");
  const [useCustomPhones, setUseCustomPhones] = useState(false);

  // Scheduling
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const charCount = message.length;
  const smsCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  useEffect(() => {
    fetchSubjects();
    fetchCampaigns();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!useCustomPhones) {
      fetchRecipients();
    }
  }, [filterType, selectedDepartment, selectedYear, selectedSubject, useCustomPhones]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("id, name").order("name");
    if (data) setSubjects(data);
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("sms_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setCampaigns(data as Campaign[]);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("sms_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data as SmsTemplate[]);
  };

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      let query = supabase.from("profiles").select("phone, full_name, department, year");

      if (filterType === "department" && selectedDepartment) {
        query = query.eq("department", selectedDepartment as any);
      } else if (filterType === "year" && selectedYear) {
        query = query.eq("year", parseInt(selectedYear));
      } else if (filterType === "subject" && selectedSubject) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("user_id")
          .eq("subject_id", selectedSubject)
          .eq("payment_status", "completed");

        if (enrollments && enrollments.length > 0) {
          const userIds = enrollments.map((e) => e.user_id);
          query = query.in("user_id", userIds);
        } else {
          setRecipients([]);
          setRecipientCount(0);
          setLoadingRecipients(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const uniquePhones = new Map<string, Profile>();
      data?.forEach((p) => {
        if (p.phone) uniquePhones.set(p.phone, p as Profile);
      });

      const list = Array.from(uniquePhones.values());
      setRecipients(list);
      setRecipientCount(list.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load recipients");
    }
    setLoadingRecipients(false);
  };

  const getPhoneList = (): string[] => {
    if (useCustomPhones) {
      return customPhones
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 10);
    }
    return recipients.map((r) => r.phone);
  };

  const getScheduledDateTime = (): string | null => {
    if (!isScheduled || !scheduleDate || !scheduleTime) return null;
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const dt = new Date(scheduleDate);
    dt.setHours(hours, minutes, 0, 0);
    return dt.toISOString();
  };

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim() || !message.trim()) {
      return toast.error("Template needs a title and message");
    }
    const { error } = await supabase.from("sms_templates").insert({
      title: templateTitle,
      message,
    });
    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved!");
      setTemplateTitle("");
      setShowSaveTemplate(false);
      fetchTemplates();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from("sms_templates").delete().eq("id", id);
    fetchTemplates();
    toast.success("Template deleted");
  };

  const handleLoadTemplate = (t: SmsTemplate) => {
    setMessage(t.message);
    if (!title) setTitle(t.title);
    setTemplatesOpen(false);
    toast.success("Template loaded");
  };

  const handleSend = async () => {
    const phones = getPhoneList();
    if (!message.trim()) return toast.error("Write a message first");
    if (phones.length === 0) return toast.error("No recipients selected");
    if (!title.trim()) return toast.error("Add a campaign title");

    const scheduledFor = getScheduledDateTime();

    if (isScheduled && !scheduledFor) {
      return toast.error("Pick a date and time for scheduling");
    }

    if (isScheduled && scheduledFor && new Date(scheduledFor) <= new Date()) {
      return toast.error("Scheduled time must be in the future");
    }

    const actionLabel = isScheduled ? "Schedule" : "Send";
    const confirmed = window.confirm(
      `${actionLabel} SMS to ${phones.length} recipients?${isScheduled ? `\n\nScheduled for: ${format(new Date(scheduledFor!), "PPP p")}` : ""}\n\nMessage: "${message.substring(0, 80)}..."`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      if (isScheduled && scheduledFor) {
        // Just create the campaign as scheduled — cron will pick it up
        const { error: campError } = await supabase
          .from("sms_campaigns")
          .insert({
            title,
            message,
            recipient_filter: {
              type: filterType,
              department: selectedDepartment,
              year: selectedYear,
              subject: selectedSubject,
              custom: useCustomPhones,
              phones: useCustomPhones ? phones : undefined,
            },
            total_recipients: phones.length,
            status: "scheduled",
            scheduled_for: scheduledFor,
          });

        if (campError) throw campError;
        toast.success(`Campaign scheduled for ${format(new Date(scheduledFor), "PPP p")}`);
      } else {
        // Send immediately (existing logic)
        const { data: campaign, error: campError } = await supabase
          .from("sms_campaigns")
          .insert({
            title,
            message,
            recipient_filter: { type: filterType, department: selectedDepartment, year: selectedYear, subject: selectedSubject, custom: useCustomPhones },
            total_recipients: phones.length,
            status: "sending",
          })
          .select()
          .single();

        if (campError) throw campError;

        const { data, error } = await supabase.functions.invoke("send-campaign-sms", {
          body: { campaign_id: campaign.id, message, phones, title },
        });

        if (error) throw error;

        toast.success(`Campaign sent! ${data.sent_count}/${data.total} delivered`);
        if (data.failed_count > 0) {
          toast.warning(`${data.failed_count} messages failed to send`);
        }
      }

      setTitle("");
      setMessage("");
      setCustomPhones("");
      setIsScheduled(false);
      setScheduleDate(undefined);
      setScheduleTime("");
      fetchCampaigns();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send campaign");
    }
    setSending(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case "sending": return <Badge className="bg-accent text-accent-foreground"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending</Badge>;
      case "scheduled": return <Badge variant="outline" className="border-primary text-primary"><CalendarIcon className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case "failed": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">SMS Campaigns</h1>
          <p className="text-sm text-muted-foreground">Send or schedule promotional SMS to your students</p>
        </div>

        {/* Templates dialog */}
        <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>SMS Templates</DialogTitle>
            </DialogHeader>
            {templates.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No saved templates yet. Write a message and save it as a template.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {templates.map((t) => (
                  <Card key={t.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleLoadTemplate(t)}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Compose Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Course Launch" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Label>Message</Label>
                  <AiWriterButton
                    type="sms_message"
                    placeholder="e.g. Write an SMS about new course launch with discount"
                    defaultPrompt="Write a short promotional SMS for a new course launch at our educational platform. Include urgency."
                    label="AI Write"
                    onApply={setMessage}
                  />
                </div>
                {message.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                  >
                    <Save className="h-3 w-3" /> Save as Template
                  </Button>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your SMS message here..."
                rows={5}
                maxLength={640}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{charCount}/640 characters</span>
                <span>{smsCount} SMS per recipient</span>
              </div>

              {showSaveTemplate && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSaveTemplate}>Save</Button>
                </div>
              )}
            </div>

            {/* Recipients filter */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-base font-semibold">Recipients</Label>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={useCustomPhones}
                  onCheckedChange={(v) => setUseCustomPhones(!!v)}
                  id="custom"
                />
                <Label htmlFor="custom" className="cursor-pointer text-sm">Use custom phone list</Label>
              </div>

              {useCustomPhones ? (
                <div>
                  <Textarea
                    value={customPhones}
                    onChange={(e) => setCustomPhones(e.target.value)}
                    placeholder="Enter phone numbers (one per line, or comma separated)&#10;01712345678&#10;01812345678"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {getPhoneList().length} valid phone numbers
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Filter by</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="year">Academic Year</SelectItem>
                        <SelectItem value="subject">Enrolled Subject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filterType === "department" && (
                    <div>
                      <Label className="text-xs">Department</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="management">Management</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="accounting">Accounting</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="economics">Economics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filterType === "year" && (
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filterType === "subject" && (
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Schedule option */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isScheduled}
                  onCheckedChange={(v) => setIsScheduled(!!v)}
                  id="schedule"
                />
                <Label htmlFor="schedule" className="cursor-pointer text-sm font-semibold">Schedule for later</Label>
              </div>

              {isScheduled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || (!useCustomPhones && recipientCount === 0) || !message.trim()}
              className="w-full btn-brand"
              size="lg"
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {isScheduled ? "Scheduling..." : "Sending..."}</>
              ) : isScheduled ? (
                <><CalendarIcon className="h-4 w-4" /> Schedule to {useCustomPhones ? getPhoneList().length : recipientCount} Recipients</>
              ) : (
                <><Send className="h-4 w-4" /> Send to {useCustomPhones ? getPhoneList().length : recipientCount} Recipients</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recipients Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRecipients ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : useCustomPhones ? (
                <div className="text-3xl font-bold">{getPhoneList().length}</div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{recipientCount}</div>
                  <p className="text-xs text-muted-foreground">students matching filter</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SMS Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(useCustomPhones ? getPhoneList().length : recipientCount) * smsCount}
              </div>
              <p className="text-xs text-muted-foreground">total SMS credits ({smsCount} per recipient)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Campaign History</CardTitle>
          <CardDescription>Your recent SMS campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No campaigns sent yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>{c.sent_count}/{c.total_recipients}</TableCell>
                    <TableCell>{c.failed_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.status === "scheduled" && c.scheduled_for
                        ? format(new Date(c.scheduled_for), "PPP p")
                        : c.sent_at
                          ? new Date(c.sent_at).toLocaleDateString()
                          : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
