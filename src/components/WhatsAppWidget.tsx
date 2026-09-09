import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppWidget() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const [config, setConfig] = useState<{ enabled: boolean; url: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('cms_content')
        .select('content')
        .eq('section', 'whatsapp_widget')
        .maybeSingle();
      if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
        const c = data.content as Record<string, unknown>;
        const rawNumber = c.number as string | undefined;
        setConfig({
          enabled: c.enabled !== false,
          url: normalizeWhatsAppLink(rawNumber),
        });
      } else {
        setConfig({ enabled: true, url: normalizeWhatsAppLink() });
      }
    };
    fetchConfig();
  }, []);

  if (isAdmin || !config?.enabled) return null;

  return (
    <a
      href={config.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lg transition-transform duration-200 hover:scale-110 hover:shadow-xl md:bottom-8 md:right-8 print:hidden"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </a>
  );
}
