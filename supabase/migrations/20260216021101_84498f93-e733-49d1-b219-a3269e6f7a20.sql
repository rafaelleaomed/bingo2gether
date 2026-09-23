
-- 1. Fix invites: replace overly permissive SELECT policy with email-based access
DROP POLICY IF EXISTS "Invited user can view invite" ON public.invites;

CREATE POLICY "Invited user can view their invite"
  ON public.invites FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR email = 'invite-code'
  );

-- 2. Fix payments: allow service_role to insert payments (for webhooks)
CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Fix handle_new_user: add input length validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, source)
  VALUES (
    NEW.id,
    NEW.email,
    LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 100),
    CASE WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google' ELSE 'email' END
  );
  RETURN NEW;
END;
$$;
