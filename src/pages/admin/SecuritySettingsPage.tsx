import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Shield, Smartphone, Trash2, RefreshCw, Search, ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { SessionViolationsWidget } from "@/components/admin/SessionViolationsWidget";

interface PlatformSettings {
  max_devices_per_student: number;
  session_timeout_minutes: number;
  device_lock_enabled: boolean;
}

interface TrustedDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_label: string | null;
  ip_address: string | null;
  registered_at: string;
  last_used_at: string;
  is_revoked: boolean;
  profile?: { full_name: string; phone: string; student_id: string | null } | null;
}

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings>({
    max_devices_per_student: 1,
    session_timeout_minutes: 5,
    device_lock_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");

  // Fetch settings
  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            max_devices_per_student: data.max_devices_per_student,
            session_timeout_minutes: data.session_timeout_minutes,
            device_lock_enabled: data.device_lock_enabled,
          });
        }
      });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({
        max_devices_per_student: settings.max_devices_per_student,
        session_timeout_minutes: settings.session_timeout_minutes,
        device_lock_enabled: settings.device_lock_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default');

    if (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Security settings updated" });
    }
    setSaving(false);
  };

  // Fetch trusted devices with profile info
  const fetchDevices = async (search?: string) => {
    setLoadingDevices(true);
    let query = supabase
      .from('trusted_devices')
      .select('*')
      .eq('is_revoked', false)
      .order('registered_at', { ascending: false })
      .limit(100);

    const { data } = await query;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, student_id')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      let enriched = data.map(d => ({
        ...d,
        profile: profileMap.get(d.user_id) || null,
      }));

      // Client-side search filtering
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        enriched = enriched.filter(d =>
          d.profile?.full_name?.toLowerCase().includes(q) ||
          d.profile?.phone?.includes(q) ||
          d.profile?.student_id?.toLowerCase().includes(q)
        );
      }

      setDevices(enriched);
    } else {
      setDevices([]);
    }
    setLoadingDevices(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSearch = () => {
    fetchDevices(studentSearch);
  };

  const revokeDevice = async (deviceId: string) => {
    const { error } = await supabase
      .from('trusted_devices')
      .update({ is_revoked: true })
      .eq('id', deviceId);

    if (error) {
      toast({ title: "Error", description: "Failed to revoke device", variant: "destructive" });
    } else {
      toast({ title: "Device Revoked", description: "Student can now register a new device on next login" });
      fetchDevices(studentSearch);
    }
  };

  const revokeAllDevicesForUser = async (userId: string, name: string) => {
    const { error } = await supabase
      .from('trusted_devices')
      .update({ is_revoked: true })
      .eq('user_id', userId);

    if (error) {
      toast({ title: "Error", description: "Failed to revoke devices", variant: "destructive" });
    } else {
      // Also deactivate sessions
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId);

      toast({ title: "All Devices Reset", description: `${name}'s devices have been cleared. They can register a new device on next login.` });
      fetchDevices(studentSearch);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Settings
          </h1>
          <p className="text-sm text-muted-foreground">Configure device locking, session limits, and manage trusted devices</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Device Lock Settings</CardTitle>
                <CardDescription>
                  Control how many devices each student can use and session behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Device Locking</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, students can only log in from registered devices
                    </p>
                  </div>
                  <Switch
                    checked={settings.device_lock_enabled}
                    onCheckedChange={(v) => setSettings(s => ({ ...s, device_lock_enabled: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Devices Per Student</Label>
                  <Select
                    value={String(settings.max_devices_per_student)}
                    onValueChange={(v) => setSettings(s => ({ ...s, max_devices_per_student: parseInt(v) }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 device (strictest)</SelectItem>
                      <SelectItem value="2">2 devices</SelectItem>
                      <SelectItem value="3">3 devices</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Number of trusted devices a student can register. First login auto-registers the device.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Select
                    value={String(settings.session_timeout_minutes)}
                    onValueChange={(v) => setSettings(s => ({ ...s, session_timeout_minutes: parseInt(v) }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How long a session stays "active" without heartbeat before another device can connect
                  </p>
                </div>

                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Trusted Devices Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Trusted Devices
                    </CardTitle>
                    <CardDescription>
                      View and manage registered devices for all students
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fetchDevices(studentSearch)} disabled={loadingDevices}>
                    <RefreshCw className={`h-4 w-4 ${loadingDevices ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, or student ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={handleSearch}>Search</Button>
                </div>

                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {loadingDevices ? "Loading..." : "No trusted devices found"}
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Last Used</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{d.profile?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{d.profile?.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {d.device_label || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(d.registered_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(d.last_used_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive h-8">
                                    <Trash2 className="h-3 w-3 mr-1" /> Revoke
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke This Device?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove "{d.device_label}" as a trusted device for {d.profile?.full_name}. 
                                      They'll be able to register a new device on their next login.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => revokeDevice(d.id)}>
                                      Revoke Device
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive h-8">
                                    Reset All
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reset All Devices?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will revoke ALL trusted devices for {d.profile?.full_name} and 
                                      terminate their active sessions. They'll need to log in again to register a new device.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => revokeAllDevicesForUser(d.user_id, d.profile?.full_name || 'User')}>
                                      Reset All Devices
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Violations Sidebar */}
          <div>
            <SessionViolationsWidget />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
