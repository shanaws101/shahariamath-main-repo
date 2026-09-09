import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function TawkToWidget() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [hideOnDashboard, setHideOnDashboard] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from('cms_content')
        .select('content')
        .eq('section', 'tawkto_settings')
        .maybeSingle();
      
      if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
        const content = data.content as Record<string, unknown>;
        setEnabled(content.enabled === true);
        setHideOnDashboard(content.hideOnDashboard === true);
      } else {
        setEnabled(true);
      }
    };
    fetchSetting();
  }, []);

  const shouldHide = isAdminRoute || (isDashboardRoute && hideOnDashboard);

  // Hide/show widget based on route
  useEffect(() => {
    const tawkApi = (window as any).Tawk_API;
    if (!tawkApi) return;
    try {
      if (shouldHide) {
        tawkApi.hideWidget?.();
      } else if (enabled === true) {
        tawkApi.showWidget?.();
      }
    } catch {}
  }, [shouldHide, enabled]);

  useEffect(() => {
    if (enabled !== true || shouldHide) {
      // Remove widget if disabled or on hidden route
      const existing = document.getElementById('tawkto-script');
      if (existing && enabled !== true) existing.remove();
      const widgets = document.querySelectorAll('[id^="tawk-"]');
      if (enabled !== true) widgets.forEach(w => w.remove());
      if ((window as any).Tawk_API) {
        try { (window as any).Tawk_API.hideWidget?.(); } catch {}
      }
      return;
    }
    // Don't double-load
    if (document.getElementById('tawkto-script')) return;

    const s1 = document.createElement("script");
    s1.id = 'tawkto-script';
    s1.async = true;
    s1.src = 'https://embed.tawk.to/69a868148b77201c364341b6/1jistd51l';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    document.body.appendChild(s1);

    return () => {
      const existing = document.getElementById('tawkto-script');
      if (existing) existing.remove();
      const widget = document.querySelector('[id^="tawk-"]');
      if (widget) widget.remove();
      if ((window as any).Tawk_API) {
        try { (window as any).Tawk_API.hideWidget?.(); } catch {}
      }
    };
  }, [enabled, shouldHide]);

  // Inject CSS to raise widget above mobile bottom nav
  useEffect(() => {
    const styleId = 'tawkto-mobile-fix';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media (max-width: 767px) {
        iframe[title="chat widget"],
        .widget-visible iframe,
        [id^="tawk-"],
        .tawk-min-container,
        div[class*="tawk"] {
          bottom: 90px !important;
          right: 10px !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  return null;
}
