
-- Live sessions table
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  title_bn text,
  description text,
  description_bn text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  mux_live_stream_id text,
  mux_playback_id text,
  mux_space_id text,
  thumbnail_url text,
  viewer_count integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-draft sessions
CREATE POLICY "Anyone can view live sessions"
  ON public.live_sessions FOR SELECT
  USING (true);

-- Staff can manage sessions
CREATE POLICY "Staff can manage live sessions"
  ON public.live_sessions FOR ALL
  TO authenticated
  USING (can_manage('can_manage_subjects'))
  WITH CHECK (can_manage('can_manage_subjects'));

-- Trigger for updated_at
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Live chat messages table
CREATE TABLE public.live_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'Anonymous',
  message text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view chat
CREATE POLICY "Authenticated users can view chat"
  ON public.live_chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
  ON public.live_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff can manage chat (pin/delete)
CREATE POLICY "Staff can manage chat"
  ON public.live_chat_messages FOR ALL
  TO authenticated
  USING (can_manage('can_manage_subjects'))
  WITH CHECK (can_manage('can_manage_subjects'));

-- Connected Facebook pages
CREATE TABLE public.connected_facebook_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text NOT NULL,
  connected_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_facebook_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage facebook pages"
  ON public.connected_facebook_pages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_facebook_pages_updated_at
  BEFORE UPDATE ON public.connected_facebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
