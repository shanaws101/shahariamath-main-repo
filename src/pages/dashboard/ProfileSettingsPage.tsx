import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Save, Loader2, Camera, Lock, Eye, EyeOff, LogOut, GraduationCap } from "lucide-react";
import { MyDevicesWidget } from "@/components/dashboard/MyDevicesWidget";
import { useToast } from "@/hooks/use-toast";
import { courseTypeHasYears } from "@/lib/course-types";

const departments = [
  { value: "management", label: "Management", labelBn: "ম্যানেজমেন্ট" },
  { value: "marketing", label: "Marketing", labelBn: "মার্কেটিং" },
  { value: "accounting", label: "Accounting", labelBn: "হিসাববিজ্ঞান" },
  { value: "finance", label: "Finance", labelBn: "ফাইন্যান্স" },
  { value: "economics", label: "Economics", labelBn: "অর্থনীতি" },
  { value: "statistics", label: "Statistics", labelBn: "পরিসংখ্যান" },
];

const years = [
  { value: 1, label: "1st Year", labelBn: "১ম বর্ষ" },
  { value: 2, label: "2nd Year", labelBn: "২য় বর্ষ" },
  { value: 3, label: "3rd Year", labelBn: "৩য় বর্ষ" },
  { value: 4, label: "4th Year", labelBn: "৪র্থ বর্ষ" },
];

const sessions = ["17-18","18-19","19-20","20-21","21-22","22-23","23-24","24-25","25-26","26-27"];

const courseTypes = [
  { value: "bba", label: "BBA", labelBn: "বিবিএ" },
  { value: "mba", label: "MBA", labelBn: "এমবিএ" },
  { value: "bbs", label: "BBS", labelBn: "বিবিএস" },
  { value: "job_preparation", label: "Job Preparation", labelBn: "চাকরি প্রস্তুতি" },
  { value: "ssc", label: "SSC", labelBn: "এসএসসি" },
  { value: "hsc", label: "HSC", labelBn: "এইচএসসি" },
];

export default function ProfileSettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBn = language === "bn";

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState<string>("");
  const [sessionVal, setSessionVal] = useState("");
  const [courseType, setCourseType] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setDepartment(profile.department || "");
      setYear(profile.year?.toString() || "");
      setSessionVal((profile as any).session || "");
      setCourseType((profile as any).course_type || "");
      setAvatarUrl((profile as any).avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Error", description: "Please select an image file", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" }); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
      if (updateError) throw updateError;
      setAvatarUrl(url);
      await refreshProfile();
      toast({ title: isBn ? "ছবি আপলোড হয়েছে" : "Photo uploaded" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) { toast({ title: isBn ? "ত্রুটি" : "Error", description: isBn ? "নাম দিতে হবে" : "Full name is required", variant: "destructive" }); return; }
    if (!phone.trim()) { toast({ title: isBn ? "ত্রুটি" : "Error", description: isBn ? "ফোন নম্বর দিতে হবে" : "Phone number is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const effectiveYear = courseTypeHasYears(courseType) && year ? parseInt(year) : null;
      const profileData = { user_id: user.id, full_name: fullName.trim(), phone: phone.trim(), department: (department || null) as any, year: effectiveYear, session: sessionVal || null, course_type: courseType || null } as any;
      if (profile) {
        const { error } = await supabase.from("profiles").update(profileData).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert(profileData);
        if (error) throw error;
      }
      await refreshProfile();
      toast({ title: isBn ? "✅ সফলভাবে সংরক্ষণ হয়েছে" : "✅ Profile Saved" });
    } catch (err: any) {
      toast({ title: isBn ? "ত্রুটি" : "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast({ title: "Error", description: isBn ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" : "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Error", description: isBn ? "পাসওয়ার্ড মিলছে না" : "Passwords do not match", variant: "destructive" }); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword(""); setConfirmPassword("");
      toast({ title: isBn ? "পাসওয়ার্ড পরিবর্তন হয়েছে" : "Password changed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setChangingPassword(false); }
  };

  const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            {isBn ? "প্রোফাইল সেটিংস" : "Profile Settings"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isBn ? "আপনার তথ্য আপডেট করুন" : "Update your personal information"}
          </p>
        </div>

        {/* Avatar & ID */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border rounded-2xl">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} className="rounded-2xl" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary rounded-2xl">{initials || "?"}</AvatarFallback>
              </Avatar>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-base font-bold text-foreground">{fullName || "—"}</h2>
              <p className="text-sm text-muted-foreground">{phone}</p>
              {profile?.student_id && (
                <Badge variant="secondary" className="font-mono text-[10px] mt-1 rounded-lg">{profile.student_id}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {isBn ? "ব্যক্তিগত তথ্য" : "Personal Information"}
            </h3>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? "পূর্ণ নাম" : "Full Name"}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? "ফোন নম্বর" : "Phone Number"}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl h-10" />
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              {isBn ? "একাডেমিক তথ্য" : "Academic Information"}
            </h3>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isBn ? "বিভাগ" : "Department"}</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder={isBn ? "বিভাগ নির্বাচন করুন" : "Select department"} /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.value} value={d.value}>{isBn ? d.labelBn : d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {courseTypeHasYears(courseType) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{isBn ? "বর্ষ" : "Year"}</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder={isBn ? "বর্ষ নির্বাচন করুন" : "Select year"} /></SelectTrigger>
                    <SelectContent>{years.map((y) => <SelectItem key={y.value} value={y.value.toString()}>{isBn ? y.labelBn : y.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isBn ? "একাডেমিক সেশন" : "Academic Session"}</Label>
                <Select value={sessionVal} onValueChange={setSessionVal}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder={isBn ? "সেশন নির্বাচন করুন" : "Select session"} /></SelectTrigger>
                  <SelectContent>{sessions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isBn ? "কোর্সের ধরন" : "Course Type"}</Label>
                <Select value={courseType} onValueChange={setCourseType}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder={isBn ? "কোর্সের ধরন নির্বাচন করুন" : "Select course type"} /></SelectTrigger>
                  <SelectContent>{courseTypes.map((ct) => <SelectItem key={ct.value} value={ct.value}>{isBn ? ct.labelBn : ct.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isBn ? "তথ্য সংরক্ষণ করুন" : "Save Profile"}
            </Button>
          </div>
        </div>

        {/* Password */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              {isBn ? "পাসওয়ার্ড পরিবর্তন" : "Change Password"}
            </h3>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? "নতুন পাসওয়ার্ড" : "New Password"}</Label>
              <div className="relative">
                <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="rounded-xl h-10 pr-10" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}</Label>
              <div className="relative">
                <Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="rounded-xl h-10 pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">{isBn ? "পাসওয়ার্ড মিলছে না" : "Passwords do not match"}</p>
            )}
            <Button onClick={handlePasswordChange} disabled={changingPassword || !newPassword || !confirmPassword} variant="outline" className="w-full h-10 rounded-xl">
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {isBn ? "পাসওয়ার্ড পরিবর্তন করুন" : "Update Password"}
            </Button>
          </div>
        </div>

        {/* My Devices */}
        <MyDevicesWidget />

        {/* Logout */}
        <div className="rounded-2xl border border-destructive/30 bg-card p-5">
          <Button variant="destructive" className="w-full h-12 rounded-xl gap-2 font-bold"
            onClick={async () => { await signOut(); window.location.href = '/'; }}>
            <LogOut className="h-4 w-4" />
            {isBn ? "লগ আউট করুন" : "Log Out"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
