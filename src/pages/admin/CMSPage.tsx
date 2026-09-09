import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { saveCmsContent } from '@/hooks/useCmsContent';
import { usePersistedTab } from '@/hooks/usePersistedTab';
import { Save, Plus, Trash2, FileText, MessageSquare, Image as ImageIcon, GripVertical, MessageCircle, Layout, Info, Navigation, PanelBottom, Upload, X, Loader2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GalleryManager } from '@/components/admin/GalleryManager';
import type { Json } from '@/integrations/supabase/types';
import { AiWriterButton } from '@/components/admin/AiWriterButton';
import { landingHeroDefaults } from '@/lib/landing-hero-content';

// ── Section text definitions grouped by page ──
const landingSectionDefinitions = [
  {
    key: 'bundle_preview',
    label: 'Bundle Preview',
    fields: [
      { name: 'heading', label: 'Heading (EN)', placeholder: 'Bundle Offers' },
      { name: 'heading_bn', label: 'Heading (BN)', placeholder: 'বান্ডেল অফার' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true, placeholder: 'Save more with our curated course bundles' },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true, placeholder: 'আমাদের কোর্স বান্ডেলে আরো সাশ্রয় করুন' },
    ],
  },
  {
    key: 'testimonials_section',
    label: 'Testimonials Section',
    fields: [
      { name: 'heading', label: 'Heading (EN)', placeholder: 'What Our Students Say' },
      { name: 'heading_bn', label: 'Heading (BN)', placeholder: 'আমাদের শিক্ষার্থীরা কী বলে' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true, placeholder: 'Hear from students who have benefited from our platform' },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true, placeholder: 'আমাদের প্ল্যাটফর্ম থেকে উপকৃত শিক্ষার্থীদের কথা শুনুন' },
    ],
  },
  {
    key: 'photo_gallery',
    label: 'Photo Gallery',
    fields: [
      { name: 'heading', label: 'Heading (EN)', placeholder: 'Our Learning Community' },
      { name: 'heading_bn', label: 'Heading (BN)', placeholder: 'আমাদের শিক্ষা সম্প্রদায়' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true, placeholder: 'See our vibrant learning community in action' },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true, placeholder: 'আমাদের প্রাণবন্ত শিক্ষা সম্প্রদায়কে কাজে দেখুন' },
    ],
  },
  {
    key: 'blog_section',
    label: 'Blog Section',
    fields: [
      { name: 'heading', label: 'Heading (EN)', placeholder: 'Our Learning Blog' },
      { name: 'heading_bn', label: 'Heading (BN)', placeholder: 'আমাদের ব্লগ' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true, placeholder: 'Tips, insights, and study guides to accelerate your learning journey' },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true, placeholder: 'আপনার শেখার যাত্রাকে ত্বরান্বিত করতে টিপস, অন্তর্দৃষ্টি এবং স্টাডি গাইড' },
    ],
  },
  {
    key: 'join_cta',
    label: 'Join CTA',
    fields: [
      { name: 'heading', label: 'Heading (EN)', placeholder: 'Save More with Bundles' },
      { name: 'heading_bn', label: 'Heading (BN)', placeholder: 'বান্ডেলে বেশি সেভ করুন' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true, placeholder: 'Get multiple subjects at a discounted price and supercharge your preparation' },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true, placeholder: 'ডিসকাউন্টে একসাথে একাধিক সাবজেক্ট নিন এবং প্রস্তুতি সুপারচার্জ করুন' },
    ],
  },
];

const landingHeroFieldGroups = [
  {
    title: 'Main Copy',
    fields: [
      { name: 'badge', label: 'Badge (EN)' },
      { name: 'badge_bn', label: 'Badge (BN)' },
      { name: 'title_prefix', label: 'Title Prefix (EN)' },
      { name: 'title_prefix_bn', label: 'Title Prefix (BN)' },
      { name: 'title_highlight', label: 'Highlighted Title (EN)' },
      { name: 'title_highlight_bn', label: 'Highlighted Title (BN)' },
      { name: 'title_suffix', label: 'Title Suffix (EN)', multiline: true },
      { name: 'title_suffix_bn', label: 'Title Suffix (BN)', multiline: true },
      { name: 'description', label: 'Description (EN)', multiline: true },
      { name: 'description_bn', label: 'Description (BN)', multiline: true },
    ],
  },
  {
    title: 'Buttons & Bullet Points',
    fields: [
      { name: 'primary_cta', label: 'Primary Button Text (EN)' },
      { name: 'primary_cta_bn', label: 'Primary Button Text (BN)' },
      { name: 'primary_cta_url', label: 'Primary Button Link', placeholder: '/join' },
      { name: 'secondary_cta', label: 'Secondary Button Text (EN)' },
      { name: 'secondary_cta_bn', label: 'Secondary Button Text (BN)' },
      { name: 'secondary_cta_url', label: 'Secondary Button Link', placeholder: '/free-classes' },
      { name: 'bullet_1', label: 'Bullet 1 (EN)' },
      { name: 'bullet_1_bn', label: 'Bullet 1 (BN)' },
      { name: 'bullet_2', label: 'Bullet 2 (EN)' },
      { name: 'bullet_2_bn', label: 'Bullet 2 (BN)' },
      { name: 'bullet_3', label: 'Bullet 3 (EN)' },
      { name: 'bullet_3_bn', label: 'Bullet 3 (BN)' },
    ],
  },
  {
    title: 'Right Visual Card',
    fields: [
      { name: 'dashboard_eyebrow', label: 'Top Bar Eyebrow (EN)' },
      { name: 'dashboard_eyebrow_bn', label: 'Top Bar Eyebrow (BN)' },
      { name: 'dashboard_text', label: 'Top Bar Text (EN)' },
      { name: 'dashboard_text_bn', label: 'Top Bar Text (BN)' },
      { name: 'journey_eyebrow', label: 'Journey Eyebrow (EN)' },
      { name: 'journey_eyebrow_bn', label: 'Journey Eyebrow (BN)' },
      { name: 'journey_title', label: 'Journey Title (EN)' },
      { name: 'journey_title_bn', label: 'Journey Title (BN)' },
      { name: 'live_label', label: 'Live Badge (EN)' },
      { name: 'live_label_bn', label: 'Live Badge (BN)' },
      { name: 'step_1', label: 'Step 1 (EN)' },
      { name: 'step_1_bn', label: 'Step 1 (BN)' },
      { name: 'step_2', label: 'Step 2 (EN)' },
      { name: 'step_2_bn', label: 'Step 2 (BN)' },
      { name: 'step_3', label: 'Step 3 (EN)' },
      { name: 'step_3_bn', label: 'Step 3 (BN)' },
      { name: 'access_label', label: 'Floating Badge Label (EN)' },
      { name: 'access_label_bn', label: 'Floating Badge Label (BN)' },
      { name: 'access_text', label: 'Floating Badge Text (EN)' },
      { name: 'access_text_bn', label: 'Floating Badge Text (BN)' },
      { name: 'brand_label', label: 'Bottom Badge Label (EN)' },
      { name: 'brand_label_bn', label: 'Bottom Badge Label (BN)' },
      { name: 'brand_text', label: 'Bottom Badge Text (EN)', multiline: true },
      { name: 'brand_text_bn', label: 'Bottom Badge Text (BN)', multiline: true },
    ],
  },
  {
    title: 'Stats Bar',
    fields: [
      { name: 'stat_1_value', label: 'Stat 1 Value (EN)' },
      { name: 'stat_1_label', label: 'Stat 1 Label (EN)' },
      { name: 'stat_1_value_bn', label: 'Stat 1 Value (BN)' },
      { name: 'stat_1_label_bn', label: 'Stat 1 Label (BN)' },
      { name: 'stat_2_value', label: 'Stat 2 Value (EN)' },
      { name: 'stat_2_label', label: 'Stat 2 Label (EN)' },
      { name: 'stat_2_value_bn', label: 'Stat 2 Value (BN)' },
      { name: 'stat_2_label_bn', label: 'Stat 2 Label (BN)' },
      { name: 'stat_3_value', label: 'Stat 3 Value (EN)' },
      { name: 'stat_3_label', label: 'Stat 3 Label (EN)' },
      { name: 'stat_3_value_bn', label: 'Stat 3 Value (BN)' },
      { name: 'stat_3_label_bn', label: 'Stat 3 Label (BN)' },
      { name: 'stat_4_value', label: 'Stat 4 Value (EN)' },
      { name: 'stat_4_label', label: 'Stat 4 Label (EN)' },
      { name: 'stat_4_value_bn', label: 'Stat 4 Value (BN)' },
      { name: 'stat_4_label_bn', label: 'Stat 4 Label (BN)' },
    ],
  },
];

const aboutSectionDefinitions = [
  {
    key: 'about_hero',
    label: 'About Hero Banner',
    fields: [
      { name: 'badge', label: 'Badge Text (EN)' },
      { name: 'badge_bn', label: 'Badge Text (BN)' },
      { name: 'heading', label: 'Heading (EN)' },
      { name: 'heading_bn', label: 'Heading (BN)' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true },
    ],
  },
  {
    key: 'about_mission',
    label: 'Mission Section',
    fields: [
      { name: 'label', label: 'Section Label (EN)' },
      { name: 'label_bn', label: 'Section Label (BN)' },
      { name: 'heading', label: 'Heading (EN)' },
      { name: 'heading_bn', label: 'Heading (BN)' },
      { name: 'description', label: 'Description (EN)', multiline: true },
      { name: 'description_bn', label: 'Description (BN)', multiline: true },
      { name: 'founder_name', label: 'Founder Name (EN)' },
      { name: 'founder_name_bn', label: 'Founder Name (BN)' },
      { name: 'founder_title', label: 'Founder Title (EN)' },
      { name: 'founder_title_bn', label: 'Founder Title (BN)' },
      { name: 'founder_bio', label: 'Founder Bio (EN)', multiline: true },
      { name: 'founder_bio_bn', label: 'Founder Bio (BN)', multiline: true },
    ],
  },
  {
    key: 'about_offerings',
    label: 'What We Offer',
    fields: [
      { name: 'heading', label: 'Heading (EN)' },
      { name: 'heading_bn', label: 'Heading (BN)' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true },
    ],
  },
  {
    key: 'about_why_us',
    label: 'Why Students Choose Us',
    fields: [
      { name: 'heading', label: 'Heading (EN)' },
      { name: 'heading_bn', label: 'Heading (BN)' },
    ],
  },
  {
    key: 'about_cta',
    label: 'About CTA',
    fields: [
      { name: 'heading', label: 'Heading (EN)' },
      { name: 'heading_bn', label: 'Heading (BN)' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true },
    ],
  },
];

const footerSectionDefinitions = [
  {
    key: 'footer_cta',
    label: 'Footer CTA Strip',
    fields: [
      { name: 'heading', label: 'Heading (EN)' },
      { name: 'heading_bn', label: 'Heading (BN)' },
      { name: 'subheading', label: 'Subheading (EN)', multiline: true },
      { name: 'subheading_bn', label: 'Subheading (BN)', multiline: true },
      { name: 'btn_primary', label: 'Primary Button (EN)' },
      { name: 'btn_primary_bn', label: 'Primary Button (BN)' },
      { name: 'btn_secondary', label: 'Secondary Button (EN)' },
      { name: 'btn_secondary_bn', label: 'Secondary Button (BN)' },
    ],
  },
  {
    key: 'footer_brand',
    label: 'Brand & Description',
    fields: [
      { name: 'name', label: 'Brand Name (EN)' },
      { name: 'name_bn', label: 'Brand Name (BN)' },
      { name: 'description', label: 'Description (EN)', multiline: true },
      { name: 'description_bn', label: 'Description (BN)', multiline: true },
    ],
  },
  {
    key: 'footer_contact',
    label: 'Contact Info',
    fields: [
      { name: 'email', label: 'Email Address' },
      { name: 'phone', label: 'Phone Number' },
      { name: 'phone_display', label: 'Phone Display Text' },
      { name: 'whatsapp_url', label: 'WhatsApp URL' },
      { name: 'whatsapp_label', label: 'WhatsApp Label (EN)' },
      { name: 'whatsapp_label_bn', label: 'WhatsApp Label (BN)' },
      { name: 'facebook_url', label: 'Facebook URL' },
      { name: 'youtube_url', label: 'YouTube URL' },
    ],
  },
  {
    key: 'footer_legal',
    label: 'Legal & Copyright',
    fields: [
      { name: 'copyright', label: 'Copyright Text (EN)' },
      { name: 'copyright_bn', label: 'Copyright Text (BN)' },
    ],
  },
];

const navbarSectionDefinitions = [
  {
    key: 'navbar',
    label: 'Navigation Links',
    fields: [
      { name: 'home', label: 'Home (EN)' },
      { name: 'home_bn', label: 'Home (BN)' },
      { name: 'subjects', label: 'Subjects (EN)' },
      { name: 'subjects_bn', label: 'Subjects (BN)' },
      { name: 'bundles', label: 'Bundles (EN)' },
      { name: 'bundles_bn', label: 'Bundles (BN)' },
      { name: 'free_classes', label: 'Free Live Classes (EN)' },
      { name: 'free_classes_bn', label: 'Free Live Classes (BN)' },
      { name: 'about', label: 'About (EN)' },
      { name: 'about_bn', label: 'About (BN)' },
    ],
  },
  {
    key: 'navbar_buttons',
    label: 'Navbar Buttons',
    fields: [
      { name: 'login', label: 'Login (EN)' },
      { name: 'login_bn', label: 'Login (BN)' },
      { name: 'join', label: 'Join Course (EN)' },
      { name: 'join_bn', label: 'Join Course (BN)' },
      { name: 'dashboard', label: 'Dashboard (EN)' },
      { name: 'dashboard_bn', label: 'Dashboard (BN)' },
      { name: 'brand_name', label: 'Brand Name (EN)' },
      { name: 'brand_name_bn', label: 'Brand Name (BN)' },
    ],
  },
];

// ── Integration Toggle Component ──
function IntegrationToggle({ 
  title, description, section, hasTrackingId = false, trackingIdLabel = 'Tracking ID', trackingIdPlaceholder = '' 
}: { 
  title: string; description: string; section: string; hasTrackingId?: boolean; trackingIdLabel?: string; trackingIdPlaceholder?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('cms_content')
        .select('content')
        .eq('section', section)
        .maybeSingle();
      if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
        const content = data.content as Record<string, unknown>;
        setEnabled(content.enabled === true);
        setTrackingId((content.trackingId as string) || '');
      }
      setLoading(false);
    };
    fetchData();
  }, [section]);

  const save = async (newEnabled: boolean, newTrackingId?: string) => {
    setSaving(true);
    const content: Record<string, unknown> = { enabled: newEnabled };
    if (hasTrackingId) content.trackingId = newTrackingId ?? trackingId;
    const { error } = await supabase
      .from('cms_content')
      .upsert({ section, content: content as unknown as Json }, { onConflict: 'section' });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Saved! Refresh the site to apply.');
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    save(checked);
  };

  if (loading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
      </div>
      {hasTrackingId && (
        <div className="px-4 pb-4 pt-0">
          <div className="flex gap-2">
            <Input
              placeholder={trackingIdPlaceholder || trackingIdLabel}
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" onClick={() => save(enabled, trackingId)} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tawk.to Settings Panel with hide-on-dashboard toggle ──
function TawkToSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [hideOnDashboard, setHideOnDashboard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('cms_content')
      .select('content')
      .eq('section', 'tawkto_settings')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
          const c = data.content as Record<string, unknown>;
          setEnabled(c.enabled === true);
          setHideOnDashboard(c.hideOnDashboard === true);
        }
        setLoading(false);
      });
  }, []);

  const save = async (newEnabled: boolean, newHide: boolean) => {
    setSaving(true);
    const content = { enabled: newEnabled, hideOnDashboard: newHide };
    const { error } = await supabase
      .from('cms_content')
      .upsert({ section: 'tawkto_settings', content: content as unknown as Json }, { onConflict: 'section' });
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Saved! Refresh to apply.');
  };

  if (loading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <p className="font-medium text-sm">Tawk.to Live Chat</p>
          <p className="text-xs text-muted-foreground">Show the live chat widget on the website for student support.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); save(v, hideOnDashboard); }} disabled={saving} />
      </div>
      {enabled && (
        <div className="px-4 pb-4 pt-0 border-t">
          <div className="flex items-center justify-between py-3">
            <div className="space-y-1">
              <p className="text-sm">Hide on Student Dashboard</p>
              <p className="text-xs text-muted-foreground">Hide the chat widget on all /dashboard pages.</p>
            </div>
            <Switch checked={hideOnDashboard} onCheckedChange={(v) => { setHideOnDashboard(v); save(enabled, v); }} disabled={saving} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── WhatsApp Widget Settings ──
function WhatsAppSettingsPanel() {
  const [enabled, setEnabled] = useState(true);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('cms_content')
      .select('content')
      .eq('section', 'whatsapp_widget')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && typeof data.content === 'object' && !Array.isArray(data.content)) {
          const c = data.content as Record<string, unknown>;
          setEnabled(c.enabled !== false);
          setNumber((c.number as string) || '');
        }
        setLoading(false);
      });
  }, []);

  const save = async (newEnabled: boolean, newNumber?: string) => {
    setSaving(true);
    const content = { enabled: newEnabled, number: newNumber ?? number };
    const { error } = await supabase
      .from('cms_content')
      .upsert({ section: 'whatsapp_widget', content: content as unknown as Json }, { onConflict: 'section' });
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Saved! Refresh the site to apply.');
  };

  if (loading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <p className="font-medium text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp Widget
          </p>
          <p className="text-xs text-muted-foreground">Show floating WhatsApp chat button on the website.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); save(v); }} disabled={saving} />
      </div>
      <div className="px-4 pb-4 pt-0">
        <div className="flex gap-2">
          <Input
            placeholder="WhatsApp number (e.g. 8801787494113)"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" onClick={() => save(enabled, number)} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Enter number without + sign. Example: 8801787494113</p>
      </div>
    </div>
  );
}

// ── Integrations Panel ──
function IntegrationsPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Third-Party Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <WhatsAppSettingsPanel />
          {/* Tawk.to hidden for now */}
          {/* <TawkToSettingsPanel /> */}
          <IntegrationToggle
            title="Google Analytics"
            description="Track website traffic, user behavior, and conversions."
            section="google_analytics_settings"
            hasTrackingId
            trackingIdLabel="Measurement ID"
            trackingIdPlaceholder="G-XXXXXXXXXX"
          />
          <IntegrationToggle
            title="Meta Pixel (Facebook)"
            description="Track ad conversions, optimize ads, and build targeted audiences via Meta."
            section="facebook_pixel_settings"
            hasTrackingId
            trackingIdLabel="Pixel ID"
            trackingIdPlaceholder="123456789012345"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Testimonial type ──
interface Testimonial {
  id: string;
  name: string;
  name_bn: string | null;
  role: string | null;
  role_bn: string | null;
  content: string;
  content_bn: string | null;
  avatar_url: string | null;
  screenshot_url: string | null;
  display_order: number | null;
  is_visible: boolean | null;
}

// ── Sortable Testimonial Item ──
function SortableTestimonialItem({ t, onEdit, onDelete, onToggle }: {
  t: Testimonial;
  onEdit: (t: Testimonial) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
          {t.avatar_url && (
            <img src={t.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{t.name}</span>
              {t.role && <span className="text-xs text-muted-foreground">• {t.role}</span>}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">"{t.content}"</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch checked={t.is_visible ?? true} onCheckedChange={(v) => onToggle(t.id, v)} />
            <Button size="sm" variant="ghost" onClick={() => onEdit(t)}>Edit</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CMSPageContent() {
  // ── Section text state ──
  const [sectionData, setSectionData] = useState<Record<string, Record<string, string>>>({});
  const [cmsTab, setCmsTab] = usePersistedTab('admin-cms-inner-tab', 'sections');
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);

  // ── Testimonials state ──
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [editingTestimonial, setEditingTestimonial] = useState<Partial<Testimonial> | null>(null);
  const [savingTestimonial, setSavingTestimonial] = useState(false);
  const [uploadingField, setUploadingField] = useState<'avatar' | 'screenshot' | null>(null);

  const uploadTestimonialImage = async (file: File, field: 'avatar_url' | 'screenshot_url') => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB');
      return;
    }
    setUploadingField(field === 'avatar_url' ? 'avatar' : 'screenshot');
    const ext = file.name.split('.').pop();
    const path = `testimonials/${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('gallery-images').upload(path, file, { upsert: true });
    if (upErr) {
      toast.error('Upload failed: ' + upErr.message);
      setUploadingField(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(path);
    setEditingTestimonial((prev) => prev ? { ...prev, [field]: urlData.publicUrl } : prev);
    setUploadingField(null);
    toast.success('Image uploaded');
  };

  const uploadHeroImage = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Maximum file size is 8MB');
      return;
    }

    setUploadingHeroImage(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `landing-hero/hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(path, file, { upsert: true, contentType: file.type || undefined });

    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message);
      setUploadingHeroImage(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(path);
    updateField('landing_hero', 'image_url', urlData.publicUrl);
    setUploadingHeroImage(false);
    toast.success('Hero image uploaded');
  };

  // Load all section content
  useEffect(() => {
    const loadSections = async () => {
      const { data } = await supabase.from('cms_content').select('section, content');
      if (data) {
        const map: Record<string, Record<string, string>> = {
          landing_hero: { ...landingHeroDefaults },
        };
        data.forEach((row) => {
          map[row.section] = {
            ...(map[row.section] || {}),
            ...(row.content as unknown as Record<string, string>),
          };
        });
        setSectionData(map);
      }
    };
    loadSections();
  }, []);

  // Load testimonials
  const fetchTestimonials = async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) setTestimonials(data);
    setLoadingTestimonials(false);
  };

  useEffect(() => { fetchTestimonials(); }, []);

  // ── Section handlers ──
  const updateField = (sectionKey: string, fieldName: string, value: string) => {
    setSectionData((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [fieldName]: value },
    }));
  };

  const saveSection = async (sectionKey: string) => {
    setSavingSection(sectionKey);
    const { error } = await saveCmsContent(sectionKey, sectionData[sectionKey] || {});
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Section saved');
    }
    setSavingSection(null);
  };

  // ── Testimonial handlers ──
  const saveTestimonial = async () => {
    if (!editingTestimonial) return;
    if (!editingTestimonial.name || !editingTestimonial.content) {
      toast.error('Name and content are required');
      return;
    }
    setSavingTestimonial(true);

    if (editingTestimonial.id) {
      // Update
      const { error } = await supabase
        .from('testimonials')
        .update({
          name: editingTestimonial.name,
          name_bn: editingTestimonial.name_bn || null,
          role: editingTestimonial.role || null,
          role_bn: editingTestimonial.role_bn || null,
          content: editingTestimonial.content,
          content_bn: editingTestimonial.content_bn || null,
          avatar_url: editingTestimonial.avatar_url || null,
          screenshot_url: editingTestimonial.screenshot_url || null,
          is_visible: editingTestimonial.is_visible ?? true,
        })
        .eq('id', editingTestimonial.id);
      if (error) toast.error('Update failed'); else toast.success('Testimonial updated');
    } else {
      // Insert
      const { error } = await supabase
        .from('testimonials')
        .insert({
          name: editingTestimonial.name!,
          name_bn: editingTestimonial.name_bn || null,
          role: editingTestimonial.role || null,
          role_bn: editingTestimonial.role_bn || null,
          content: editingTestimonial.content!,
          content_bn: editingTestimonial.content_bn || null,
          avatar_url: editingTestimonial.avatar_url || null,
          screenshot_url: editingTestimonial.screenshot_url || null,
          display_order: testimonials.length,
          is_visible: editingTestimonial.is_visible ?? true,
        });
      if (error) toast.error('Create failed'); else toast.success('Testimonial added');
    }

    setSavingTestimonial(false);
    setEditingTestimonial(null);
    fetchTestimonials();
  };

  const deleteTestimonial = async (id: string) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) toast.error('Delete failed'); else { toast.success('Deleted'); fetchTestimonials(); }
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    await supabase.from('testimonials').update({ is_visible: visible }).eq('id', id);
    fetchTestimonials();
  };

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTestimonialDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = testimonials.findIndex((t) => t.id === active.id);
    const newIndex = testimonials.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(testimonials, oldIndex, newIndex);
    setTestimonials(reordered);

    // Persist new order
    const updates = reordered.map((t, i) =>
      supabase.from('testimonials').update({ display_order: i }).eq('id', t.id)
    );
    await Promise.all(updates);
  };

  const renderLandingHeroEditor = () => {
    const heroContent = { ...landingHeroDefaults, ...(sectionData.landing_hero || {}) };

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Landing Hero Section</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Full control for the homepage hero copy, buttons, bullets, image, visual card, floating badges, and stats bar.
              </p>
            </div>
            <AiWriterButton
              type="cms_text"
              context="Landing page hero section for Shaharia Math"
              placeholder="e.g. Write a premium academy hero headline with CTAs"
              defaultPrompt="Write a premium homepage hero headline, short description, three bullet points, and two CTA labels for Shaharia Math in English."
              label="AI Write"
              onApply={(text) => {
                const lines = text.split('\n').map((line) => line.replace(/^[-#*\d.\s]+/, '').trim()).filter(Boolean);
                if (lines[0]) updateField('landing_hero', 'title_suffix', lines[0]);
                if (lines[1]) updateField('landing_hero', 'description', lines[1]);
                if (lines[2]) updateField('landing_hero', 'bullet_1', lines[2]);
                if (lines[3]) updateField('landing_hero', 'bullet_2', lines[3]);
                if (lines[4]) updateField('landing_hero', 'bullet_3', lines[4]);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/20 p-3">
            <Label className="text-xs text-muted-foreground">Hero Image</Label>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center">
              {heroContent.image_url ? (
                <div className="relative w-full overflow-hidden rounded-lg border bg-background lg:w-56">
                  <img src={heroContent.image_url} alt="Hero preview" className="aspect-[16/10] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => updateField('landing_hero', 'image_url', '')}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    aria-label="Remove hero image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-lg border-2 border-dashed bg-background text-muted-foreground lg:w-56">
                  {uploadingHeroImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={heroContent.image_url}
                    onChange={(e) => updateField('landing_hero', 'image_url', e.target.value)}
                    placeholder="Paste image URL or upload a file"
                    className="h-9 text-sm"
                  />
                  <label className="shrink-0 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingHeroImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadHeroImage(file);
                        e.target.value = '';
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingHeroImage} asChild>
                      <span className="gap-2">
                        {uploadingHeroImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {heroContent.image_url ? 'Replace Image' : 'Upload Image'}
                      </span>
                    </Button>
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">Recommended: landscape JPG, PNG, or WebP under 8MB.</p>
              </div>
            </div>
          </div>

          {landingHeroFieldGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {group.fields.map((field) => (
                  <div key={field.name}>
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    {field.multiline ? (
                      <Textarea
                        value={heroContent[field.name as keyof typeof heroContent] || ''}
                        onChange={(e) => updateField('landing_hero', field.name, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="mt-1 text-sm"
                        rows={2}
                      />
                    ) : (
                      <Input
                        value={heroContent[field.name as keyof typeof heroContent] || ''}
                        onChange={(e) => updateField('landing_hero', field.name, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="mt-1 h-9 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button
            size="sm"
            onClick={() => saveSection('landing_hero')}
            disabled={savingSection === 'landing_hero' || uploadingHeroImage}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSection === 'landing_hero' ? 'Saving...' : 'Save Hero Section'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  // ── Render section cards helper ──
  const renderSectionCards = (sections: { key: string; label: string; fields: { name: string; label: string; multiline?: boolean; placeholder?: string }[] }[]) => (
    <>
      {sections.map((section) => (
        <Card key={section.key}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{section.label}</CardTitle>
              <AiWriterButton
                type="cms_text"
                context={`Section: ${section.label}`}
                placeholder={`e.g. Write an engaging heading for the ${section.label} section`}
                defaultPrompt={`Write a compelling heading and subheading for the "${section.label}" section of an educational platform website. Provide in English.`}
                label="AI Write"
                onApply={(text) => {
                  const lines = text.split('\n').filter(l => l.trim());
                  if (lines[0]) updateField(section.key, 'heading', lines[0].replace(/^#+\s*/, '').replace(/["*]/g, ''));
                  if (lines[1]) updateField(section.key, 'subheading', lines.slice(1).join(' ').replace(/["*]/g, ''));
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.fields.map((field) => (
                <div key={field.name}>
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  {field.multiline ? (
                    <Textarea
                      value={sectionData[section.key]?.[field.name] || ''}
                      onChange={(e) => updateField(section.key, field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="text-sm mt-1"
                      rows={2}
                    />
                  ) : (
                    <Input
                      value={sectionData[section.key]?.[field.name] || ''}
                      onChange={(e) => updateField(section.key, field.name, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className="text-sm h-9 mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => saveSection(section.key)}
              disabled={savingSection === section.key}
              className="gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              {savingSection === section.key ? 'Saving...' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </>
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CMS</h1>
          <p className="text-muted-foreground">Edit content across all pages — Landing, About, Navbar, Footer</p>
        </div>

        <Tabs value={cmsTab} onValueChange={setCmsTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="sections" className="gap-2"><Layout className="h-4 w-4" /> Landing Page</TabsTrigger>
            <TabsTrigger value="about" className="gap-2"><Info className="h-4 w-4" /> About Page</TabsTrigger>
            <TabsTrigger value="navbar" className="gap-2"><Navigation className="h-4 w-4" /> Navbar</TabsTrigger>
            <TabsTrigger value="footer" className="gap-2"><PanelBottom className="h-4 w-4" /> Footer</TabsTrigger>
            <TabsTrigger value="testimonials" className="gap-2"><MessageSquare className="h-4 w-4" /> Testimonials</TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2"><ImageIcon className="h-4 w-4" /> Photo Gallery</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2"><MessageCircle className="h-4 w-4" /> Integrations</TabsTrigger>
          </TabsList>

          {/* ── Section Text Tab ── */}
          <TabsContent value="sections" className="space-y-4">
            {renderLandingHeroEditor()}
            {renderSectionCards(landingSectionDefinitions)}
          </TabsContent>

          {/* ── About Page Tab ── */}
          <TabsContent value="about" className="space-y-4">
            {renderSectionCards(aboutSectionDefinitions)}
          </TabsContent>

          {/* ── Footer Tab ── */}
          <TabsContent value="footer" className="space-y-4">
            {renderSectionCards(footerSectionDefinitions)}
          </TabsContent>

          {/* ── Navbar Tab ── */}
          <TabsContent value="navbar" className="space-y-4">
            {renderSectionCards(navbarSectionDefinitions)}
          </TabsContent>

          {/* ── Testimonials Tab ── */}
          <TabsContent value="testimonials" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{testimonials.length} testimonials</p>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setEditingTestimonial({ name: '', content: '', is_visible: true })}
              >
                <Plus className="h-4 w-4" /> Add Testimonial
              </Button>
            </div>

            {/* Edit/Add form */}
            {editingTestimonial && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name (EN) *</Label>
                      <Input
                        value={editingTestimonial.name || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Name (BN)</Label>
                      <Input
                        value={editingTestimonial.name_bn || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name_bn: e.target.value })}
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Role (EN)</Label>
                      <Input
                        value={editingTestimonial.role || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                        placeholder="e.g. Management, 3rd Year"
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Role (BN)</Label>
                      <Input
                        value={editingTestimonial.role_bn || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role_bn: e.target.value })}
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                  </div>

                  {/* Image uploads: avatar (person photo) + screenshot (chat/feedback proof) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Avatar */}
                    <div>
                      <Label className="text-xs">Avatar Photo</Label>
                      <div className="flex items-center gap-3 mt-1">
                        {editingTestimonial.avatar_url ? (
                          <div className="relative">
                            <img src={editingTestimonial.avatar_url} alt="avatar" className="w-14 h-14 rounded-full object-cover border" />
                            <button
                              type="button"
                              onClick={() => setEditingTestimonial({ ...editingTestimonial, avatar_url: null })}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                              aria-label="Remove avatar"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center text-muted-foreground">
                            {uploadingField === 'avatar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadTestimonialImage(f, 'avatar_url');
                              e.target.value = '';
                            }}
                          />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingField === 'avatar'} asChild>
                            <span>{editingTestimonial.avatar_url ? 'Replace' : 'Upload'}</span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {/* Screenshot */}
                    <div>
                      <Label className="text-xs">Screenshot (chat / feedback proof)</Label>
                      <div className="flex items-center gap-3 mt-1">
                        {editingTestimonial.screenshot_url ? (
                          <div className="relative">
                            <img src={editingTestimonial.screenshot_url} alt="screenshot" className="w-20 h-14 rounded-md object-cover border" />
                            <button
                              type="button"
                              onClick={() => setEditingTestimonial({ ...editingTestimonial, screenshot_url: null })}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                              aria-label="Remove screenshot"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-14 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground">
                            {uploadingField === 'screenshot' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadTestimonialImage(f, 'screenshot_url');
                              e.target.value = '';
                            }}
                          />
                          <Button type="button" variant="outline" size="sm" disabled={uploadingField === 'screenshot'} asChild>
                            <span>{editingTestimonial.screenshot_url ? 'Replace' : 'Upload'}</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quote (EN) *</Label>
                      <Textarea
                        value={editingTestimonial.content || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, content: e.target.value })}
                        rows={3}
                        className="text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quote (BN)</Label>
                      <Textarea
                        value={editingTestimonial.content_bn || ''}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, content_bn: e.target.value })}
                        rows={3}
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTestimonial} disabled={savingTestimonial} className="gap-2">
                      <Save className="h-3.5 w-3.5" />
                      {savingTestimonial ? 'Saving...' : editingTestimonial.id ? 'Update' : 'Add'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTestimonial(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testimonial list */}
            {loadingTestimonials ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : testimonials.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No testimonials yet. Add your first one above.
                </CardContent>
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTestimonialDragEnd}>
                <SortableContext items={testimonials.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {testimonials.map((t) => (
                      <SortableTestimonialItem
                        key={t.id}
                        t={t}
                        onEdit={setEditingTestimonial}
                        onDelete={deleteTestimonial}
                        onToggle={toggleVisibility}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>
          {/* ── Photo Gallery Tab ── */}
          <TabsContent value="gallery">
            <GalleryManager />
          </TabsContent>

          {/* ── Integrations Tab ── */}
          <TabsContent value="integrations">
            <IntegrationsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function CMSPage() {
  return <AdminLayout requiredPermission="can_manage_cms"><CMSPageContent /></AdminLayout>;
}
