import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeKey || !webhookSecret) throw new Error('Missing Stripe config');

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    if (!sig) throw new Error('No signature');

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as any;
      const userId = session.client_reference_id || session.metadata?.userId;
      const planType = session.metadata?.planType || 'annual';
      let coupleId = session.metadata?.coupleId;

      if (!coupleId && userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('couple_id')
          .eq('id', userId)
          .single();
        coupleId = profile?.couple_id;
      }

      if (coupleId) {
        const planMap: Record<string, string> = {
          monthly: 'mensal',
          annual: 'anual',
          lifetime: 'vitalicio',
        };

        const expiresAt = planType === 'lifetime'
          ? null
          : planType === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        await supabase.from('couples').update({
          plan_type: planMap[planType] || 'anual',
          plan_expires_at: expiresAt,
        }).eq('id', coupleId);

        await supabase.from('payments').insert({
          couple_id: coupleId,
          provider: 'stripe',
          provider_id: session.id,
          plan_type: planMap[planType] || 'anual',
          amount: (session.amount_total || 0) / 100,
          status: 'completed',
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("stripe-webhook error:", error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
