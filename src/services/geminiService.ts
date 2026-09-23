import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { AiIncentive, AiChallenge, AiPrediction } from "./aiTypes";
import { STATIC_CHALLENGES, STATIC_INCENTIVES, MATRIMONEY_CHALLENGES, MATRIMONEY_INCENTIVES } from "./challengesData";

interface AiCoachResponse {
  data?: any;
  error?: string;
  usageCount?: number;
  limit?: number;
  isPro?: boolean;
}

async function callAiCoachOnce(body: any): Promise<AiCoachResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s client timeout (server max ~10s)

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const token = useAuthStore.getState().token;

    const resp = await fetch(`${supabaseUrl}/functions/v1/ai-coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("AI Coach HTTP error:", resp.status, errBody);
      throw new Error(`AI Coach error (${resp.status})`);
    }

    return await resp.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tempo esgotado. Tente novamente.');
    }
    console.error("callAiCoach failed:", err);
    throw err;
  }
}

// Wrapper with 1 automatic retry before giving up
async function callAiCoach(body: any): Promise<AiCoachResponse> {
  try {
    return await callAiCoachOnce(body);
  } catch (firstErr) {
    console.warn("AI Coach: first attempt failed, retrying...", (firstErr as Error).message);
    // Single retry after a brief pause
    await new Promise(r => setTimeout(r, 500));
    return await callAiCoachOnce(body);
  }
}

export const getIncentive = async (
  p1Name: string,
  p2Name: string,
  contextData: {
    totalGoal: number;
    deadlineMonths: number;
    totalNumbers: number;
    avgValue: number;
    progressPercent: number;
    remainingNumbers: number;
    objective: string;
  },
  recentTitles: string[] = [],
  bonusAnniversary?: boolean,
  skinId?: string
): Promise<AiIncentive & { usageCount?: number; limit?: number; isPro?: boolean }> => {
  const incentiveList = skinId === 'matrimoney' ? MATRIMONEY_INCENTIVES : STATIC_INCENTIVES;
  const fallback = incentiveList[Math.floor(Math.random() * incentiveList.length)];

  try {
    const response = await callAiCoach({
      type: 'incentive',
      context: { ...contextData, p1Name, p2Name },
      recentTitles,
      bonusAnniversary: !!bonusAnniversary,
      ...(skinId ? { skinId } : {}),
    });

    if (response.error === 'limit_reached') {
      return { ...fallback, usageCount: response.usageCount, limit: response.limit, isPro: false, _limitReached: true } as any;
    }

    if (!response.data) throw new Error("Aviso vazio da IA");

    return { ...response.data, usageCount: response.usageCount, limit: response.limit, isPro: response.isPro };
  } catch (error) {
    console.error("AI Coach Incentive Error:", error);
    return fallback;
  }
};

export const getChallenge = async (
  p1Name: string,
  p2Name: string,
  recentTitles: string[] = [],
  bonusAnniversary?: boolean,
  skinId?: string
): Promise<AiChallenge & { usageCount?: number; limit?: number; isPro?: boolean }> => {
  const challengeList = skinId === 'matrimoney' ? MATRIMONEY_CHALLENGES : STATIC_CHALLENGES;
  const fallback = challengeList[Math.floor(Math.random() * challengeList.length)];

  try {
    const response = await callAiCoach({
      type: 'challenge',
      context: { p1Name, p2Name },
      recentTitles,
      bonusAnniversary: !!bonusAnniversary,
      ...(skinId ? { skinId } : {}),
    });

    if (response.error === 'limit_reached') {
      return { ...fallback, usageCount: response.usageCount, limit: response.limit, isPro: false, _limitReached: true } as any;
    }

    if (!response.data) throw new Error("Resposta vazia da IA");

    if (!response.data.financialOption) {
      response.data.financialOption = "Sortear 1 número extra";
    }

    return { ...response.data, usageCount: response.usageCount, limit: response.limit, isPro: response.isPro };
  } catch (error) {
    console.error("AI Coach Challenge Error:", error);
    return fallback;
  }
};

export const getPrediction = async (
  p1Name: string,
  p2Name: string,
  historyData: any[],
  goalData: { totalGoal: number; currentSaved: number; monthsElapsed: number }
): Promise<AiPrediction> => {
  const fallback: AiPrediction = {
    likelyFinishDate: "Dez/2026",
    paceAnalysis: "Com o ritmo atual, vocês atingirão a meta em 14 meses.",
    optimisticScenario: "Se investirem, podem antecipar para Out/2026.",
    pessimisticScenario: "Sem proteção contra inflação, o prazo pode subir para 16 meses.",
    recommendation: "Invistam o saldo acumulado em um CDB 110% do CDI imediatamente.",
    investmentRoiEstimate: "R$ 150,00/mês",
    timeReductionWithInvestment: "2 meses a menos",
  };

  try {
    const response = await callAiCoach({
      type: 'prediction',
      context: { ...goalData, p1Name, p2Name },
    });

    if (response.error === 'pro_only' || response.error === 'limit_reached') {
      return fallback;
    }

    return response.data;
  } catch (error) {
    console.error("AI Coach Prediction Error:", error);
    return fallback;
  }
};
