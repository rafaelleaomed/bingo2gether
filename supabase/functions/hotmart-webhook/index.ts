import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Webhook Receptor para Hotmart (Postback / Webhook 2.0)
 * Eventos principais suportados:
 * - PURCHASE_APPROVED / APPROVED (Compra aprovada - ativa plano PRO)
 * - SUBSCRIPTION_CANCELED / CANCELED (Cancelamento)
 * - REFUND / CHARGEBACK (Estorno - revoga plano)
 */

serve(async (req) => {
  try {
    // O token da Hotmart e a URL do Supabase vêm SÓ de variáveis de ambiente (nunca no código).
    const hotmartHottok = Deno.env.get('HOTMART_HOTTOK');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!hotmartHottok) {
      // falha fechada: sem token configurado, não aceita nenhum webhook
      throw new Error('HOTMART_HOTTOK não configurado');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    // Validação de segurança via Hottok (se configurado nas variáveis de ambiente)
    const tokenHeader = req.headers.get('x-hotmart-hottok') || body.hottok;
    if (hotmartHottok && tokenHeader !== hotmartHottok) {
      return new Response(JSON.stringify({ error: 'Unauthorized Hotmart token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = body.event || body.status;
    const buyerEmail = body.data?.buyer?.email || body.email;
    const buyerName = body.data?.buyer?.name || body.name || 'Usuário Hotmart';
    const transactionId = body.data?.purchase?.transaction || body.transaction;
    const offerCode = body.data?.purchase?.offer?.code || body.offer_code;
    const recurrenceNumber = body.data?.purchase?.recurrence_number || 1;

    console.log(`[Hotmart Webhook] Evento: ${event} | Comprador: ${buyerEmail} | Transação: ${transactionId}`);

    if (!buyerEmail) {
      return new Response(JSON.stringify({ error: 'No buyer email found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Identificação do Tipo de Plano (baseado no código da oferta ou produto)
    // Configure os códigos da sua oferta na Hotmart aqui ou por variável de ambiente
    let planType: 'mensal' | 'anual' | 'vitalicio' = 'anual';
    if (offerCode) {
      if (offerCode.toLowerCase().includes('mes') || offerCode.toLowerCase().includes('monthly')) {
        planType = 'mensal';
      } else if (offerCode.toLowerCase().includes('vit') || offerCode.toLowerCase().includes('life')) {
        planType = 'vitalicio';
      }
    }

    // 1. Localiza ou cria o usuário pelo e-mail
    let userId: string | null = null;
    let coupleId: string | null = null;

    // Busca usuário existente pelo e-mail
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === buyerEmail.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Se o usuário ainda não existir no Supabase, criamos o convite/usuário pré-aprovado
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        email_confirm: true,
        user_metadata: { full_name: buyerName, origin: 'hotmart' },
      });

      if (createError) {
        console.error('[Hotmart] Erro ao criar usuário pré-aprovado:', createError);
      } else if (newUser.user) {
        userId = newUser.user.id;
      }
    }

    // 2. Busca perfil e casal
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', userId)
        .maybeSingle();

      coupleId = profile?.couple_id || null;

      // Se ainda não tem casal cadastrado, cria uma entrada de casal para provisionar o PRO
      if (!coupleId) {
        const { data: newCouple, error: coupleError } = await supabase
          .from('couples')
          .insert({
            user1_id: userId,
            plan_type: planType,
          })
          .select('id')
          .single();

        if (newCouple) {
          coupleId = newCouple.id;
          await supabase.from('profiles').update({ couple_id: coupleId }).eq('id', userId);
        }
      }
    }

    // 3. Aplicação do Evento no Banco
    if (coupleId) {
      if (event === 'PURCHASE_APPROVED' || event === 'APPROVED' || event === 'COMPLETE') {
        const expiresAt = planType === 'vitalicio'
          ? null
          : planType === 'mensal'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        await supabase.from('couples').update({
          plan_type: planType,
          plan_expires_at: expiresAt,
        }).eq('id', coupleId);

        await supabase.from('payments').insert({
          couple_id: coupleId,
          provider: 'hotmart',
          provider_id: transactionId,
          plan_type: planType,
          amount: body.data?.purchase?.price?.value || 0,
          status: 'completed',
        });

        console.log(`[Hotmart Webhook] Plano ${planType} ativado com sucesso para o casal ${coupleId}!`);
      } else if (event === 'REFUND' || event === 'CHARGEBACK' || event === 'CANCELED') {
        // Em caso de reembolso ou estorno, reverte para o plano gratuito
        await supabase.from('couples').update({
          plan_type: 'free',
          plan_expires_at: new Date().toISOString(),
        }).eq('id', coupleId);

        console.log(`[Hotmart Webhook] Plano revogado por estorno/cancelamento para o casal ${coupleId}.`);
      }
    }

    return new Response(JSON.stringify({ received: true, status: 'processed' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Hotmart Webhook] Erro crítico:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
