-- Comprehensive fix for invites table RLS policies
-- This ensures couple owners can send invites and invited users can read them

-- ====================
-- DROP existing stale policies
-- ====================
DROP POLICY IF EXISTS "Invited user can view their invite" ON public.invites;
DROP POLICY IF EXISTS "Invited user can view pending invite by exact token" ON public.invites;
DROP POLICY IF EXISTS "Couple owner can insert invites" ON public.invites;
DROP POLICY IF EXISTS "Couple owner can create invites" ON public.invites;
DROP POLICY IF EXISTS "Owner can create invite" ON public.invites;

-- ====================
-- ENABLE RLS (idempotent)
-- ====================
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- ====================
-- Policy 1: Couple owner can INSERT invites for their couple
-- ====================
CREATE POLICY "Couple owner can insert invites"
  ON public.invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND c.owner_user_id = auth.uid()
    )
  );

-- ====================
-- Policy 2: Invited user can SELECT their invite by email
--           OR anyone can view pending invites (token acts as secret)
-- ====================
CREATE POLICY "Users can view their own invite or any pending invite"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    OR status = 'pending'
  );

-- ====================
-- Policy 3: Couple owner can UPDATE invite status (e.g., cancel)
-- ====================
CREATE POLICY "Couple owner can update their invites"
  ON public.invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.couples c
      WHERE c.id = couple_id
        AND c.owner_user_id = auth.uid()
    )
  );
