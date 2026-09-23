-- =========================================
-- Bingo2Gether - CLEAN RESET
-- Este script APAGA tudo e recria do zero
-- Cole TUDO no SQL Editor e clique RUN
-- =========================================

-- STEP 1: Drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- STEP 2: Drop ALL existing policies (ignore errors if they don't exist)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- STEP 3: Drop all tables in correct order (respecting FKs)
DROP TABLE IF EXISTS public.ai_usage CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invites CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.couples CASCADE;

-- =========================================
-- STEP 4: Create tables from scratch
-- =========================================

CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES auth.users(id),
  plan_type TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'owner',
  source TEXT DEFAULT 'email',
  couple_id UUID REFERENCES public.couples(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_setup BOOLEAN NOT NULL DEFAULT false,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  plan_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- STEP 5: Enable RLS on all tables
-- =========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- =========================================
-- STEP 6: User policies
-- =========================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Couples
CREATE POLICY "Couple members can view" ON public.couples FOR SELECT USING (auth.uid() = owner_user_id OR auth.uid() = partner_user_id);
CREATE POLICY "Owner can insert couple" ON public.couples FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner can update couple" ON public.couples FOR UPDATE USING (auth.uid() = owner_user_id);

-- Games
CREATE POLICY "Couple members can view games" ON public.games FOR SELECT USING (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid() OR partner_user_id = auth.uid())
);
CREATE POLICY "Couple members can insert games" ON public.games FOR INSERT WITH CHECK (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid() OR partner_user_id = auth.uid())
);
CREATE POLICY "Couple members can update games" ON public.games FOR UPDATE USING (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid() OR partner_user_id = auth.uid())
);

-- Invites
CREATE POLICY "Couple owners can view invites" ON public.invites FOR SELECT USING (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid())
);
CREATE POLICY "Couple owners can insert invites" ON public.invites FOR INSERT WITH CHECK (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid())
);

-- Payments
CREATE POLICY "Couple members can view payments" ON public.payments FOR SELECT USING (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid() OR partner_user_id = auth.uid())
);
CREATE POLICY "Couple members can insert payments" ON public.payments FOR INSERT WITH CHECK (
  couple_id IN (SELECT id FROM public.couples WHERE owner_user_id = auth.uid() OR partner_user_id = auth.uid())
);

-- AI Usage
CREATE POLICY "Users can view own ai_usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_usage" ON public.ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_usage" ON public.ai_usage FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- STEP 7: Admin policies
-- =========================================

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (auth.jwt() ->> 'email' IN ('bingotwogether@gmail.com', 'rafaelleaobh@gmail.com'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (auth.jwt() ->> 'email' IN ('bingotwogether@gmail.com', 'rafaelleaobh@gmail.com'));

CREATE POLICY "Admins can view all couples" ON public.couples
  FOR SELECT USING (auth.jwt() ->> 'email' IN ('bingotwogether@gmail.com', 'rafaelleaobh@gmail.com'));

CREATE POLICY "Admins can update all couples" ON public.couples
  FOR UPDATE USING (auth.jwt() ->> 'email' IN ('bingotwogether@gmail.com', 'rafaelleaobh@gmail.com'));

CREATE POLICY "Admins can insert couples" ON public.couples
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IN ('bingotwogether@gmail.com', 'rafaelleaobh@gmail.com'));

-- =========================================
-- STEP 8: Auto-create profile on signup
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, source)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'provider', 'email')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
