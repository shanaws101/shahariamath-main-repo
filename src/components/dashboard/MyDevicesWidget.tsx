import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Monitor, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";

interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  device_label: string | null;
  registered_at: string;
  last_used_at: string;
  is_revoked: boolean;
}

export function MyDevicesWidget() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [currentFp, setCurrentFp] = useState("");

  useEffect(() => {
    setCurrentFp(generateDeviceFingerprint());
  }, []);

  const fetchDevices = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("trusted_devices")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_revoked", false)
      .order("registered_at", { ascending: true });
    setDevices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const handleRequestDeviceChange = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      // Revoke ALL trusted devices for this user
      await supabase
        .from("trusted_devices")
        .update({ is_revoked: true })
        .eq("user_id", user.id);

      // Deactivate all sessions
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Re-trust current device
      const fp = generateDeviceFingerprint();
      const { getDeviceLabel } = await import("@/lib/deviceFingerprint");
      await supabase.from("trusted_devices").upsert({
        user_id: user.id,
        device_fingerprint: fp,
        device_label: getDeviceLabel(),
        last_used_at: new Date().toISOString(),
        is_revoked: false,
      }, { onConflict: "user_id,device_fingerprint" });

      toast({
        title: language === "bn" ? "ডিভাইস রিসেট হয়েছে" : "Device Reset",
        description: language === "bn"
          ? "আপনার সকল পুরাতন ডিভাইস সরানো হয়েছে। এই ডিভাইসটি এখন আপনার প্রাথমিক ডিভাইস।"
          : "All old devices removed. This device is now your primary device.",
      });
      await fetchDevices();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const isMobileDevice = (label: string | null) => {
    if (!label) return false;
    return /Android|iOS/i.test(label);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {language === "bn" ? "আমার ডিভাইসসমূহ" : "My Devices"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {language === "bn" ? "কোনো নিবন্ধিত ডিভাইস নেই" : "No registered devices"}
          </p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => {
              const isCurrentDevice = device.device_fingerprint === currentFp;
              return (
                <div
                  key={device.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  {isMobileDevice(device.device_label) ? (
                    <Smartphone className="h-5 w-5 mt-0.5 text-primary" />
                  ) : (
                    <Monitor className="h-5 w-5 mt-0.5 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">
                        {device.device_label || (language === "bn" ? "অজানা ডিভাইস" : "Unknown Device")}
                      </span>
                      {isCurrentDevice && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          {language === "bn" ? "এই ডিভাইস" : "This device"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {language === "bn" ? "নিবন্ধিত: " : "Registered: "}
                      {formatDate(device.registered_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === "bn" ? "সর্বশেষ ব্যবহার: " : "Last used: "}
                      {formatDate(device.last_used_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {language === "bn"
                ? "ডিভাইস পরিবর্তন করলে অন্য সব ডিভাইস থেকে লগ আউট হয়ে যাবে এবং শুধুমাত্র এই ডিভাইসটি সক্রিয় থাকবে।"
                : "Changing device will log out all other devices and only keep this device active."}
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRequestDeviceChange}
            disabled={requesting || devices.length <= 1}
          >
            {requesting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {language === "bn" ? "ডিভাইস পরিবর্তন করুন" : "Reset & Use This Device Only"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}