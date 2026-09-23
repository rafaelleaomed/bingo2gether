import React, { useMemo, useState } from "react";

type Dict = Record<string, number>;

type Row = {
  classe: string;
  percentualAtual: number;
  percentualAlvo: number;
  diferenca: number;
  valorIdeal: number;
  comprarAporte: number;
  precisaVender: boolean;
  vendaRecomendada: number;
  classificacao: string;
};

type Plan = {
  rows: Row[];
  summary: string;
  totalBefore: number;
  totalAfter: number;
  buys: Dict;
  sells: Dict;
  postValues: Dict;
  postPct: Dict;
  score: number;
  rating: string;
};

type HistoryRow = {
  mes: number;
  patrimonioAntesAporte: number;
  patrimonioDepoisAporte: number;
  score: number;
  rating: string;
  resumo: string;
};

const DEFAULT_TARGETS: Dict = {
  Internacional: 30,
  "Acoes Brasil": 25,
  "Renda Fixa": 22,
  FIIs: 12,
  Cripto: 7,
  Fundos: 4,
};

const DEFAULT_CURRENT: Dict = {
  Internacional: 24,
  "Acoes Brasil": 28,
  "Renda Fixa": 20,
  FIIs: 13,
  Cripto: 10,
  Fundos: 5,
};

const DEFAULT_VOL: Dict = {
  Internacional: 18,
  "Acoes Brasil": 25,
  "Renda Fixa": 5,
  FIIs: 15,
  Cripto: 60,
  Fundos: 10,
};

const DEFAULT_RETURNS: Dict = {
  Internacional: 0.1,
  "Acoes Brasil": 0.12,
  "Renda Fixa": 0.09,
  FIIs: 0.11,
  Cripto: 0.2,
  Fundos: 0.08,
};

const classes = Object.keys(DEFAULT_TARGETS);

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v));
const sumObj = (obj: Dict) => Object.values(obj).reduce((a, b) => a + b, 0);
const fmtMoney = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizePercent = (dict: Dict): Dict | null => {
  const total = sumObj(dict);
  if (total <= 0) return null;
  const out: Dict = {};
  Object.keys(dict).forEach((k) => {
    out[k] = (dict[k] * 100) / total;
  });
  return out;
};

const dynamicBands = (className: string) => {
  const vol = DEFAULT_VOL[className] ?? 15;
  const ignore = clamp(1.0, 4.0, 1.5 + vol / 40);
  const active = clamp(ignore + 1.5, 8.0, ignore + 2 + vol / 30);
  return { ignore, active };
};

const classify = (absDiff: number, ignoreBand: number, activeBand: number) => {
  if (absDiff < ignoreBand) return "Ignorar";
  if (absDiff < activeBand) return "Ajustar via aporte";
  return "Rebalanceamento ativo";
};

const parseNumber = (raw: string): number => {
  let s = String(raw).trim().replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const parseOcrText = (text: string): { total: number | null; pctNorm: Dict | null } => {
  const alias: Record<string, string[]> = {
    Internacional: ["internacional", "global", "exterior", "us"],
    "Acoes Brasil": ["acoes brasil", "acoes", "brasil"],
    "Renda Fixa": ["renda fixa", "rf", "fixed income"],
    FIIs: ["fii", "fiis", "fundos imobiliarios"],
    Cripto: ["cripto", "crypto", "bitcoin", "btc"],
    Fundos: ["fundos", "multimercado"],
  };

  const lines = text.toLowerCase().split(/\r?\n/);
  let total: number | null = null;
  const pctRaw: Dict = {};

  lines.forEach((line) => {
    const totalMatch = line.match(/(total|patrimonio)[^\d]*([\d\.,]+)/i);
    if (totalMatch) total = parseNumber(totalMatch[2]);

    const pctMatch = line.match(/([\d\.,]+)\s*%/);
    if (!pctMatch) return;

    const pct = parseNumber(pctMatch[1]);
    Object.keys(alias).forEach((cls) => {
      if (alias[cls].some((k) => line.includes(k))) pctRaw[cls] = pct;
    });
  });

  return { total, pctNorm: normalizePercent(pctRaw) };
};

const portfolioHealthScore = (postPct: Dict, targetPct: Dict) => {
  let err = 0;
  classes.forEach((c) => {
    const d = postPct[c] - targetPct[c];
    err += d * d;
  });

  const score = Math.max(0, 100 - 0.8 * err);
  let rating = "B";
  if (score >= 90) rating = "AAA";
  else if (score >= 80) rating = "AA";
  else if (score >= 70) rating = "A";
  else if (score >= 60) rating = "BBB";
  else if (score >= 50) rating = "BB";

  return { score, rating };
};

const rebalanceMonth = (portfolioValues: Dict, monthlyContribution: number, targetPct: Dict): Plan => {
  const currentValues = { ...portfolioValues };
  const totalBefore = sumObj(currentValues);

  const currentPct: Dict = {};
  classes.forEach((c) => {
    currentPct[c] = totalBefore > 0 ? (100 * currentValues[c]) / totalBefore : 0;
  });

  const totalAfterContribution = totalBefore + monthlyContribution;
  const idealAfter: Dict = {};
  const deficits: Dict = {};

  classes.forEach((c) => {
    idealAfter[c] = totalAfterContribution * (targetPct[c] / 100);
    deficits[c] = idealAfter[c] - currentValues[c];
  });

  const underTarget = classes.filter((c) => deficits[c] > 0).sort((a, b) => deficits[b] - deficits[a]);

  const buys: Dict = {};
  classes.forEach((c) => (buys[c] = 0));

  let remaining = monthlyContribution;
  underTarget.forEach((c) => {
    if (remaining <= 0) return;
    const buy = Math.min(deficits[c], remaining);
    buys[c] += buy;
    remaining -= buy;
  });

  if (remaining > 0) {
    classes.forEach((c) => {
      buys[c] += remaining * (targetPct[c] / 100);
    });
  }

  const postValues: Dict = {};
  classes.forEach((c) => {
    postValues[c] = currentValues[c] + buys[c];
  });

  const postTotal = sumObj(postValues);
  const postPct: Dict = {};
  classes.forEach((c) => {
    postPct[c] = postTotal > 0 ? (100 * postValues[c]) / postTotal : 0;
  });

  const sells: Dict = {};
  const rows: Row[] = [];

  classes.forEach((c) => {
    const diff = currentPct[c] - targetPct[c];
    const absDiff = Math.abs(diff);
    const band = dynamicBands(c);
    const postDiff = postPct[c] - targetPct[c];

    let sell = 0;
    if (postDiff > band.active) {
      sell = postValues[c] - postTotal * (targetPct[c] / 100);
    }

    sells[c] = Math.max(0, sell);

    rows.push({
      classe: c,
      percentualAtual: currentPct[c],
      percentualAlvo: targetPct[c],
      diferenca: diff,
      valorIdeal: totalBefore * (targetPct[c] / 100),
      comprarAporte: buys[c],
      precisaVender: sells[c] > 0.01,
      vendaRecomendada: sells[c],
      classificacao: classify(absDiff, band.ignore, band.active),
    });
  });

  const totalSell = sumObj(sells);
  const buyOrder = [...rows].sort((a, b) => b.comprarAporte - a.comprarAporte).filter((r) => r.comprarAporte > 0);
  const sellClasses = rows.filter((r) => r.vendaRecomendada > 0.01).map((r) => r.classe);

  const summary =
    `Aporte direcionado para: ${buyOrder.map((r) => r.classe).join(", ") || "Nenhuma classe"}. ` +
    (totalSell <= 0.01 ? "Nenhuma venda necessaria" : `Venda recomendada em ${sellClasses.join(", ")}`);

  const health = portfolioHealthScore(postPct, targetPct);

  return {
    rows,
    summary,
    totalBefore,
    totalAfter: postTotal,
    buys,
    sells,
    postValues,
    postPct,
    score: health.score,
    rating: health.rating,
  };
};

const simulateMonths = (
  initialPortfolioValues: Dict,
  monthlyContribution: number,
  annualReturns: Dict,
  targetPct: Dict,
  months: number,
): HistoryRow[] => {
  const values = { ...initialPortfolioValues };
  const history: HistoryRow[] = [];

  for (let m = 1; m <= months; m += 1) {
    classes.forEach((c) => {
      const annual = annualReturns[c] ?? 0;
      const monthly = Math.pow(1 + annual, 1 / 12) - 1;
      values[c] *= 1 + monthly;
    });

    const plan = rebalanceMonth(values, monthlyContribution, targetPct);
    classes.forEach((c) => {
      values[c] = plan.postValues[c];
    });

    history.push({
      mes: m,
      patrimonioAntesAporte: plan.totalBefore,
      patrimonioDepoisAporte: plan.totalAfter,
      score: plan.score,
      rating: plan.rating,
      resumo: plan.summary,
    });
  }

  return history;
};

const simulateFutureScenarios = (
  initialPortfolioValues: Dict,
  monthlyContribution: number,
  baseAnnualReturns: Dict,
  targetPct: Dict,
  months: number,
) => {
  const shiftReturns = (delta: number): Dict => {
    const out: Dict = {};
    classes.forEach((c) => {
      out[c] = clamp(-0.2, 0.6, (baseAnnualReturns[c] ?? 0) + delta);
    });
    return out;
  };

  return {
    Conservador: simulateMonths(initialPortfolioValues, monthlyContribution, shiftReturns(-0.04), targetPct, months),
    Base: simulateMonths(initialPortfolioValues, monthlyContribution, { ...baseAnnualReturns }, targetPct, months),
    Otimista: simulateMonths(initialPortfolioValues, monthlyContribution, shiftReturns(0.04), targetPct, months),
  };
};

const FamilyOfficeRebalance: React.FC = () => {
  const [totalValue, setTotalValue] = useState(150000);
  const [monthlyContribution, setMonthlyContribution] = useState(4000);
  const [currentPct, setCurrentPct] = useState<Dict>({ ...DEFAULT_CURRENT });
  const [targetPct, setTargetPct] = useState<Dict>({ ...DEFAULT_TARGETS });
  const [annualReturns, setAnnualReturns] = useState<Dict>({ ...DEFAULT_RETURNS });
  const [months, setMonths] = useState(12);
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const basePortfolio = useMemo(() => {
    const currentNorm = normalizePercent(currentPct);
    if (!currentNorm) return null;

    const out: Dict = {};
    classes.forEach((c) => {
      out[c] = totalValue * (currentNorm[c] / 100);
    });
    return out;
  }, [currentPct, totalValue]);

  const normalizedTarget = useMemo(() => normalizePercent(targetPct), [targetPct]);

  const onRebalance = () => {
    if (!basePortfolio || !normalizedTarget) return;
    const next = rebalanceMonth(basePortfolio, monthlyContribution, normalizedTarget);
    setPlan(next);
  };

  const onSimulate = () => {
    if (!basePortfolio || !normalizedTarget) return;
    const m = Math.max(1, Math.floor(months));
    const h = simulateMonths(basePortfolio, monthlyContribution, annualReturns, normalizedTarget, m);
    setHistory(h);

    // Mantem a funcao ativa para uso futuro.
    simulateFutureScenarios(basePortfolio, monthlyContribution, annualReturns, normalizedTarget, m);
  };

  const onParseOcr = () => {
    const { total, pctNorm } = parseOcrText(ocrText);
    if (!pctNorm) {
      setOcrStatus("Nao foi possivel identificar percentuais do OCR.");
      return;
    }
    const nextCurrent = { ...currentPct };
    classes.forEach((c) => {
      if (pctNorm[c] != null) nextCurrent[c] = pctNorm[c];
    });
    setCurrentPct(nextCurrent);

    if (total && total > 0) {
      setTotalValue(total);
    }

    setOcrStatus("OCR aplicado com sucesso.");
  };

  const report = useMemo(() => {
    if (!plan) return "";

    const alloc = plan.rows
      .map(
        (r) =>
          `- ${r.classe}: atual ${r.percentualAtual.toFixed(2)}% | alvo ${r.percentualAlvo.toFixed(2)}% | diff ${r.diferenca >= 0 ? "+" : ""}${r.diferenca.toFixed(2)} p.p.`,
      )
      .join("\n");

    const buys = Object.entries(plan.buys)
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0.01)
      .map(([k, v]) => `- ${k}: R$ ${fmtMoney(v)}`)
      .join("\n");

    return [
      "=== PANORAMA MACRO GLOBAL ===",
      "Desaceleracao com inflacao moderando (Expansao 30%, Desaceleracao 45%, Recessao 25%).",
      "",
      "=== PANORAMA BRASIL ===",
      "Crescimento fraco com juros reais elevados (Aperto 35%, Desaceleracao 40%, Recuperacao 25%).",
      "",
      "=== SAUDE DA CARTEIRA ===",
      `Carteira rebalanceada via aporte. Patrimonio: R$ ${fmtMoney(plan.totalBefore)} -> R$ ${fmtMoney(plan.totalAfter)}.`,
      "",
      "=== SCORE INSTITUCIONAL ===",
      `Nota ${plan.score.toFixed(1)}/100 | Classificacao ${plan.rating}`,
      "",
      "=== OPORTUNIDADES ASSIMETRICAS ===",
      "Classes com maior eficiencia marginal para aporte sao as mais abaixo do alvo.",
      "",
      "=== ALOCACAO IDEAL ===",
      alloc,
      "",
      "=== APORTES RECOMENDADOS ===",
      buys || "- Sem aportes registrados.",
      "",
      "=== TRAJETORIA PATRIMONIAL ===",
      "Use a secao de simulacao para 12 meses e cenarios conservador/base/otimista.",
      "",
      "=== ALERTAS COMPORTAMENTAIS ===",
      "Evitar mudancas por ruido. Priorizar disciplina no aporte mensal.",
      "",
      "=== MEMORIA ATUALIZADA ===",
      plan.summary,
    ].join("\n");
  }, [plan]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-black tracking-tight">Family Office AI - Rebalanceamento Mensal</h1>
          <p className="text-slate-400 mt-2">
            Motor de rebalanceamento com aporte, bandas dinamicas, simulacao de 12 meses e historico mensal.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 md:p-5">
          <h2 className="text-lg font-bold mb-3">1) Entrada</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <label className="text-sm text-slate-300">
              Total da carteira (R$)
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                type="number"
                min={0}
                step="0.01"
                value={totalValue}
                onChange={(e) => setTotalValue(Number(e.target.value) || 0)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Aporte mensal (R$)
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                type="number"
                min={0}
                step="0.01"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map((c) => (
              <div key={c} className="rounded-lg border border-slate-700 p-3 bg-slate-950/30">
                <p className="font-semibold mb-2">{c}</p>
                <label className="text-xs text-slate-400 block">
                  Atual %
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                    type="number"
                    step="0.01"
                    value={currentPct[c]}
                    onChange={(e) => setCurrentPct({ ...currentPct, [c]: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="text-xs text-slate-400 block mt-2">
                  Alvo %
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                    type="number"
                    step="0.01"
                    value={targetPct[c]}
                    onChange={(e) => setTargetPct({ ...targetPct, [c]: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 md:p-5">
          <h2 className="text-lg font-bold mb-3">2) OCR (texto colado)</h2>
          <textarea
            className="w-full min-h-32 rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Total: R$ 150.000,00&#10;Internacional 24%&#10;Acoes Brasil 28%&#10;Renda Fixa 20%&#10;FIIs 13%&#10;Cripto 10%&#10;Fundos 5%"
          />
          <div className="flex items-center gap-3 mt-3">
            <button className="rounded-md bg-sky-700 hover:bg-sky-600 px-3 py-2" onClick={onParseOcr}>
              Preencher por OCR
            </button>
            <span className="text-sm text-slate-400">{ocrStatus}</span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 md:p-5">
          <h2 className="text-lg font-bold mb-3">3) Rebalanceamento mensal</h2>
          <button className="rounded-md bg-emerald-700 hover:bg-emerald-600 px-3 py-2" onClick={onRebalance}>
            Calcular rebalanceamento
          </button>

          {plan && (
            <>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950">
                      <th className="border border-slate-700 p-2 text-left">Classe</th>
                      <th className="border border-slate-700 p-2 text-left">Atual %</th>
                      <th className="border border-slate-700 p-2 text-left">Alvo %</th>
                      <th className="border border-slate-700 p-2 text-left">Diferenca</th>
                      <th className="border border-slate-700 p-2 text-left">Valor ideal (R$)</th>
                      <th className="border border-slate-700 p-2 text-left">Comprar (R$)</th>
                      <th className="border border-slate-700 p-2 text-left">Precisa vender?</th>
                      <th className="border border-slate-700 p-2 text-left">Venda (R$)</th>
                      <th className="border border-slate-700 p-2 text-left">Classificacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.rows.map((r) => (
                      <tr key={r.classe}>
                        <td className="border border-slate-700 p-2">{r.classe}</td>
                        <td className="border border-slate-700 p-2">{r.percentualAtual.toFixed(2)}%</td>
                        <td className="border border-slate-700 p-2">{r.percentualAlvo.toFixed(2)}%</td>
                        <td className="border border-slate-700 p-2">{r.diferenca >= 0 ? "+" : ""}{r.diferenca.toFixed(2)} p.p.</td>
                        <td className="border border-slate-700 p-2">{fmtMoney(r.valorIdeal)}</td>
                        <td className="border border-slate-700 p-2">{fmtMoney(r.comprarAporte)}</td>
                        <td className="border border-slate-700 p-2">{r.precisaVender ? "Sim" : "Nao"}</td>
                        <td className="border border-slate-700 p-2">{fmtMoney(r.vendaRecomendada)}</td>
                        <td className="border border-slate-700 p-2">{r.classificacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 font-semibold">{plan.summary}</p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 md:p-5">
          <h2 className="text-lg font-bold mb-3">4) Simulacao futura</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            {classes.map((c) => (
              <label key={c} className="text-xs text-slate-300">
                {c} - retorno esperado anual
                <input
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                  type="number"
                  step="0.001"
                  value={annualReturns[c]}
                  onChange={(e) => setAnnualReturns({ ...annualReturns, [c]: Number(e.target.value) || 0 })}
                />
              </label>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <label className="text-sm text-slate-300">
              Meses
              <input
                className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 w-28"
                type="number"
                min={1}
                max={600}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value) || 12)}
              />
            </label>
            <button className="rounded-md bg-violet-700 hover:bg-violet-600 px-3 py-2" onClick={onSimulate}>
              Simular
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-950">
                  <th className="border border-slate-700 p-2 text-left">Mes</th>
                  <th className="border border-slate-700 p-2 text-left">Antes aporte (R$)</th>
                  <th className="border border-slate-700 p-2 text-left">Depois aporte (R$)</th>
                  <th className="border border-slate-700 p-2 text-left">Score</th>
                  <th className="border border-slate-700 p-2 text-left">Rating</th>
                  <th className="border border-slate-700 p-2 text-left">Resumo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.mes}>
                    <td className="border border-slate-700 p-2">{h.mes}</td>
                    <td className="border border-slate-700 p-2">{fmtMoney(h.patrimonioAntesAporte)}</td>
                    <td className="border border-slate-700 p-2">{fmtMoney(h.patrimonioDepoisAporte)}</td>
                    <td className="border border-slate-700 p-2">{h.score.toFixed(1)}</td>
                    <td className="border border-slate-700 p-2">{h.rating}</td>
                    <td className="border border-slate-700 p-2">{h.resumo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 md:p-5">
          <h2 className="text-lg font-bold mb-3">5) Formato Family Office AI</h2>
          <pre className="rounded-md border border-slate-700 bg-slate-950 p-3 overflow-x-auto whitespace-pre-wrap text-sm">
            {report}
          </pre>
        </section>
      </div>
    </div>
  );
};

export default FamilyOfficeRebalance;
