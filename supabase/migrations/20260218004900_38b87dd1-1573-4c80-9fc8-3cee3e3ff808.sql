
-- Fix invites: remove 'invite-code' backdoor from policy
DROP POLICY IF EXISTS "Invited user can view their invite" ON public.invites;
CREATE POLICY "Invited user can view their invite"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING (email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text);

-- Fix payments: explicitly deny UPDATE and DELETE for non-service roles
CREATE POLICY "Only service role can update payments"
  ON public.payments
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Only service role can delete payments"
  ON public.payments
  FOR DELETE
  TO service_role
  USING (true);
