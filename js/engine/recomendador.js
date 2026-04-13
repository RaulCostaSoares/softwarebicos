(function () {
  const LIMITES_ESPACAMENTO = {
    leque: { min: 0.35, max: 0.7 },
    conico: { min: 0.2, max: 0.6 },
    rotativo: { min: 0.25, max: 1.5 },
  };
  // Ajuste rapido: limite minimo para exibir opcoes de cor em atomizadores (VRU).
  const LIMITE_MIN_PSI_COR_ATOMIZADOR = 15;
  // Limite tecnico absoluto: abaixo disso nao exibir/recomendar PSI.
  const LIMITE_MIN_PSI_TECNICO = 15;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function faixaPsiCumpreMinimoTecnico(faixaPsi) {
    return Boolean(
      faixaPsi &&
        Number.isFinite(faixaPsi.min) &&
        Number.isFinite(faixaPsi.med) &&
        Number.isFinite(faixaPsi.max) &&
        faixaPsi.min >= LIMITE_MIN_PSI_TECNICO &&
        faixaPsi.med >= LIMITE_MIN_PSI_TECNICO &&
        faixaPsi.max >= LIMITE_MIN_PSI_TECNICO
    );
  }

  function familiaPublica(familia) {
    return familia === "leque" ? "plano" : familia;
  }

  function escolherAlvo(estrategia) {
    if (estrategia === "reserva") return 0.45;
    if (estrategia === "uniformidade") return 0.62;
    return 0.55;
  }

  function penalidadeFamilia(item, preferenciaFamilia) {
    if (preferenciaFamilia === "auto") return 0;
    if (preferenciaFamilia === "conico") return item.familia === "conico" ? 0 : 18;
    if (preferenciaFamilia === item.familia) return 0;
    return 18;
  }

  function itemPassaFiltroTipos(item, tiposPermitidos) {
    if (!tiposPermitidos) return true;
    const tipoJato = String(item.tipoJato || "").toLowerCase();
    const nome = String(item.nome || "").toLowerCase();
    const id = String(item.id || "").toUpperCase();
    const isSolido = tipoJato.includes("solido");
    const isLeque = item.familia === "leque" && (tipoJato.includes("leque") || !tipoJato);
    const isConico = item.familia === "conico";
    const isConicoEletrostatico = isConico && (id === "90500" || nome.includes("eletrostatic"));
    const isConicoCoreDisco = isConico && !isConicoEletrostatico;
    const isAtomizador = item.familia === "rotativo" || item.categoria === "atomizador";
    const separarConico =
      Object.prototype.hasOwnProperty.call(tiposPermitidos, "conicoCoreDisco") ||
      Object.prototype.hasOwnProperty.call(tiposPermitidos, "conicoEletrostatico");
    const permitirConicoCoreDisco = separarConico
      ? Boolean(tiposPermitidos.conicoCoreDisco)
      : Boolean(tiposPermitidos.conico);
    const permitirConicoEletrostatico = separarConico
      ? Boolean(tiposPermitidos.conicoEletrostatico)
      : Boolean(tiposPermitidos.conico);

    return (
      (tiposPermitidos.leque && isLeque) ||
      (tiposPermitidos.solido && isSolido) ||
      (permitirConicoCoreDisco && isConicoCoreDisco) ||
      (permitirConicoEletrostatico && isConicoEletrostatico) ||
      (tiposPermitidos.atomizador && isAtomizador)
    );
  }

  function chavesFiltroDetalhadoPorItem(item) {
    const tipoJato = String(item.tipoJato || "").toLowerCase();
    const nome = String(item.nome || "").toLowerCase();
    const id = String(item.id || "").toUpperCase();
    const isSolido = tipoJato.includes("solido");
    const isLeque = item.familia === "leque" && (tipoJato.includes("leque") || !tipoJato);
    const isConico = item.familia === "conico";
    const isConicoEletro = isConico && (id === "90500" || nome.includes("eletrostatic"));
    const isConicoCore = isConico && !isConicoEletro;
    const out = [];
    if (isLeque) out.push("leque");
    if (isSolido) out.push("solido");
    if (isConicoCore) out.push("conico-core");
    if (isConicoEletro) out.push("conico-eletro");
    return out;
  }

  function itemPassaFiltrosEspecificos(item, tiposPermitidos, filtrosEspecificos) {
    if (!filtrosEspecificos || typeof filtrosEspecificos !== "object") return true;

    const gruposAtivos = [];
    if (tiposPermitidos && tiposPermitidos.leque) gruposAtivos.push("leque");
    if (tiposPermitidos && tiposPermitidos.solido) gruposAtivos.push("solido");
    if (tiposPermitidos && tiposPermitidos.conicoCoreDisco) gruposAtivos.push("conico-core");
    if (tiposPermitidos && tiposPermitidos.conicoEletrostatico) gruposAtivos.push("conico-eletro");
    if (!gruposAtivos.length) return true;

    const idItem = String(item.id || "").toUpperCase();
    const gruposItem = chavesFiltroDetalhadoPorItem(item).filter((g) => gruposAtivos.includes(g));
    if (!gruposItem.length) return true;

    let temRegraAplicavel = false;
    for (let i = 0; i < gruposItem.length; i += 1) {
      const grupo = gruposItem[i];
      if (!Object.prototype.hasOwnProperty.call(filtrosEspecificos, grupo)) continue;
      temRegraAplicavel = true;
      const idsPermitidos = Array.isArray(filtrosEspecificos[grupo]) ? filtrosEspecificos[grupo] : [];
      for (let j = 0; j < idsPermitidos.length; j += 1) {
        if (String(idsPermitidos[j] || "").toUpperCase() === idItem) {
          return true;
        }
      }
    }

    if (!temRegraAplicavel) return true;
    return false;
  }

  function itemEhEletrostatico(item) {
    const nome = String((item && item.nome) || "").toLowerCase();
    const id = String((item && item.id) || "").toUpperCase();
    return id === "90500" || nome.includes("eletrostatic");
  }

  function resolverFaixaPsiAplicada(item, psiFaixaDesejada, psiFaixasPorTipo) {
    if (!psiFaixaDesejada) return null;

    const minBase = Number(psiFaixaDesejada.min);
    const maxBase = Number(psiFaixaDesejada.max);
    if (!Number.isFinite(minBase) || !Number.isFinite(maxBase)) return null;

    const chave = itemEhEletrostatico(item) ? "eletrostatico" : "outros";
    const faixaTipo =
      psiFaixasPorTipo && psiFaixasPorTipo[chave] ? psiFaixasPorTipo[chave] : null;

    let min = minBase;
    let max = maxBase;
    if (faixaTipo && Number.isFinite(Number(faixaTipo.min))) min = Number(faixaTipo.min);
    if (faixaTipo && Number.isFinite(Number(faixaTipo.max))) max = Number(faixaTipo.max);
    if (max < min) max = min;

    return { min, max };
  }

  function formatFaixaPsi(minPsi, maxPsi) {
    if (!Number.isFinite(minPsi) || !Number.isFinite(maxPsi)) {
      return "Sem faixa de PSI no catalogo";
    }
    return `${minPsi.toFixed(1)}-${maxPsi.toFixed(1)} psi`;
  }

  function normalizarCurva(item) {
    if (!Array.isArray(item.curvaPressaoVazao)) return [];
    return item.curvaPressaoVazao
      .filter(
        (ponto) =>
          ponto &&
          Number.isFinite(Number(ponto.psi)) &&
          Number.isFinite(Number(ponto.vazaoLMin))
      )
      .map((ponto) => ({
        psi: Number(ponto.psi),
        vazaoLMin: Number(ponto.vazaoLMin),
      }))
      .sort((a, b) => a.psi - b.psi);
  }

  function normalizarCurvaPontos(pontos) {
    if (!Array.isArray(pontos)) return [];
    return pontos
      .filter(
        (ponto) =>
          ponto &&
          Number.isFinite(Number(ponto.psi)) &&
          Number.isFinite(Number(ponto.vazaoLMin))
      )
      .map((ponto) => ({
        psi: Number(ponto.psi),
        vazaoLMin: Number(ponto.vazaoLMin),
      }))
      .sort((a, b) => a.psi - b.psi);
  }

  function interpolarVazaoNaCurva(curva, psi) {
    if (!curva.length) return null;
    if (psi < curva[0].psi || psi > curva[curva.length - 1].psi) return null;
    if (psi === curva[0].psi) return curva[0].vazaoLMin;
    if (psi === curva[curva.length - 1].psi) return curva[curva.length - 1].vazaoLMin;

    for (let i = 0; i < curva.length - 1; i += 1) {
      const a = curva[i];
      const b = curva[i + 1];
      if (psi >= a.psi && psi <= b.psi) {
        const spanPsi = b.psi - a.psi;
        if (spanPsi === 0) return a.vazaoLMin;
        const t = (psi - a.psi) / spanPsi;
        return a.vazaoLMin + (b.vazaoLMin - a.vazaoLMin) * t;
      }
    }
    return null;
  }

  function estimarPsiPorVazao(curva, vazao, permitirExtrapolacao) {
    if (!curva.length) return null;
    let idxMin = 0;
    let idxMax = 0;
    for (let i = 1; i < curva.length; i += 1) {
      if (curva[i].vazaoLMin < curva[idxMin].vazaoLMin) idxMin = i;
      if (curva[i].vazaoLMin > curva[idxMax].vazaoLMin) idxMax = i;
    }

    const vMin = curva[idxMin].vazaoLMin;
    const vMax = curva[idxMax].vazaoLMin;

    const interpolarSegmento = (a, b, alvoVazao) => {
      if (!a || !b) return null;
      const spanV = b.vazaoLMin - a.vazaoLMin;
      if (spanV === 0) return a.psi;
      const t = (alvoVazao - a.vazaoLMin) / spanV;
      return a.psi + (b.psi - a.psi) * t;
    };

    if (vazao < vMin || vazao > vMax) {
      if (!permitirExtrapolacao || curva.length < 2) return null;
      if (vazao < vMin) {
        if (idxMin < curva.length - 1) {
          return interpolarSegmento(curva[idxMin], curva[idxMin + 1], vazao);
        }
        return interpolarSegmento(curva[idxMin - 1], curva[idxMin], vazao);
      }
      if (idxMax > 0) {
        return interpolarSegmento(curva[idxMax - 1], curva[idxMax], vazao);
      }
      return interpolarSegmento(curva[idxMax], curva[idxMax + 1], vazao);
    }

    const candidatosPsi = [];
    for (let i = 0; i < curva.length - 1; i += 1) {
      const a = curva[i];
      const b = curva[i + 1];
      const minSeg = Math.min(a.vazaoLMin, b.vazaoLMin);
      const maxSeg = Math.max(a.vazaoLMin, b.vazaoLMin);
      if (vazao >= minSeg && vazao <= maxSeg) {
        const psiCalc = interpolarSegmento(a, b, vazao);
        if (Number.isFinite(psiCalc)) candidatosPsi.push(psiCalc);
      }
    }
    if (!candidatosPsi.length) return null;
    return Math.min(...candidatosPsi);
  }

  function avaliarGarantiaCurva(item, psiFaixaDesejada, vReq) {
    const curva = normalizarCurva(item);
    if (curva.length < 2) {
      return {
        disponivel: false,
        compativel: false,
        motivo: "sem-curva",
        psiEstimadoFaixa: null,
        faixaVazaoNoAlvoPsi: null,
      };
    }

    const psiMinUtil = Math.max(psiFaixaDesejada.min, curva[0].psi);
    const psiMaxUtil = Math.min(psiFaixaDesejada.max, curva[curva.length - 1].psi);
    if (psiMinUtil > psiMaxUtil) {
      return {
        disponivel: true,
        compativel: false,
        motivo: "fora-faixa-psi-curva",
        psiEstimadoFaixa: null,
        faixaVazaoNoAlvoPsi: null,
      };
    }

    const vazaoPsiMin = interpolarVazaoNaCurva(curva, psiMinUtil);
    const vazaoPsiMax = interpolarVazaoNaCurva(curva, psiMaxUtil);
    if (!Number.isFinite(vazaoPsiMin) || !Number.isFinite(vazaoPsiMax)) {
      return {
        disponivel: true,
        compativel: false,
        motivo: "falha-interpolacao",
        psiEstimadoFaixa: null,
        faixaVazaoNoAlvoPsi: null,
      };
    }

    const faixaVazaoNoAlvoPsi = {
      min: Math.min(vazaoPsiMin, vazaoPsiMax),
      max: Math.max(vazaoPsiMin, vazaoPsiMax),
    };

    const psiEstimadoFaixa = {
      min: estimarPsiPorVazao(curva, vReq.min, true),
      med: estimarPsiPorVazao(curva, vReq.med, true),
      max: estimarPsiPorVazao(curva, vReq.max, true),
    };

    const compFaixaVazao =
      vReq.min >= faixaVazaoNoAlvoPsi.min &&
      vReq.min <= faixaVazaoNoAlvoPsi.max &&
      vReq.med >= faixaVazaoNoAlvoPsi.min &&
      vReq.med <= faixaVazaoNoAlvoPsi.max &&
      vReq.max >= faixaVazaoNoAlvoPsi.min &&
      vReq.max <= faixaVazaoNoAlvoPsi.max;

    const compPsiEstimado =
      Number.isFinite(psiEstimadoFaixa.min) &&
      Number.isFinite(psiEstimadoFaixa.med) &&
      Number.isFinite(psiEstimadoFaixa.max) &&
      psiEstimadoFaixa.min >= psiFaixaDesejada.min &&
      psiEstimadoFaixa.min <= psiFaixaDesejada.max &&
      psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
      psiEstimadoFaixa.med <= psiFaixaDesejada.max &&
      psiEstimadoFaixa.max >= psiFaixaDesejada.min &&
      psiEstimadoFaixa.max <= psiFaixaDesejada.max;

    return {
      disponivel: true,
      compativel: compFaixaVazao && compPsiEstimado,
      motivo: compFaixaVazao && compPsiEstimado ? "ok" : "vazao-fora-curva-no-alvo-psi",
      psiEstimadoFaixa,
      faixaVazaoNoAlvoPsi,
    };
  }

  function avaliarCurvasOrificio(item, psiFaixaDesejada, vReq) {
    if (!Array.isArray(item.curvasOrificio) || !item.curvasOrificio.length) {
      return null;
    }

    const candidatos = [];
    const candidatosParciais = [];
    const alvoPsi = psiFaixaDesejada
      ? (psiFaixaDesejada.min + psiFaixaDesejada.max) / 2
      : 40;

    for (let i = 0; i < item.curvasOrificio.length; i += 1) {
      const curvaOrificio = item.curvasOrificio[i];
      const curva = normalizarCurvaPontos(curvaOrificio.pontos);
      if (curva.length < 2) continue;

      const psiEstimadoFaixa = {
        min: estimarPsiPorVazao(curva, vReq.min, true),
        med: estimarPsiPorVazao(curva, vReq.med, true),
        max: estimarPsiPorVazao(curva, vReq.max, true),
      };
      const temPsiMin = Number.isFinite(psiEstimadoFaixa.min);
      const temPsiMed = Number.isFinite(psiEstimadoFaixa.med);
      const temPsiMax = Number.isFinite(psiEstimadoFaixa.max);
      const temPsiCompleto = temPsiMin && temPsiMed && temPsiMax;
      const cumpreMinimoTecnico = temPsiCompleto && faixaPsiCumpreMinimoTecnico(psiEstimadoFaixa);
      const temPsiParcial = temPsiMed || temPsiMin || temPsiMax;
      if (!temPsiParcial) continue;

      let compativelFaixaPsi = true;
      if (psiFaixaDesejada && temPsiCompleto) {
        compativelFaixaPsi =
          psiEstimadoFaixa.min >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.min <= psiFaixaDesejada.max &&
          psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.med <= psiFaixaDesejada.max &&
          psiEstimadoFaixa.max >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.max <= psiFaixaDesejada.max;
      }
      const compativelMedPsi = psiFaixaDesejada
        ? temPsiMed &&
          psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.med <= psiFaixaDesejada.max
        : temPsiMed;

      const distanciaAlvo =
        (temPsiMin ? Math.abs(psiEstimadoFaixa.min - alvoPsi) : 50) +
        (temPsiMed ? Math.abs(psiEstimadoFaixa.med - alvoPsi) : 50) +
        (temPsiMax ? Math.abs(psiEstimadoFaixa.max - alvoPsi) : 50);

      const cand = {
        orificioMm: Number(curvaOrificio.orificioMm),
        psiEstimadoFaixa,
        temPsiCompleto,
        cumpreMinimoTecnico,
        compativelFaixaPsi,
        distanciaAlvo,
      };
      if (temPsiCompleto && cumpreMinimoTecnico) {
        candidatos.push(cand);
      }
      candidatosParciais.push(cand);
    }

    if (!candidatosParciais.length) {
      return {
        disponivel: true,
        compativel: false,
        melhor: null,
      };
    }

    candidatos.sort((a, b) => {
      if (a.compativelFaixaPsi !== b.compativelFaixaPsi) {
        return a.compativelFaixaPsi ? -1 : 1;
      }
      return a.distanciaAlvo - b.distanciaAlvo;
    });

    candidatosParciais.sort((a, b) => {
      const aMed = Number.isFinite(a.psiEstimadoFaixa.med) ? Math.abs(a.psiEstimadoFaixa.med - alvoPsi) : 999;
      const bMed = Number.isFinite(b.psiEstimadoFaixa.med) ? Math.abs(b.psiEstimadoFaixa.med - alvoPsi) : 999;
      return aMed - bMed;
    });

    const melhorCompleto = candidatos[0] || null;
    const melhorParcial = candidatosParciais[0] || null;
    const opcoes = candidatos.map((c) => ({
        orificioMm: c.orificioMm,
        psiEstimadoFaixa: c.psiEstimadoFaixa,
        distanciaAlvo: c.distanciaAlvo,
      }));

    return {
      disponivel: true,
      compativel: Boolean(melhorCompleto && melhorCompleto.compativelFaixaPsi),
      melhor: melhorCompleto || melhorParcial,
      opcoes,
    };
  }

  function avaliarCurvasDisco(item, psiFaixaDesejada, vReq) {
    if (!Array.isArray(item.curvasDisco) || !item.curvasDisco.length) {
      return null;
    }

    const candidatos = [];
    const candidatosParciais = [];
    const alvoPsi = psiFaixaDesejada ? (psiFaixaDesejada.min + psiFaixaDesejada.max) / 2 : 40;

    for (let i = 0; i < item.curvasDisco.length; i += 1) {
      const curvaDisco = item.curvasDisco[i];
      const curva = normalizarCurvaPontos(curvaDisco.pontos);
      if (curva.length < 2) continue;

      const psiEstimadoFaixa = {
        min: estimarPsiPorVazao(curva, vReq.min, true),
        med: estimarPsiPorVazao(curva, vReq.med, true),
        max: estimarPsiPorVazao(curva, vReq.max, true),
      };
      const temPsiMin = Number.isFinite(psiEstimadoFaixa.min);
      const temPsiMed = Number.isFinite(psiEstimadoFaixa.med);
      const temPsiMax = Number.isFinite(psiEstimadoFaixa.max);
      const temPsiCompleto = temPsiMin && temPsiMed && temPsiMax;
      const cumpreMinimoTecnico = temPsiCompleto && faixaPsiCumpreMinimoTecnico(psiEstimadoFaixa);
      const temPsiParcial = temPsiMed || temPsiMin || temPsiMax;
      if (!temPsiParcial) continue;

      let compativelFaixaPsi = true;
      if (psiFaixaDesejada && temPsiCompleto) {
        compativelFaixaPsi =
          psiEstimadoFaixa.min >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.min <= psiFaixaDesejada.max &&
          psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.med <= psiFaixaDesejada.max &&
          psiEstimadoFaixa.max >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.max <= psiFaixaDesejada.max;
      }
      const compativelMedPsi = psiFaixaDesejada
        ? temPsiMed &&
          psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
          psiEstimadoFaixa.med <= psiFaixaDesejada.max
        : temPsiMed;

      const distanciaAlvo =
        (temPsiMin ? Math.abs(psiEstimadoFaixa.min - alvoPsi) : 50) +
        (temPsiMed ? Math.abs(psiEstimadoFaixa.med - alvoPsi) : 50) +
        (temPsiMax ? Math.abs(psiEstimadoFaixa.max - alvoPsi) : 50);
      const cand = {
        disco: String(curvaDisco.disco || ""),
        psiEstimadoFaixa,
        temPsiCompleto,
        cumpreMinimoTecnico,
        compativelFaixaPsi,
        compativelMedPsi,
        distanciaAlvo,
      };
      if (temPsiCompleto && cumpreMinimoTecnico) candidatos.push(cand);
      candidatosParciais.push(cand);
    }

    if (!candidatosParciais.length) {
      return { disponivel: true, compativel: false, melhor: null };
    }

    candidatos.sort((a, b) => {
      if (a.compativelFaixaPsi !== b.compativelFaixaPsi) {
        return a.compativelFaixaPsi ? -1 : 1;
      }
      return a.distanciaAlvo - b.distanciaAlvo;
    });
    const candidatosMed = candidatosParciais
      .filter((c) => c.compativelMedPsi && Number.isFinite(c.psiEstimadoFaixa.med))
      .sort(
        (a, b) =>
          Math.abs(a.psiEstimadoFaixa.med - alvoPsi) - Math.abs(b.psiEstimadoFaixa.med - alvoPsi)
      );

    if (!candidatosMed.length) {
      candidatosParciais.sort((a, b) => {
        if (a.compativelFaixaPsi !== b.compativelFaixaPsi) {
          return a.compativelFaixaPsi ? -1 : 1;
        }
        if (a.compativelMedPsi !== b.compativelMedPsi) {
          return a.compativelMedPsi ? -1 : 1;
        }
        const aMed = Number.isFinite(a.psiEstimadoFaixa.med) ? Math.abs(a.psiEstimadoFaixa.med - alvoPsi) : 999;
        const bMed = Number.isFinite(b.psiEstimadoFaixa.med) ? Math.abs(b.psiEstimadoFaixa.med - alvoPsi) : 999;
        if (aMed !== bMed) return aMed - bMed;
        return a.distanciaAlvo - b.distanciaAlvo;
      });
    }

    const melhorParcial = (candidatosMed.length ? candidatosMed[0] : candidatosParciais[0]) || null;
    const opcoes = candidatos
      .map((c) => ({
        disco: c.disco,
        psiEstimadoFaixa: c.psiEstimadoFaixa,
        distanciaAlvo: c.distanciaAlvo,
      }));
    const melhorCompativel = candidatos.find((c) => c.compativelFaixaPsi) || null;
    return {
      disponivel: true,
      compativel: Boolean(melhorCompativel && melhorCompativel.compativelFaixaPsi),
      melhor: melhorCompativel || melhorParcial,
      opcoes,
    };
  }

  function avaliarPontasColoridas(item, psiFaixaDesejada, vReq) {
    if (!Array.isArray(item.curvasPontaColorida) || !item.curvasPontaColorida.length) {
      return null;
    }

    const alvoPsi = psiFaixaDesejada ? (psiFaixaDesejada.min + psiFaixaDesejada.max) / 2 : 40;
    const candidatos = item.curvasPontaColorida
      .map((ponta) => {
        const curva = normalizarCurvaPontos(ponta.pontos);
        if (curva.length < 2) return null;
        const psiEstimadoFaixa = {
          min: estimarPsiPorVazao(curva, vReq.min, true),
          med: estimarPsiPorVazao(curva, vReq.med, true),
          max: estimarPsiPorVazao(curva, vReq.max, true),
        };
        const temCompleto =
          Number.isFinite(psiEstimadoFaixa.min) &&
          Number.isFinite(psiEstimadoFaixa.med) &&
          Number.isFinite(psiEstimadoFaixa.max);
        if (!temCompleto) return null;
        if (!faixaPsiCumpreMinimoTecnico(psiEstimadoFaixa)) return null;

        const compativelFaixaPsi = psiFaixaDesejada
          ? psiEstimadoFaixa.min >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.min <= psiFaixaDesejada.max &&
            psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.med <= psiFaixaDesejada.max &&
            psiEstimadoFaixa.max >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.max <= psiFaixaDesejada.max
          : true;

        const distanciaAlvo =
          Math.abs(psiEstimadoFaixa.min - alvoPsi) +
          Math.abs(psiEstimadoFaixa.med - alvoPsi) +
          Math.abs(psiEstimadoFaixa.max - alvoPsi);

        return {
          codigo: ponta.codigo || "",
          cor: ponta.cor || "",
          psiEstimadoFaixa,
          compativelFaixaPsi,
          distanciaAlvo,
        };
      })
      .filter(Boolean);

    if (!candidatos.length) {
      return { disponivel: true, compativel: false, melhor: null, sugeridas: [] };
    }

    candidatos.sort((a, b) => {
      if (a.compativelFaixaPsi !== b.compativelFaixaPsi) {
        return a.compativelFaixaPsi ? -1 : 1;
      }
      return a.distanciaAlvo - b.distanciaAlvo;
    });

    const melhor = candidatos[0];
    const sugeridas = [
      {
        codigo: melhor.codigo,
        cor: melhor.cor,
        regimes: [
          `min:${melhor.psiEstimadoFaixa.min.toFixed(1)}psi`,
          `med:${melhor.psiEstimadoFaixa.med.toFixed(1)}psi`,
          `max:${melhor.psiEstimadoFaixa.max.toFixed(1)}psi`,
        ],
      },
    ];

    return {
      disponivel: true,
      compativel: Boolean(melhor.compativelFaixaPsi),
      melhor: {
        codigo: melhor.codigo,
        cor: melhor.cor,
        psiEstimadoFaixa: melhor.psiEstimadoFaixa,
      },
      opcoes: candidatos.map((c) => ({
          codigo: c.codigo,
          cor: c.cor,
          psiEstimadoFaixa: c.psiEstimadoFaixa,
          distanciaAlvo: c.distanciaAlvo,
        })),
      sugeridas,
    };
  }

  function avaliarTabelaVru(item, psiFaixaDesejada, vReq) {
    const tabela = item.tabelaVru;
    if (!tabela || !Array.isArray(tabela.psi) || !Array.isArray(tabela.linhas) || !tabela.linhas.length) {
      return null;
    }

    const psiBase = tabela.psi
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    if (psiBase.length < 2) return null;

    const cores = Array.isArray(tabela.coresRegulagem) && tabela.coresRegulagem.length
      ? tabela.coresRegulagem.map((c) => String(c))
      : ["canal-1", "canal-2", "canal-3"];
    const alvoPsi = psiFaixaDesejada ? (psiFaixaDesejada.min + psiFaixaDesejada.max) / 2 : 40;

    const candidatos = [];
    const candidatosParciais = [];

    for (let i = 0; i < tabela.linhas.length; i += 1) {
      const linha = tabela.linhas[i];
      if (!linha || !Array.isArray(linha.valores)) continue;
      const posicao = Number.isFinite(Number(linha.posicao)) ? Number(linha.posicao) : i;

      for (let corIdx = 0; corIdx < cores.length; corIdx += 1) {
        const curva = [];
        for (let p = 0; p < psiBase.length && p < linha.valores.length; p += 1) {
          const tripla = linha.valores[p];
          if (!Array.isArray(tripla) || !Number.isFinite(Number(tripla[corIdx]))) continue;
          curva.push({ psi: psiBase[p], vazaoLMin: Number(tripla[corIdx]) });
        }
        if (curva.length < 2) continue;

        const psiEstimadoFaixa = {
          min: estimarPsiPorVazao(curva, vReq.min, true),
          med: estimarPsiPorVazao(curva, vReq.med, true),
          max: estimarPsiPorVazao(curva, vReq.max, true),
        };
        const temPsiMin = Number.isFinite(psiEstimadoFaixa.min);
        const temPsiMed = Number.isFinite(psiEstimadoFaixa.med);
        const temPsiMax = Number.isFinite(psiEstimadoFaixa.max);
        const temPsiCompleto = temPsiMin && temPsiMed && temPsiMax;
        const cumpreMinimoTecnico = temPsiCompleto && faixaPsiCumpreMinimoTecnico(psiEstimadoFaixa);
        const temPsiParcial = temPsiMed || temPsiMin || temPsiMax;
        if (!temPsiParcial) continue;

        let compativelFaixaPsi = true;
        if (psiFaixaDesejada && temPsiCompleto) {
          compativelFaixaPsi =
            psiEstimadoFaixa.min >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.min <= psiFaixaDesejada.max &&
            psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.med <= psiFaixaDesejada.max &&
            psiEstimadoFaixa.max >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.max <= psiFaixaDesejada.max;
        }
        const compativelMedPsi = psiFaixaDesejada
          ? temPsiMed &&
            psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
            psiEstimadoFaixa.med <= psiFaixaDesejada.max
          : temPsiMed;

        const distanciaAlvo =
          (temPsiMin ? Math.abs(psiEstimadoFaixa.min - alvoPsi) : 50) +
          (temPsiMed ? Math.abs(psiEstimadoFaixa.med - alvoPsi) : 50) +
          (temPsiMax ? Math.abs(psiEstimadoFaixa.max - alvoPsi) : 50);

        const cand = {
          posicao,
          cor: cores[corIdx],
          psiEstimadoFaixa,
          temPsiCompleto,
          cumpreMinimoTecnico,
          compativelFaixaPsi,
          compativelMedPsi,
          distanciaAlvo,
        };
        if (temPsiCompleto && cumpreMinimoTecnico) candidatos.push(cand);
        candidatosParciais.push(cand);
      }
    }

    if (!candidatosParciais.length) {
      return { disponivel: true, compativel: false, melhor: null };
    }

    candidatos.sort((a, b) => {
      if (a.compativelFaixaPsi !== b.compativelFaixaPsi) {
        return a.compativelFaixaPsi ? -1 : 1;
      }
      return a.distanciaAlvo - b.distanciaAlvo;
    });

    const candidatosMed = candidatosParciais
      .filter((c) => c.compativelMedPsi && Number.isFinite(c.psiEstimadoFaixa.med))
      .sort(
        (a, b) =>
          Math.abs(a.psiEstimadoFaixa.med - alvoPsi) - Math.abs(b.psiEstimadoFaixa.med - alvoPsi)
      );

    if (!candidatosMed.length) {
      candidatosParciais.sort((a, b) => {
        if (a.compativelFaixaPsi !== b.compativelFaixaPsi) {
          return a.compativelFaixaPsi ? -1 : 1;
        }
        if (a.compativelMedPsi !== b.compativelMedPsi) {
          return a.compativelMedPsi ? -1 : 1;
        }
        const aMed = Number.isFinite(a.psiEstimadoFaixa.med) ? Math.abs(a.psiEstimadoFaixa.med - alvoPsi) : 999;
        const bMed = Number.isFinite(b.psiEstimadoFaixa.med) ? Math.abs(b.psiEstimadoFaixa.med - alvoPsi) : 999;
        if (aMed !== bMed) return aMed - bMed;
        return a.distanciaAlvo - b.distanciaAlvo;
      });
    }

    const melhorParcial = (candidatosMed.length ? candidatosMed[0] : candidatosParciais[0]) || null;
    const opcoes = candidatos
      .map((c) => ({
        posicao: c.posicao,
        cor: c.cor,
        psiEstimadoFaixa: c.psiEstimadoFaixa,
        distanciaAlvo: c.distanciaAlvo,
      }));
    const opcoesTodas = candidatosParciais
      .filter((c) => c.temPsiCompleto)
      .sort((a, b) => a.distanciaAlvo - b.distanciaAlvo)
      .map((c) => ({
        posicao: c.posicao,
        cor: c.cor,
        psiEstimadoFaixa: c.psiEstimadoFaixa,
        distanciaAlvo: c.distanciaAlvo,
      }));
    const melhorCompativel = candidatos.find((c) => c.compativelFaixaPsi) || null;
    return {
      disponivel: true,
      compativel: Boolean(melhorCompativel && melhorCompativel.compativelFaixaPsi),
      melhor: melhorCompativel || melhorParcial,
      opcoes,
      opcoesTodas,
    };
  }

  function estimarPsiFaixaCatalogo(item, psiFaixaDesejada, vReq) {
    const psiMin = Number(item.pressaoMinPsi);
    const psiMax = Number(item.pressaoMaxPsi);
    const qMin = Number(item.vazaoMinLMin);
    const qMax = Number(item.vazaoMaxLMin);
    if (
      !Number.isFinite(psiMin) ||
      !Number.isFinite(psiMax) ||
      !Number.isFinite(qMin) ||
      !Number.isFinite(qMax) ||
      psiMin <= 0 ||
      psiMax <= 0 ||
      psiMin >= psiMax ||
      qMin >= qMax
    ) {
      return null;
    }

    const sMin = Math.sqrt(psiMin);
    const sMax = Math.sqrt(psiMax);
    const den = sMax - sMin;
    if (den === 0) return null;

    // Modelo continuo: Q = a*sqrt(psi) + b (calibrado em min/max do catalogo).
    const a = (qMax - qMin) / den;
    const b = qMin - a * sMin;

    function psiPorVazao(q) {
      if (!Number.isFinite(q) || a === 0) return null;
      const s = (q - b) / a;
      if (!Number.isFinite(s)) return null;
      return s * s;
    }

    const psiEstimadoFaixa = {
      min: psiPorVazao(vReq.min),
      med: psiPorVazao(vReq.med),
      max: psiPorVazao(vReq.max),
    };
    const temCompleto =
      Number.isFinite(psiEstimadoFaixa.min) &&
      Number.isFinite(psiEstimadoFaixa.med) &&
      Number.isFinite(psiEstimadoFaixa.max);
    if (!temCompleto) return null;
    if (!faixaPsiCumpreMinimoTecnico(psiEstimadoFaixa)) return null;

    const dentroCatalogo =
      psiEstimadoFaixa.min >= psiMin &&
      psiEstimadoFaixa.min <= psiMax &&
      psiEstimadoFaixa.med >= psiMin &&
      psiEstimadoFaixa.med <= psiMax &&
      psiEstimadoFaixa.max >= psiMin &&
      psiEstimadoFaixa.max <= psiMax;
    const dentroFaixaDesejada = psiFaixaDesejada
      ? psiEstimadoFaixa.min >= psiFaixaDesejada.min &&
        psiEstimadoFaixa.min <= psiFaixaDesejada.max &&
        psiEstimadoFaixa.med >= psiFaixaDesejada.min &&
        psiEstimadoFaixa.med <= psiFaixaDesejada.max &&
        psiEstimadoFaixa.max >= psiFaixaDesejada.min &&
        psiEstimadoFaixa.max <= psiFaixaDesejada.max
      : true;

    return {
      disponivel: true,
      compativel: dentroCatalogo && dentroFaixaDesejada,
      psiEstimadoFaixa,
    };
  }

  function gerarConfiguracao(
    item,
    taxaUsoMed,
    vazaoRequeridaFaixa,
    psiEstimadoFaixa,
    orificioSelecionadoMm,
    pontasSugeridas,
    discoSelecionado,
    vruSelecionado
  ) {
    function extrairInstalacaoAtomizador(itemLocal) {
      if (!itemLocal || itemLocal.categoria !== "atomizador") return "";

      const nome = String(itemLocal.nome || "").toLowerCase();
      const obs = String(itemLocal.observacao || "").toLowerCase();
      const texto = `${nome} ${obs}`;
      const partes = [];

      const idxBarra = nome.indexOf("na barra");
      const idxEixo = nome.indexOf("no eixo");
      const temDuasAlimentacoes = /duas alimenta/.test(texto);

      if (temDuasAlimentacoes) {
        partes.push("duas alimentacoes na barra");
      } else if (idxBarra >= 0 && (idxEixo < 0 || idxBarra < idxEixo)) {
        partes.push("VRU na barra");
      } else if (idxEixo >= 0) {
        partes.push("VRU no eixo");
      }

      if (/2\s*valvulas|duas\s*valvulas/.test(texto)) {
        partes.push("2 valvulas anti-gotejo na barra");
      } else if (/1\s*valvula/.test(texto)) {
        partes.push("1 valvula anti-gotejo na barra");
      }

      if (/inox no eixo/.test(texto)) {
        partes.push("valvula inox no eixo");
      }

      return partes.join(" | ");
    }

    const conf = [];
    const usoPercentual = clamp(taxaUsoMed, 0, 1);
    const instalacaoAtomizador = extrairInstalacaoAtomizador(item);

    if (instalacaoAtomizador) {
      conf.push(`Instalacao: ${instalacaoAtomizador}`);
    }

    if (item.ajuste && item.ajuste.modo === "orificio") {
      if (Number.isFinite(orificioSelecionadoMm)) {
        conf.push(`Orificio recomendado ${orificioSelecionadoMm.toFixed(2)} mm`);
      }
    }

    if (discoSelecionado) {
      conf.push(`Disco recomendado ${discoSelecionado}`);
    }

    if (vruSelecionado) {
      conf.push(`VRU posicao ${vruSelecionado.posicao} (${vruSelecionado.cor})`);
    }

    if (Array.isArray(pontasSugeridas) && pontasSugeridas.length) {
      const p = pontasSugeridas[0];
      const codigo = p.codigo ? `#${p.codigo}` : "sem codigo";
      const cor = p.cor ? ` (${p.cor})` : "";
      conf.push(`Ponta fixa recomendada: ${codigo}${cor}`);
    }

    if (item.ajuste && item.ajuste.modo === "rotacao") {
      let nivel = "Baixa";
      if (usoPercentual >= 0.35 && usoPercentual < 0.7) nivel = "Media";
      if (usoPercentual >= 0.7) nivel = "Alta";
      conf.push(`Rotacao ${nivel}`);
    }

    if (!conf.length) conf.push("Ajuste manual de abertura");

    return conf.join(" | ");
  }

  function avaliarItemFaixa(item, demandaFaixa, preferencias) {
    const vReq = demandaFaixa.vazaoPorPulverizadorLMin;
    const range = item.vazaoMaxLMin - item.vazaoMinLMin;
    const psiCriterio = preferencias.psiCriterio || "preferencial";
    const psiFaixaDesejada = resolverFaixaPsiAplicada(
      item,
      preferencias.psiFaixa || null,
      preferencias.psiFaixasPorTipo || null
    );

    const taxaUsoFaixa = {
      min: clamp(range > 0 ? (vReq.min - item.vazaoMinLMin) / range : 0, 0, 1),
      med: clamp(range > 0 ? (vReq.med - item.vazaoMinLMin) / range : 0, 0, 1),
      max: clamp(range > 0 ? (vReq.max - item.vazaoMinLMin) / range : 0, 0, 1),
    };

    const compativelVazao =
      vReq.min >= item.vazaoMinLMin &&
      vReq.min <= item.vazaoMaxLMin &&
      vReq.med >= item.vazaoMinLMin &&
      vReq.med <= item.vazaoMaxLMin &&
      vReq.max >= item.vazaoMinLMin &&
      vReq.max <= item.vazaoMaxLMin;

    const temFaixaPsiCatalogo =
      Number.isFinite(item.pressaoMinPsi) && Number.isFinite(item.pressaoMaxPsi);

    let compativelPressao = null;
    let garantiaCurva = null;
    let estimativaFaixaCatalogo = null;
    const analiseVru = avaliarTabelaVru(item, psiFaixaDesejada, vReq);
    const analiseDisco = analiseVru ? null : avaliarCurvasDisco(item, psiFaixaDesejada, vReq);
    const analisePontaColorida =
      analiseVru || analiseDisco ? null : avaliarPontasColoridas(item, psiFaixaDesejada, vReq);
    const analiseOrificio =
      analiseVru || analiseDisco || analisePontaColorida
        ? null
        : avaliarCurvasOrificio(item, psiFaixaDesejada, vReq);

    if (psiFaixaDesejada) {
      if (analiseVru) {
        compativelPressao = analiseVru.compativel;
      } else {
        if (analiseDisco) {
          compativelPressao = analiseDisco.compativel;
        } else {
          if (analisePontaColorida) {
            compativelPressao = analisePontaColorida.compativel;
          } else {
            if (analiseOrificio) {
              compativelPressao = analiseOrificio.compativel;
            } else {
              garantiaCurva = avaliarGarantiaCurva(item, psiFaixaDesejada, vReq);
              if (psiCriterio === "obrigatorio") {
                compativelPressao = garantiaCurva.compativel;
              } else {
                estimativaFaixaCatalogo = estimarPsiFaixaCatalogo(item, psiFaixaDesejada, vReq);
                if (estimativaFaixaCatalogo) {
                  compativelPressao = estimativaFaixaCatalogo.compativel;
                } else if (temFaixaPsiCatalogo) {
                  const sobreposicaoMin = Math.max(item.pressaoMinPsi, psiFaixaDesejada.min);
                  const sobreposicaoMax = Math.min(item.pressaoMaxPsi, psiFaixaDesejada.max);
                  compativelPressao = sobreposicaoMin <= sobreposicaoMax;
                }
              }
            }
          }
        }
      }
    } else {
      estimativaFaixaCatalogo = estimarPsiFaixaCatalogo(item, null, vReq);
    }

    if (psiFaixaDesejada && !analiseVru && !analiseDisco && !analisePontaColorida && !analiseOrificio) {
      if (psiCriterio === "obrigatorio" && !garantiaCurva && estimativaFaixaCatalogo) {
        compativelPressao = estimativaFaixaCatalogo.compativel;
      } else if (psiCriterio !== "obrigatorio" && compativelPressao === null && estimativaFaixaCatalogo) {
        compativelPressao = estimativaFaixaCatalogo.compativel;
      }
    }

    const limites = LIMITES_ESPACAMENTO[item.familia] || null;
    const compativelEspacamento =
      !limites ||
      (demandaFaixa.espacamentoMedioM >= limites.min && demandaFaixa.espacamentoMedioM <= limites.max);

    const alvo = escolherAlvo(preferencias.estrategia);
    let score = 100;
    score -=
      ((Math.abs(taxaUsoFaixa.min - alvo) +
        Math.abs(taxaUsoFaixa.med - alvo) +
        Math.abs(taxaUsoFaixa.max - alvo)) /
        3) *
      40;

    if (!compativelVazao) {
      const dist = (req) =>
        req < item.vazaoMinLMin ? item.vazaoMinLMin - req : req > item.vazaoMaxLMin ? req - item.vazaoMaxLMin : 0;
      score -= 80 + (dist(vReq.min) + dist(vReq.med) + dist(vReq.max)) * 15;
    }

    score -= penalidadeFamilia(item, preferencias.familia);
    if (!compativelEspacamento) score -= 15;

    if (psiFaixaDesejada && psiCriterio === "preferencial") {
      if (compativelPressao === true) score += 8;
      if (compativelPressao === false) score -= 45;
      if (compativelPressao === null) score -= 12;
    }
    if (psiFaixaDesejada && psiCriterio === "obrigatorio" && compativelPressao !== true) {
      score -= 120;
    }

    const avisos = [];
    if (!compativelEspacamento && limites) {
      avisos.push(
        `Espacamento ${demandaFaixa.espacamentoMedioM.toFixed(2)} m fora da faixa tipica ${limites.min.toFixed(
          2
        )}-${limites.max.toFixed(2)} m para ${familiaPublica(item.familia)}.`
      );
    }
    if (compativelVazao && taxaUsoFaixa.max > 0.9) {
      avisos.push("Na velocidade maxima, operacao perto do limite superior da faixa de vazao.");
    }
    if (item.componenteInterno) {
      avisos.push("Componente interno: usar somente montado em bico/atomizador compativel.");
    }
    if (psiFaixaDesejada && psiCriterio === "obrigatorio") {
      if (analiseVru && !analiseVru.melhor) {
        avisos.push("Tabela VRU nao cobre a vazao alvo para estimar PSI.");
      } else if (analiseDisco && !analiseDisco.melhor) {
        avisos.push("Tabela de disco nao cobre a vazao alvo para estimar PSI.");
      } else if (analisePontaColorida && !analisePontaColorida.melhor) {
        avisos.push("Tabela de pontas coloridas nao cobre a vazao alvo para estimar PSI.");
      } else if (analiseOrificio && !analiseOrificio.melhor) {
        avisos.push("Curva por orificio nao cobre a vazao alvo para estimar PSI.");
      } else if (
        !analiseVru &&
        !analiseDisco &&
        !analisePontaColorida &&
        !analiseOrificio &&
        (!garantiaCurva || !garantiaCurva.disponivel) &&
        !estimativaFaixaCatalogo
      ) {
        avisos.push(
          `Sem curva PSI->vazao no catalogo para garantir ${psiFaixaDesejada.min.toFixed(1)}-${psiFaixaDesejada.max.toFixed(1)} psi.`
        );
      } else if (compativelPressao !== true) {
        avisos.push(
          `Nao garante vazao alvo dentro de ${psiFaixaDesejada.min.toFixed(1)}-${psiFaixaDesejada.max.toFixed(
            1
          )} psi.`
        );
      }
    } else if (psiFaixaDesejada && compativelPressao === false) {
      avisos.push(
        `Faixa PSI do modelo (${formatFaixaPsi(
          item.pressaoMinPsi,
          item.pressaoMaxPsi
        )}) nao sobrepoe o alvo ${psiFaixaDesejada.min.toFixed(1)}-${psiFaixaDesejada.max.toFixed(1)} psi.`
      );
    }

    const psiEstimadoFaixa = analiseVru && analiseVru.melhor
      ? analiseVru.melhor.psiEstimadoFaixa
      : analiseDisco && analiseDisco.melhor
      ? analiseDisco.melhor.psiEstimadoFaixa
      : analisePontaColorida && analisePontaColorida.melhor
      ? analisePontaColorida.melhor.psiEstimadoFaixa
      : analiseOrificio && analiseOrificio.melhor
      ? analiseOrificio.melhor.psiEstimadoFaixa
      : garantiaCurva
      ? garantiaCurva.psiEstimadoFaixa
      : estimativaFaixaCatalogo
      ? estimativaFaixaCatalogo.psiEstimadoFaixa
      : null;
    const psiEstimadoFaixaValida = faixaPsiCumpreMinimoTecnico(psiEstimadoFaixa) ? psiEstimadoFaixa : null;
    const orificioSelecionadoMm = analiseOrificio && analiseOrificio.melhor
      ? analiseOrificio.melhor.orificioMm
      : null;
    const discoSelecionado = analiseDisco && analiseDisco.melhor ? analiseDisco.melhor.disco : null;
    const vruSelecionado = analiseVru && analiseVru.melhor
      ? { posicao: analiseVru.melhor.posicao, cor: analiseVru.melhor.cor }
      : null;
    const pontasSugeridas = analisePontaColorida ? analisePontaColorida.sugeridas : [];
    const pontaSelecionada = Array.isArray(pontasSugeridas) && pontasSugeridas.length
      ? {
          codigo: pontasSugeridas[0].codigo || "",
          cor: pontasSugeridas[0].cor || "",
        }
      : null;
    let statusCompativel =
      compativelVazao && !(psiFaixaDesejada && psiCriterio === "obrigatorio" && compativelPressao !== true);
    if (psiEstimadoFaixa && !psiEstimadoFaixaValida) {
      statusCompativel = false;
      score -= 120;
    }
    const opcoesCalibracao = [];
    let semOpcoesVruValidas = false;

    if (analiseVru && Array.isArray(analiseVru.opcoes) && analiseVru.opcoes.length) {
      const ordemCor = { preto: 0, vermelho: 1, verde: 2, d5: 0, d7: 1 };
      const opcoesVruTodas =
        Array.isArray(analiseVru.opcoesTodas) && analiseVru.opcoesTodas.length
          ? analiseVru.opcoesTodas
          : analiseVru.opcoes;
      const limiteMinPsiCor =
        Number.isFinite(Number(preferencias && preferencias.limiteMinPsiCorAtomizador))
          ? Number(preferencias.limiteMinPsiCorAtomizador)
          : LIMITE_MIN_PSI_COR_ATOMIZADOR;
      const faixaIdealMin =
        psiFaixaDesejada && Number.isFinite(Number(psiFaixaDesejada.min)) ? Number(psiFaixaDesejada.min) : 25;
      const faixaIdealMax =
        psiFaixaDesejada && Number.isFinite(Number(psiFaixaDesejada.max)) ? Number(psiFaixaDesejada.max) : 40;
      const opcaoCumpreLimiteMinPsi = (op) => {
        const psi = (op && op.psiEstimadoFaixa) || {};
        return (
          Number.isFinite(psi.min) &&
          Number.isFinite(psi.med) &&
          Number.isFinite(psi.max) &&
          psi.min >= limiteMinPsiCor &&
          psi.med >= limiteMinPsiCor &&
          psi.max >= limiteMinPsiCor
        );
      };

      const distanciaFaixaIdeal = (psi) => {
        if (!Number.isFinite(psi)) return 999;
        if (psi < faixaIdealMin) return faixaIdealMin - psi;
        if (psi > faixaIdealMax) return psi - faixaIdealMax;
        return 0;
      };

      const prioridadeIdeal = (op) => {
        const psi = (op && op.psiEstimadoFaixa) || {};
        const minOk = Number.isFinite(psi.min) && psi.min >= faixaIdealMin && psi.min <= faixaIdealMax;
        const medOk = Number.isFinite(psi.med) && psi.med >= faixaIdealMin && psi.med <= faixaIdealMax;
        const maxOk = Number.isFinite(psi.max) && psi.max >= faixaIdealMin && psi.max <= faixaIdealMax;
        const dentroCompleto = minOk && medOk && maxOk;
        const dentroMedio = medOk;
        const penalidadeFaixa =
          distanciaFaixaIdeal(psi.min) + distanciaFaixaIdeal(psi.med) * 1.5 + distanciaFaixaIdeal(psi.max);
        return {
          dentroCompleto,
          dentroMedio,
          penalidadeFaixa,
          distanciaAlvo: op && Number.isFinite(op.distanciaAlvo) ? op.distanciaAlvo : 999,
        };
      };

      const compararPorPrioridade = (a, b) => {
        const pa = prioridadeIdeal(a);
        const pb = prioridadeIdeal(b);
        if (pa.dentroCompleto !== pb.dentroCompleto) return pa.dentroCompleto ? -1 : 1;
        if (pa.dentroMedio !== pb.dentroMedio) return pa.dentroMedio ? -1 : 1;
        if (pa.penalidadeFaixa !== pb.penalidadeFaixa) return pa.penalidadeFaixa - pb.penalidadeFaixa;
        return pa.distanciaAlvo - pb.distanciaAlvo;
      };

      const porCor = new Map();
      opcoesVruTodas.forEach((op) => {
        if (!opcaoCumpreLimiteMinPsi(op)) return;
        const chaveCor = String((op && op.cor) || "").toLowerCase().trim();
        if (!chaveCor) return;
        if (!porCor.has(chaveCor)) {
          porCor.set(chaveCor, op);
          return;
        }
        const atual = porCor.get(chaveCor);
        if (compararPorPrioridade(op, atual) < 0) {
          porCor.set(chaveCor, op);
        }
      });

      const opcoesOrdenadas = Array.from(porCor.values()).sort((a, b) => {
        const ca = String((a && a.cor) || "").toLowerCase();
        const cb = String((b && b.cor) || "").toLowerCase();
        const oa = Object.prototype.hasOwnProperty.call(ordemCor, ca) ? ordemCor[ca] : 99;
        const ob = Object.prototype.hasOwnProperty.call(ordemCor, cb) ? ordemCor[cb] : 99;
        if (oa !== ob) return oa - ob;
        return compararPorPrioridade(a, b);
      });

      opcoesOrdenadas.forEach((op) => {
        opcoesCalibracao.push({
          psiEstimadoFaixa: op.psiEstimadoFaixa,
          vruSelecionado: { posicao: op.posicao, cor: op.cor },
          configuracaoSugerida: gerarConfiguracao(
            item,
            taxaUsoFaixa.med,
            vReq,
            op.psiEstimadoFaixa,
            null,
            [],
            null,
            { posicao: op.posicao, cor: op.cor }
          ),
        });
      });
      if (!opcoesCalibracao.length) {
        semOpcoesVruValidas = true;
        statusCompativel = false;
        avisos.push(
          `Nenhuma opcao de cor/VRU ficou com PSI >= ${limiteMinPsiCor.toFixed(1)} em min/med/max.`
        );
        score -= 200;
      }
    } else if (analiseDisco && Array.isArray(analiseDisco.opcoes) && analiseDisco.opcoes.length) {
      analiseDisco.opcoes.forEach((op) => {
        opcoesCalibracao.push({
          psiEstimadoFaixa: op.psiEstimadoFaixa,
          discoSelecionado: op.disco,
          configuracaoSugerida: gerarConfiguracao(
            item,
            taxaUsoFaixa.med,
            vReq,
            op.psiEstimadoFaixa,
            null,
            [],
            op.disco,
            null
          ),
        });
      });
    } else if (
      analisePontaColorida &&
      Array.isArray(analisePontaColorida.opcoes) &&
      analisePontaColorida.opcoes.length
    ) {
      analisePontaColorida.opcoes.forEach((op) => {
        opcoesCalibracao.push({
          psiEstimadoFaixa: op.psiEstimadoFaixa,
          pontaSelecionada: { codigo: op.codigo, cor: op.cor },
          configuracaoSugerida: gerarConfiguracao(
            item,
            taxaUsoFaixa.med,
            vReq,
            op.psiEstimadoFaixa,
            null,
            [{ codigo: op.codigo, cor: op.cor }],
            null,
            null
          ),
        });
      });
    } else if (analiseOrificio && Array.isArray(analiseOrificio.opcoes) && analiseOrificio.opcoes.length) {
      analiseOrificio.opcoes.forEach((op) => {
        opcoesCalibracao.push({
          psiEstimadoFaixa: op.psiEstimadoFaixa,
          orificioSelecionadoMm: op.orificioMm,
          configuracaoSugerida: gerarConfiguracao(
            item,
            taxaUsoFaixa.med,
            vReq,
            op.psiEstimadoFaixa,
            op.orificioMm,
            [],
            null,
            null
          ),
        });
      });
    }

    if (!opcoesCalibracao.length && psiEstimadoFaixaValida && !semOpcoesVruValidas) {
      opcoesCalibracao.push({
        psiEstimadoFaixa: psiEstimadoFaixaValida,
        orificioSelecionadoMm,
        discoSelecionado,
        vruSelecionado,
        pontaSelecionada,
        configuracaoSugerida: gerarConfiguracao(
          item,
          taxaUsoFaixa.med,
          vReq,
          psiEstimadoFaixaValida,
          orificioSelecionadoMm,
          pontasSugeridas,
          discoSelecionado,
          vruSelecionado
        ),
      });
    }

    return {
      ...item,
      score: Number(score.toFixed(2)),
      compativelVazao,
      compativelPressao,
      compativelEspacamento,
      taxaUsoFaixa,
      vazaoRequeridaFaixa: vReq,
      faixaPsiCatalogo: formatFaixaPsi(item.pressaoMinPsi, item.pressaoMaxPsi),
      psiFaixaAplicada: psiFaixaDesejada,
      psiEstimadoFaixa: psiEstimadoFaixaValida,
      garantiaCurvaDisponivel: garantiaCurva ? garantiaCurva.disponivel : false,
      garantiaPressaoVazao: analiseVru
        ? analiseVru.compativel
        : analiseDisco
        ? analiseDisco.compativel
        : analisePontaColorida
        ? analisePontaColorida.compativel
        : analiseOrificio
        ? analiseOrificio.compativel
        : garantiaCurva
        ? garantiaCurva.compativel
        : null,
      orificioSelecionadoMm,
      discoSelecionado,
      vruSelecionado,
      semOpcoesVruValidas,
      pontaSelecionada,
      pontasSugeridas,
      opcoesCalibracao,
      configuracaoSugerida: gerarConfiguracao(
        item,
        taxaUsoFaixa.med,
        vReq,
        psiEstimadoFaixaValida,
        orificioSelecionadoMm,
        pontasSugeridas,
        discoSelecionado,
        vruSelecionado
      ),
      avisos,
      status: statusCompativel ? "compativel" : "fora-faixa",
    };
  }

  function recomendar(catalogo, demandaFaixa, preferencias) {
    const psiCriterio = preferencias.psiCriterio || "preferencial";
    const psiFaixaDesejada = preferencias.psiFaixa || null;
    const tiposPermitidos = preferencias.tiposPermitidos || null;
    const filtrosEspecificos = preferencias.filtrosEspecificos || null;
    const catalogoEquipamentos = catalogo.filter(
      (item) =>
        itemPassaFiltroTipos(item, tiposPermitidos) &&
        itemPassaFiltrosEspecificos(item, tiposPermitidos, filtrosEspecificos)
    );

    const avaliados = catalogoEquipamentos
      .map((item) => avaliarItemFaixa(item, demandaFaixa, preferencias))
      .sort((a, b) => b.score - a.score);

    const compativeis = avaliados.filter((item) => {
      if (!item.compativelVazao) return false;
      if (psiFaixaDesejada && psiCriterio === "obrigatorio") {
        return item.compativelPressao === true;
      }
      return true;
    });

    const baseRecomendacao =
      compativeis.length > 0
        ? compativeis
        : avaliados;
    const recomendadosSemLimite = baseRecomendacao
      .flatMap((item) => {
        if (item && item.semOpcoesVruValidas) return [];
        const opcoes = Array.isArray(item.opcoesCalibracao) ? item.opcoesCalibracao : [];
        if (!opcoes.length) return [item];
        return opcoes.map((op, idx) => ({
          ...item,
          psiEstimadoFaixa: op.psiEstimadoFaixa || item.psiEstimadoFaixa,
          orificioSelecionadoMm:
            op.orificioSelecionadoMm !== undefined ? op.orificioSelecionadoMm : item.orificioSelecionadoMm,
          discoSelecionado: op.discoSelecionado || item.discoSelecionado,
          vruSelecionado: op.vruSelecionado || item.vruSelecionado,
          pontaSelecionada: op.pontaSelecionada || item.pontaSelecionada,
          configuracaoSugerida: op.configuracaoSugerida || item.configuracaoSugerida,
          score: Number((item.score - idx * 0.001).toFixed(3)),
        }));
      })
      .sort((a, b) => b.score - a.score);
    const maxOpcoesPorModeloRaw = Number(preferencias && preferencias.maxOpcoesPorModelo);
    const maxOpcoesPorModelo =
      Number.isFinite(maxOpcoesPorModeloRaw) && maxOpcoesPorModeloRaw > 0
        ? Math.floor(maxOpcoesPorModeloRaw)
        : 1;
    const contadorPorModelo = new Map();
    const recomendados = recomendadosSemLimite.filter((item) => {
      const chaveModelo = String(item && (item.id || item.nome) ? item.id || item.nome : "");
      const atual = Number(contadorPorModelo.get(chaveModelo) || 0);
      if (atual >= maxOpcoesPorModelo) return false;
      contadorPorModelo.set(chaveModelo, atual + 1);
      return true;
    });
    const avisosGlobais = [];

    if (!compativeis.length) {
      if (psiFaixaDesejada && psiCriterio === "obrigatorio") {
        avisosGlobais.push(
          "Nenhum modelo garantiu simultaneamente vazao alvo e PSI alvo. Verifique os limites de pressao aplicados por tipo (demais: ate 90 psi; eletrostatico: ate 10 bar)."
        );
      } else {
        avisosGlobais.push(
          "Nenhum modelo atendeu simultaneamente as tres velocidades. Revise volume, velocidades, faixa ou numero de pulverizadores."
        );
      }
    }

    return {
      avaliados,
      recomendados,
      totalCatalogo: catalogoEquipamentos.length,
      totalCompativeis: compativeis.length,
      psiCriterio,
      psiFaixaDesejada,
      avisosGlobais,
    };
  }

  window.SoftwareBicos = window.SoftwareBicos || {};
  window.SoftwareBicos.recomendador = {
    recomendar,
    LIMITES_ESPACAMENTO,
  };
})();
