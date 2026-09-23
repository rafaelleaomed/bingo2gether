(function () {
  const DEFAULT_TARGETS = {
    Internacional: 30,
    "Acoes Brasil": 25,
    "Renda Fixa": 22,
    FIIs: 12,
    Cripto: 7,
    Fundos: 4,
  };

  const DEFAULT_CURRENT = {
    Internacional: 24,
    "Acoes Brasil": 28,
    "Renda Fixa": 20,
    FIIs: 13,
    Cripto: 10,
    Fundos: 5,
  };

  const DEFAULT_VOL = {
    Internacional: 18,
    "Acoes Brasil": 25,
    "Renda Fixa": 5,
    FIIs: 15,
    Cripto: 60,
    Fundos: 10,
  };

  const DEFAULT_RETURNS = {
    Internacional: 0.1,
    "Acoes Brasil": 0.12,
    "Renda Fixa": 0.09,
    FIIs: 0.11,
    Cripto: 0.2,
    Fundos: 0.08,
  };

  const classes = Object.keys(DEFAULT_TARGETS);

  const el = {
    totalValue: document.getElementById("totalValue"),
    monthlyContribution: document.getElementById("monthlyContribution"),
    allocationInputs: document.getElementById("allocationInputs"),
    resetTargetsBtn: document.getElementById("resetTargetsBtn"),
    ocrText: document.getElementById("ocrText"),
    parseOcrBtn: document.getElementById("parseOcrBtn"),
    ocrStatus: document.getElementById("ocrStatus"),
    rebalanceBtn: document.getElementById("rebalanceBtn"),
    resultWrapper: document.getElementById("resultWrapper"),
    resultTableBody: document.querySelector("#resultTable tbody"),
    summaryText: document.getElementById("summaryText"),
    returnsInputs: document.getElementById("returnsInputs"),
    simMonths: document.getElementById("simMonths"),
    simulateBtn: document.getElementById("simulateBtn"),
    historyTableBody: document.querySelector("#historyTable tbody"),
    familyOfficeReport: document.getElementById("familyOfficeReport"),
  };

  let latestPlan = null;

  function buildInputRows() {
    el.allocationInputs.innerHTML = "";
    el.returnsInputs.innerHTML = "";

    classes.forEach((name) => {
      const wrap = document.createElement("div");
      wrap.className = "grid";
      wrap.innerHTML = `
        <label>${name} - Atual %
          <input type="number" step="0.01" min="0" data-role="current" data-class="${name}" value="${DEFAULT_CURRENT[name]}" />
        </label>
        <label>${name} - Alvo %
          <input type="number" step="0.01" min="0" data-role="target" data-class="${name}" value="${DEFAULT_TARGETS[name]}" />
        </label>
      `;
      el.allocationInputs.appendChild(wrap);

      const rWrap = document.createElement("div");
      rWrap.innerHTML = `
        <label>${name} - Retorno esperado anual
          <input type="number" step="0.001" data-role="ret" data-class="${name}" value="${DEFAULT_RETURNS[name]}" />
        </label>
      `;
      el.returnsInputs.appendChild(rWrap);
    });
  }

  function getNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizePercent(dict) {
    const sum = Object.values(dict).reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      return null;
    }
    const out = {};
    Object.keys(dict).forEach((k) => {
      out[k] = (dict[k] * 100) / sum;
    });
    return out;
  }

  function readCurrentAndTargets() {
    const current = {};
    const target = {};

    document.querySelectorAll("input[data-role='current']").forEach((input) => {
      current[input.dataset.class] = getNumber(input.value);
    });

    document.querySelectorAll("input[data-role='target']").forEach((input) => {
      target[input.dataset.class] = getNumber(input.value);
    });

    const currentNorm = normalizePercent(current);
    const targetNorm = normalizePercent(target);

    if (!currentNorm || !targetNorm) {
      throw new Error("Soma de percentuais deve ser maior que zero.");
    }

    return { current: currentNorm, target: targetNorm };
  }

  function dynamicBands(className) {
    const vol = DEFAULT_VOL[className] || 15;
    const ignore = clamp(1.0, 4.0, 1.5 + vol / 40);
    const active = clamp(ignore + 1.5, 8.0, ignore + 2 + vol / 30);
    return { ignore, active };
  }

  function clamp(min, max, val) {
    return Math.max(min, Math.min(max, val));
  }

  function classify(absDiff, bandIgnore, bandActive) {
    if (absDiff < bandIgnore) return "Ignorar";
    if (absDiff < bandActive) return "Ajustar via aporte";
    return "Rebalanceamento ativo";
  }

  function buildPortfolioValues(total, currentPct) {
    const values = {};
    classes.forEach((c) => {
      values[c] = total * (currentPct[c] / 100);
    });
    return values;
  }

  function portfolioHealthScore(postPct, targetPct) {
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
  }

  function rebalanceMonth(portfolioValues, monthlyContribution, targetPct) {
    const currentValues = { ...portfolioValues };
    const totalBefore = sumObj(currentValues);

    const currentPct = {};
    classes.forEach((c) => {
      currentPct[c] = totalBefore > 0 ? (100 * currentValues[c]) / totalBefore : 0;
    });

    const totalAfterContribution = totalBefore + monthlyContribution;
    const idealAfter = {};
    const deficits = {};

    classes.forEach((c) => {
      idealAfter[c] = totalAfterContribution * (targetPct[c] / 100);
      deficits[c] = idealAfter[c] - currentValues[c];
    });

    const underTarget = classes
      .filter((c) => deficits[c] > 0)
      .sort((a, b) => deficits[b] - deficits[a]);

    const buys = {};
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
      remaining = 0;
    }

    const postValues = {};
    const postPct = {};
    classes.forEach((c) => {
      postValues[c] = currentValues[c] + buys[c];
    });

    const postTotal = sumObj(postValues);
    classes.forEach((c) => {
      postPct[c] = postTotal > 0 ? (100 * postValues[c]) / postTotal : 0;
    });

    const rows = [];
    const sells = {};
    classes.forEach((c) => {
      const diff = currentPct[c] - targetPct[c];
      const bands = dynamicBands(c);
      const absDiff = Math.abs(diff);
      const postDiff = postPct[c] - targetPct[c];

      let sell = 0;
      // So recomenda venda se, mesmo com aporte, continuar acima da banda ativa.
      if (postDiff > bands.active) {
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
        classificacao: classify(absDiff, bands.ignore, bands.active),
      });
    });

    const totalSell = sumObj(sells);
    const buyOrder = [...rows].sort((a, b) => b.comprarAporte - a.comprarAporte).filter((x) => x.comprarAporte > 0);
    const sellClasses = rows.filter((r) => r.vendaRecomendada > 0.01).map((r) => r.classe);

    const summary =
      `Aporte direcionado para: ${buyOrder.map((r) => r.classe).join(", ") || "Nenhuma classe"}. ` +
      (totalSell <= 0.01
        ? "Nenhuma venda necessaria"
        : `Venda recomendada em ${sellClasses.join(", ")}`);

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
  }

  function simulateMonths(initialPortfolioValues, monthlyContribution, annualReturns, targetPct, months) {
    const values = { ...initialPortfolioValues };
    const history = [];

    for (let m = 1; m <= months; m += 1) {
      classes.forEach((c) => {
        const annual = annualReturns[c] || 0;
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
  }

  function simulateFutureScenarios(initialPortfolioValues, monthlyContribution, baseAnnualReturns, targetPct, months) {
    const scenarios = {
      Conservador: shiftReturns(baseAnnualReturns, -0.04),
      Base: { ...baseAnnualReturns },
      Otimista: shiftReturns(baseAnnualReturns, 0.04),
    };

    const out = {};
    Object.keys(scenarios).forEach((name) => {
      out[name] = simulateMonths(
        { ...initialPortfolioValues },
        monthlyContribution,
        scenarios[name],
        targetPct,
        months
      );
    });

    return out;
  }

  function shiftReturns(base, delta) {
    const out = {};
    classes.forEach((c) => {
      const r = (base[c] || 0) + delta;
      out[c] = clamp(-0.2, 0.6, r);
    });
    return out;
  }

  function parseOcrText(text) {
    const alias = {
      Internacional: ["internacional", "global", "exterior", "us"],
      "Acoes Brasil": ["acoes brasil", "acoes", "brasil"],
      "Renda Fixa": ["renda fixa", "rf", "fixed income"],
      FIIs: ["fii", "fiis", "fundos imobiliarios"],
      Cripto: ["cripto", "crypto", "bitcoin", "btc"],
      Fundos: ["fundos", "multimercado"],
    };

    const lines = text.toLowerCase().split(/\r?\n/);
    const pctRaw = {};
    let total = null;

    lines.forEach((line) => {
      const totalMatch = line.match(/(total|patrimonio)[^\d]*([\d\.,]+)/i);
      if (totalMatch) {
        total = parseNumber(totalMatch[2]);
      }

      const pctMatch = line.match(/([\d\.,]+)\s*%/);
      if (!pctMatch) return;

      const pct = parseNumber(pctMatch[1]);
      Object.keys(alias).forEach((cls) => {
        if (alias[cls].some((k) => line.includes(k))) {
          pctRaw[cls] = pct;
        }
      });
    });

    const pctNorm = normalizePercent(pctRaw);
    return { total, pctNorm };
  }

  function parseNumber(raw) {
    let s = String(raw).trim().replace(/\s/g, "");
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function sumObj(obj) {
    return Object.values(obj).reduce((a, b) => a + b, 0);
  }

  function fmtMoney(v) {
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    return `${v.toFixed(2)}%`;
  }

  function tagClassificacao(text) {
    const key = text === "Ignorar" ? "ok" : text === "Ajustar via aporte" ? "warn" : "danger";
    return `<span class="badge ${key}">${text}</span>`;
  }

  function renderPlan(plan) {
    el.resultWrapper.classList.remove("hidden");
    el.resultTableBody.innerHTML = "";

    plan.rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.classe}</td>
        <td>${fmtPct(r.percentualAtual)}</td>
        <td>${fmtPct(r.percentualAlvo)}</td>
        <td>${r.diferenca >= 0 ? "+" : ""}${r.diferenca.toFixed(2)}</td>
        <td>${fmtMoney(r.valorIdeal)}</td>
        <td>${fmtMoney(r.comprarAporte)}</td>
        <td>${r.precisaVender ? "Sim" : "Nao"}</td>
        <td>${fmtMoney(r.vendaRecomendada)}</td>
        <td>${tagClassificacao(r.classificacao)}</td>
      `;
      el.resultTableBody.appendChild(tr);
    });

    el.summaryText.textContent = plan.summary;
    el.familyOfficeReport.textContent = buildFamilyOfficeReport(plan);
  }

  function renderHistory(history) {
    el.historyTableBody.innerHTML = "";
    history.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.mes}</td>
        <td>${fmtMoney(row.patrimonioAntesAporte)}</td>
        <td>${fmtMoney(row.patrimonioDepoisAporte)}</td>
        <td>${row.score.toFixed(1)}</td>
        <td>${row.rating}</td>
        <td>${row.resumo}</td>
      `;
      el.historyTableBody.appendChild(tr);
    });
  }

  function buildFamilyOfficeReport(plan) {
    const alloc = plan.rows
      .map((r) => `- ${r.classe}: atual ${r.percentualAtual.toFixed(2)}% | alvo ${r.percentualAlvo.toFixed(2)}% | diff ${r.diferenca >= 0 ? "+" : ""}${r.diferenca.toFixed(2)} p.p.`)
      .join("\n");

    const buys = Object.entries(plan.buys)
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0.01)
      .map(([k, v]) => `- ${k}: R$ ${fmtMoney(v)}`)
      .join("\n");

    const report = [
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
    ];

    return report.join("\n");
  }

  function getAnnualReturns() {
    const out = {};
    document.querySelectorAll("input[data-role='ret']").forEach((input) => {
      out[input.dataset.class] = getNumber(input.value);
    });
    return out;
  }

  function getCurrentTargetTotal() {
    const total = getNumber(el.totalValue.value);
    const aporte = getNumber(el.monthlyContribution.value);
    const { current, target } = readCurrentAndTargets();
    const portfolio = buildPortfolioValues(total, current);
    return { total, aporte, current, target, portfolio };
  }

  function handleRebalance() {
    try {
      const { aporte, target, portfolio } = getCurrentTargetTotal();
      const plan = rebalanceMonth(portfolio, aporte, target);
      latestPlan = { ...plan, targetPct: target, portfolioBefore: portfolio };
      renderPlan(plan);
    } catch (err) {
      alert(err.message || "Erro ao calcular rebalanceamento.");
    }
  }

  function handleSimulate() {
    try {
      const months = Math.max(1, Math.floor(getNumber(el.simMonths.value)) || 12);
      const { aporte, target, portfolio } = getCurrentTargetTotal();
      const annualReturns = getAnnualReturns();
      const history = simulateMonths(portfolio, aporte, annualReturns, target, months);
      renderHistory(history);

      // Executa tambem cenarios para manter funcao futura disponivel.
      const scenarios = simulateFutureScenarios(portfolio, aporte, annualReturns, target, months);
      if (latestPlan) {
        latestPlan.scenarios = scenarios;
      }
    } catch (err) {
      alert(err.message || "Erro na simulacao.");
    }
  }

  function handleParseOcr() {
    const text = el.ocrText.value.trim();
    if (!text) {
      el.ocrStatus.textContent = "Cole texto OCR para processar.";
      return;
    }

    const { total, pctNorm } = parseOcrText(text);
    if (!pctNorm) {
      el.ocrStatus.textContent = "Nao foi possivel identificar percentuais no OCR.";
      return;
    }

    if (total && total > 0) {
      el.totalValue.value = total.toFixed(2);
    }

    document.querySelectorAll("input[data-role='current']").forEach((input) => {
      const cls = input.dataset.class;
      if (pctNorm[cls] != null) {
        input.value = pctNorm[cls].toFixed(2);
      }
    });

    el.ocrStatus.textContent = "OCR aplicado com sucesso.";
  }

  function resetTargets() {
    document.querySelectorAll("input[data-role='target']").forEach((input) => {
      input.value = DEFAULT_TARGETS[input.dataset.class].toFixed(2);
    });
  }

  function init() {
    buildInputRows();
    el.rebalanceBtn.addEventListener("click", handleRebalance);
    el.simulateBtn.addEventListener("click", handleSimulate);
    el.parseOcrBtn.addEventListener("click", handleParseOcr);
    el.resetTargetsBtn.addEventListener("click", resetTargets);
  }

  init();
})();
