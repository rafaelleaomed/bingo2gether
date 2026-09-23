// Stripe Payment Links — Bingo2Gether PRO
// Prices: Mensal R$29,90/mês | Anual R$199,90/ano | Vitalício R$399,90 (único)

const STRIPE_PAYMENT_LINKS: Record<string, string> = {
    monthly: 'https://buy.stripe.com/fZuaEWdljf0ih1y5Ae0Fi09',   // R$29,90/mês
    annual: 'https://buy.stripe.com/3cIcN41CBcSa7qY2o20Fi0a',    // R$199,90/ano
    lifetime: 'https://buy.stripe.com/cNibJ0a97dWe6mUgeS0Fi0b',  // R$399,90 único
};

export const paymentService = {
    createStripeSession: async (planType: 'monthly' | 'annual' | 'lifetime' = 'annual') => {
        const link = STRIPE_PAYMENT_LINKS[planType];
        if (!link) throw new Error('Plano inválido.');
        // Returns URL — caller opens in new tab with window.open
        return { url: link };
    },

    createBoletoSession: async (planType: 'annual' | 'lifetime' = 'annual') => {
        // Boleto/PIX are offered on the same Stripe Checkout page when enabled in Stripe Dashboard
        const link = STRIPE_PAYMENT_LINKS[planType];
        if (!link) throw new Error('Plano inválido.');
        return { url: link };
    },

    createPixSession: async (planType: 'annual' | 'lifetime' = 'annual') => {
        const link = STRIPE_PAYMENT_LINKS[planType];
        if (!link) throw new Error('Plano inválido.');
        return { url: link };
    },
};
