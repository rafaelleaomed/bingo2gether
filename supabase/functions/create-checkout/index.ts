import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PRICES: Record<string, { priceId: string; mode: 'subscription' | 'payment' }> = {
  monthly: { priceId: 'price_1T1Gs3AAX8P01k2CLWdnBVb2', mode: 'subscription' },
  annual: { priceId: 'price_1T1GscAAX8P01k2CWLUNmjnS', mode: 'subscription' },
  lifetime: { priceId: 'price_1T1GtIAAX8P01k2CkIrfVC1I', mode: 'payment' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error('User not authenticated');

    const { planType = 'annual', paymentMethod } = await req.json();
    const plan = PRICES[planType] || PRICES.annual;

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Check existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get('origin') || 'https://id-preview--f1c85475-cef5-43dd-827f-c10ca31a66a4.lovable.app';

    // Boleto payments: must use mode: 'payment' (no subscriptions)
    const isBoleto = paymentMethod === 'boleto';

    if (isBoleto && planType === 'monthly') {
      throw new Error('Boleto não suporta planos recorrentes. Escolha Anual ou Vitalício.');
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/`,
    };

    const BOLETO_PRICES: Record<string, number> = {
      annual: 19990,
      lifetime: 39990,
    };

    if (isBoleto) {
      sessionParams.mode = 'payment';
      sessionParams.payment_method_types = ['boleto'];
      sessionParams.line_items = [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Bingo2Gether PRO (${planType === 'annual' ? 'Anual' : 'Vitalício'})`,
          },
          unit_amount: BOLETO_PRICES[planType],
        },
        quantity: 1,
      }];
      sessionParams.payment_method_options = {
        boleto: { expires_after_days: 3 },
      };
    } else {
      sessionParams.mode = plan.mode;
      sessionParams.line_items = [{ price: plan.priceId, quantity: 1 }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("create-checkout error:", error);
    let safeMessage = 'Erro ao processar pagamento. Tente novamente.';
    if (error.message === 'Not authenticated' || error.message === 'User not authenticated') {
      safeMessage = error.message;
    } else if (error.type === 'StripeInvalidRequestError' && error.param === 'payment_method_types') {
      safeMessage = 'Método de pagamento Boleto ainda não está ativado. Por favor, use cartão de crédito.';
    } else if (error.message?.includes('Boleto não suporta')) {
      safeMessage = error.message;
    }
    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
