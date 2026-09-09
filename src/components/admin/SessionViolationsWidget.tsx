import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Monitor, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Violation {
  id: string;
  user_id: string;
  violation_type: string;
  blocked_device_label: string | null;
  active_device_label: string | null;
  created_at: string;
  profile?: { full_name: string; phone: string } | null;
}

export function SessionViolationsWidget() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViolations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('session_violations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      // Fetch profile info for each unique user_id
      const userIds = [...new Set(data.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      setViolations(
        data.map(v => ({
          ...v,
          profile: profileMap.get(v.user_id) || null,
        }))
      );
    } else {
      setViolations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Account Sharing Alerts
            {violations.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {violations.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchViolations} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No sharing attempts detected
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {violations.map((v) => (
              <div key={v.id} className="flex items-start gap-3 p-2 rounded-lg border bg-muted/30">
                <Monitor className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {v.profile?.full_name || 'Unknown'} ({v.profile?.phone || v.user_id.slice(0, 8)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Blocked: {v.blocked_device_label || 'Unknown device'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active on: {v.active_device_label || 'Unknown device'}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
