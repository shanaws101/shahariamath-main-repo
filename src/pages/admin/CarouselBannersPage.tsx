import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Upload, ExternalLink } from 'lucide-react';

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
  title_bn: string | null;
  display_order: number;
  is_visible: boolean;
}

export default function CarouselBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('carousel_banners')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) {
      toast.error('Failed to load banners');
    } else {
      setBanners(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const convertToWebP = (file: File, quality = 0.82): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('WebP conversion failed')),
          'image/webp',
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (banners.length >= 6) {
      toast.error('Maximum 6 banners allowed');
      return;
    }
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 8MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const fileName = `${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-banners')
        .upload(fileName, webpBlob, { contentType: 'image/webp' });

      if (uploadError) {
        toast.error('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('carousel-banners')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('carousel_banners')
        .insert({
          image_url: urlData.publicUrl,
          display_order: banners.length,
          is_visible: true,
        });

      if (insertError) {
        toast.error('Failed to save banner');
      } else {
        toast.success(`Banner added (converted to WebP, ${(webpBlob.size / 1024).toFixed(0)}KB)`);
        fetchBanners();
      }
    } catch (err) {
      toast.error('Image conversion failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  const updateBanner = async (id: string, updates: Partial<Banner>) => {
    const { error } = await supabase
      .from('carousel_banners')
      .update(updates)
      .eq('id', id);
    if (error) {
      toast.error('Update failed');
    } else {
      setBanners(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }
  };

  const deleteBanner = async (id: string, imageUrl: string) => {
    // Extract filename from URL
    const fileName = imageUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('carousel-banners').remove([fileName]);
    }
    const { error } = await supabase.from('carousel_banners').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed');
    } else {
      toast.success('Banner deleted');
      fetchBanners();
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= banners.length) return;

    const a = banners[index];
    const b = banners[swapIndex];

    await Promise.all([
      supabase.from('carousel_banners').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('carousel_banners').update({ display_order: a.display_order }).eq('id', b.id),
    ]);
    fetchBanners();
  };

  return (
    <AdminLayout requiredPermission="can_manage_carousel">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Carousel Banners</h1>
            <p className="text-sm text-muted-foreground">Manage homepage carousel banners (max 6)</p>
            <p className="text-xs text-destructive font-medium mt-1">📐 Recommended size: 1920×640px (3:1 ratio) • JPG/PNG • Max 8MB</p>
          </div>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading || banners.length >= 6}
            />
            <Button disabled={uploading || banners.length >= 6} className="gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Add Banner'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : banners.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground mb-4">No banners yet. Upload your first banner image.</p>
              <div className="relative inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Upload Banner
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <Card key={banner.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4 items-start">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => moveOrder(index, 'up')}
                        disabled={index === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                      >▲</button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <button
                        onClick={() => moveOrder(index, 'down')}
                        disabled={index === banners.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                      >▼</button>
                    </div>

                    {/* Preview */}
                    <div className="w-40 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Fields */}
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Title (EN)</Label>
                          <Input
                            value={banner.title || ''}
                            onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                            placeholder="Banner title"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Title (BN)</Label>
                          <Input
                            value={banner.title_bn || ''}
                            onChange={(e) => updateBanner(banner.id, { title_bn: e.target.value })}
                            placeholder="ব্যানার শিরোনাম"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="text-xs">Link URL</Label>
                          <div className="flex gap-2">
                            <Input
                              value={banner.link_url || ''}
                              onChange={(e) => updateBanner(banner.id, { link_url: e.target.value })}
                              placeholder="https://... or /subjects"
                              className="h-8 text-sm"
                            />
                            {banner.link_url && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                                <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={banner.is_visible}
                          onCheckedChange={(v) => updateBanner(banner.id, { is_visible: v })}
                        />
                        <span className="text-xs text-muted-foreground">Visible</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteBanner(banner.id, banner.image_url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
          <p className="text-sm font-medium">{banners.length}/6 banners used</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>📐 <strong>Recommended size:</strong> 1920×640px (3:1 aspect ratio)</li>
            <li>📁 <strong>Format:</strong> JPG or PNG, max 8MB per image</li>
            <li>📱 <strong>Mobile:</strong> Images will be cropped to ~21:9 on smaller screens</li>
            <li>💡 <strong>Tip:</strong> Keep important content centered for best results across devices</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
