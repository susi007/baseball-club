CREATE TABLE IF NOT EXISTS public.announcement (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    content text NOT NULL DEFAULT ''
);

INSERT INTO public.announcement (id, content)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.announcement FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.announcement TO authenticated;
GRANT UPDATE (content) ON TABLE public.announcement TO authenticated;

DROP POLICY IF EXISTS announcement_select_authenticated ON public.announcement;
CREATE POLICY announcement_select_authenticated ON public.announcement
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS announcement_update_admin ON public.announcement;
CREATE POLICY announcement_update_admin ON public.announcement
    FOR UPDATE TO authenticated
    USING (public.is_club_admin())
    WITH CHECK (public.is_club_admin());
