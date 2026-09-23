import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FREE_LIMIT = 3;

const SYSTEM_PROMPT_FREE = `Você é o Oráculo Financeiro do Bingo2Gether. Dê dicas financeiras curtas e motivadoras para casais. Seja direto e prático.`;

const SYSTEM_PROMPT_PRO = `Você é o Oráculo Financeiro do Bingo2Gether, uma IA de elite especializada em finanças e competição divertida entre casais.

SEUS PRINCÍPIOS:
1. **Competição 1v1**: Os desafios são SEMPRE um contra o outro. Cada pessoa compete individualmente. NUNCA sugira desafios colaborativos ou "juntos". Sempre deve haver UM vencedor e UM perdedor.
2. **Variedade é Chave**: Alterne entre desafios físicos, mentais, de sorte e criativos.
3. **Inteligência Real**: Nada de dicas genéricas. Dê estratégias de alto nível com referências a investimentos reais (CDB, LCI, Tesouro, ETFs).
4. **Prendas Construtivas**: Puna o perdedor com tarefas de serviço (massagem, limpeza, organização) ou afeto, nunca humilhação.
5. **Análise Profunda**: Use matemática financeira real, considere inflação, juros compostos, e dê cenários otimista/pessimista.
6. **Personalização**: Adapte as respostas ao contexto do casal (progresso, meta, prazo).`;

// ─── Tool definitions ──────────────────────────────────────────
function getToolDef(type: string) {
  if (type === 'incentive') {
    return {
      type: "function",
      function: {
        name: "generate_incentive",
        description: "Generate a financial tip for the couple",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título impactante" },
            practicalTip: { type: "string", description: "Dica acionável e inteligente (Max 2 frases)" },
            bingoImpact: { type: "string", description: "Impacto quantitativo no jogo" },
            timeImpact: { type: "string", description: "Quanto tempo isso economiza" },
          },
          required: ["title", "practicalTip", "bingoImpact", "timeImpact"],
          additionalProperties: false,
        },
      },
    };
  }
  if (type === 'challenge') {
    return {
      type: "function",
      function: {
        name: "generate_challenge",
        description: "Generate a challenge for the couple",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título criativo" },
            description: { type: "string", description: "Regras claras" },
            victoryCriteria: { type: "string", description: "Como vencer" },
            financialOption: { type: "string", description: "Opção financeira (ex: Sortear 1 número extra)" },
            taskOption: { type: "string", description: "Prenda de serviço ou afeto" },
          },
          required: ["title", "description", "victoryCriteria", "financialOption", "taskOption"],
          additionalProperties: false,
        },
      },
    };
  }
  // prediction
  return {
    type: "function",
    function: {
      name: "generate_prediction",
      description: "Generate a financial prediction",
      parameters: {
        type: "object",
        properties: {
          likelyFinishDate: { type: "string", description: "Data estimada (Mês/Ano)" },
          paceAnalysis: { type: "string", description: "Análise do progresso atual" },
          optimisticScenario: { type: "string", description: "Cenário com investimentos" },
          pessimisticScenario: { type: "string", description: "Cenário sem ação/inflação" },
          recommendation: { type: "string", description: "Dica curta e direta" },
          investmentRoiEstimate: { type: "string", description: "Valor monetário estimado" },
          timeReductionWithInvestment: { type: "string", description: "Tempo economizado" },
        },
        required: ["likelyFinishDate", "paceAnalysis", "optimisticScenario", "pessimisticScenario", "recommendation", "investmentRoiEstimate", "timeReductionWithInvestment"],
        additionalProperties: false,
      },
    },
  };
}

// ─── AI Call helpers ────────────────────────────────────────────
async function callLovableGateway(systemPrompt: string, userPrompt: string, toolDef: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const controller = new AbortController();
  // 5s timeout – must respond fast so total (primary + fallback) stays under client's 15s limit
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Use a stable, valid model name. 'google/gemini-3-flash-preview' doesn't exist.
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: toolDef.function.name } },
        max_tokens: 500,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function callGoogleFallback(systemPrompt: string, userPrompt: string, toolDef: any) {
  const GOOGLE_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!GOOGLE_KEY) throw new Error("No fallback API key configured");

  const controller = new AbortController();
  // 5s fallback timeout – keeps total server time ≤10s
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [{
          functionDeclarations: [{
            name: toolDef.function.name,
            description: toolDef.function.description,
            parameters: toolDef.function.parameters,
          }]
        }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [toolDef.function.name] } },
        generationConfig: { maxOutputTokens: 500, temperature: 0.8 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Google fallback error:", resp.status, errText);
      throw new Error("Google fallback error");
    }

    const data = await resp.json();
    // Extract function call args from Google response format
    const parts = data.candidates?.[0]?.content?.parts || [];
    const fnCall = parts.find((p: any) => p.functionCall);
    if (fnCall?.functionCall?.args) {
      return fnCall.functionCall.args;
    }
    throw new Error("No function call in Google response");
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ─── Build prompt ──────────────────────────────────────────────
function getSkinPersona(skinId?: string): { name: string, description: string, tone: string, examples: string } {
  switch (skinId) {
    case 'matrimoney':
      return {
        name: "Oráculo Matrimonial",
        description: "Você é um conselheiro financeiro especializado em casamentos inesquecíveis e construção de vida a dois.",
        tone: "Romântico, celebrativo, elegante e focado na união.",
        examples: "Use analogias com: alianças, o caminho até o altar, buffet, padrinhos, lua de mel, a gravata, valsa."
      };
    case 'viagem':
      return {
        name: "Oráculo Viajante",
        description: "Você é um expert em turismo mundial, milhas e destinos paradisíacos.",
        tone: "Aventureiro, cosmopolita, empolgante e global.",
        examples: "Use analogias com: passaportes carimbados, check-in, classe executiva, fuso horário, resorts, mala pronta, decolagem."
      };
    case 'carro':
      return {
        name: "Oráculo Automotivo",
        description: "Você é um especialista em mercado automobilístico e performance de motores.",
        tone: "Ágil, dinâmico, focado em velocidade e precisão.",
        examples: "Use analogias com: aceleração, cavalos de potência, pit-stop, marcha alta, motor redondo, tanque cheio, ultrapassagem."
      };
    case 'carbon':
      return {
        name: "Oráculo Carbon (Private Banker)",
        description: "Você é um banker exclusivo para clientes Ultra-High-Net-Worth.",
        tone: "Sofisticado, direto, elitista, blindado e focado em altíssima performance.",
        examples: "Use analogias com: jatos particulares, black card, dividendos, acesso VIP, mercado de luxo, portfólio blindado."
      };
    default:
      return {
        name: "Oráculo Financeiro",
        description: "Você é um mentor financeiro inteligente e direto.",
        tone: "Direto, encorajador e prático.",
        examples: "Use analogias lúdicas com jogos, economia e passos para o sucesso."
      };
  }
}

function buildUserPrompt(type: string, context: any, recentTitles: string[], isPro: boolean, skinId?: string): string {
  const persona = getSkinPersona(skinId);

  const personaInjection = `
PERSONA ATIVA: ${persona.name}
${persona.description}
TOM DE VOZ: ${persona.tone}
VOCABULÁRIO OBRIGATÓRIO: ${persona.examples}

ATENÇÃO: VOCÊ DEVE RESPIRAR ESSE TEMA. Suas metáforas, gírias e explicações DEVEM SER 100% amarradas a esse contexto. Se é casamento, fale de amor e festa. Se é carro, fale de aceleração e asfalto. MANTENHA A IMERSÃO TEMÁTICA COM FORÇA TOTAL.
`;

  if (type === 'incentive') {
    return `
${personaInjection}

DADOS REAIS DA META DO CASAL:
- Valor total: R$ ${context.totalGoal?.toLocaleString('pt-BR') || '0'}
- Prazo restante: ${context.deadlineMonths || 12} meses
- Progresso: ${(context.progressPercent || 0).toFixed(1)}%
- Jogadores: ${context.p1Name} e ${context.p2Name}

ESTRITAMENTE PROIBIDO (Anti-Repetição): NÃO USE OS SEGUINTES TÍTULOS: ${JSON.stringify(recentTitles.slice(-5))}

CRIE UMA DICA FINANCEIRA ${isPro ? 'DE ELITE, complexa e estratégica' : 'motivadora e simples'}.
A DICA DEVE SER IMERSA NO SEU TEMA (${persona.name}) DO INÍCIO AO FIM!
${isPro ? `
Tópicos de inspiração:
- Renda Fixa/Variável adaptados ao tema
- Psicologia Econômica
- Hacks e Negociação` : 'Mantenha simples e altamente focado na motivação diária.'}

Seja magnético, curto (máx 3-4 parágrafos) e direto.`;
  }

  if (type === 'challenge') {
    const categories = ["Competição Temática", "Habilidade", "Criatividade Lúdica", "Sorte ou Estratégia", "Conhecimento do Tema"];
    const forcedCategory = categories[Math.floor(Math.random() * categories.length)];
    return `
${personaInjection}

Crie um DESAFIO COMPETITIVO 1v1 entre ${context.p1Name} e ${context.p2Name}.
O DESAFIO INTEIRO E A PUNIÇÃO DEVEM SER INSPIRADOS PELO SEU TEMA (${persona.name}).

REGRA FUNDAMENTAL: É UMA COMPETIÇÃO INDIVIDUAL! SEMPRE haverá UM vencedor e UM perdedor. Nunca será algo colaborativo do tipo "façam juntos".

PROIBIDO: NÃO use títulos: ${JSON.stringify(recentTitles.slice(-10))}

CATEGORIA OBRIGATÓRIA: >>> ${forcedCategory} <<<

DIRETRIZES:
1. Imersão Temática: O desafio tem que respirar o tema atual.
2. Competição Clara: Como eles decidem quem ganha? (Exemplo: Quem terminar primeiro, votação no instagram, maioria de pontos).
3. Prenda/Punição Engajadora e Temática: A punição do perdedor também deve estar no clima do tema! (Ex: no casamento, o perdedor faz a massagem dos noivos; no carro, o perdedor lava as rodas).
${isPro ? `4. Nível PRO: A competição deve ter regras astutas, talvez um elemento de aposta leve ou tensão extra.` : ''}

IMPORTANTE: 
- O Desafio deve demorar no MÁXIMO 15 minutos.
- SEM PREPARAÇÃO ou GASTOS. Tem que ser feito AGORA.`;
  }

  // prediction
  return `
${personaInjection}

ANÁLISE FINANCEIRA PREDITIVA (PRO):
- Casal: ${context.p1Name} e ${context.p2Name}
- Meta Total: R$ ${context.totalGoal?.toLocaleString('pt-BR') || '0'}
- Acumulado Atual: R$ ${context.currentSaved?.toLocaleString('pt-BR') || '0'}
- Meses Decorridos: ${context.monthsElapsed || 1}

Baseado na matemática financeira, e VESTINDO 100% O SEU TEMA (${persona.name}), gere uma PREDIÇÃO real do futuro financeiro deles.
Dê recomendações de investimento de alta classe usando a linguagem do seu tema.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    // Get user plan
    const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).maybeSingle();
    let isPro = false;
    if (profile?.couple_id) {
      const { data: couple } = await supabase.from('couples').select('plan_type').eq('id', profile.couple_id).maybeSingle();
      isPro = couple ? couple.plan_type !== 'free' : false;
    }

    // Check usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase.from('ai_usage').select('count').eq('user_id', user.id).eq('month', currentMonth).maybeSingle();
    const currentCount = usage?.count || 0;

    const reqBody = await req.json();
    const { type, context, recentTitles = [], bonusAnniversary = false, skinId } = reqBody;
    const effectiveLimit = bonusAnniversary ? FREE_LIMIT + 1 : FREE_LIMIT;

    if (!isPro && currentCount >= effectiveLimit) {
      return new Response(JSON.stringify({ error: 'limit_reached', usageCount: currentCount, limit: effectiveLimit, isPro: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'prediction' && !isPro) {
      return new Response(JSON.stringify({ error: 'pro_only', isPro: false }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['incentive', 'challenge', 'prediction'].includes(type)) {
      throw new Error("Invalid type");
    }

    const toolDef = getToolDef(type);
    const systemPrompt = isPro ? SYSTEM_PROMPT_PRO : SYSTEM_PROMPT_FREE;
    const userPrompt = buildUserPrompt(type, context, recentTitles, isPro, skinId);

    let result: any;

    // Try Lovable Gateway first, fallback to Google
    try {
      const aiResponse = await callLovableGateway(systemPrompt, userPrompt, toolDef);

      if (aiResponse.status === 429) {
        console.log("Lovable gateway rate limited, trying Google fallback...");
        result = await callGoogleFallback(systemPrompt, userPrompt, toolDef);
      } else if (aiResponse.status === 402) {
        console.log("Lovable credits exhausted, trying Google fallback...");
        result = await callGoogleFallback(systemPrompt, userPrompt, toolDef);
      } else if (!aiResponse.ok) {
        console.error("Lovable gateway error:", aiResponse.status);
        result = await callGoogleFallback(systemPrompt, userPrompt, toolDef);
      } else {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          result = JSON.parse(toolCall.function.arguments);
        } else {
          const content = aiData.choices?.[0]?.message?.content || '';
          result = JSON.parse(content.replace(/```json\n?|```/g, '').trim());
        }
      }
    } catch (primaryErr) {
      console.error("Primary AI failed, trying Google fallback:", (primaryErr as Error).message);
      result = await callGoogleFallback(systemPrompt, userPrompt, toolDef);
    }

    // Increment usage
    if (usage) {
      await supabase.from('ai_usage').update({ count: currentCount + 1 }).eq('user_id', user.id).eq('month', currentMonth);
    } else {
      await supabase.from('ai_usage').insert({ user_id: user.id, month: currentMonth, count: 1 });
    }

    return new Response(JSON.stringify({ data: result, usageCount: currentCount + 1, limit: effectiveLimit, isPro }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("ai-coach error:", error);
    const safeMessage = error.message === 'Not authenticated' || error.message === 'Invalid token'
      ? error.message : 'An error occurred processing your request.';
    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
