import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Upload, Image as ImageIcon, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GalleryImage {
  id: string;
  image_url: string;
  alt_text: string;
  alt_text_bn: string | null;
  display_order: number;
  is_visible: boolean;
}
// this is a test
function SortableGalleryItem({ img, editingId, editAlt, editAltBn, setEditAlt, setEditAltBn, onStartEdit, onSaveEdit, onCancelEdit, onToggle, onDelete }: {
  img: GalleryImage;
  editingId: string | null;
  editAlt: string;
  editAltBn: string;
  setEditAlt: (v: string) => void;
  setEditAltBn: (v: string) => void;
  onStartEdit: (img: GalleryImage) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggle: (id: string, v: boolean) => void;
  onDelete: (img: GalleryImage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: img.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <div className="aspect-[4/3] relative">
        <img src={img.image_url} alt={img.alt_text} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2">
          <button {...attributes} {...listeners} className="bg-background/80 rounded p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute top-2 right-2">
          <Switch checked={img.is_visible} onCheckedChange={(v) => onToggle(img.id, v)} />
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        {editingId === img.id ? (
          <>
            <div>
              <Label className="text-xs">Alt Text (EN)</Label>
              <Input value={editAlt} onChange={(e) => setEditAlt(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Alt Text (BN)</Label>
              <Input value={editAltBn} onChange={(e) => setEditAltBn(e.target.value)} className="h-8 text-xs mt-1" />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="default" onClick={onSaveEdit} className="text-xs h-7">Save</Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit} className="text-xs h-7">Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground truncate">{img.alt_text}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onStartEdit(img)} className="text-xs h-7">Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs h-7" onClick={() => onDelete(img)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editAltBn, setEditAltBn] = useState('');
  const [scrollSpeed, setScrollSpeed] = useState('30');
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) setImages(data);
    setLoading(false);
  };

  const fetchScrollSpeed = async () => {
    const { data } = await supabase
      .from('cms_content')
      .select('content')
      .eq('section', 'photo_gallery')
      .maybeSingle();
    if (data?.content && typeof data.content === 'object' && 'scroll_speed' in (data.content as any)) {
      setScrollSpeed((data.content as any).scroll_speed || '30');
    }
  };

  const saveScrollSpeed = async () => {
    const { data: existing } = await supabase
      .from('cms_content')
      .select('id, content')
      .eq('section', 'photo_gallery')
      .maybeSingle();

    const newContent = { ...(existing?.content as any || {}), scroll_speed: scrollSpeed };

    if (existing) {
      await supabase.from('cms_content').update({ content: newContent }).eq('id', existing.id);
    } else {
      await supabase.from('cms_content').insert({ section: 'photo_gallery', content: newContent });
    }
    toast.success('Scroll speed saved');
  };

  useEffect(() => { fetchImages(); fetchScrollSpeed(); }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);
    setImages(reordered);

    const updates = reordered.map((img, i) =>
      supabase.from('gallery_images').update({ display_order: i }).eq('id', img.id)
    );
    await Promise.all(updates);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 8MB.');
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `gallery-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('gallery-images')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message);
      setUploading(false);
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase
      .from('gallery_images')
      .insert({
        image_url: urlData.publicUrl,
        alt_text: file.name.replace(/\.[^.]+$/, ''),
        display_order: images.length,
      });

    if (insertError) {
      toast.error('Failed to save: ' + insertError.message);
    } else {
      toast.success('Image uploaded');
      fetchImages();
    }

    setUploading(false);
    e.target.value = '';
  };

  const deleteImage = async (img: GalleryImage) => {
    const parts = img.image_url.split('/');
    const fileName = parts[parts.length - 1];
    await supabase.storage.from('gallery-images').remove([fileName]);
    const { error } = await supabase.from('gallery_images').delete().eq('id', img.id);
    if (error) toast.error('Delete failed');
    else { toast.success('Deleted'); fetchImages(); }
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    await supabase.from('gallery_images').update({ is_visible: visible }).eq('id', id);
    fetchImages();
  };

  const startEdit = (img: GalleryImage) => {
    setEditingId(img.id);
    setEditAlt(img.alt_text);
    setEditAltBn(img.alt_text_bn || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('gallery_images')
      .update({ alt_text: editAlt, alt_text_bn: editAltBn || null })
      .eq('id', editingId);
    if (error) toast.error('Update failed');
    else { toast.success('Updated'); setEditingId(null); fetchImages(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{images.length} images • Drag to reorder</p>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <Button size="sm" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>
      {/* Scroll Speed Control */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">Auto-Scroll Speed (seconds per loop)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Lower = faster. Default: 30</p>
            </div>
            <Input
              type="number"
              min="5"
              max="120"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(e.target.value)}
              className="w-24 h-9"
            />
            <Button size="sm" onClick={saveScrollSpeed}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Max 8MB per image. Supported: JPG, PNG, WebP.</p>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No gallery images yet. Upload your first one above.
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img) => (
                <SortableGalleryItem
                  key={img.id}
                  img={img}
                  editingId={editingId}
                  editAlt={editAlt}
                  editAltBn={editAltBn}
                  setEditAlt={setEditAlt}
                  setEditAltBn={setEditAltBn}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onToggle={toggleVisibility}
                  onDelete={deleteImage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
