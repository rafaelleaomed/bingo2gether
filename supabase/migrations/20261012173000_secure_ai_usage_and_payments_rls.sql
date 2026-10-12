-- Migration: Secure AI usage and tighten RLS
-- Previne que usuários autenticados alterem ou resetem manualmente a contagem de uso da IA via cliente.
-- Inserções e atualizações em ai_usage passam a ser exclusivas da Edge Function (service_role).

DROP POLICY IF EXISTS "Users can update their own usage" ON public.ai_usage;
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.ai_usage;

-- Garante que usuários autenticados possam apenas consultar seu próprio consumo
DROP POLICY IF EXISTS "Users can only read their own usage" ON public.ai_usage;
CREATE POLICY "Users can only read their own usage"
  ON public.ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
