import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IntegrationSettings {
  enabled: boolean;
  trackingId: string;
}

function useIntegrationSettings(section: string) {
  const [settings, setSettings] = useState<IntegrationSettings>({ enabled: false, trackingId: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('cms_content')
      .select('content')
      .eq('section', section)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
          const c = data.content as Record<string, unknown>;
          setSettings({
            enabled: c.enabled === true,
            trackingId: (c.trackingId as string) || '',
          });
        }
        setLoading(false);
      });
  }, [section]);

  return { settings, loading };
}

export function GoogleAnalyticsWidget() {
  const { settings, loading } = useIntegrationSettings('google_analytics_settings');

  useEffect(() => {
    if (loading || !settings.enabled || !settings.trackingId) return;
    if (document.getElementById('ga-script')) return;

    const gtagScript = document.createElement('script');
    gtagScript.id = 'ga-script';
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${settings.trackingId}`;
    document.head.appendChild(gtagScript);

    const inlineScript = document.createElement('script');
    inlineScript.id = 'ga-inline';
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.trackingId}');
    `;
    document.head.appendChild(inlineScript);

    return () => {
      document.getElementById('ga-script')?.remove();
      document.getElementById('ga-inline')?.remove();
    };
  }, [loading, settings.enabled, settings.trackingId]);

  return null;
}

export function FacebookPixelWidget() {
  const { settings, loading } = useIntegrationSettings('facebook_pixel_settings');

  useEffect(() => {
    if (loading || !settings.enabled || !settings.trackingId) return;
    if (document.getElementById('fb-pixel-script')) return;

    const script = document.createElement('script');
    script.id = 'fb-pixel-script';
    script.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${settings.trackingId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.id = 'fb-pixel-noscript';
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${settings.trackingId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);

    return () => {
      document.getElementById('fb-pixel-script')?.remove();
      document.getElementById('fb-pixel-noscript')?.remove();
    };
  }, [loading, settings.enabled, settings.trackingId]);

  return null;
}
