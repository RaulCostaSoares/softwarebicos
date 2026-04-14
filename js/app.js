(function () {
  window.__softwarebicosAppLoaded = true;
  const ns = window.SoftwareBicos || {};
  const calculos = ns.calculos || {};
  const recomendador = ns.recomendador || {};

  const form = document.getElementById("calibration-form");
  const fillExampleBtn = document.getElementById("fill-example");
  const formError = document.getElementById("form-error");
  const summaryCards = document.getElementById("summary-cards");
  const warnings = document.getElementById("warnings");
  const resultsMeta = document.getElementById("results-meta");
  const exportPdfBtn = document.getElementById("export-pdf-btn");
  const tableBody = document.querySelector("#results-table tbody");
  const presetAeronaveSelect = document.getElementById("preset-aeronave");
  const pulverizadorSelecionadoInput = document.getElementById("pulverizador-selecionado");
  const pulverizadorGrid = document.getElementById("pulverizador-grid");
  const tt11Config = document.getElementById("tt11-config");
  const tt11PontaSelect = document.getElementById("tt11-ponta");
  const coreConfig = document.getElementById("core-config");
  const coreDiscoSelect = document.getElementById("core-disco");
  const maxRecPorModeloInput = document.getElementById("max-rec-modelo");
  const modoExibicaoSelect = document.getElementById("modo-exibicao");
  const pressaoBaseInfo = document.getElementById("pressao-base-info");
  const configValidacaoInfo = document.getElementById("config-validacao-info");

  let dadosAeronaveFluxometro = null;
  let catalogoAtivo = null;
  let chaveRecomendacaoSelecionada = "";
  let referenciaPsiPopup = null;
  let popupPsiNode = null;
  const modoPagina = String((document.body && document.body.dataset && document.body.dataset.pagina) || "geral")
    .toLowerCase()
    .trim();
  const paginaAtomizadores = modoPagina === "atomizadores";
  const LIMITE_ATOMIZADORES_MAX = 18;
  const LIMITE_BICOS_MIN = 20;
  const LIMITE_MIN_PSI_EXIBICAO = 15;
  const LIMITE_MAX_PSI_BICOS_HIDRAULICOS = 100;
  const CHAVE_DADOS_COMPARTILHADOS = "softwarebicos_shared_form_v1";

  if (!form) {
    console.error("[softwarebicos] Formulario #calibration-form nao encontrado nesta pagina.");
    return;
  }
  if (!calculos.calcularDemandaFaixa || !recomendador.recomendar) {
    const msg =
      "Falha ao inicializar calculadora: scripts base nao carregaram (calculos/recomendador).";
    if (formError) formError.textContent = msg;
    console.error("[softwarebicos]", msg, {
      temCalculos: Boolean(calculos.calcularDemandaFaixa),
      temRecomendador: Boolean(recomendador.recomendar),
    });
    return;
  }

  const modoExibicaoInicial =
    String(form.dataset.defaultModoExibicao || "medio").toLowerCase() === "faixa" ? "faixa" : "medio";
  const GRUPOS_FILTRO_DETALHE = [
    { chave: "leque", filtroId: "filtro-leque", titulo: "Modelos de jato plano" },
    { chave: "solido", filtroId: "filtro-solido", titulo: "Modelos de jato solido" },
    { chave: "conico-core", filtroId: "filtro-conico-core", titulo: "Modelos conico core/disco" },
    { chave: "conico-eletro", filtroId: "filtro-conico-eletro", titulo: "Modelos conico eletrostatico" },
  ];

  function n(value, dec) {
    return calculos.formatNumber ? calculos.formatNumber(value, dec) : value.toFixed(dec);
  }

  function itemRespeitaLimitePsiMaxBicos(item) {
    const psiMax = Number(item && item.psiEstimadoFaixa && item.psiEstimadoFaixa.max);
    return !Number.isFinite(psiMax) || psiMax <= LIMITE_MAX_PSI_BICOS_HIDRAULICOS;
  }

  function pad2(value) {
    const nValue = Number(value);
    if (!Number.isFinite(nValue)) return "00";
    return String(Math.floor(nValue)).padStart(2, "0");
  }

  function dataHoraParaNomeArquivo(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date();
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const h = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `${y}-${m}-${day}_${h}-${min}`;
  }

  function exportarPaginaParaPdf() {
    const tituloAnterior = String(document.title || "");
    const prefixo = paginaAtomizadores ? "relatorio_atomizadores" : "relatorio_bicos_hidraulicos";
    document.title = `${prefixo}_${dataHoraParaNomeArquivo(new Date())}`;
    window.print();
    window.setTimeout(() => {
      document.title = tituloAnterior;
    }, 400);
  }

  function lerDadosCompartilhados() {
    try {
      const bruto = localStorage.getItem(CHAVE_DADOS_COMPARTILHADOS);
      if (!bruto) return null;
      const parsed = JSON.parse(bruto);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function salvarDadosCompartilhados() {
    try {
      const payload = {
        presetAeronave: String((presetAeronaveSelect && presetAeronaveSelect.value) || ""),
        faixa: String((form && form.faixa && form.faixa.value) || ""),
        taxa: String((form && form.vazao && form.vazao.value) || ""),
        pulverizadores: String((form && form.pulverizadores && form.pulverizadores.value) || ""),
        maxRecPorModelo: String((maxRecPorModeloInput && maxRecPorModeloInput.value) || ""),
        velMin: String((form && form["velocidade-min"] && form["velocidade-min"].value) || ""),
        velMed: String((form && form["velocidade-med"] && form["velocidade-med"].value) || ""),
        velMax: String((form && form["velocidade-max"] && form["velocidade-max"].value) || ""),
      };
      localStorage.setItem(CHAVE_DADOS_COMPARTILHADOS, JSON.stringify(payload));
    } catch (_error) {
      // localStorage indisponivel: segue sem compartilhamento.
    }
  }

  function aplicarDadosCompartilhadosNoForm() {
    const dados = lerDadosCompartilhados();
    if (!dados) return false;
    let aplicou = false;

    if (Object.prototype.hasOwnProperty.call(dados, "faixa") && form && form.faixa) {
      form.faixa.value = String(dados.faixa || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "taxa") && form && form.vazao) {
      form.vazao.value = String(dados.taxa || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "pulverizadores") && form && form.pulverizadores) {
      form.pulverizadores.value = String(dados.pulverizadores || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "maxRecPorModelo") && maxRecPorModeloInput) {
      const valorSalvo = Number(dados.maxRecPorModelo);
      maxRecPorModeloInput.value = String(
        Number.isFinite(valorSalvo) && valorSalvo >= 1 ? Math.min(10, Math.floor(valorSalvo)) : 5
      );
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "velMin") && form && form["velocidade-min"]) {
      form["velocidade-min"].value = String(dados.velMin || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "velMed") && form && form["velocidade-med"]) {
      form["velocidade-med"].value = String(dados.velMed || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "velMax") && form && form["velocidade-max"]) {
      form["velocidade-max"].value = String(dados.velMax || "0");
      aplicou = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(dados, "presetAeronave") &&
      presetAeronaveSelect &&
      String(dados.presetAeronave || "")
    ) {
      const alvo = String(dados.presetAeronave || "");
      const existe = Array.from(presetAeronaveSelect.options || []).some((opt) => String(opt.value) === alvo);
      if (existe) {
        presetAeronaveSelect.value = alvo;
        aplicou = true;
      }
    }

    return aplicou;
  }

  function aplicarCamposIniciaisZero() {
    if (form && form["velocidade-min"]) form["velocidade-min"].value = "0";
    if (form && form["velocidade-med"]) form["velocidade-med"].value = "0";
    if (form && form["velocidade-max"]) form["velocidade-max"].value = "0";
    if (presetAeronaveSelect) presetAeronaveSelect.value = "";
    if (form && form.faixa) form.faixa.value = "0";
    if (form && form.vazao) form.vazao.value = "0";
    if (form && form.pulverizadores) form.pulverizadores.value = "0";
    if (maxRecPorModeloInput) maxRecPorModeloInput.value = "5";
  }

  function lerMaxRecomendacoesPorModelo() {
    if (!maxRecPorModeloInput) return 5;
    const valor = Number(maxRecPorModeloInput.value);
    if (!Number.isFinite(valor) || valor < 1) return 5;
    return Math.min(10, Math.floor(valor));
  }

  function entradaInicialValidaParaCalculo() {
    const vMin = Number(form && form["velocidade-min"] && form["velocidade-min"].value);
    const vMed = Number(form && form["velocidade-med"] && form["velocidade-med"].value);
    const vMax = Number(form && form["velocidade-max"] && form["velocidade-max"].value);
    const faixa = Number(form && form.faixa && form.faixa.value);
    const taxa = Number(form && form.vazao && form.vazao.value);
    const qtd = Number(form && form.pulverizadores && form.pulverizadores.value);

    if (!Number.isFinite(vMin) || !Number.isFinite(vMed) || !Number.isFinite(vMax)) return false;
    if (!Number.isFinite(faixa) || !Number.isFinite(taxa) || !Number.isFinite(qtd)) return false;
    if (vMin <= 0 || vMed <= 0 || vMax <= 0) return false;
    if (faixa <= 0 || taxa <= 0 || qtd <= 0) return false;
    if (!(vMin <= vMed && vMed <= vMax)) return false;
    if (paginaAtomizadores && qtd > LIMITE_ATOMIZADORES_MAX) return false;
    if (!paginaAtomizadores && qtd < LIMITE_BICOS_MIN) return false;
    return true;
  }

  function aplicarLimitesCampoQuantidade() {
    const campo = form && form.pulverizadores;
    if (!campo) return;
    if (paginaAtomizadores) {
      campo.setAttribute("min", "1");
      campo.setAttribute("max", String(LIMITE_ATOMIZADORES_MAX));
      return;
    }
    campo.setAttribute("min", String(LIMITE_BICOS_MIN));
    campo.removeAttribute("max");
  }

  function ajustarValorCampoQuantidade() {
    const campo = form && form.pulverizadores;
    if (!campo) return;
    const bruto = String(campo.value || "").trim();
    if (!bruto) return;
    const valor = Number(bruto);
    if (!Number.isFinite(valor)) return;
    if (paginaAtomizadores && valor > LIMITE_ATOMIZADORES_MAX) {
      campo.value = String(LIMITE_ATOMIZADORES_MAX);
      return;
    }
    if (paginaAtomizadores && valor < 1) {
      campo.value = "1";
      return;
    }
    if (!paginaAtomizadores && valor < LIMITE_BICOS_MIN) {
      campo.value = String(LIMITE_BICOS_MIN);
    }
  }

  function validarQuantidadePulverizadores() {
    const valor = Number(form && form.pulverizadores && form.pulverizadores.value);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Numero de pulverizadores deve ser maior que zero.");
    }
    if (paginaAtomizadores && valor > LIMITE_ATOMIZADORES_MAX) {
      throw new Error(`Na tela ATOMIZADORES, o maximo permitido e ${LIMITE_ATOMIZADORES_MAX}.`);
    }
    if (!paginaAtomizadores && valor < LIMITE_BICOS_MIN) {
      throw new Error(`Na tela GERAL, o minimo de bicos e ${LIMITE_BICOS_MIN}.`);
    }
    return valor;
  }

  function normalizarPontosTabela(pontos) {
    if (!Array.isArray(pontos)) return [];
    return pontos
      .map((p) => ({
        psi: Number(p && p.psi),
        vazao: Number(p && p.vazaoLMin),
      }))
      .filter((p) => Number.isFinite(p.psi) && Number.isFinite(p.vazao))
      .sort((a, b) => a.psi - b.psi);
  }

  function htmlMiniTabelaPsi(item) {
    if (!item) return "";
    const nome = escapeHtml(item.nome || item.id || "Equipamento");
    let subtitulo = "";
    let tabelaHtml = "";

    function montarMatrizCurvas(curvas, linhaLabelFn, linhaSelecionadaFn) {
      const psiSet = new Set();
      const linhas = [];
      curvas.forEach((curva) => {
        const pontos = normalizarPontosTabela(curva && curva.pontos);
        if (!pontos.length) return;
        const map = new Map();
        pontos.forEach((p) => {
          psiSet.add(p.psi);
          map.set(p.psi, p.vazao);
        });
        linhas.push({
          label: linhaLabelFn(curva),
          valores: map,
          selected: linhaSelecionadaFn(curva),
        });
      });
      const psiCols = Array.from(psiSet).sort((a, b) => a - b);
      return { psiCols, linhas };
    }

    function renderMatriz(rowHeader, psiCols, linhas) {
      if (!psiCols.length || !linhas.length) return "";
      const head = `<tr><th>${rowHeader}</th>${psiCols.map((psi) => `<th>${n(psi, 0)}</th>`).join("")}</tr>`;
      const body = linhas
        .map((linha) => {
          const cls = linha.selected ? " class=\"is-selected\"" : "";
          const cols = psiCols
            .map((psi) => {
              const v = linha.valores.get(psi);
              return `<td>${Number.isFinite(v) ? n(v, 2) : "-"}</td>`;
            })
            .join("");
          return `<tr${cls}><th scope="row">${linha.label}</th>${cols}</tr>`;
        })
        .join("");
      return `<div class="psi-mini-scroll"><table class="psi-mini-table psi-mini-table-matrix"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }

    if (Array.isArray(item.curvasOrificio) && item.curvasOrificio.length) {
      const alvo = Number(item.orificioSelecionadoMm);
      const matriz = montarMatrizCurvas(
        item.curvasOrificio,
        (c) => `${Number.isFinite(Number(c && c.orificioMm)) ? n(Number(c.orificioMm), 2) : "-"}mm`,
        (c) => Number.isFinite(alvo) && Math.abs(Number(c && c.orificioMm) - alvo) < 0.02
      );
      subtitulo = "Tabela por orificio";
      tabelaHtml = renderMatriz("Orif.", matriz.psiCols, matriz.linhas);
    } else if (Array.isArray(item.curvasDisco) && item.curvasDisco.length) {
      const discoSel = normalizarId(item.discoSelecionado || "");
      const matriz = montarMatrizCurvas(
        item.curvasDisco,
        (c) => escapeHtml(String(c && c.disco ? c.disco : "-")),
        (c) => normalizarId(c && c.disco) === discoSel
      );
      subtitulo = "Tabela de disco";
      tabelaHtml = renderMatriz("Disco", matriz.psiCols, matriz.linhas);
    } else if (Array.isArray(item.curvasPontaColorida) && item.curvasPontaColorida.length) {
      const pontaSel = normalizarId(item.pontaSelecionada && item.pontaSelecionada.codigo);
      const matriz = montarMatrizCurvas(
        item.curvasPontaColorida,
        (c) => {
          const cod = String(c && c.codigo ? c.codigo : "-");
          const cor = c && c.cor ? ` (${escapeHtml(c.cor)})` : "";
          return `#${escapeHtml(cod)}${cor}`;
        },
        (c) => normalizarId(c && c.codigo) === pontaSel
      );
      subtitulo = "Tabela de ponta (TT11)";
      tabelaHtml = renderMatriz("Ponta", matriz.psiCols, matriz.linhas);
    } else if (item.tabelaVru && Array.isArray(item.tabelaVru.psi) && Array.isArray(item.tabelaVru.linhas)) {
      const tabela = item.tabelaVru;
      const psiCols = tabela.psi.map((p) => Number(p)).filter((p) => Number.isFinite(p)).sort((a, b) => a - b);
      const cores =
        Array.isArray(tabela.coresRegulagem) && tabela.coresRegulagem.length ? tabela.coresRegulagem : ["canal-1"];
      const corSel = String((item.vruSelecionado && item.vruSelecionado.cor) || cores[0] || "canal-1");
      const idxCor = Math.max(
        0,
        cores.findIndex((c) => normalizarCorNome(c) === normalizarCorNome(corSel))
      );
      const posSel = Number(item.vruSelecionado && item.vruSelecionado.posicao);
      const linhas = tabela.linhas
        .map((linha) => {
          const pos = Number(linha && linha.posicao);
          if (!Number.isFinite(pos)) return null;
          const map = new Map();
          psiCols.forEach((psi, i) => {
            const valores = Array.isArray(linha.valores) ? linha.valores[i] : null;
            const valor =
              Array.isArray(valores) && Number.isFinite(Number(valores[idxCor]))
                ? Number(valores[idxCor])
                : Number.isFinite(Number(valores))
                ? Number(valores)
                : null;
            if (Number.isFinite(valor)) map.set(psi, valor);
          });
          return {
            label: String(pos),
            valores: map,
            selected: Number.isFinite(posSel) && pos === posSel,
          };
        })
        .filter(Boolean);
      subtitulo = `Tabela VRU (${escapeHtml(corSel)})`;
      tabelaHtml = renderMatriz("Pos.", psiCols, linhas);
    }

    if (!tabelaHtml) return "";

    return `
      <div class="psi-mini-title">${nome}</div>
      <div class="psi-mini-sub">${subtitulo}</div>
      ${tabelaHtml}
    `;
  }

  function posicionarPopupPsi(clientX, clientY) {
    if (!popupPsiNode || !popupPsiNode.classList.contains("is-visible")) return;
    const rect = popupPsiNode.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offset = 14;
    const margem = 8;

    let left = clientX + offset;
    let top = clientY + offset;
    if (left + rect.width > vw - margem) left = clientX - rect.width - offset;
    if (left < margem) left = margem;
    if (top + rect.height > vh - margem) top = vh - rect.height - margem;
    if (top < margem) top = margem;

    popupPsiNode.style.left = `${left}px`;
    popupPsiNode.style.top = `${top}px`;
  }

  function esconderPopupPsi() {
    if (!popupPsiNode) return;
    popupPsiNode.classList.remove("is-visible");
    popupPsiNode.innerHTML = "";
  }

  function exibirPopupPsi(event) {
    if (!popupPsiNode || !referenciaPsiPopup) return;
    const html = htmlMiniTabelaPsi(referenciaPsiPopup);
    if (!html) return;
    popupPsiNode.innerHTML = html;
    popupPsiNode.classList.add("is-visible");
    posicionarPopupPsi(event.clientX, event.clientY);
  }

  function inicializarPopupResumoPsi() {
    if (popupPsiNode) return;
    popupPsiNode = document.createElement("div");
    popupPsiNode.className = "psi-mini-popup";
    document.body.appendChild(popupPsiNode);

    ["res-psi-min", "res-psi-med", "res-psi-max"].forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.classList.add("psi-hover-target");
      node.addEventListener("mouseenter", exibirPopupPsi);
      node.addEventListener("mousemove", (event) => posicionarPopupPsi(event.clientX, event.clientY));
      node.addEventListener("mouseleave", esconderPopupPsi);
    });

    window.addEventListener("blur", esconderPopupPsi);
    window.addEventListener("scroll", esconderPopupPsi, true);
  }

  function familiaLabel(familia) {
    if (familia === "leque") return "Plano";
    if (familia === "conico") return "Conico";
    if (familia === "rotativo") return "Atomizador rotativo";
    return familia;
  }

  function faixa3(vMin, vMed, vMax, suffix, dec) {
    return `${n(vMin, dec)} / ${n(vMed, dec)} / ${n(vMax, dec)} ${suffix}`;
  }

  const MAPA_CORES_BICO = {
    vermelho: "#dc2626",
    azul: "#2563eb",
    amarelo: "#facc15",
    laranja: "#f97316",
    verde: "#16a34a",
    "verde-claro": "#84cc16",
    preto: "#111827",
    branco: "#f8fafc",
    cinza: "#9ca3af",
    "cinza-claro": "#d1d5db",
    "cinza-escuro": "#4b5563",
    bege: "#d6b48a",
    grafite: "#374151",
    marrom: "#92400e",
  };

  const MAPA_IMAGENS_POR_ID = {
    "90088": "js/data/images/90088.png",
    "90088A": "js/data/images/90088A.png",
    TT90300: "js/data/images/TT03.png",
    TT09: "js/data/images/TT09.png",
    TT11: "js/data/images/TT11.png",
    "90500": "js/data/images/ELETROSTATICO.png",
    CORE25: "js/data/images/CORE/CORE25.png",
    CORE45: "js/data/images/CORE/CORE45.png",
    CORE46: "js/data/images/CORE/CORE46.png",
    CORE56: "js/data/images/CORE/CORE56.png",
    "AR-15":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU INOX VRU NO EIXO 1 VALVULA ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-15B":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU INOX VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 8.png",
    "AR-17":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU INOX VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 4.png",
    "AR-19":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU INOX DUAS ALIMENTACOES VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 4.png",
    "AR-21":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU Polimero VRU NO EIXO 1 VALVULA ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-22":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU POLIMERO VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 8.png",
    "AR-23":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU POLIMERO VRU NO EIXO DUAS VALVULAS ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-24":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU POLIMERO VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 4.png",
    "AR-27":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo Disco VRU POLIMERO VRU NA BARRA VALVULA ANTI GOTEJO POLIMERO NO EIXO PARA NIPLE 1 8.png",
    "AR-29":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU INOX VRU NO EIXO DUAS VALVULAS ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-29-AV":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU INOX VRU NO EIXO DUAS VALVULAS ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8 VRU AV.png",
    "AR-30":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU POLIMERO DUAS ALIMENTACOES VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 4.png",
    "AR-D5D7":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo Mini VRU Polimero VRU NO EIXO COM REDUTOR VALVULA ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-ESFERA-23":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU ESFERA VRU NO EIXO 1 VALVULA ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-ESFERA-27":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo VRU ESFERA VRU NO EIXO 2 VALVULA ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
    "AR-MINI-BARRA":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo Mini VRU Polimero VRU NA BARRA VALVULA ANTI GOTEJO INOX NO EIXO PARA NIPLE 1 8.png",
    "AR-MINI-EIXO":
      "js/data/images/ATOMIZADOR/Atomizador Rotativo Mini VRU Polimero VRU NO EIXO VALVULA ANTI GOTEJO POLIMERO NA BARRA PARA NIPLE 1 8.png",
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizarCorNome(corNome) {
    return String(corNome || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function hexCorBico(corNome) {
    const chave = normalizarCorNome(corNome);
    return MAPA_CORES_BICO[chave] || "#cbd5e1";
  }

  function corTextoContraste(hexColor) {
    const hex = String(hexColor || "").replace("#", "");
    if (hex.length !== 6) return "#111827";
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminancia = (r * 299 + g * 587 + b * 114) / 1000;
    return luminancia >= 140 ? "#111827" : "#ffffff";
  }

  function caminhoImagemPonteira(corNome) {
    const chave = normalizarCorNome(corNome).replace(/[^a-z0-9]/g, "");
    const mapa = {
      vermelho: "vermelho",
      azul: "azul",
      bege: "bege",
      branco: "branco",
      cinzaclaro: "cinzaclaro",
      cinzaescuro: "cinzaescuro",
      laranja: "laranja",
      marrom: "marrom",
      verde: "verde",
    };
    const arquivo = mapa[chave] || "";
    return arquivo ? `js/data/images/PONTEIRAS/${arquivo}.png` : "";
  }

  function habilitarPreviewImagens() {
    const preview = document.createElement("div");
    preview.className = "image-hover-preview";
    preview.innerHTML = '<img alt="Preview da imagem" loading="lazy" />';
    const previewImg = preview.querySelector("img");
    if (!previewImg) return;
    document.body.appendChild(preview);

    let imagemAtiva = null;
    const offset = 16;
    const margem = 10;

    function limparTamanhoPreview() {
      preview.classList.remove("is-atomizador");
      preview.style.removeProperty("width");
      preview.style.removeProperty("height");
      preview.style.removeProperty("max-width");
      preview.style.removeProperty("max-height");
      previewImg.style.removeProperty("width");
      previewImg.style.removeProperty("height");
      previewImg.style.removeProperty("max-width");
      previewImg.style.removeProperty("max-height");
    }

    function ajustarTamanhoPreview(img, src) {
      const isAtomizador =
        /\/ATOMIZADOR\//i.test(String(src || "")) ||
        Boolean(img && typeof img.closest === "function" && img.closest(".atomizador-grupo-row"));
      if (!isAtomizador) {
        limparTamanhoPreview();
        return;
      }

      const rect = img.getBoundingClientRect();
      const baseW = Math.max(1, rect.width);
      const baseH = Math.max(1, rect.height);
      let alvoW = baseW * 2;
      let alvoH = baseH * 2;

      const maxW = Math.max(140, Math.min(window.innerWidth - margem * 4, 620));
      const maxH = Math.max(140, Math.min(window.innerHeight - margem * 4, 620));
      const fator = Math.min(maxW / alvoW, maxH / alvoH, 1);
      alvoW = Math.max(140, alvoW * fator);
      alvoH = Math.max(140, alvoH * fator);

      preview.classList.add("is-atomizador");
      preview.style.maxWidth = `${Math.round(alvoW + 16)}px`;
      preview.style.maxHeight = `${Math.round(alvoH + 16)}px`;
      previewImg.style.width = `${Math.round(alvoW)}px`;
      previewImg.style.height = `${Math.round(alvoH)}px`;
      previewImg.style.maxWidth = `${Math.round(alvoW)}px`;
      previewImg.style.maxHeight = `${Math.round(alvoH)}px`;
    }

    function podeExibir(el) {
      if (!(el instanceof HTMLImageElement)) return false;
      if (!el.src) return false;
      if (preview.contains(el)) return false;
      return true;
    }

    function posicionar(clientX, clientY) {
      const rect = preview.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = clientX + offset;
      let top = clientY + offset;

      if (left + rect.width > vw - margem) left = clientX - rect.width - offset;
      if (left < margem) left = margem;
      if (top + rect.height > vh - margem) top = vh - rect.height - margem;
      if (top < margem) top = margem;

      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
    }

    function exibirParaImagem(img, clientX, clientY) {
      const src = img.currentSrc || img.src;
      if (!src) return;
      imagemAtiva = img;
      previewImg.src = src;
      previewImg.alt = img.alt || "Preview da imagem";
      ajustarTamanhoPreview(img, src);
      preview.classList.add("is-visible");
      posicionar(clientX, clientY);
    }

    function ocultar() {
      imagemAtiva = null;
      preview.classList.remove("is-visible");
      previewImg.removeAttribute("src");
      limparTamanhoPreview();
    }

    document.addEventListener("mouseover", (event) => {
      const target = event.target instanceof Element ? event.target.closest("img") : null;
      if (!target || !podeExibir(target)) return;
      exibirParaImagem(target, event.clientX, event.clientY);
    });

    document.addEventListener("mousemove", (event) => {
      if (!imagemAtiva || !preview.classList.contains("is-visible")) return;
      posicionar(event.clientX, event.clientY);
    });

    document.addEventListener("mouseout", (event) => {
      if (!imagemAtiva) return;
      const saiuDe = event.target instanceof Element ? event.target.closest("img") : null;
      if (!saiuDe || saiuDe !== imagemAtiva) return;
      ocultar();
    });

    window.addEventListener("blur", ocultar);
    window.addEventListener("scroll", () => {
      if (imagemAtiva) ocultar();
    });
  }

  function placeholderSvgPorProduto(item) {
    const familia = String(item.familia || "");
    const fundo =
      familia === "leque"
        ? "#dbeafe"
        : familia === "conico"
        ? "#fee2e2"
        : familia === "rotativo"
        ? "#e0f2fe"
        : "#e5e7eb";
    const texto = String(item.id || item.nome || "PROD").toUpperCase().slice(0, 9);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
      <rect x='0' y='0' width='96' height='96' rx='10' fill='${fundo}'/>
      <circle cx='48' cy='36' r='18' fill='rgba(17,24,39,0.10)'/>
      <rect x='18' y='63' width='60' height='14' rx='5' fill='rgba(17,24,39,0.16)'/>
      <text x='48' y='88' text-anchor='middle' font-family='Arial, sans-serif' font-size='11' fill='#111827'>${escapeHtml(
        texto
      )}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function resolverImagemProduto(item) {
    if (item && typeof item.imagem === "string" && item.imagem.trim()) return item.imagem.trim();
    if (item && typeof item.imagemUrl === "string" && item.imagemUrl.trim()) return item.imagemUrl.trim();
    if (item && typeof item.foto === "string" && item.foto.trim()) return item.foto.trim();
    const id = String((item && item.id) || "").toUpperCase();
    if (id && MAPA_IMAGENS_POR_ID[id]) return MAPA_IMAGENS_POR_ID[id];
    if (item && (item.familia === "rotativo" || item.categoria === "atomizador")) {
      return "js/data/images/ATOMIZADOR.png";
    }
    return placeholderSvgPorProduto(item || {});
  }

  function nomeBaseArquivo(caminho) {
    const valor = String(caminho || "");
    if (!valor || valor.startsWith("data:image/")) return "";
    const semQuery = valor.split("?")[0].split("#")[0];
    const partes = semQuery.split(/[\\/]/);
    const ultimo = partes.length ? partes[partes.length - 1] : "";
    if (!ultimo) return "";
    const decodificado = decodeURIComponent(ultimo);
    return decodificado.replace(/\.[^.]+$/, "");
  }

  function nomeExibicaoProduto(item, caminhoImagem) {
    const nomeArquivo = nomeBaseArquivo(caminhoImagem);
    if (nomeArquivo) return nomeArquivo;
    return String((item && item.nome) || "");
  }

  function normalizarId(value) {
    return String(value || "").trim().toUpperCase();
  }

  function chavesFiltroDetalhadoPorItem(item) {
    const tipoJato = String((item && item.tipoJato) || "").toLowerCase();
    const familia = String((item && item.familia) || "").toLowerCase();
    const nome = String((item && item.nome) || "").toLowerCase();
    const id = normalizarId(item && item.id);
    const isSolido = tipoJato.includes("solido");
    const isLeque = familia === "leque" && (tipoJato.includes("leque") || !tipoJato);
    const isConico = familia === "conico";
    const isConicoEletro = isConico && (id === "90500" || nome.includes("eletrostatic"));
    const isConicoCore = isConico && !isConicoEletro;
    const out = [];
    if (isLeque) out.push("leque");
    if (isSolido) out.push("solido");
    if (isConicoCore) out.push("conico-core");
    if (isConicoEletro) out.push("conico-eletro");
    return out;
  }

  function rotuloFiltroDetalhadoItem(item) {
    const id = normalizarId(item && item.id);
    if (id === "TT90300") return "TT03";
    return id || String((item && item.nome) || "Modelo");
  }

  function montarOpcoesFiltroDetalhado(catalogo) {
    const porGrupo = {
      leque: [],
      solido: [],
      "conico-core": [],
      "conico-eletro": [],
    };
    const vistos = {
      leque: new Set(),
      solido: new Set(),
      "conico-core": new Set(),
      "conico-eletro": new Set(),
    };

    if (!Array.isArray(catalogo)) return porGrupo;
    catalogo.forEach((item) => {
      const id = normalizarId(item && item.id);
      if (!id) return;
      chavesFiltroDetalhadoPorItem(item).forEach((grupo) => {
        if (!Object.prototype.hasOwnProperty.call(porGrupo, grupo)) return;
        if (vistos[grupo].has(id)) return;
        vistos[grupo].add(id);
        porGrupo[grupo].push({
          id,
          rotulo: rotuloFiltroDetalhadoItem(item),
          nome: String((item && item.nome) || ""),
        });
      });
    });

    Object.keys(porGrupo).forEach((grupo) => {
      porGrupo[grupo].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
    });
    return porGrupo;
  }

  function garantirChipWrap(labelPrincipal) {
    if (!labelPrincipal || !labelPrincipal.parentElement) return null;
    if (labelPrincipal.parentElement.classList.contains("chip-wrap")) {
      return labelPrincipal.parentElement;
    }
    const wrap = document.createElement("div");
    wrap.className = "chip-wrap";
    labelPrincipal.parentElement.insertBefore(wrap, labelPrincipal);
    wrap.appendChild(labelPrincipal);
    return wrap;
  }

  function inicializarMenusFiltroDetalhado(catalogo) {
    const opcoes = montarOpcoesFiltroDetalhado(catalogo);
    GRUPOS_FILTRO_DETALHE.forEach((grupo) => {
      const inputPrincipal = form[grupo.filtroId];
      if (!inputPrincipal) return;
      const labelPrincipal = inputPrincipal.closest("label");
      const wrap = garantirChipWrap(labelPrincipal);
      if (!wrap) return;

      const antigo = wrap.querySelector(`.chip-hover-menu[data-filtro-grupo="${grupo.chave}"]`);
      if (antigo) antigo.remove();

      const itens = opcoes[grupo.chave] || [];
      if (!itens.length) return;

      const menu = document.createElement("div");
      menu.className = "chip-hover-menu";
      menu.setAttribute("data-filtro-grupo", grupo.chave);
      menu.addEventListener(
        "wheel",
        (event) => {
          const tentouHorizontal = Math.abs(event.deltaX) > 0 || event.shiftKey;
          if (!tentouHorizontal) return;
          event.preventDefault();
          const deslocamento = Math.abs(event.deltaY) > 0 ? event.deltaY : event.deltaX;
          menu.scrollTop += deslocamento;
        },
        { passive: false }
      );

      const titulo = document.createElement("div");
      titulo.className = "chip-hover-title";
      titulo.textContent = grupo.titulo;
      menu.appendChild(titulo);

      const lista = document.createElement("div");
      lista.className = "chip-hover-list";

      itens.forEach((item) => {
        const opt = document.createElement("label");
        opt.className = "chip-hover-item";

        const ck = document.createElement("input");
        ck.type = "checkbox";
        ck.checked = true;
        ck.value = item.id;
        ck.setAttribute("data-filtro-detalhe", grupo.chave);

        const tx = document.createElement("span");
        tx.textContent = `${item.rotulo} - ${item.nome}`;

        opt.appendChild(ck);
        opt.appendChild(tx);
        lista.appendChild(opt);
      });

      menu.appendChild(lista);
      wrap.appendChild(menu);

      const atualizarEstadoWrap = () => {
        wrap.classList.toggle("chip-wrap-disabled", !inputPrincipal.checked);
      };
      inputPrincipal.addEventListener("change", atualizarEstadoWrap);
      atualizarEstadoWrap();
    });
  }

  function lerFiltrosDetalhadosSelecionados() {
    const filtros = {};
    GRUPOS_FILTRO_DETALHE.forEach((grupo) => {
      const inputPrincipal = form[grupo.filtroId];
      if (!inputPrincipal || !inputPrincipal.checked) return;
      const entradas = form.querySelectorAll(`input[data-filtro-detalhe="${grupo.chave}"]`);
      if (!entradas.length) return;
      filtros[grupo.chave] = Array.from(entradas)
        .filter((el) => el.checked)
        .map((el) => normalizarId(el.value));
    });
    return filtros;
  }

  function chaveRecomendacao(item) {
    return `${normalizarId(item && item.id)}|${String((item && item.configuracaoSugerida) || "").trim()}`;
  }

  function itemCatalogoPorId(catalogo, idNormalizado) {
    if (!Array.isArray(catalogo) || !idNormalizado) return null;
    return catalogo.find((item) => normalizarId(item && item.id) === idNormalizado) || null;
  }

  function atualizarEstadoCardsPulverizador(idSelecionado) {
    if (!pulverizadorGrid) return;
    const alvo = normalizarId(idSelecionado);
    pulverizadorGrid.querySelectorAll(".pulv-card").forEach((btn) => {
      const idBtn = normalizarId(btn.getAttribute("data-id"));
      const ativo = idBtn === alvo;
      btn.classList.toggle("is-active", ativo);
      btn.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
  }

  function popularSelectTT11(item) {
    if (!tt11PontaSelect) return;
    const atual = normalizarId(tt11PontaSelect.value);
    tt11PontaSelect.innerHTML = "";
    const curvas = Array.isArray(item && item.curvasPontaColorida) ? item.curvasPontaColorida : [];
    curvas.forEach((p) => {
      const codigo = String(p.codigo || "");
      if (!codigo) return;
      const opt = document.createElement("option");
      opt.value = codigo;
      opt.textContent = `#${codigo}${p.cor ? ` (${p.cor})` : ""}`;
      tt11PontaSelect.appendChild(opt);
    });
    if (atual) {
      const existe = Array.from(tt11PontaSelect.options).some((o) => normalizarId(o.value) === atual);
      if (existe) tt11PontaSelect.value = atual;
    }
    if (!tt11PontaSelect.value && tt11PontaSelect.options.length) {
      tt11PontaSelect.selectedIndex = 0;
    }
  }

  function popularSelectCoreDisco(item) {
    if (!coreDiscoSelect) return;
    const atual = normalizarId(coreDiscoSelect.value);
    coreDiscoSelect.innerHTML = "";
    const curvas = Array.isArray(item && item.curvasDisco) ? item.curvasDisco : [];
    curvas.forEach((d) => {
      const disco = String(d.disco || "");
      if (!disco) return;
      const opt = document.createElement("option");
      opt.value = disco;
      opt.textContent = disco;
      coreDiscoSelect.appendChild(opt);
    });
    if (atual) {
      const existe = Array.from(coreDiscoSelect.options).some((o) => normalizarId(o.value) === atual);
      if (existe) coreDiscoSelect.value = atual;
    }
    if (!coreDiscoSelect.value && coreDiscoSelect.options.length) {
      coreDiscoSelect.selectedIndex = 0;
    }
  }

  function atualizarSubconfigPulverizador(catalogo) {
    const idSel = normalizarId(pulverizadorSelecionadoInput && pulverizadorSelecionadoInput.value);
    const item = itemCatalogoPorId(catalogo, idSel);

    if (tt11Config) {
      const mostrarTT11 = Boolean(item && idSel === "TT11");
      tt11Config.hidden = !mostrarTT11;
      if (mostrarTT11) {
        popularSelectTT11(item);
      } else if (tt11PontaSelect) {
        tt11PontaSelect.innerHTML = "";
      }
    }

    if (coreConfig) {
      const mostrarCore = Boolean(item && Array.isArray(item.curvasDisco) && item.curvasDisco.length);
      coreConfig.hidden = !mostrarCore;
      if (mostrarCore) {
        popularSelectCoreDisco(item);
      } else if (coreDiscoSelect) {
        coreDiscoSelect.innerHTML = "";
      }
    }
  }

  function inicializarSeletorPulverizador(catalogo, onChange) {
    if (!pulverizadorGrid || !pulverizadorSelecionadoInput || !Array.isArray(catalogo)) return;

    const itens = catalogo
      .filter((item) => item && (item.categoria === "bico" || item.categoria === "core" || item.categoria === "atomizador"))
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

    const frag = document.createDocumentFragment();

    const criarCard = (item, id, nome, imagem) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pulv-card";
      btn.setAttribute("data-id", id || "");
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = `
        <img src="${escapeHtml(imagem)}" alt="${escapeHtml(nome)}" loading="lazy" />
        <span>${escapeHtml(nome)}</span>
      `;
      btn.addEventListener("click", function () {
        pulverizadorSelecionadoInput.value = id || "";
        atualizarEstadoCardsPulverizador(id || "");
        atualizarSubconfigPulverizador(catalogo);
        if (typeof onChange === "function") onChange();
      });
      frag.appendChild(btn);
    };

    criarCard(null, "", "Auto", placeholderSvgPorProduto({ id: "AUTO", familia: "leque" }));

    itens.forEach((item) => {
      const id = String(item.id || "");
      criarCard(item, id, item.nome || id, resolverImagemProduto(item));
    });

    pulverizadorGrid.innerHTML = "";
    pulverizadorGrid.appendChild(frag);

    atualizarEstadoCardsPulverizador(pulverizadorSelecionadoInput.value || "");
    atualizarSubconfigPulverizador(catalogo);

    if (tt11PontaSelect) {
      tt11PontaSelect.addEventListener("change", function () {
        if (typeof onChange === "function") onChange();
      });
    }
    if (coreDiscoSelect) {
      coreDiscoSelect.addEventListener("change", function () {
        if (typeof onChange === "function") onChange();
      });
    }
  }

  function normalizarPontosCurvaLocal(pontos) {
    if (!Array.isArray(pontos)) return [];
    return pontos
      .filter(
        (p) =>
          p &&
          Number.isFinite(Number(p.psi)) &&
          Number.isFinite(Number(p.vazaoLMin))
      )
      .map((p) => ({ psi: Number(p.psi), vazaoLMin: Number(p.vazaoLMin) }))
      .sort((a, b) => a.psi - b.psi);
  }

  function estimarPsiPorVazaoCurvaLocal(curva, vazao) {
    if (!Array.isArray(curva) || curva.length < 2 || !Number.isFinite(vazao)) return null;
    const vMin = Math.min(curva[0].vazaoLMin, curva[curva.length - 1].vazaoLMin);
    const vMax = Math.max(curva[0].vazaoLMin, curva[curva.length - 1].vazaoLMin);

    if (vazao < vMin) {
      const a = curva[0];
      const b = curva[1];
      const spanV = b.vazaoLMin - a.vazaoLMin;
      if (spanV === 0) return a.psi;
      const t = (vazao - a.vazaoLMin) / spanV;
      return a.psi + (b.psi - a.psi) * t;
    }
    if (vazao > vMax) {
      const a = curva[curva.length - 2];
      const b = curva[curva.length - 1];
      const spanV = b.vazaoLMin - a.vazaoLMin;
      if (spanV === 0) return b.psi;
      const t = (vazao - a.vazaoLMin) / spanV;
      return a.psi + (b.psi - a.psi) * t;
    }

    for (let i = 0; i < curva.length - 1; i += 1) {
      const a = curva[i];
      const b = curva[i + 1];
      const minSeg = Math.min(a.vazaoLMin, b.vazaoLMin);
      const maxSeg = Math.max(a.vazaoLMin, b.vazaoLMin);
      if (vazao >= minSeg && vazao <= maxSeg) {
        const spanV = b.vazaoLMin - a.vazaoLMin;
        if (spanV === 0) return a.psi;
        const t = (vazao - a.vazaoLMin) / spanV;
        return a.psi + (b.psi - a.psi) * t;
      }
    }

    return null;
  }

  function montarPsiFaixaPorCurva(curva, vazaoReqFaixa) {
    if (!curva || !vazaoReqFaixa) return null;
    const psi = {
      min: estimarPsiPorVazaoCurvaLocal(curva, vazaoReqFaixa.min),
      med: estimarPsiPorVazaoCurvaLocal(curva, vazaoReqFaixa.med),
      max: estimarPsiPorVazaoCurvaLocal(curva, vazaoReqFaixa.max),
    };
    if (!Number.isFinite(psi.min) || !Number.isFinite(psi.med) || !Number.isFinite(psi.max)) return null;
    return psi;
  }

  function obterReferenciaPressaoSelecaoDireta(demandaFaixa) {
    const idSelecionado = normalizarId(pulverizadorSelecionadoInput && pulverizadorSelecionadoInput.value);
    if (!idSelecionado || !Array.isArray(catalogoAtivo) || !demandaFaixa || !demandaFaixa.vazaoPorPulverizadorLMin) {
      return null;
    }

    const item = itemCatalogoPorId(catalogoAtivo, idSelecionado);
    if (!item) return null;

    if (idSelecionado === "TT11") {
      const codigo = normalizarId(tt11PontaSelect && tt11PontaSelect.value);
      if (!codigo || !Array.isArray(item.curvasPontaColorida)) return null;
      const curvaItem = item.curvasPontaColorida.find((p) => normalizarId(p && p.codigo) === codigo);
      if (!curvaItem) return null;
      const curva = normalizarPontosCurvaLocal(curvaItem.pontos);
      const psiEstimadoFaixa = montarPsiFaixaPorCurva(curva, demandaFaixa.vazaoPorPulverizadorLMin);
      if (!psiEstimadoFaixa) return null;
      return {
        ...item,
        psiEstimadoFaixa,
        nome: `${item.nome} #${curvaItem.codigo}${curvaItem.cor ? ` (${curvaItem.cor})` : ""}`,
        pontaSelecionada: { codigo: curvaItem.codigo || "", cor: curvaItem.cor || "" },
        selecaoDireta: true,
      };
    }

    if (Array.isArray(item.curvasDisco) && item.curvasDisco.length) {
      const disco = normalizarId(coreDiscoSelect && coreDiscoSelect.value);
      if (!disco) return null;
      const curvaDisco = item.curvasDisco.find((d) => normalizarId(d && d.disco) === disco);
      if (!curvaDisco) return null;
      const curva = normalizarPontosCurvaLocal(curvaDisco.pontos);
      const psiEstimadoFaixa = montarPsiFaixaPorCurva(curva, demandaFaixa.vazaoPorPulverizadorLMin);
      if (!psiEstimadoFaixa) return null;
      return {
        ...item,
        psiEstimadoFaixa,
        nome: `${item.nome} ${curvaDisco.disco || ""}`.trim(),
        discoSelecionado: curvaDisco.disco || "",
        selecaoDireta: true,
      };
    }

    return null;
  }

  function itemCorrespondeSelecaoAtual(item, idSelecionado, tt11Ponta, coreDisco) {
    if (!item || normalizarId(item.id) !== idSelecionado) return false;
    if (idSelecionado === "TT11") {
      if (!tt11Ponta) return true;
      return normalizarId(item.pontaSelecionada && item.pontaSelecionada.codigo) === tt11Ponta;
    }
    if (coreDisco) {
      return normalizarId(item.discoSelecionado) === coreDisco;
    }
    return true;
  }

  function escolherReferenciaPressao(resultado, demandaFaixa) {
    const recomendados = Array.isArray(resultado && resultado.recomendados) ? resultado.recomendados : [];
    if (!chaveRecomendacaoSelecionada) return null;
    return recomendados.find((item) => chaveRecomendacao(item) === chaveRecomendacaoSelecionada) || null;
  }

  function renderConfiguracaoHtml(item) {
    const textoConfiguracao = String(item.configuracaoSugerida || "n/d");
    const ehAtomizador =
      Boolean(item && item.categoria === "atomizador") ||
      String((item && item.familia) || "").toLowerCase() === "rotativo" ||
      String((item && item.tipoJato) || "").toLowerCase().includes("rotativo");

    if (ehAtomizador) {
      const imagemProdutoRef = resolverImagemProduto(item);
      const nomeObsCfg = normalizarCorNome(
        `${String((item && item.nome) || "")} ${String((item && item.observacao) || "")} ${textoConfiguracao} ${String(
          imagemProdutoRef || ""
        )}`
      );
      const componentes = [];

      const corBruta = normalizarCorNome(item && item.vruSelecionado && item.vruSelecionado.cor);
      const corCanal = corBruta === "d5" ? "vermelho" : corBruta === "d7" ? "verde" : corBruta;
      const corFinal = corCanal === "vermelho" || corCanal === "verde" || corCanal === "preto" ? corCanal : "preto";

      const ehVruEsfera = /vru esfera/.test(nomeObsCfg);
      const usaVruInox = ehVruEsfera || /v\.?r\.?u\s*inox|vru inox/.test(nomeObsCfg);
      const vruNaBarra = /vru na barra/.test(nomeObsCfg);
      const vruNoEixo = /vru no eixo/.test(nomeObsCfg);
      const localVru = vruNaBarra ? "barra" : vruNoEixo ? "eixo" : "indef";

      const antiPolNoEixoExp = /anti[- ]?gotejo\s+polimero\s+no\s+eixo/.test(nomeObsCfg);
      const antiPolNaBarraExp = /anti[- ]?gotejo\s+polimero\s+na\s+barra/.test(nomeObsCfg);
      const antiInoxNoEixoExp = /anti[- ]?gotejo\s+inox\s+no\s+eixo/.test(nomeObsCfg);
      const antiInoxNaBarraExp = /anti[- ]?gotejo\s+inox\s+na\s+barra/.test(nomeObsCfg);

      const temTipoAntiPolExplicito = antiPolNoEixoExp || antiPolNaBarraExp;
      const temTipoAntiInoxExplicito = antiInoxNoEixoExp || antiInoxNaBarraExp;

      const antigotejoPolNoEixo =
        antiPolNoEixoExp || (!temTipoAntiInoxExplicito && /valvula\s+polimero\s+no\s+eixo/.test(nomeObsCfg));
      const antigotejoPolNaBarra =
        antiPolNaBarraExp || (!temTipoAntiInoxExplicito && /valvula\s+polimero\s+na\s+barra/.test(nomeObsCfg));
      const antigotejoInoxNoEixo =
        antiInoxNoEixoExp || (!temTipoAntiPolExplicito && /valvula\s+inox\s+no\s+eixo/.test(nomeObsCfg));
      const antigotejoInoxNaBarra =
        antiInoxNaBarraExp || (!temTipoAntiPolExplicito && /valvula\s+inox\s+na\s+barra/.test(nomeObsCfg));

      const localAntigotejo = antigotejoInoxNaBarra || antigotejoPolNaBarra
        ? "barra"
        : antigotejoInoxNoEixo || antigotejoPolNoEixo
        ? "eixo"
        : "indef";

      const componentesBase = [];
      const vruImagem = usaVruInox ? "js/data/images/MONTAGEM/VRUINOX.jpeg" : "js/data/images/MONTAGEM/VRUPOL.jpeg";
      componentesBase.push({
        src: vruImagem,
        alt: usaVruInox ? "VRU inox" : "VRU polimero",
        local: localVru,
        ordem: 0,
      });

      if (antigotejoPolNoEixo || antigotejoPolNaBarra) {
        componentesBase.push({
          src: "js/data/images/MONTAGEM/BOJOPOL.jpeg",
          alt: "Bojo anti-gotejo polimero",
          local: localAntigotejo,
          ordem: 1,
        });
      } else if (antigotejoInoxNoEixo || antigotejoInoxNaBarra) {
        componentesBase.push({
          src: "js/data/images/MONTAGEM/ANTIGOTEJOINOX.png",
          alt: "Anti-gotejo inox",
          local: localAntigotejo,
          ordem: 1,
        });
      }

      const ordemLocal = { barra: 0, eixo: 1, indef: 2 };
      const ordemDoLocal = (local) =>
        Object.prototype.hasOwnProperty.call(ordemLocal, local) ? ordemLocal[local] : 9;
      componentesBase
        .sort((a, b) => ordemDoLocal(a.local) - ordemDoLocal(b.local) || a.ordem - b.ordem)
        .forEach((comp) => {
          componentes.push({ src: comp.src, alt: comp.alt });
        });

      const bojaoPorCor = {
        preto: "js/data/images/MONTAGEM/bojaopreto.png",
        vermelho: "js/data/images/MONTAGEM/bojaovermelho.png",
        verde: "js/data/images/MONTAGEM/bojaoverde.png",
      };
      const bojinhoPorCor = {
        preto: "js/data/images/MONTAGEM/bojinhopreto.jpg",
        vermelho: "js/data/images/MONTAGEM/bojinhovermelho.jpg",
        verde: "js/data/images/MONTAGEM/bojinhoverde.jpg",
      };

      if (antigotejoInoxNoEixo && bojaoPorCor[corFinal]) {
        componentes.push({
          src: bojaoPorCor[corFinal],
          alt: `Bojao ${corFinal}`,
        });
      }

      if (bojinhoPorCor[corFinal]) {
        componentes.push({
          src: bojinhoPorCor[corFinal],
          alt: `Bojinho ${corFinal}`,
        });
      }

      if (componentes.length) {
        const htmlComponentes = componentes
          .map(
            (comp) =>
              `<img class="montagem-item-img" src="${escapeHtml(comp.src)}" alt="${escapeHtml(comp.alt)}" loading="lazy" />`
          )
          .join("");
        return `<div class="montagem-strip">${htmlComponentes}</div>`;
      }
    }

    const linhasConfiguracao = textoConfiguracao
      .split(/\s\|\s/g)
      .filter((linha) => !/ponta fixa recomendada/i.test(String(linha || "")));
    const idItem = normalizarId(item && item.id);
    const temOrificioRecomendado =
      Boolean(item && item.ajuste && item.ajuste.modo === "orificio") &&
      Number.isFinite(Number(item && item.orificioSelecionadoMm));
    let linhasHtml = linhasConfiguracao.map((linha) => escapeHtml(linha));

    if (temOrificioRecomendado) {
      const imagemOrificio =
        idItem === "TT09" ? "js/data/images/4-orificios.png" : "js/data/images/5-orificios.png";
      const altOrificio =
        idItem === "TT09" ? "Demonstracao de bico 4 orificios" : "Demonstracao de bico 5 orificios";
      linhasHtml = linhasConfiguracao.map((linha) => {
        const linhaEscapada = escapeHtml(linha);
        if (!/orificio recomendado/i.test(linha)) return linhaEscapada;
        return `<span class="orificio-line-text">${linhaEscapada}</span><img class="orificio-demo-img" src="${imagemOrificio}" alt="${altOrificio}" loading="lazy" />`;
      });
    }

    const temCurvasDisco = Boolean(item && Array.isArray(item.curvasDisco) && item.curvasDisco.length);
    if (temCurvasDisco) {
      linhasHtml = linhasConfiguracao.map((linha) => {
        const linhaEscapada = escapeHtml(linha);
        if (!/disco recomendado/i.test(linha)) return linhaEscapada;

        const matchCodigo = linha.match(/disco recomendado\s*(d\s*\d+)/i);
        const codigoBruto = (matchCodigo && matchCodigo[1]) || item.discoSelecionado || "";
        const codigoNormalizado = normalizarId(codigoBruto).replace(/\s+/g, "");
        const numero = codigoNormalizado.replace(/^D/, "");

        if (!/^\d+$/.test(numero)) return linhaEscapada;

        const imagemDisco = `js/data/images/DISCO/DISCO${numero}.png`;
        const altDisco = `Disco ${codigoNormalizado}`;
        return `<span class="disco-line-text">${linhaEscapada}</span><img class="disco-demo-img" src="${imagemDisco}" alt="${escapeHtml(
          altDisco
        )}" loading="lazy" />`;
      });
    }

    const blocos = [];
    if (linhasHtml.length) {
      blocos.push(linhasHtml.join("<br>"));
    }
    const ponta = item && item.pontaSelecionada ? item.pontaSelecionada : null;
    if (ponta && (ponta.codigo || ponta.cor)) {
      const corNome = ponta.cor || "sem-cor";
      const corHex = hexCorBico(corNome);
      const corTexto = corTextoContraste(corHex);
      const codigoPonta = String(ponta.codigo || "").trim().replace(/^#/, "");
      const label = escapeHtml(codigoPonta ? `${codigoPonta} - ${corNome}` : corNome);
      const badgeHtml = `<span class="ponta-badge"><span class="ponta-dot" style="background:${corHex};"></span><span class="ponta-pill" style="background:${corHex};color:${corTexto};">${label}</span></span>`;
      const idAtual = normalizarId(item && item.id);
      const exibirImagemPonteira = idAtual === "TT11";
      const imgPonteira = caminhoImagemPonteira(corNome);
      if (exibirImagemPonteira && imgPonteira) {
        blocos.push(
          `<span class="ponta-line">${badgeHtml}<img class="ponta-demo-img" src="${imgPonteira}" alt="Ponteira ${escapeHtml(
            corNome
          )}" loading="lazy" /></span>`
        );
      } else {
        blocos.push(badgeHtml);
      }
    }
    return blocos.join("<br>");
  }

  function lerConfiguracaoPsi() {
    const faixaPreferencial = { min: 25, max: 40 };
    return {
      criterio: "preferencial",
      // Regra fixa de preferencia para recomendacao:
      // - Alvo de operacao: 25-40 psi
      // (fora dessa faixa ainda pode aparecer quando nao houver opcao melhor)
      faixa: { ...faixaPreferencial },
      faixasPorTipo: {
        outros: { ...faixaPreferencial },
        eletrostatico: { ...faixaPreferencial },
      },
      // Limite minimo para exibir opcoes de cor nos atomizadores (VRU).
      limiteMinPsiCorAtomizador: 20,
      permitirPsiAlto: true,
    };
  }

  function ajustarFiltrosPorQuantidadePulverizadores() {
    const filtroAtomizador = form["filtro-atomizador"];
    if (!filtroAtomizador) return;

    if (paginaAtomizadores) {
      filtroAtomizador.checked = true;
      return;
    }

    // Na tela geral, atomizador fica separado em pagina dedicada.
    filtroAtomizador.checked = false;
  }

  function lerFiltrosTipos() {
    if (paginaAtomizadores) {
      return {
        leque: false,
        solido: false,
        conico: false,
        conicoCoreDisco: false,
        conicoEletrostatico: false,
        atomizador: true,
      };
    }

    const filtroConicoCoreDisco = Boolean(form["filtro-conico-core"] && form["filtro-conico-core"].checked);
    const filtroConicoEletrostatico = Boolean(form["filtro-conico-eletro"] && form["filtro-conico-eletro"].checked);
    const algumConico = filtroConicoCoreDisco || filtroConicoEletrostatico;

    const tipos = {
      leque: Boolean(form["filtro-leque"] && form["filtro-leque"].checked),
      solido: Boolean(form["filtro-solido"] && form["filtro-solido"].checked),
      conico: algumConico,
      conicoCoreDisco: filtroConicoCoreDisco,
      conicoEletrostatico: filtroConicoEletrostatico,
      atomizador: false,
    };

    if (
      !tipos.leque &&
      !tipos.solido &&
      !tipos.conicoCoreDisco &&
      !tipos.conicoEletrostatico &&
      !tipos.atomizador
    ) {
      throw new Error("Selecione pelo menos um tipo para pesquisar.");
    }

    return tipos;
  }

  function lerModoExibicao() {
    const modo = modoExibicaoSelect ? modoExibicaoSelect.value : "medio";
    return modo === "medio" ? "medio" : "faixa";
  }

  function renderSummary(demandaFaixa, resultado, modoExibicao) {
    if (summaryCards) summaryCards.innerHTML = "";
    const areaCobertaHaMin = {
      min: (demandaFaixa.velocidadesKmh.min * demandaFaixa.faixaM) / 600,
      med: (demandaFaixa.velocidadesKmh.med * demandaFaixa.faixaM) / 600,
      max: (demandaFaixa.velocidadesKmh.max * demandaFaixa.faixaM) / 600,
    };

    const cards = [
      {
        label: modoExibicao === "medio" ? "Velocidade media" : "Velocidade (min/med/max)",
        value:
          modoExibicao === "medio"
            ? `${n(demandaFaixa.velocidadesKmh.med, 2)} km/h`
            : faixa3(
                demandaFaixa.velocidadesKmh.min,
                demandaFaixa.velocidadesKmh.med,
                demandaFaixa.velocidadesKmh.max,
                "km/h",
                2
              ),
      },
      {
        label: modoExibicao === "medio" ? "Area coberta media" : "Area coberta (min/med/max)",
        value:
          modoExibicao === "medio"
            ? `${n(areaCobertaHaMin.med, 3)} ha/min`
            : faixa3(
                areaCobertaHaMin.min,
                areaCobertaHaMin.med,
                areaCobertaHaMin.max,
                "ha/min",
                3
              ),
      },
      {
        label: modoExibicao === "medio" ? "Vazao total media" : "Vazao total (min/med/max)",
        value:
          modoExibicao === "medio"
            ? `${n(demandaFaixa.vazaoTotalLMin.med, 2)} L/min`
            : faixa3(
                demandaFaixa.vazaoTotalLMin.min,
                demandaFaixa.vazaoTotalLMin.med,
                demandaFaixa.vazaoTotalLMin.max,
                "L/min",
                2
              ),
      },
      {
        label: modoExibicao === "medio" ? "Vazao por pulverizador media" : "Vazao por pulverizador (min/med/max)",
        value:
          modoExibicao === "medio"
            ? `${n(demandaFaixa.vazaoPorPulverizadorLMin.med, 2)} L/min`
            : faixa3(
                demandaFaixa.vazaoPorPulverizadorLMin.min,
                demandaFaixa.vazaoPorPulverizadorLMin.med,
                demandaFaixa.vazaoPorPulverizadorLMin.max,
                "L/min",
                2
              ),
      },
      {
        label: "Modelos compativeis",
        value: `${resultado.totalCompativeis}/${resultado.totalCatalogo}`,
      },
    ];

    if (summaryCards) {
      cards.forEach((card) => {
        const node = document.createElement("article");
        node.className = "card";
        node.innerHTML = `<span class="label">${card.label}</span><span class="value">${card.value}</span>`;
        summaryCards.appendChild(node);
      });
    }

    // Layout alternativo: tabela de colunas Min/Med/Max (se os IDs existirem na pagina).
    const referenciaPressao = escolherReferenciaPressao(resultado, demandaFaixa);
    referenciaPsiPopup = referenciaPressao || null;
    if (!referenciaPsiPopup) esconderPopupPsi();
    const psiTop = referenciaPressao && referenciaPressao.psiEstimadoFaixa ? referenciaPressao.psiEstimadoFaixa : null;
    const txt = (value, dec, suffix) =>
      Number.isFinite(value) ? `${n(value, dec)}${suffix ? ` ${suffix}` : ""}` : "-";
    const set = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };

    set("res-vel-min", txt(demandaFaixa.velocidadesKmh.min, 2, ""));
    set("res-vel-med", txt(demandaFaixa.velocidadesKmh.med, 2, ""));
    set("res-vel-max", txt(demandaFaixa.velocidadesKmh.max, 2, ""));

    set("res-area-min", txt(areaCobertaHaMin.min, 3, ""));
    set("res-area-med", txt(areaCobertaHaMin.med, 3, ""));
    set("res-area-max", txt(areaCobertaHaMin.max, 3, ""));

    set("res-vt-min", txt(demandaFaixa.vazaoTotalLMin.min, 2, ""));
    set("res-vt-med", txt(demandaFaixa.vazaoTotalLMin.med, 2, ""));
    set("res-vt-max", txt(demandaFaixa.vazaoTotalLMin.max, 2, ""));

    set("res-vb-min", txt(demandaFaixa.vazaoPorPulverizadorLMin.min, 2, ""));
    set("res-vb-med", txt(demandaFaixa.vazaoPorPulverizadorLMin.med, 2, ""));
    set("res-vb-max", txt(demandaFaixa.vazaoPorPulverizadorLMin.max, 2, ""));

    set("res-psi-min", txt(psiTop && psiTop.min, 1, ""));
    set("res-psi-med", txt(psiTop && psiTop.med, 1, ""));
    set("res-psi-max", txt(psiTop && psiTop.max, 1, ""));

    if (pressaoBaseInfo) {
      pressaoBaseInfo.textContent = referenciaPressao
        ? `Pressao baseada em: ${referenciaPressao.nome || referenciaPressao.id || "selecionado"}`
        : "Pressao baseada em: sem referencia";
    }

    if (configValidacaoInfo) {
      const selecionado = normalizarId(pulverizadorSelecionadoInput && pulverizadorSelecionadoInput.value);
      const tt11Ponta = normalizarId(tt11PontaSelect && tt11PontaSelect.value);
      const coreDisco = normalizarId(coreDiscoSelect && coreDiscoSelect.value);
      const recomendados = Array.isArray(resultado && resultado.recomendados) ? resultado.recomendados : [];
      configValidacaoInfo.classList.remove("is-ok", "is-warn");

      if (!selecionado) {
        configValidacaoInfo.textContent = "Modo auto: usando o pulverizador mais recomendado.";
      } else {
        const recomendadoExato = recomendados.find((item) =>
          itemCorrespondeSelecaoAtual(item, selecionado, tt11Ponta, coreDisco)
        );
        if (recomendadoExato) {
          configValidacaoInfo.textContent = "Configuracao escolhida: OK para os parametros informados.";
          configValidacaoInfo.classList.add("is-ok");
        } else {
          const recomendadoMesmoPulv = recomendados.find((item) => normalizarId(item && item.id) === selecionado);
          if (recomendadoMesmoPulv) {
            const sugestao = String(recomendadoMesmoPulv.configuracaoSugerida || "").replace(/\s\|\s/g, ", ");
            configValidacaoInfo.textContent =
              `Configuracao escolhida nao recomendada. Sugestao melhor para esse pulverizador: ${sugestao}.`;
          } else if (recomendados.length) {
            configValidacaoInfo.textContent =
              `Pulverizador escolhido fora da recomendacao para esses dados. Melhor opcao atual: ${recomendados[0].nome}.`;
          } else {
            configValidacaoInfo.textContent = "Nao ha recomendacoes validas para os parametros atuais.";
          }
          configValidacaoInfo.classList.add("is-warn");
        }
      }
    }
  }

  function renderWarnings(resultado, recomendados) {
    warnings.innerHTML = "";
    // Avisos ocultos por solicitacao do usuario.
  }

  function formatVelocidadeCabecalho(valor) {
    if (!Number.isFinite(valor)) return "-";
    return Number.isInteger(valor) ? n(valor, 0) : n(valor, 1);
  }

  function atualizarCabecalhoDemanda(demandaFaixa) {
    if (!demandaFaixa || !demandaFaixa.velocidadesKmh) return;
    const set = (id, label, valor) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = `${label} (${formatVelocidadeCabecalho(valor)} km/h)`;
    };
    set("th-demanda-min", "Velocidade minima", demandaFaixa.velocidadesKmh.min);
    set("th-demanda-med", "Velocidade media", demandaFaixa.velocidadesKmh.med);
    set("th-demanda-max", "Velocidade maxima", demandaFaixa.velocidadesKmh.max);
  }

  function renderTable(recomendados, demandaFaixa, resultado, modoExibicao) {
    tableBody.innerHTML = "";

    const isAtomizadorItem = (item) =>
      Boolean(item && item.categoria === "atomizador") ||
      String((item && item.familia) || "").toLowerCase() === "rotativo" ||
      String((item && item.tipoJato) || "").toLowerCase().includes("rotativo");

    const ORDEM_COR_VRU = { preto: 0, vermelho: 1, verde: 2, d5: 0, d7: 1 };
    const renderTagCor = (corNome) => {
      const label = String(corNome || "n/d");
      const corHex = hexCorBico(label);
      const corTexto = corTextoContraste(corHex);
      return `<span class="vru-tag" style="background:${corHex};color:${corTexto};">${escapeHtml(label)}</span>`;
    };

    const extrairLinhasConfigAtomizador = (item) => {
      const linhas = String((item && item.configuracaoSugerida) || "")
        .split(/\s\|\s/g)
        .map((linha) => String(linha || "").trim())
        .filter(Boolean);
      const instalacao = linhas.find((linha) => /^instalacao:/i.test(linha)) || "";
      const vru = linhas.find((linha) => /^vru posicao/i.test(linha)) || "";
      const rotacao = linhas.find((linha) => /^rotacao/i.test(linha)) || "";
      const outras = linhas.filter(
        (linha) => !/^instalacao:/i.test(linha) && !/^vru posicao/i.test(linha) && !/^rotacao/i.test(linha)
      );
      return { instalacao, vru, rotacao, outras };
    };

    const chaveAgrupamentoAtomizador = (item) => {
      const id = normalizarId(item && item.id);
      const cfg = extrairLinhasConfigAtomizador(item);
      const baseConfig = [cfg.instalacao, cfg.rotacao, ...cfg.outras]
        .map((v) => String(v || "").toLowerCase().trim())
        .filter(Boolean)
        .join("|");
      return `${id}|${baseConfig}`;
    };

    const aplicarSelecaoVisual = () => {
      tableBody.querySelectorAll("tr").forEach((row) => {
        const chaveLinha = row.getAttribute("data-chave-rec") || "";
        const chavesLinha = String(row.getAttribute("data-chaves-rec") || "")
          .split("||")
          .map((v) => v.trim())
          .filter(Boolean);
        const ativo =
          Boolean(chaveRecomendacaoSelecionada) &&
          (chaveLinha === chaveRecomendacaoSelecionada || chavesLinha.includes(chaveRecomendacaoSelecionada));
        row.classList.toggle("row-selected", ativo);
        row.querySelectorAll("[data-chave-rec-item]").forEach((subitem) => {
          const chaveItem = subitem.getAttribute("data-chave-rec-item") || "";
          const ativoItem = Boolean(chaveRecomendacaoSelecionada) && chaveItem === chaveRecomendacaoSelecionada;
          subitem.classList.toggle("is-selected", ativoItem);
        });
      });
    };

    const grupoProduto = (item) => {
      const id = normalizarId(item && item.id);
      const nome = String((item && item.nome) || "").toLowerCase();

      if (id === "TT11") return { key: "tt11", label: "TT11", ordem: 0 };
      if (id === "TT90300" || id === "TT03") return { key: "tt03", label: "TT03", ordem: 1 };
      if (id === "TT09") return { key: "tt09", label: "TT09", ordem: 2 };
      if (id.startsWith("CORE")) return { key: "core-disco", label: "Core e Disco", ordem: 3 };
      if (id === "90500" || nome.includes("eletrostatic")) {
        return { key: "eletrostatico", label: "Eletrostatico", ordem: 4 };
      }
      if (id === "90088" || id === "90088A" || nome.includes("leque seletor") || nome.includes("plano seletor")) {
        return { key: "leque-seletor", label: "Plano Seletor", ordem: 5 };
      }
      if (isAtomizadorItem(item)) {
        return {
          key: `atomizador-${id || normalizarId(item && item.nome)}`,
          label: String((item && item.nome) || "Atomizador"),
          ordem: 6,
        };
      }

      return { key: `outros-${String(item && item.familia)}`, label: familiaLabel(item.familia), ordem: 99 };
    };

    const recomendadosOrdenados = [...recomendados].sort((a, b) => {
      const grupoA = grupoProduto(a);
      const grupoB = grupoProduto(b);
      if (grupoA.ordem !== grupoB.ordem) return grupoA.ordem - grupoB.ordem;
      if (grupoA.label !== grupoB.label) return grupoA.label.localeCompare(grupoB.label, "pt-BR");
      if (a.score !== b.score) return b.score - a.score;
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });

    const entradasRender = [];
    recomendadosOrdenados.forEach((item) => {
      if (!isAtomizadorItem(item)) {
        entradasRender.push({ tipo: "item", item });
        return;
      }
      const chave = chaveAgrupamentoAtomizador(item);
      const ultimo = entradasRender.length ? entradasRender[entradasRender.length - 1] : null;
      if (ultimo && ultimo.tipo === "atomizador-grupo" && ultimo.chave === chave) {
        ultimo.itens.push(item);
        return;
      }
      entradasRender.push({ tipo: "atomizador-grupo", chave, itens: [item] });
    });

    const totalColunas = Math.max(
      1,
      Number(
        tableBody &&
          tableBody.closest("table") &&
          tableBody.closest("table").querySelectorAll("thead th").length
      ) || 9
    );
    let grupoAnterior = null;
    let linhaNumero = 0;
    const vazaoReq = demandaFaixa.vazaoPorPulverizadorLMin;

    const classePorPsi = (psi, faixaRef, limiteMinBaixaPsi) => {
      const minFaixa = faixaRef && Number.isFinite(Number(faixaRef.min)) ? Number(faixaRef.min) : NaN;
      const maxFaixa = faixaRef && Number.isFinite(Number(faixaRef.max)) ? Number(faixaRef.max) : NaN;
      const abaixoFaixa = Number.isFinite(psi) && Number.isFinite(minFaixa) && psi < minFaixa;
      const acimaFaixa = Number.isFinite(psi) && Number.isFinite(maxFaixa) && psi > maxFaixa;
      return [
        abaixoFaixa ? "pressao-faixa-baixa" : "",
        acimaFaixa ? "pressao-faixa-alta" : "",
        !abaixoFaixa && Number.isFinite(psi) && psi < limiteMinBaixaPsi ? "pressao-baixa" : "",
        !acimaFaixa && Number.isFinite(psi) && psi > 60 ? "pressao-alta" : "",
      ]
        .filter(Boolean)
        .join(" ");
    };

    const blocoDemandaHtml = (vazao, psi, faixaRef, limiteMinBaixaPsi) => {
      const temPsi = Number.isFinite(psi);
      const psiExibivel = temPsi && psi >= LIMITE_MIN_PSI_EXIBICAO;
      const avisoBaixaPressao =
        psiExibivel && psi < limiteMinBaixaPsi
          ? `<small class="tag-psi-baixa">Abaixo de ${n(limiteMinBaixaPsi, 0)} psi: o bico pode fechar</small>`
          : "";
      return `<div class="demanda-vazao">${n(vazao, 2)} L/min</div><small class="demanda-psi ${classePorPsi(
        psiExibivel ? psi : NaN,
        faixaRef,
        limiteMinBaixaPsi
      )}">${psiExibivel ? `${n(psi, 1)} psi` : "n/d"}</small>${avisoBaixaPressao}`;
    };

    const obterPsiPorFaixa = (item, faixaChave) => {
      const psiFaixa = item && item.psiEstimadoFaixa ? item.psiEstimadoFaixa : null;
      const temFaixaPressaoItem =
        item && Number.isFinite(item.pressaoMinPsi) && Number.isFinite(item.pressaoMaxPsi);
      if (faixaChave === "min") {
        return psiFaixa && Number.isFinite(psiFaixa.min)
          ? psiFaixa.min
          : temFaixaPressaoItem
          ? item.pressaoMinPsi
          : NaN;
      }
      if (faixaChave === "med") {
        return psiFaixa && Number.isFinite(psiFaixa.med)
          ? psiFaixa.med
          : temFaixaPressaoItem
          ? (item.pressaoMinPsi + item.pressaoMaxPsi) / 2
          : NaN;
      }
      return psiFaixa && Number.isFinite(psiFaixa.max)
        ? psiFaixa.max
        : temFaixaPressaoItem
        ? item.pressaoMaxPsi
        : NaN;
    };

    const ordenarItensGrupoAtomizador = (itens) =>
      [...itens].sort((a, b) => {
        const corA = normalizarCorNome(a && a.vruSelecionado && a.vruSelecionado.cor);
        const corB = normalizarCorNome(b && b.vruSelecionado && b.vruSelecionado.cor);
        const ordemA = Object.prototype.hasOwnProperty.call(ORDEM_COR_VRU, corA) ? ORDEM_COR_VRU[corA] : 99;
        const ordemB = Object.prototype.hasOwnProperty.call(ORDEM_COR_VRU, corB) ? ORDEM_COR_VRU[corB] : 99;
        if (ordemA !== ordemB) return ordemA - ordemB;
        if ((a.score || 0) !== (b.score || 0)) return (b.score || 0) - (a.score || 0);
        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
      });

    entradasRender.forEach((entrada, index) => {
      const item = entrada.tipo === "item" ? entrada.item : entrada.itens[0];
      if (!item) return;
      const grupoAtual = grupoProduto(item);
      if (index === 0 || grupoAtual.key !== grupoAnterior) {
        const sep = document.createElement("tr");
        sep.className = "familia-separador";
        sep.innerHTML = `<td colspan="${totalColunas}"><div class="familia-divider"><span class="familia-divider-label">${escapeHtml(
          grupoAtual.label
        )}</span></div></td>`;
        tableBody.appendChild(sep);
      }
      grupoAnterior = grupoAtual.key;
      linhaNumero += 1;

      if (entrada.tipo === "atomizador-grupo") {
        const itensOrdenados = ordenarItensGrupoAtomizador(entrada.itens);
        const itemBase = itensOrdenados[0];
        const chavesItens = itensOrdenados.map((it) => chaveRecomendacao(it)).filter(Boolean);
        const tr = document.createElement("tr");
        const temCompativel = itensOrdenados.some((it) => String(it.status || "") === "compativel");
        tr.className = `status-${temCompativel ? "compativel" : "limite"} atomizador-grupo-row`;
        if (chavesItens.length) {
          tr.setAttribute("data-chave-rec", chavesItens[0]);
          tr.setAttribute("data-chaves-rec", chavesItens.join("||"));
        }

        const faixa = `${n(itemBase.vazaoMinLMin, 2)} - ${n(itemBase.vazaoMaxLMin, 2)}`;
        const imagemProduto = resolverImagemProduto(itemBase);
        const imagemSrcAttr = escapeHtml(imagemProduto);
        const nomeProdutoExibicao = nomeExibicaoProduto(itemBase, imagemProduto);

        const celulaDemandaGrupo = (chaveFaixa, vazao) => {
          const linhas = itensOrdenados
            .map((it) => {
              const psi = obterPsiPorFaixa(it, chaveFaixa);
              const faixaPsi = (it && it.psiFaixaAplicada) || (resultado && resultado.psiFaixaDesejada) || null;
              const limiteMinBaixaPsi = isAtomizadorItem(it) ? 20 : 25;
              const chaveItem = escapeHtml(chaveRecomendacao(it));
              return `<div class="atom-subitem atom-subitem-demanda" data-chave-rec-item="${chaveItem}">${blocoDemandaHtml(
                vazao,
                psi,
                faixaPsi,
                limiteMinBaixaPsi
              )}</div>`;
            })
            .join("");
          return `<td><div class="atom-sublist atom-sublist-equal" style="--subcount:${itensOrdenados.length};">${linhas}</div></td>`;
        };

        const linhasConfig = itensOrdenados
          .map((it) => {
            const cfg = extrairLinhasConfigAtomizador(it);
            const corNome = String((it && it.vruSelecionado && it.vruSelecionado.cor) || "canal");
            const vruSemCor = String(cfg.vru || "")
              .replace(/\([^)]*\)/g, "")
              .replace(/\s{2,}/g, " ")
              .trim();
            const detalhes = [vruSemCor || cfg.vru, cfg.rotacao, ...cfg.outras]
              .map((v) => String(v || "").trim())
              .filter(Boolean)
              .join(" | ");
            const chaveItem = escapeHtml(chaveRecomendacao(it));
            const htmlConfig = renderConfiguracaoHtml(it);
            return `<div class="atom-subitem atom-subitem-config" data-chave-rec-item="${chaveItem}">${
              htmlConfig
                ? htmlConfig
                : `<span class="atom-subtext">${escapeHtml(detalhes || "Configuracao VRU")}</span>`
            }</div>`;
          })
          .join("");
        const linhasCor = itensOrdenados
          .map((it) => {
            const corNome = String((it && it.vruSelecionado && it.vruSelecionado.cor) || "canal");
            const cfg = extrairLinhasConfigAtomizador(it);
            const vruSemCor = String(cfg.vru || "")
              .replace(/\([^)]*\)/g, "")
              .replace(/\s{2,}/g, " ")
              .trim();
            const chaveItem = escapeHtml(chaveRecomendacao(it));
            const vruInfoHtml = vruSemCor
              ? `<small class="atom-cor-vru">${escapeHtml(vruSemCor)}</small>`
              : "";
            return `<div class="atom-subitem atom-subitem-cor" data-chave-rec-item="${chaveItem}">${renderTagCor(
              corNome
            )}${vruInfoHtml}</div>`;
          })
          .join("");

        tr.innerHTML = `
          <td>${linhaNumero}</td>
          <td>
            <div class="produto-cell atomizador-bloco">
              <img class="produto-thumb" src="${imagemSrcAttr}" alt="${escapeHtml(
                itemBase.nome || "Produto"
              )}" loading="lazy" />
              <div>
                <strong>${escapeHtml(nomeProdutoExibicao)}</strong><br><small>${escapeHtml(
                  itemBase.conexao || ""
                )}</small>
              </div>
              <span class="faixa-inline">${escapeHtml(faixa)} L/min</span>
            </div>
          </td>
          <td>${familiaLabel(itemBase.familia)}</td>
          <td>${faixa}</td>
          <td class="atom-cor-cell"><div class="atom-sublist atom-sublist-equal" style="--subcount:${itensOrdenados.length};">${linhasCor}</div></td>
          ${celulaDemandaGrupo("min", vazaoReq.min)}
          ${celulaDemandaGrupo("med", vazaoReq.med)}
          ${celulaDemandaGrupo("max", vazaoReq.max)}
          <td class="config-cell atom-config-cell"><div class="atom-sublist atom-sublist-equal" style="--subcount:${itensOrdenados.length};">${linhasConfig}</div></td>
        `;

        tr.addEventListener("click", function () {
          const chavePadrao = tr.getAttribute("data-chave-rec") || "";
          if (!chavePadrao) return;
          chaveRecomendacaoSelecionada = chavePadrao;
          aplicarSelecaoVisual();
          renderSummary(demandaFaixa, resultado, modoExibicao);
        });
        tr.querySelectorAll("[data-chave-rec-item]").forEach((subitem) => {
          subitem.addEventListener("click", function (event) {
            event.stopPropagation();
            const chaveItem = subitem.getAttribute("data-chave-rec-item") || "";
            if (!chaveItem) return;
            chaveRecomendacaoSelecionada = chaveItem;
            aplicarSelecaoVisual();
            renderSummary(demandaFaixa, resultado, modoExibicao);
          });
        });
        tableBody.appendChild(tr);
        return;
      }

      const tr = document.createElement("tr");
      const corVru = normalizarCorNome(item && item.vruSelecionado && item.vruSelecionado.cor);
      let classeVru = "";
      if (corVru === "preto") classeVru = "vru-cor-preto";
      else if (corVru === "vermelho" || corVru === "d5") classeVru = "vru-cor-vermelho";
      else if (corVru === "verde" || corVru === "d7") classeVru = "vru-cor-verde";
      tr.className = `status-${item.status}${classeVru ? ` ${classeVru}` : ""}`;
      tr.setAttribute("data-chave-rec", chaveRecomendacao(item));

      const faixa = `${n(item.vazaoMinLMin, 2)} - ${n(item.vazaoMaxLMin, 2)}`;
      const psiMin = obterPsiPorFaixa(item, "min");
      const psiMed = obterPsiPorFaixa(item, "med");
      const psiMax = obterPsiPorFaixa(item, "max");
      const faixaPsi = (item && item.psiFaixaAplicada) || (resultado && resultado.psiFaixaDesejada) || null;
      const limiteMinBaixaPsi = isAtomizadorItem(item) ? 20 : 25;
      const celulaDemanda = (vazao, psi) =>
        `<td>${blocoDemandaHtml(vazao, psi, faixaPsi, limiteMinBaixaPsi)}</td>`;
      const imagemProduto = resolverImagemProduto(item);
      const imagemSrcAttr = escapeHtml(imagemProduto);
      const nomeProdutoExibicao = nomeExibicaoProduto(item, imagemProduto);
      const configuracaoHtml = renderConfiguracaoHtml(item);
      const corColunaPadrao = (() => {
        if (!isAtomizadorItem(item)) return '<span class="cor-vazia">-</span>';
        const corVruItem = item && item.vruSelecionado && item.vruSelecionado.cor;
        if (corVruItem) return renderTagCor(corVruItem);
        const corPonta = item && item.pontaSelecionada && item.pontaSelecionada.cor;
        if (corPonta) return renderTagCor(corPonta);
        return '<span class="cor-vazia">-</span>';
      })();

      tr.innerHTML = `
        <td>${linhaNumero}</td>
        <td>
          <div class="produto-cell">
            <img class="produto-thumb" src="${imagemSrcAttr}" alt="${escapeHtml(item.nome || "Produto")}" loading="lazy" />
            <div>
              <strong>${escapeHtml(nomeProdutoExibicao)}</strong><br><small>${escapeHtml(item.conexao || "")}</small>
            </div>
            <span class="faixa-inline">${escapeHtml(faixa)} L/min</span>
          </div>
        </td>
        <td>${familiaLabel(item.familia)}</td>
        <td>${faixa}</td>
        <td>${corColunaPadrao}</td>
        ${celulaDemanda(vazaoReq.min, psiMin)}
        ${celulaDemanda(vazaoReq.med, psiMed)}
        ${celulaDemanda(vazaoReq.max, psiMax)}
        <td class="config-cell">${configuracaoHtml}</td>
      `;
      tr.addEventListener("click", function () {
        chaveRecomendacaoSelecionada = tr.getAttribute("data-chave-rec") || "";
        aplicarSelecaoVisual();
        renderSummary(demandaFaixa, resultado, modoExibicao);
      });
      tableBody.appendChild(tr);
    });

    aplicarSelecaoVisual();
  }

  function configurarAutoCalculo(catalogo) {
    let timer = null;
    const agendar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => executarCalculo(catalogo), 160);
    };

    form.addEventListener("input", function (event) {
      if (event && event.target && event.target.id === "pulverizadores") {
        ajustarValorCampoQuantidade();
        ajustarFiltrosPorQuantidadePulverizadores();
      }
      salvarDadosCompartilhados();
      agendar();
    });

    form.addEventListener("change", function (event) {
      if (event && event.target && event.target.id === "pulverizadores") {
        ajustarValorCampoQuantidade();
        ajustarFiltrosPorQuantidadePulverizadores();
      }
      salvarDadosCompartilhados();
      // Preset ja recalcula no handler proprio.
      if (event && event.target && event.target.id === "preset-aeronave") return;
      executarCalculo(catalogo);
    });
  }

  function configurarCamposNumericosSemExpo() {
    if (!form) return;
    const campos = Array.from(form.querySelectorAll('input[type="number"]'));
    campos.forEach((campo) => {
      campo.setAttribute("inputmode", "decimal");
      campo.addEventListener("keydown", function (event) {
        if (!event) return;
        const tecla = String(event.key || "");
        if (tecla === "e" || tecla === "E" || tecla === "+" || tecla === "-") {
          event.preventDefault();
        }
      });
      campo.addEventListener("input", function () {
        const bruto = String(campo.value || "");
        let limpo = bruto.replace(/[eE+\-]/g, "").replace(/,/g, ".");
        const partes = limpo.split(".");
        if (partes.length > 2) {
          limpo = `${partes.shift()}.${partes.join("")}`;
        }
        if (limpo !== bruto) {
          campo.value = limpo;
        }
      });
    });
  }

  function executarCalculo(catalogo) {
    formError.textContent = "";
    salvarDadosCompartilhados();
    try {
      ajustarValorCampoQuantidade();
      ajustarFiltrosPorQuantidadePulverizadores();
      const numeroPulverizadores = validarQuantidadePulverizadores();
      const demandaFaixa = calculos.calcularDemandaFaixa({
        velocidadeMinKmh: form["velocidade-min"].value,
        velocidadeMedKmh: form["velocidade-med"].value,
        velocidadeMaxKmh: form["velocidade-max"].value,
        faixaM: form.faixa.value,
        volumeLHa: form.vazao.value,
        numeroPulverizadores,
      });

      const psiConfig = lerConfiguracaoPsi();
      const modoExibicao = lerModoExibicao();
      const preferencias = {
        familia: "auto",
        estrategia: "balanceado",
        psiCriterio: psiConfig.criterio,
        psiFaixa: psiConfig.faixa,
        psiFaixasPorTipo: psiConfig.faixasPorTipo,
        limiteMinPsiCorAtomizador: psiConfig.limiteMinPsiCorAtomizador,
        maxOpcoesPorModelo: lerMaxRecomendacoesPorModelo(),
        tiposPermitidos: lerFiltrosTipos(),
        filtrosEspecificos: lerFiltrosDetalhadosSelecionados(),
      };

      const resultadoBase = recomendador.recomendar(catalogo, demandaFaixa, preferencias);
      const resultado = {
        ...resultadoBase,
        recomendados: paginaAtomizadores
          ? resultadoBase.recomendados
          : (Array.isArray(resultadoBase.recomendados) ? resultadoBase.recomendados : []).filter(
              itemRespeitaLimitePsiMaxBicos
            ),
      };
      const existeChaveSelecionada = resultado.recomendados.some(
        (item) => chaveRecomendacao(item) === chaveRecomendacaoSelecionada
      );
      if (!existeChaveSelecionada) {
        chaveRecomendacaoSelecionada = "";
      }

      atualizarCabecalhoDemanda(demandaFaixa);
      renderSummary(demandaFaixa, resultado, modoExibicao);
      renderWarnings(resultado, resultado.recomendados);
      renderTable(resultado.recomendados, demandaFaixa, resultado, modoExibicao);

      resultsMeta.textContent =
        `${resultado.recomendados.length} recomendacoes exibidas ` +
        `(compativeis na faixa completa: ${resultado.totalCompativeis} de ${resultado.totalCatalogo}).`;
    } catch (error) {
      formError.textContent = error.message || "Erro ao calcular.";
    }
  }

  async function carregarCatalogoJson() {
    const caminhos = ["js/data/catalogo.json", "./js/data/catalogo.json", "/js/data/catalogo.json"];
    const erros = [];

    for (let i = 0; i < caminhos.length; i += 1) {
      const caminho = caminhos[i];
      try {
        const response = await fetch(caminho, { cache: "no-store" });
        if (!response.ok) {
          erros.push(`${caminho} -> HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Catalogo JSON invalido: esperado um array.");
        }
        return data;
      } catch (error) {
        erros.push(`${caminho} -> ${error.message}`);
      }
    }

    const dica =
      window.location.protocol === "file:"
        ? " Abra via servidor HTTP (ex.: node app.js), nao via arquivo local file://."
        : "";
    throw new Error(`Falha ao carregar catalogo JSON. Tentativas: ${erros.join(" | ")}.${dica}`);
  }

  async function carregarComplementoXlsJson() {
    const caminhos = [
      "js/data/catalogo_xls_extra.json",
      "./js/data/catalogo_xls_extra.json",
      "/js/data/catalogo_xls_extra.json",
    ];

    for (let i = 0; i < caminhos.length; i += 1) {
      const caminho = caminhos[i];
      try {
        const response = await fetch(caminho, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        if (Array.isArray(data)) return data;
      } catch (error) {
        // Complemento e opcional: segue sem interromper inicializacao.
      }
    }
    return [];
  }

  async function carregarAeronavesFluxometroJson() {
    const caminhos = [
      "js/data/aeronaves_fluxometro.json",
      "./js/data/aeronaves_fluxometro.json",
      "/js/data/aeronaves_fluxometro.json",
    ];

    for (let i = 0; i < caminhos.length; i += 1) {
      const caminho = caminhos[i];
      try {
        const response = await fetch(caminho, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        const normalizado = normalizarDadosAeronaves(data);
        if (normalizado) return normalizado;
      } catch (error) {
        // Presets de aeronave sao opcionais.
      }
    }
    return null;
  }

  function normalizarDadosAeronaves(data) {
    if (!data) return null;
    if (Array.isArray(data.aeronaves)) return data;
    if (Array.isArray(data)) return { aeronaves: data };

    const chavesAlternativas = ["Aeronaves", "aircraft", "avioes", "planes"];
    for (let i = 0; i < chavesAlternativas.length; i += 1) {
      const chave = chavesAlternativas[i];
      if (Array.isArray(data[chave])) {
        return { ...data, aeronaves: data[chave] };
      }
    }
    return null;
  }

  function popularPresetAeronave(catalogo) {
    if (!presetAeronaveSelect || !dadosAeronaveFluxometro || !Array.isArray(dadosAeronaveFluxometro.aeronaves)) {
      return;
    }

    const aeronaves = dadosAeronaveFluxometro.aeronaves;
    if (!Array.isArray(aeronaves) || !aeronaves.length) return;
    // Mantem apenas a opcao manual na primeira posicao antes de popular.
    while (presetAeronaveSelect.options.length > 1) {
      presetAeronaveSelect.remove(1);
    }
    const fragment = document.createDocumentFragment();
    aeronaves.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.modelo;
      opt.textContent = `${item.modelo} (${n(item.vminKmh, 0)}/${n(item.vmedKmh, 0)}/${n(item.vmaxKmh, 0)} km/h)`;
      fragment.appendChild(opt);
    });
    presetAeronaveSelect.appendChild(fragment);

    if (!presetAeronaveSelect.dataset.boundChange) {
      presetAeronaveSelect.addEventListener("change", function () {
        const model = presetAeronaveSelect.value;
        const base = dadosAeronaveFluxometro && Array.isArray(dadosAeronaveFluxometro.aeronaves)
          ? dadosAeronaveFluxometro.aeronaves
          : [];
        const preset = base.find((a) => a.modelo === model);
        if (!preset) return;
        form["velocidade-min"].value = String(preset.vminKmh);
        form["velocidade-med"].value = String(preset.vmedKmh);
        form["velocidade-max"].value = String(preset.vmaxKmh);
        salvarDadosCompartilhados();
        executarCalculo(catalogo);
      });
      presetAeronaveSelect.dataset.boundChange = "1";
    }
  }

  async function garantirPresetAeronaveCarregado(catalogo) {
    if (!presetAeronaveSelect) return;
    if (presetAeronaveSelect.options.length > 1) return;
    const dados = await carregarAeronavesFluxometroJson();
    if (!dados || !Array.isArray(dados.aeronaves) || !dados.aeronaves.length) return;
    dadosAeronaveFluxometro = dados;
    popularPresetAeronave(catalogo);
  }

  async function preencherPresetAeronaveDireto() {
    if (!presetAeronaveSelect || presetAeronaveSelect.options.length > 1) return;
    try {
      const caminhos = [
        "/js/data/aeronaves_fluxometro.json",
        "js/data/aeronaves_fluxometro.json",
        "./js/data/aeronaves_fluxometro.json",
      ];
      let data = null;
      for (let i = 0; i < caminhos.length; i += 1) {
        const resp = await fetch(caminhos[i], { cache: "no-store" });
        if (!resp.ok) continue;
        data = await resp.json();
        break;
      }
      if (!data) return;
      const normalizado = normalizarDadosAeronaves(data);
      const lista = normalizado && Array.isArray(normalizado.aeronaves) ? normalizado.aeronaves : [];
      if (!lista.length) return;

      while (presetAeronaveSelect.options.length > 1) {
        presetAeronaveSelect.remove(1);
      }
      const frag = document.createDocumentFragment();
      lista.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.modelo;
        const vmin = Number.isFinite(Number(item.vminKmh)) ? Number(item.vminKmh) : 0;
        const vmed = Number.isFinite(Number(item.vmedKmh)) ? Number(item.vmedKmh) : 0;
        const vmax = Number.isFinite(Number(item.vmaxKmh)) ? Number(item.vmaxKmh) : 0;
        opt.textContent = `${item.modelo} (${Math.round(vmin)}/${Math.round(vmed)}/${Math.round(vmax)} km/h)`;
        frag.appendChild(opt);
      });
      presetAeronaveSelect.appendChild(frag);
      window.__softwarebicosPresetCount = presetAeronaveSelect.options.length;
    } catch (_error) {
      // fallback silencioso
    }
  }

  function iniciarFallbackPresetAeronave() {
    if (!presetAeronaveSelect) return;
    let tentativas = 0;
    const maxTentativas = 6;

    const tentar = async () => {
      tentativas += 1;
      await preencherPresetAeronaveDireto();
      window.__softwarebicosPresetFallbackTentativas = tentativas;
      window.__softwarebicosPresetCount = presetAeronaveSelect.options.length;
      if (presetAeronaveSelect.options.length > 1) return;
      if (tentativas >= maxTentativas) return;
      window.setTimeout(tentar, 450);
    };

    if (document.readyState === "complete") {
      tentar();
    } else {
      window.addEventListener(
        "load",
        () => {
          tentar();
        },
        { once: true }
      );
    }
  }

  function mesclarCurvasPonta(base, extra) {
    if (!Array.isArray(extra) || !extra.length) return Array.isArray(base) ? base : [];
    if (!Array.isArray(base) || !base.length) return extra;

    const baseByCode = new Map();
    base.forEach((curva) => {
      baseByCode.set(String(curva.codigo || ""), curva);
    });

    return extra.map((curvaExtra) => {
      const codigo = String(curvaExtra.codigo || "");
      const curvaBase = baseByCode.get(codigo) || {};
      return {
        ...curvaBase,
        ...curvaExtra,
        cor: curvaExtra.cor || curvaBase.cor || "",
      };
    });
  }

  function mesclarCatalogo(baseCatalogo, complementoXls) {
    if (!Array.isArray(baseCatalogo)) return [];
    if (!Array.isArray(complementoXls) || !complementoXls.length) return baseCatalogo;

    const extrasById = new Map();
    complementoXls.forEach((item) => {
      if (item && item.id) extrasById.set(String(item.id), item);
    });

    const merged = baseCatalogo.map((item) => {
      const extra = extrasById.get(String(item.id));
      if (!extra) return item;

      const out = { ...item, ...extra };
      if (extra.curvasPontaColorida) {
        out.curvasPontaColorida = mesclarCurvasPonta(item.curvasPontaColorida, extra.curvasPontaColorida);
      }
      return out;
    });

    complementoXls.forEach((extra) => {
      if (!extra || !extra.id) return;
      const jaExiste = merged.some((item) => String(item.id) === String(extra.id));
      if (!jaExiste) merged.push(extra);
    });

    return merged;
  }

  (async function init() {
    try {
      habilitarPreviewImagens();
      inicializarPopupResumoPsi();
      const catalogoBase = await carregarCatalogoJson();
      const complementoXls = await carregarComplementoXlsJson();
      dadosAeronaveFluxometro = await carregarAeronavesFluxometroJson();
      const catalogo = mesclarCatalogo(catalogoBase, complementoXls);
      catalogoAtivo = catalogo;
      popularPresetAeronave(catalogo);
      await garantirPresetAeronaveCarregado(catalogo);
      window.setTimeout(() => {
        garantirPresetAeronaveCarregado(catalogo);
      }, 350);
      window.setTimeout(() => {
        preencherPresetAeronaveDireto();
      }, 500);
      if (presetAeronaveSelect && presetAeronaveSelect.options.length <= 1) {
        console.warn("[softwarebicos] Presets de aeronave nao carregados ou vazios.");
      }
      inicializarSeletorPulverizador(catalogo, function () {
        executarCalculo(catalogo);
      });
      inicializarMenusFiltroDetalhado(catalogo);

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        executarCalculo(catalogo);
      });
      if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", exportarPaginaParaPdf);
      }
      configurarCamposNumericosSemExpo();
      configurarAutoCalculo(catalogo);
      aplicarLimitesCampoQuantidade();

      if (fillExampleBtn) {
        fillExampleBtn.addEventListener("click", function () {
          form["velocidade-min"].value = "5.5";
          form["velocidade-med"].value = "7.5";
          form["velocidade-max"].value = "9.0";
          if (presetAeronaveSelect) presetAeronaveSelect.value = "";
          form.faixa.value = "12";
          form.vazao.value = "120";
          form.pulverizadores.value = paginaAtomizadores ? String(LIMITE_ATOMIZADORES_MAX) : "24";
          ajustarValorCampoQuantidade();
          if (modoExibicaoSelect) modoExibicaoSelect.value = modoExibicaoInicial;
          if (form["filtro-leque"]) form["filtro-leque"].checked = !paginaAtomizadores;
          if (form["filtro-solido"]) form["filtro-solido"].checked = !paginaAtomizadores;
          if (form["filtro-conico-core"]) form["filtro-conico-core"].checked = true;
          if (form["filtro-conico-eletro"]) form["filtro-conico-eletro"].checked = true;
          if (form["filtro-atomizador"]) form["filtro-atomizador"].checked = paginaAtomizadores;
          salvarDadosCompartilhados();
          executarCalculo(catalogo);
        });
      }

      const aplicouCompartilhado = aplicarDadosCompartilhadosNoForm();
      if (!aplicouCompartilhado) {
        aplicarCamposIniciaisZero();
      }
      ajustarValorCampoQuantidade();
      if (modoExibicaoSelect) modoExibicaoSelect.value = modoExibicaoInicial;
      if (form["filtro-leque"]) form["filtro-leque"].checked = !paginaAtomizadores;
      if (form["filtro-solido"]) form["filtro-solido"].checked = !paginaAtomizadores;
      if (form["filtro-conico-core"]) form["filtro-conico-core"].checked = true;
      if (form["filtro-conico-eletro"]) form["filtro-conico-eletro"].checked = true;
      if (form["filtro-atomizador"]) form["filtro-atomizador"].checked = paginaAtomizadores;
      salvarDadosCompartilhados();
      ajustarFiltrosPorQuantidadePulverizadores();
      if (entradaInicialValidaParaCalculo()) {
        executarCalculo(catalogo);
      }
    } catch (error) {
      formError.textContent = error.message || "Erro ao inicializar aplicacao.";
    }
  })();

  iniciarFallbackPresetAeronave();
})();
