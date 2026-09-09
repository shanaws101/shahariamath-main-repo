import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export function useCmsContent<T = Record<string, string>>(section: string, defaultContent: T): T {
  const [content, setContent] = useState<T>(defaultContent);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('cms_content')
        .select('content')
        .eq('section', section)
        .maybeSingle();
      if (data?.content) {
        setContent({ ...defaultContent, ...(data.content as unknown as T) });
      }
    };
    fetch();
  }, [section]);

  return content;
}

export async function saveCmsContent(section: string, content: Record<string, string>) {
  // Try update first, then insert if it doesn't exist.
  const { data: existing } = await supabase
    .from('cms_content')
    .select('id')
    .eq('section', section)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cms_content')
      .update({ content: content as unknown as Json, updated_at: new Date().toISOString() })
      .eq('section', section);
    return { error };
  } else {
    const { error } = await supabase
      .from('cms_content')
      .insert({ section, content: content as unknown as Json });
    return { error };
  }
}
