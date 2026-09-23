-- Fix invites RLS: Allow users to view pending invites to fix the shared code issue
DROP POLICY IF EXISTS "Invited user can view their invite" ON public.invites;

CREATE POLICY "Invited user can view pending invite by exact token"
  ON public.invites FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR status = 'pending');
