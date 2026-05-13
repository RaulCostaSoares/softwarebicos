(function () {
  const ns = window.SoftwareBicos || {};
  const calculos = ns.calculos || {};

  const form = document.getElementById("comp-form");
  if (!form) return;

  const formError = document.getElementById("comp-error");
  const presetAeronave = document.getElementById("preset-aeronave-comp");
  const inputEquipamento = document.getElementById("equipamento-comp");
  const inputAtomizador = document.getElementById("atomizador-comp");
  const passosBody = document.querySelector("#comp-steps-table tbody");
  const passosMeta = document.getElementById("comp-steps-meta");
  const exportPdfBtn = document.getElementById("export-pdf-btn");
  const pdfModeloSelect = document.getElementById("pdf-modelo-select");
  const pdfModeloGroup = document.getElementById("pdf-modelo-group");

  const inputFaixa = document.getElementById("faixa-comp");
  const inputTaxa = document.getElementById("taxa-comp");
  const inputSistemaUnidades = document.getElementById("sistema-unidades-comp");
  const inputPulverizadores = document.getElementById("pulverizadores-comp");
  const inputVelMin = document.getElementById("velocidade-min-comp");
  const inputVelMed = document.getElementById("velocidade-med-comp");
  const inputVelMax = document.getElementById("velocidade-max-comp");
  const inputPasso = document.getElementById("comp-step-comp");
  const inputPsiMin = document.getElementById("comp-psi-min-comp");
  const inputPsiMax = document.getElementById("comp-psi-max-comp");
  const inputPassosBaixo = document.getElementById("comp-step-down-comp");
  const inputPassosCima = document.getElementById("comp-step-up-comp");
  const configBox = document.getElementById("comp-config-box");
  const configLabel = document.getElementById("comp-config-label");
  const configOpcoes = document.getElementById("comp-config-opcoes");
  const btnConfigTodos = document.getElementById("comp-config-todos");
  const btnConfigLimpar = document.getElementById("comp-config-limpar");

  const resumoIds = {
    velMin: document.getElementById("comp-res-vel-min"),
    velMed: document.getElementById("comp-res-vel-med"),
    velMax: document.getElementById("comp-res-vel-max"),
    areaMin: document.getElementById("comp-res-area-min"),
    areaMed: document.getElementById("comp-res-area-med"),
    areaMax: document.getElementById("comp-res-area-max"),
    vtMin: document.getElementById("comp-res-vt-min"),
    vtMed: document.getElementById("comp-res-vt-med"),
    vtMax: document.getElementById("comp-res-vt-max"),
    vbMin: document.getElementById("comp-res-vb-min"),
    vbMed: document.getElementById("comp-res-vb-med"),
    vbMax: document.getElementById("comp-res-vb-max"),
  };

  let catalogo = [];
  let aeronaves = [];
  let bicosConfiguracao = [];
  let atomizadoresConfiguracao = [];
  const selecaoConfigPorBico = new Map();
  const PSI_LIMITE_MIN = 15;
  const PSI_LIMITE_MAX = 100;
  const PSI_PADRAO_MIN = 20;
  const PSI_PADRAO_MAX = 60;
  const MAX_PONTEIRAS_TT11 = 3;
  const CHAVE_DADOS_COMPARTILHADOS = "softwarebicos_shared_form_v1";
  const SISTEMA_UNIDADES_METRICO = "metrico";
  const SISTEMA_UNIDADES_IMPERIAL = "imperial";
  const MODELO_RELATORIO_PADRAO = "operacional-1p";
  const MODELOS_RELATORIO_VALIDOS = new Set(["operacional-1p", "comparativo-1p", "visual-1p"]);
  let ultimoContextoCalculo = null;

  function normalizarSistemaUnidades(value) {
    return String(value || "").toLowerCase().trim() === SISTEMA_UNIDADES_IMPERIAL
      ? SISTEMA_UNIDADES_IMPERIAL
      : SISTEMA_UNIDADES_METRICO;
  }

  function fmt(value, decimals) {
    if (calculos.formatNumber) return calculos.formatNumber(value, decimals);
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function normalizarModeloRelatorioPdf(value) {
    const modelo = String(value || "").toLowerCase().trim();
    if (modelo === "operacional-2p") return "operacional-1p";
    if (modelo === "checklist-2p") return "visual-1p";
    return MODELOS_RELATORIO_VALIDOS.has(modelo) ? modelo : MODELO_RELATORIO_PADRAO;
  }

  function normalizarSrcImagemPdf(src) {
    const valor = String(src || "").trim();
    if (!valor) return "";
    if (valor.startsWith("data:image/")) return valor;
    if (/^https?:\/\//i.test(valor)) return valor;
    const origem = window.location.origin || "";
    const limpo = valor.replace(/^\.?\//, "");
    return `${origem}/${limpo}`;
  }

  function atualizarBotoesModeloPdf(modeloSelecionado) {
    if (!pdfModeloGroup) return;
    const modelo = normalizarModeloRelatorioPdf(modeloSelecionado);
    const botoes = pdfModeloGroup.querySelectorAll("[data-pdf-modelo]");
    botoes.forEach((btn) => {
      const atual = normalizarModeloRelatorioPdf(btn.getAttribute("data-pdf-modelo"));
      const ativo = atual === modelo;
      btn.classList.toggle("is-active", ativo);
      btn.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
  }

  function lerModeloRelatorioPdfAtual() {
    const valor = pdfModeloSelect ? pdfModeloSelect.value : "";
    const modelo = normalizarModeloRelatorioPdf(valor);
    if (pdfModeloSelect && pdfModeloSelect.value !== modelo) {
      pdfModeloSelect.value = modelo;
    }
    atualizarBotoesModeloPdf(modelo);
    return modelo;
  }

  function setExportPdfBusy(isBusy) {
    if (!exportPdfBtn) return;
    if (isBusy) {
      exportPdfBtn.dataset.idleText = String(exportPdfBtn.textContent || "Exportar PDF").trim();
      exportPdfBtn.disabled = true;
      exportPdfBtn.setAttribute("aria-busy", "true");
      exportPdfBtn.textContent = "Gerando PDF...";
      return;
    }
    exportPdfBtn.disabled = false;
    exportPdfBtn.setAttribute("aria-busy", "false");
    exportPdfBtn.textContent = exportPdfBtn.dataset.idleText || "Exportar PDF";
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

  function endpointRelatorioPdfCandidatos() {
    const pathApi = "/api/relatorio-pdf";
    const vistos = new Set();
    const out = [];

    function add(base) {
      const valorBase = String(base || "").trim();
      let url = "";
      if (!valorBase) {
        url = pathApi;
      } else if (/^https?:\/\//i.test(valorBase)) {
        url = `${valorBase.replace(/\/+$/, "")}${pathApi}`;
      } else {
        const normalizado = valorBase.startsWith("/") ? valorBase : `/${valorBase}`;
        url = `${normalizado.replace(/\/+$/, "")}${pathApi}`;
      }
      if (!vistos.has(url)) {
        vistos.add(url);
        out.push(url);
      }
    }

    const cfgGlobal =
      (window && window.SOFTWAREBICOS_API_BASE ? String(window.SOFTWAREBICOS_API_BASE) : "") ||
      (document.body && document.body.dataset ? String(document.body.dataset.apiBase || "") : "");
    add(cfgGlobal);

    const pathname = String((window.location && window.location.pathname) || "");
    const partes = pathname.split("/").filter(Boolean);
    if (partes.length) {
      const ultima = String(partes[partes.length - 1] || "");
      if (/\.[a-z0-9]+$/i.test(ultima)) partes.pop();
      if (partes.length) add(`/${partes.join("/")}`);
    }

    add("");
    return out;
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

  function preferenciaExibirSinalPercentual() {
    const dados = lerDadosCompartilhados();
    if (!dados || !Object.prototype.hasOwnProperty.call(dados, "exibirSinalPercentual")) {
      return false;
    }
    return Boolean(dados.exibirSinalPercentual);
  }

  function salvarDadosCompartilhados() {
    try {
      const dados = lerDadosCompartilhados() || {};
      const payload = {
        ...dados,
        presetAeronave: String((presetAeronave && presetAeronave.value) || ""),
        equipamentoBicoComp: String((inputEquipamento && inputEquipamento.value) || ""),
        equipamentoAtomizadorComp: String((inputAtomizador && inputAtomizador.value) || ""),
        faixa: String((inputFaixa && inputFaixa.value) || ""),
        taxa: String((inputTaxa && inputTaxa.value) || ""),
        sistemaUnidades: normalizarSistemaUnidades(inputSistemaUnidades && inputSistemaUnidades.value),
        pulverizadores: String((inputPulverizadores && inputPulverizadores.value) || ""),
        velMin: String((inputVelMin && inputVelMin.value) || ""),
        velMed: String((inputVelMed && inputVelMed.value) || ""),
        velMax: String((inputVelMax && inputVelMax.value) || ""),
        psiMinCfg: String((inputPsiMin && inputPsiMin.value) || ""),
        psiMaxCfg: String((inputPsiMax && inputPsiMax.value) || ""),
        passosBaixo: String((inputPassosBaixo && inputPassosBaixo.value) || ""),
        passosCima: String((inputPassosCima && inputPassosCima.value) || ""),
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

    if (Object.prototype.hasOwnProperty.call(dados, "faixa")) {
      inputFaixa.value = String(dados.faixa || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "taxa")) {
      inputTaxa.value = String(dados.taxa || "0");
      aplicou = true;
    }
    if (inputSistemaUnidades && Object.prototype.hasOwnProperty.call(dados, "sistemaUnidades")) {
      inputSistemaUnidades.value = normalizarSistemaUnidades(dados.sistemaUnidades);
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "pulverizadores")) {
      inputPulverizadores.value = String(dados.pulverizadores || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "velMin")) {
      inputVelMin.value = String(dados.velMin || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "velMed")) {
      inputVelMed.value = String(dados.velMed || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "velMax")) {
      inputVelMax.value = String(dados.velMax || "0");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "psiMinCfg") && inputPsiMin) {
      const psiMinSalvo = Number(dados.psiMinCfg);
      const psiMinSeguro =
        Number.isFinite(psiMinSalvo) && psiMinSalvo >= PSI_LIMITE_MIN && psiMinSalvo <= PSI_LIMITE_MAX
          ? psiMinSalvo
          : PSI_PADRAO_MIN;
      inputPsiMin.value = String(psiMinSeguro);
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "psiMaxCfg") && inputPsiMax) {
      const psiMaxSalvo = Number(dados.psiMaxCfg);
      const psiMaxSeguro =
        Number.isFinite(psiMaxSalvo) && psiMaxSalvo >= PSI_LIMITE_MIN && psiMaxSalvo <= PSI_LIMITE_MAX
          ? psiMaxSalvo
          : PSI_PADRAO_MAX;
      inputPsiMax.value = String(psiMaxSeguro);
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "passosBaixo") && inputPassosBaixo) {
      inputPassosBaixo.value = String(dados.passosBaixo || "5");
      aplicou = true;
    }
    if (Object.prototype.hasOwnProperty.call(dados, "passosCima") && inputPassosCima) {
      inputPassosCima.value = String(dados.passosCima || "5");
      aplicou = true;
    }

    if (presetAeronave && Object.prototype.hasOwnProperty.call(dados, "presetAeronave")) {
      const alvo = String(dados.presetAeronave || "");
      const existe = Array.from(presetAeronave.options || []).some((opt) => String(opt.value) === alvo);
      if (existe) {
        presetAeronave.value = alvo;
        aplicou = true;
      }
    }
    if (inputEquipamento) {
      const alvoBico = String(dados.equipamentoBicoComp || dados.equipamentoComp || "");
      if (alvoBico) {
        const existeBico = Array.from(inputEquipamento.options || []).some(
          (opt) => String(opt.value) === alvoBico
        );
        if (existeBico) {
          inputEquipamento.value = alvoBico;
          aplicou = true;
        }
      }
    }
    if (inputAtomizador) {
      const alvoAtom = String(dados.equipamentoAtomizadorComp || "");
      if (alvoAtom) {
        const existeAtom = Array.from(inputAtomizador.options || []).some(
          (opt) => String(opt.value) === alvoAtom
        );
        if (existeAtom) {
          inputAtomizador.value = alvoAtom;
          aplicou = true;
        }
      }
    }

    if (inputPsiMin && inputPsiMax) {
      const psiMinAtual = Number(inputPsiMin.value);
      const psiMaxAtual = Number(inputPsiMax.value);
      if (!(Number.isFinite(psiMinAtual) && Number.isFinite(psiMaxAtual) && psiMinAtual < psiMaxAtual)) {
        inputPsiMin.value = String(PSI_PADRAO_MIN);
        inputPsiMax.value = String(PSI_PADRAO_MAX);
      }
    }

    return aplicou;
  }

  function clearTabela() {
    passosBody.innerHTML = "";
    passosMeta.textContent = "";
    ultimoContextoCalculo = null;
  }

  function setError(msg) {
    formError.textContent = msg || "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resolverImagemReferencia(item) {
    if (!item || typeof item !== "object") return "";
    if (typeof item.imagem === "string" && item.imagem.trim()) return item.imagem.trim();
    if (typeof item.imagemUrl === "string" && item.imagemUrl.trim()) return item.imagemUrl.trim();
    if (typeof item.foto === "string" && item.foto.trim()) return item.foto.trim();

    const id = String(item.id || "").trim().toUpperCase();
    const mapaPorId = {
      "90088": "js/data/images/90088.png",
      "90088A": "js/data/images/90088A.png",
      TT90300: "js/data/images/TT03.png",
      TT90900BZ: "js/data/images/TT09.png",
      TT11: "js/data/images/TT11.png",
      "90500": "js/data/images/ELETROSTATICO.png",
      CORE25: "js/data/images/CORE/CORE25.png",
      CORE45: "js/data/images/CORE/CORE45.png",
      CORE46: "js/data/images/CORE/CORE46.png",
      CORE56: "js/data/images/CORE/CORE56.png",
    };
    if (mapaPorId[id]) return mapaPorId[id];

    if (String(item.categoria || "").toLowerCase() === "atomizador") {
      return "js/data/images/ATOMIZADOR.png";
    }

    return "";
  }

  async function fetchJsonWithFallback(paths, required) {
    const erros = [];
    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i];
      try {
        const resp = await fetch(path, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
      } catch (error) {
        erros.push(`${path} -> ${error.message}`);
      }
    }
    if (required) {
      throw new Error(`Falha ao carregar JSON: ${erros.join(" | ")}`);
    }
    return null;
  }

  function preencherPresets() {
    if (!presetAeronave) return;
    while (presetAeronave.options.length > 1) {
      presetAeronave.remove(1);
    }
    aeronaves
      .slice()
      .sort((a, b) => String(a.modelo || "").localeCompare(String(b.modelo || ""), "pt-BR"))
      .forEach((item) => {
        const opt = document.createElement("option");
        opt.value = String(item.modelo || "");
        opt.textContent = String(item.modelo || "");
        presetAeronave.appendChild(opt);
      });
  }

  function itemTemCurvaConfiguracao(item) {
    return (
      Array.isArray(item && item.curvasOrificio) ||
      Array.isArray(item && item.curvasPontaColorida) ||
      Array.isArray(item && item.curvasDisco)
    );
  }

  function itemTemTabelaVru(item) {
    return Boolean(
      item &&
        item.tabelaVru &&
        Array.isArray(item.tabelaVru.psi) &&
        Array.isArray(item.tabelaVru.linhas) &&
        item.tabelaVru.psi.length >= 2 &&
        item.tabelaVru.linhas.length
    );
  }

  function listarBicosConfiguracao() {
    return (Array.isArray(catalogo) ? catalogo : [])
      .filter(
        (item) =>
          String((item && item.categoria) || "").toLowerCase() !== "atomizador" &&
          itemTemCurvaConfiguracao(item)
      )
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  }

  function listarAtomizadoresConfiguracao() {
    return (Array.isArray(catalogo) ? catalogo : [])
      .filter(
        (item) =>
          String((item && item.categoria) || "").toLowerCase() === "atomizador" &&
          itemTemTabelaVru(item)
      )
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  }

  function preencherBicosConfiguracao() {
    if (!inputEquipamento) return;
    bicosConfiguracao = listarBicosConfiguracao();
    inputEquipamento.innerHTML =
      '<option value="">Selecione</option>' +
      bicosConfiguracao
        .map(
          (item) =>
            `<option value="${escapeHtml(String(item.id || ""))}">${escapeHtml(String(item.nome || item.id || ""))}</option>`
        )
        .join("");
  }

  function preencherAtomizadoresConfiguracao() {
    if (!inputAtomizador) return;
    atomizadoresConfiguracao = listarAtomizadoresConfiguracao();
    inputAtomizador.innerHTML =
      '<option value="">Selecione</option>' +
      atomizadoresConfiguracao
        .map(
          (item) =>
            `<option value="${escapeHtml(String(item.id || ""))}">${escapeHtml(String(item.nome || item.id || ""))}</option>`
        )
        .join("");
  }

  function obterBicoSelecionado() {
    const id = String((inputEquipamento && inputEquipamento.value) || "").trim();
    if (!id) return null;
    return bicosConfiguracao.find((item) => String(item.id) === id) || null;
  }

  function obterAtomizadorSelecionado() {
    const id = String((inputAtomizador && inputAtomizador.value) || "").trim();
    if (!id) return null;
    return atomizadoresConfiguracao.find((item) => String(item.id) === id) || null;
  }

  function obterEquipamentoSelecionado() {
    const atomizador = obterAtomizadorSelecionado();
    if (atomizador) return atomizador;
    return obterBicoSelecionado();
  }

  function tipoSelecaoConfiguracao(item) {
    if (!item) return "";
    const id = String(item.id || "").toUpperCase();
    const categoria = String(item.categoria || "").toLowerCase();

    if (categoria === "atomizador" && itemTemTabelaVru(item)) {
      return "vru-cor";
    }
    if (id === "TT11" && Array.isArray(item.curvasPontaColorida) && item.curvasPontaColorida.length) {
      return "ponta";
    }
    if ((categoria === "core" || id.startsWith("CORE")) && Array.isArray(item.curvasDisco) && item.curvasDisco.length) {
      return "disco";
    }
    return "";
  }

  function listarOpcoesConfiguracao(item) {
    const tipo = tipoSelecaoConfiguracao(item);
    if (!tipo || !item) return [];

    if (tipo === "disco") {
      return (item.curvasDisco || [])
        .map((curva) => {
          const disco = String((curva && curva.disco) || "").trim();
          if (!disco) return null;
          return {
            key: `disco:${disco}`,
            label: `Disco ${disco}`,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
    }

    if (tipo === "ponta") {
      return (item.curvasPontaColorida || [])
        .map((curva) => {
          const codigo = String((curva && curva.codigo) || "").trim();
          const cor = String((curva && curva.cor) || "").trim();
          if (!codigo) return null;
          return {
            key: `ponta:${codigo}`,
            label: cor ? `${codigo} - ${cor}` : codigo,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
    }

    if (tipo === "vru-cor") {
      const tabela = item && item.tabelaVru ? item.tabelaVru : null;
      const cores = Array.isArray(tabela && tabela.coresRegulagem) ? tabela.coresRegulagem : [];
      const ordemCores = {
        preto: 0,
        vermelho: 1,
        verde: 2,
        d5: 3,
        d7: 4,
      };
      return cores
        .map((corRaw) => {
          const cor = String(corRaw || "").trim().toLowerCase();
          if (!cor) return null;
          return {
            key: `vru-cor:${cor}`,
            label: `Cor ${cor}`,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const corA = String(a.key || "").replace(/^vru-cor:/, "");
          const corB = String(b.key || "").replace(/^vru-cor:/, "");
          const ordA = Object.prototype.hasOwnProperty.call(ordemCores, corA) ? ordemCores[corA] : 99;
          const ordB = Object.prototype.hasOwnProperty.call(ordemCores, corB) ? ordemCores[corB] : 99;
          if (ordA !== ordB) return ordA - ordB;
          return a.label.localeCompare(b.label, "pt-BR", { numeric: true });
        });
    }

    return [];
  }

  function lerConfiguracoesMarcadasDom() {
    if (!configOpcoes) return [];
    return Array.from(configOpcoes.querySelectorAll("input.comp-config-check:checked"))
      .map((node) => String(node.value || "").trim())
      .filter(Boolean);
  }

  function salvarSelecaoConfiguracaoAtual(item) {
    if (!item) return;
    const tipo = tipoSelecaoConfiguracao(item);
    if (!tipo) return;
    const id = String(item.id || "");
    selecaoConfigPorBico.set(id, lerConfiguracoesMarcadasDom());
  }

  function normalizarSelecaoConfiguracao(item, lista) {
    const tipo = tipoSelecaoConfiguracao(item);
    const opcoes = listarOpcoesConfiguracao(item);
    const validas = new Set(opcoes.map((opcao) => String(opcao.key)));
    const filtradas = Array.isArray(lista)
      ? lista.map((v) => String(v || "").trim()).filter((v) => v && validas.has(v))
      : [];

    if (tipo === "disco") {
      return filtradas.length ? [filtradas[0]] : [];
    }
    if (tipo === "ponta") {
      return filtradas.slice(0, MAX_PONTEIRAS_TT11);
    }
    if (tipo === "vru-cor") {
      return filtradas;
    }
    return filtradas;
  }

  function atualizarSeletorConfiguracao() {
    if (!configBox || !configLabel || !configOpcoes) return;
    const item = obterEquipamentoSelecionado();
    const tipo = tipoSelecaoConfiguracao(item);

    if (!item || !tipo) {
      configBox.hidden = true;
      configOpcoes.innerHTML = "";
      return;
    }

    const opcoes = listarOpcoesConfiguracao(item);
    const id = String(item.id || "");
    let selecaoNormalizada = normalizarSelecaoConfiguracao(item, selecaoConfigPorBico.get(id) || []);
    if (tipo === "vru-cor" && !selecaoNormalizada.length && opcoes.length) {
      selecaoNormalizada = opcoes.map((opcao) => opcao.key);
    }
    selecaoConfigPorBico.set(id, selecaoNormalizada);
    const selecionadas = new Set(selecaoNormalizada);

    configBox.hidden = false;
    if (tipo === "disco") {
      configLabel.textContent = "Selecione o disco que voce ja tem (1 por CORE)";
    } else if (tipo === "ponta") {
      configLabel.textContent = `Selecione as ponteiras do TT11 que voce ja tem (maximo ${MAX_PONTEIRAS_TT11})`;
    } else if (tipo === "vru-cor") {
      configLabel.textContent = "Selecione as cores de regulagem disponiveis neste atomizador";
    } else {
      configLabel.textContent = "Selecione as configuracoes disponiveis";
    }

    configOpcoes.innerHTML = opcoes
      .map(
        (opcao) => `
          <label class="comp-check">
            <input type="${tipo === "disco" ? "radio" : "checkbox"}" class="comp-config-check" ${
              tipo === "disco" ? 'name="comp-config-radio"' : ""
            } value="${escapeHtml(opcao.key)}" ${
              selecionadas.has(opcao.key) ? "checked" : ""
            } />
            <span>${escapeHtml(opcao.label)}</span>
          </label>
        `
      )
      .join("");
  }

  function aplicarPadraoInicial() {
    inputFaixa.value = "0";
    inputTaxa.value = "0";
    if (inputSistemaUnidades) inputSistemaUnidades.value = SISTEMA_UNIDADES_METRICO;
    inputPulverizadores.value = "0";
    inputVelMin.value = "0";
    inputVelMed.value = "0";
    inputVelMax.value = "0";
    if (inputPsiMin) inputPsiMin.value = String(PSI_PADRAO_MIN);
    if (inputPsiMax) inputPsiMax.value = String(PSI_PADRAO_MAX);
    inputPasso.value = "5";
    if (inputPassosBaixo) inputPassosBaixo.value = "5";
    if (inputPassosCima) inputPassosCima.value = "5";
  }

  function harmonizarSelecaoEquipamento() {
    const temAtomizador = Boolean(String((inputAtomizador && inputAtomizador.value) || "").trim());
    const temBico = Boolean(String((inputEquipamento && inputEquipamento.value) || "").trim());
    if (temAtomizador && temBico && inputEquipamento) {
      inputEquipamento.value = "";
    }
  }

  function entradaInicialValidaParaCalculo() {
    const faixa = Number(inputFaixa && inputFaixa.value);
    const taxa = Number(inputTaxa && inputTaxa.value);
    const pulverizadores = Number(inputPulverizadores && inputPulverizadores.value);
    const velMin = Number(inputVelMin && inputVelMin.value);
    const velMed = Number(inputVelMed && inputVelMed.value);
    const velMax = Number(inputVelMax && inputVelMax.value);
    const psiMinCfg = Number(inputPsiMin && inputPsiMin.value);
    const psiMaxCfg = Number(inputPsiMax && inputPsiMax.value);
    const passo = Number(inputPasso && inputPasso.value);
    const passosBaixo = Number(inputPassosBaixo && inputPassosBaixo.value);
    const passosCima = Number(inputPassosCima && inputPassosCima.value);

    if (!Number.isFinite(faixa) || !Number.isFinite(taxa) || !Number.isFinite(pulverizadores)) return false;
    if (!Number.isFinite(velMin) || !Number.isFinite(velMed) || !Number.isFinite(velMax)) return false;
    if (!Number.isFinite(psiMinCfg) || !Number.isFinite(psiMaxCfg)) return false;
    if (!Number.isFinite(passo) || !Number.isFinite(passosBaixo) || !Number.isFinite(passosCima)) return false;
    if (faixa <= 0 || taxa <= 0 || pulverizadores <= 0) return false;
    if (velMin <= 0 || velMed <= 0 || velMax <= 0) return false;
    if (psiMinCfg < PSI_LIMITE_MIN || psiMinCfg > PSI_LIMITE_MAX) return false;
    if (psiMaxCfg < PSI_LIMITE_MIN || psiMaxCfg > PSI_LIMITE_MAX) return false;
    if (!(psiMinCfg < psiMaxCfg)) return false;
    if (passo <= 0 || passosBaixo < 0 || passosCima < 0) return false;
    if (!(velMin <= velMed && velMed <= velMax)) return false;
    return true;
  }

  function lerNumero(el, nome) {
    const value = Number(el && el.value);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${nome} deve ser maior que zero.`);
    }
    return value;
  }

  function lerEntrada() {
    const bicoSelecionado = obterEquipamentoSelecionado();
    if (!bicoSelecionado) {
      throw new Error("Selecione um bico ou atomizador utilizado.");
    }
    const tipoConfig = tipoSelecaoConfiguracao(bicoSelecionado);
    const configuracoesSelecionadas = lerConfiguracoesMarcadasDom();
    if (tipoConfig && !configuracoesSelecionadas.length) {
      if (tipoConfig === "disco") {
        throw new Error("Selecione pelo menos um disco que voce ja possui para este CORE.");
      }
      if (tipoConfig === "vru-cor") {
        throw new Error("Selecione pelo menos uma cor de regulagem do atomizador.");
      }
      throw new Error("Selecione pelo menos uma ponteira do TT11 que voce ja possui.");
    }

    const faixaM = lerNumero(inputFaixa, "Faixa");
    const taxaAlvoLHa = lerNumero(inputTaxa, "Taxa alvo");
    const pulverizadores = lerNumero(inputPulverizadores, "Numero de bicos");
    const velMin = lerNumero(inputVelMin, "Velocidade minima");
    const velMed = lerNumero(inputVelMed, "Velocidade media");
    const velMax = lerNumero(inputVelMax, "Velocidade maxima");
    const passoComp = Number(inputPasso && inputPasso.value);
    if (!Number.isFinite(passoComp) || passoComp <= 0) {
      throw new Error("Passo de ajuste (%) deve ser maior que zero.");
    }
    const psiMinCfg = Number(inputPsiMin && inputPsiMin.value);
    const psiMaxCfg = Number(inputPsiMax && inputPsiMax.value);
    if (!Number.isFinite(psiMinCfg) || psiMinCfg < PSI_LIMITE_MIN || psiMinCfg > PSI_LIMITE_MAX) {
      throw new Error(`Pressao minima deve ficar entre ${PSI_LIMITE_MIN} e ${PSI_LIMITE_MAX} psi.`);
    }
    if (!Number.isFinite(psiMaxCfg) || psiMaxCfg < PSI_LIMITE_MIN || psiMaxCfg > PSI_LIMITE_MAX) {
      throw new Error(`Pressao maxima deve ficar entre ${PSI_LIMITE_MIN} e ${PSI_LIMITE_MAX} psi.`);
    }
    if (!(psiMinCfg < psiMaxCfg)) {
      throw new Error("Pressao minima deve ser menor que a pressao maxima.");
    }
    const passosBaixo = Number(inputPassosBaixo && inputPassosBaixo.value);
    if (!Number.isFinite(passosBaixo) || passosBaixo < 0 || !Number.isInteger(passosBaixo)) {
      throw new Error("Passos para baixo deve ser um inteiro maior ou igual a zero.");
    }
    const passosCima = Number(inputPassosCima && inputPassosCima.value);
    if (!Number.isFinite(passosCima) || passosCima < 0 || !Number.isInteger(passosCima)) {
      throw new Error("Passos para cima deve ser um inteiro maior ou igual a zero.");
    }

    if (!(velMin <= velMed && velMed <= velMax)) {
      throw new Error("As velocidades devem seguir: minima <= media <= maxima.");
    }

    return {
      bicoSelecionado,
      configuracoesSelecionadas,
      faixaM,
      taxaAlvoLHa,
      pulverizadores,
      velocidades: { min: velMin, med: velMed, max: velMax },
      psiFaixa: { min: psiMinCfg, max: psiMaxCfg },
      passoComp,
      passosBaixo,
      passosCima,
    };
  }

  function atualizarResumo(input) {
    const area = {
      min: (input.velocidades.min * input.faixaM) / 600,
      med: (input.velocidades.med * input.faixaM) / 600,
      max: (input.velocidades.max * input.faixaM) / 600,
    };
    const vt = {
      min: area.min * input.taxaAlvoLHa,
      med: area.med * input.taxaAlvoLHa,
      max: area.max * input.taxaAlvoLHa,
    };
    const vb = {
      min: vt.min / input.pulverizadores,
      med: vt.med / input.pulverizadores,
      max: vt.max / input.pulverizadores,
    };

    resumoIds.velMin.textContent = fmt(input.velocidades.min, 0);
    resumoIds.velMed.textContent = fmt(input.velocidades.med, 0);
    resumoIds.velMax.textContent = fmt(input.velocidades.max, 0);

    resumoIds.areaMin.textContent = fmt(area.min, 2);
    resumoIds.areaMed.textContent = fmt(area.med, 2);
    resumoIds.areaMax.textContent = fmt(area.max, 2);

    resumoIds.vtMin.textContent = fmt(vt.min, 2);
    resumoIds.vtMed.textContent = fmt(vt.med, 2);
    resumoIds.vtMax.textContent = fmt(vt.max, 2);

    resumoIds.vbMin.textContent = fmt(vb.min, 2);
    resumoIds.vbMed.textContent = fmt(vb.med, 2);
    resumoIds.vbMax.textContent = fmt(vb.max, 2);

    return { area, vt, vb };
  }

  function calcularTaxa(vazaoTotalLMin, velocidadeKmh, faixaM) {
    return (600 * vazaoTotalLMin) / (velocidadeKmh * faixaM);
  }

  function normalizarPontos(curva) {
    return (curva && Array.isArray(curva.pontos) ? curva.pontos : [])
      .map((ponto) => ({
        psi: Number(ponto && ponto.psi),
        vazao: Number(ponto && ponto.vazaoLMin),
      }))
      .filter((ponto) => Number.isFinite(ponto.psi) && Number.isFinite(ponto.vazao))
      .sort((a, b) => a.psi - b.psi);
  }

  function interpolarVazaoPorPsi(pontos, psi) {
    if (!Array.isArray(pontos) || pontos.length < 2) return null;
    if (psi < pontos[0].psi) {
      // Extrapolacao para baixo usando modelo de bico: Q ~ sqrt(P)
      if (psi < PSI_LIMITE_MIN) return null;
      if (pontos[0].psi <= 0) return null;
      return pontos[0].vazao * Math.sqrt(psi / pontos[0].psi);
    }
    if (psi > pontos[pontos.length - 1].psi) return null;
    for (let i = 0; i < pontos.length - 1; i += 1) {
      const p1 = pontos[i];
      const p2 = pontos[i + 1];
      if (psi === p1.psi) return p1.vazao;
      if (psi === p2.psi) return p2.vazao;
      if (psi > p1.psi && psi < p2.psi) {
        const t = (psi - p1.psi) / (p2.psi - p1.psi);
        return p1.vazao + t * (p2.vazao - p1.vazao);
      }
    }
    return null;
  }

  function interpolarPsiPorVazao(pontos, vazaoAlvo, psiMinAceitavel, psiMaxAceitavel) {
    if (!Array.isArray(pontos) || pontos.length < 2) return null;
    const psiMin = Number.isFinite(Number(psiMinAceitavel)) ? Number(psiMinAceitavel) : PSI_PADRAO_MIN;
    const psiMax = Number.isFinite(Number(psiMaxAceitavel)) ? Number(psiMaxAceitavel) : PSI_LIMITE_MAX;
    const pontosPorVazao = pontos
      .map((p) => ({ psi: p.psi, vazao: p.vazao }))
      .sort((a, b) => a.vazao - b.vazao);
    if (vazaoAlvo < pontosPorVazao[0].vazao) {
      // Extrapolacao para baixo invertendo Q ~ sqrt(P)
      const pontoMin = pontosPorVazao[0];
      if (pontoMin.vazao <= 0) return null;
      const psiEstimada = Math.pow(vazaoAlvo / pontoMin.vazao, 2) * pontoMin.psi;
      if (!Number.isFinite(psiEstimada)) return null;
      if (psiEstimada < psiMin || psiEstimada > pontoMin.psi) return null;
      return psiEstimada;
    }
    if (vazaoAlvo > pontosPorVazao[pontosPorVazao.length - 1].vazao) {
      // Extrapolacao para cima invertendo Q ~ sqrt(P)
      const pontoMax = pontosPorVazao[pontosPorVazao.length - 1];
      if (pontoMax.vazao <= 0 || pontoMax.psi <= 0) return null;
      const psiEstimada = Math.pow(vazaoAlvo / pontoMax.vazao, 2) * pontoMax.psi;
      if (!Number.isFinite(psiEstimada)) return null;
      if (psiEstimada < pontoMax.psi || psiEstimada > psiMax || psiEstimada > PSI_LIMITE_MAX) return null;
      return psiEstimada;
    }
    for (let i = 0; i < pontosPorVazao.length - 1; i += 1) {
      const p1 = pontosPorVazao[i];
      const p2 = pontosPorVazao[i + 1];
      if (vazaoAlvo === p1.vazao) return p1.psi;
      if (vazaoAlvo === p2.vazao) return p2.psi;
      if (vazaoAlvo > p1.vazao && vazaoAlvo < p2.vazao) {
        const t = (vazaoAlvo - p1.vazao) / (p2.vazao - p1.vazao);
        return p1.psi + t * (p2.psi - p1.psi);
      }
    }
    return null;
  }

  function calcularVazaoPorBico(taxaLHa, velocidadeKmh, faixaM, pulverizadores) {
    const vazaoTotal = (taxaLHa * velocidadeKmh * faixaM) / 600;
    return vazaoTotal / pulverizadores;
  }

  function curvasDoBico(item, configuracoesSelecionadas) {
    if (!item) return [];
    const curvas = [];
    const filtro = Array.isArray(configuracoesSelecionadas) && configuracoesSelecionadas.length
      ? new Set(configuracoesSelecionadas)
      : null;
    const permitido = (chave) => !filtro || filtro.has(chave);

    if (Array.isArray(item.curvasOrificio)) {
      item.curvasOrificio.forEach((curva) => {
        const valor = Number(curva && curva.orificioMm);
        const pontos = normalizarPontos(curva);
        const chave = `orificio:${valor}`;
        if (!Number.isFinite(valor) || pontos.length < 2) return;
        if (!permitido(chave)) return;
        curvas.push({
          chave,
          label: `Orificio ${fmt(valor, 2)} mm`,
          pontos,
        });
      });
    }

    if (Array.isArray(item.curvasPontaColorida)) {
      item.curvasPontaColorida.forEach((curva) => {
        const codigo = String((curva && curva.codigo) || "").trim();
        const cor = String((curva && curva.cor) || "").trim();
        const pontos = normalizarPontos(curva);
        const chave = `ponta:${codigo}`;
        if (!codigo || pontos.length < 2) return;
        if (!permitido(chave)) return;
        curvas.push({
          chave,
          label: `Ponta ${codigo}${cor ? ` (${cor})` : ""}`,
          pontos,
        });
      });
    }

    if (Array.isArray(item.curvasDisco)) {
      item.curvasDisco.forEach((curva) => {
        const disco = String((curva && curva.disco) || "").trim();
        const pontos = normalizarPontos(curva);
        const chave = `disco:${disco}`;
        if (!disco || pontos.length < 2) return;
        if (!permitido(chave)) return;
        curvas.push({
          chave,
          label: `Disco ${disco}`,
          pontos,
        });
      });
    }

    if (itemTemTabelaVru(item)) {
      const tabela = item.tabelaVru || {};
      const psiLista = Array.isArray(tabela.psi)
        ? tabela.psi.map((v) => Number(v)).filter((v) => Number.isFinite(v))
        : [];
      const linhas = Array.isArray(tabela.linhas) ? tabela.linhas : [];
      const cores = Array.isArray(tabela.coresRegulagem) && tabela.coresRegulagem.length
        ? tabela.coresRegulagem.map((cor) => String(cor || "").trim().toLowerCase())
        : ["canal-1"];
      const filtroCores = filtro
        ? new Set(
            Array.from(filtro)
              .map((k) => String(k || "").trim().toLowerCase())
              .filter((k) => k.startsWith("vru-cor:"))
          )
        : null;

      linhas.forEach((linha, idxLinha) => {
        const posicaoRaw = Number(linha && linha.posicao);
        const posicao = Number.isFinite(posicaoRaw) ? posicaoRaw : idxLinha;
        const valores = Array.isArray(linha && linha.valores) ? linha.valores : [];

        cores.forEach((corNome, idxCor) => {
          const chaveCor = `vru-cor:${corNome}`;
          if (filtroCores && !filtroCores.has(chaveCor)) return;

          const pontos = [];
          for (let i = 0; i < psiLista.length; i += 1) {
            const psi = Number(psiLista[i]);
            const valLinha = valores[i];
            let vazaoRaw = NaN;
            if (Array.isArray(valLinha)) {
              vazaoRaw = Number(valLinha[idxCor]);
            } else if (idxCor === 0) {
              vazaoRaw = Number(valLinha);
            }
            if (Number.isFinite(psi) && Number.isFinite(vazaoRaw)) {
              pontos.push({ psi, vazao: vazaoRaw });
            }
          }

          if (pontos.length < 2) return;
          curvas.push({
            chave: `vru:${corNome}:pos:${posicao}`,
            label: `VRU posicao ${posicao} (${corNome})`,
            pontos: pontos.sort((a, b) => a.psi - b.psi),
          });
        });
      });
    }

    return curvas;
  }

  function calcularPassos(input) {
    const passo = Number(input && input.passoComp) || 5;
    const psiMinAceitavel =
      Number.isFinite(Number(input && input.psiFaixa && input.psiFaixa.min))
        ? Number(input.psiFaixa.min)
        : PSI_PADRAO_MIN;
    const psiMaxAceitavel =
      Number.isFinite(Number(input && input.psiFaixa && input.psiFaixa.max))
        ? Number(input.psiFaixa.max)
        : PSI_PADRAO_MAX;
    const passosBaixo = Number.isFinite(Number(input && input.passosBaixo))
      ? Math.max(0, Math.trunc(Number(input.passosBaixo)))
      : 5;
    const passosCima = Number.isFinite(Number(input && input.passosCima))
      ? Math.max(0, Math.trunc(Number(input.passosCima)))
      : 5;
    const curvasSelecionadas = curvasDoBico(input.bicoSelecionado, input.configuracoesSelecionadas);
    if (!curvasSelecionadas.length) return [];

    const totalFaixasSolicitadas = passosBaixo + passosCima + 1;
    const MAX_ITER_BUSCA = 1000;

    function avaliarPassoAlvo(passoAlvo) {
      const taxaCompAlvo = input.taxaAlvoLHa * (passoAlvo / 100);
      const candidatos = [];

      curvasSelecionadas.forEach((curva) => {
        const q = {
          min: calcularVazaoPorBico(
            taxaCompAlvo,
            input.velocidades.min,
            input.faixaM,
            input.pulverizadores
          ),
          med: calcularVazaoPorBico(
            taxaCompAlvo,
            input.velocidades.med,
            input.faixaM,
            input.pulverizadores
          ),
          max: calcularVazaoPorBico(
            taxaCompAlvo,
            input.velocidades.max,
            input.faixaM,
            input.pulverizadores
          ),
        };
        const psi = {
          min: interpolarPsiPorVazao(curva.pontos, q.min, psiMinAceitavel, psiMaxAceitavel),
          med: interpolarPsiPorVazao(curva.pontos, q.med, psiMinAceitavel, psiMaxAceitavel),
          max: interpolarPsiPorVazao(curva.pontos, q.max, psiMinAceitavel, psiMaxAceitavel),
        };
        if (!Number.isFinite(psi.min) || !Number.isFinite(psi.med) || !Number.isFinite(psi.max)) return;
        if (psi.min < psiMinAceitavel || psi.med < psiMinAceitavel || psi.max < psiMinAceitavel) return;
        if (psi.min > psiMaxAceitavel || psi.med > psiMaxAceitavel || psi.max > psiMaxAceitavel) return;

        const score = Math.abs(psi.med - 35) + Math.abs(psi.max - psi.min) * 0.05;
        candidatos.push({
          configLabel: curva.label,
          configKey: curva.chave,
          vazaoBico: q,
          psi,
          score,
        });
      });

      if (!candidatos.length) {
        return null;
      }
      candidatos.sort((a, b) => a.score - b.score);
      return {
        passoComp: passo,
        totalFaixas: totalFaixasSolicitadas,
        passoAlvo,
        taxaCompAlvo,
        candidato: candidatos[0],
        referencialIndisponivel: false,
      };
    }

    const resultadosBaixoDesc = [];
    for (let i = 1; i <= MAX_ITER_BUSCA && resultadosBaixoDesc.length < passosBaixo; i += 1) {
      const passoAlvo = 100 - i * passo;
      if (passoAlvo <= 0) break;
      const avaliacao = avaliarPassoAlvo(passoAlvo);
      if (avaliacao && avaliacao.candidato) {
        resultadosBaixoDesc.push(avaliacao);
      }
    }

    const resultadosCima = [];
    for (let i = 1; i <= MAX_ITER_BUSCA && resultadosCima.length < passosCima; i += 1) {
      const passoAlvo = 100 + i * passo;
      const avaliacao = avaliarPassoAlvo(passoAlvo);
      if (avaliacao && avaliacao.candidato) {
        resultadosCima.push(avaliacao);
      }
    }

    const centro = avaliarPassoAlvo(100) || {
      passoComp: passo,
      totalFaixas: totalFaixasSolicitadas,
      passoAlvo: 100,
      taxaCompAlvo: input.taxaAlvoLHa,
      candidato: null,
      referencialIndisponivel: true,
    };

    const resultados = [...resultadosBaixoDesc.reverse(), centro, ...resultadosCima];

    resultados.forEach((item) => {
      item.totalFaixas = totalFaixasSolicitadas;
      item.totalSolicitadoBaixo = passosBaixo;
      item.totalSolicitadoCima = passosCima;
      item.totalEncontradoBaixo = resultadosBaixoDesc.length;
      item.totalEncontradoCima = resultadosCima.length;
    });

    return resultados;
  }

  function renderPassos(passos, inputAtual) {
    const psiMinAceitavel = Number(inputPsiMin && inputPsiMin.value);
    const psiMaxAceitavel = Number(inputPsiMax && inputPsiMax.value);
    const psiMin = Number.isFinite(psiMinAceitavel) ? psiMinAceitavel : PSI_PADRAO_MIN;
    const psiMax = Number.isFinite(psiMaxAceitavel) ? psiMaxAceitavel : PSI_PADRAO_MAX;
    const mostrarSinal = preferenciaExibirSinalPercentual();
    const equipamentoSelecionado = String(
      (inputAtual && inputAtual.bicoSelecionado && (inputAtual.bicoSelecionado.nome || inputAtual.bicoSelecionado.id)) ||
        ""
    ).trim();
    if (!passos.length) {
      passosBody.innerHTML = `
        <tr>
          <td colspan="5">
            Sem configuracoes disponiveis no intervalo de pressao ${psiMin}-${psiMax} psi.
          </td>
        </tr>
      `;
      passosMeta.textContent = "0 configuracoes mapeadas";
      return;
    }

    function celulaVel(vazao, psi) {
      const psiClass =
        psi < psiMin
          ? "pressao-faixa-baixa"
          : psi > psiMax
          ? "pressao-faixa-alta"
          : "";
      return `
        <div class="demanda-vazao">${fmt(vazao, 2)} L/min</div>
        <small class="demanda-psi ${psiClass}">${fmt(psi, 1)} psi</small>
      `;
    }

    passosBody.innerHTML = passos
      .map((item) => {
        const cand = item.candidato;
        const ehCentro = Math.abs(item.passoAlvo - 100) < 0.001;
        const semReferencia = !cand && Boolean(item.referencialIndisponivel);
        const rowClass = ehCentro
          ? semReferencia
            ? "comp-med comp-centro-100"
            : "comp-ok comp-centro-100"
          : "comp-ok";
        const imagemRef = ehCentro ? resolverImagemReferencia(inputAtual && inputAtual.bicoSelecionado) : "";
        const configPrincipal = cand
          ? escapeHtml(String(cand.configLabel || "-"))
          : "Indisponivel nesta configuracao";
        const configCellHtml =
          ehCentro && equipamentoSelecionado
            ? `<div class="comp-ref-row">
                <div class="comp-ref-text">
                  <div class="comp-ref-main">${configPrincipal}</div>
                  <small class="comp-ref-equip">Equipamento: ${escapeHtml(equipamentoSelecionado)}</small>
                </div>
                ${
                  imagemRef
                    ? `<img class="comp-ref-thumb" src="${escapeHtml(imagemRef)}" alt="${escapeHtml(
                        equipamentoSelecionado
                      )}" loading="lazy" />`
                    : ""
                }
              </div>`
            : configPrincipal;
        return `
          <tr class="${rowClass}">
            <td>
              <div class="comp-taxa-evidencia">${fmt(item.taxaCompAlvo, 2)} L/ha</div>
              <small>${textoDeltaComp(item.passoAlvo, mostrarSinal)}</small>
            </td>
            <td>
              ${configCellHtml}
            </td>
            <td>
              ${cand ? celulaVel(cand.vazaoBico.min, cand.psi.min) : '<small class="demanda-psi">n/d</small>'}
            </td>
            <td>
              ${cand ? celulaVel(cand.vazaoBico.med, cand.psi.med) : '<small class="demanda-psi">n/d</small>'}
            </td>
            <td>
              ${cand ? celulaVel(cand.vazaoBico.max, cand.psi.max) : '<small class="demanda-psi">n/d</small>'}
            </td>
          </tr>
        `;
      })
      .join("");

    const passoAtual = Number(passos[0] && passos[0].passoComp) || Number(inputPasso && inputPasso.value) || 5;
    const totalFaixasSolicitadas =
      Number(passos[0] && passos[0].totalFaixas) ||
      (Number(inputPassosBaixo && inputPassosBaixo.value) || 0) +
        (Number(inputPassosCima && inputPassosCima.value) || 0) +
        1;
    const encontradoBaixo = Number(passos[0] && passos[0].totalEncontradoBaixo);
    const encontradoCima = Number(passos[0] && passos[0].totalEncontradoCima);
    const solicitadoBaixo = Number(passos[0] && passos[0].totalSolicitadoBaixo);
    const solicitadoCima = Number(passos[0] && passos[0].totalSolicitadoCima);
    const detalheLados =
      Number.isFinite(encontradoBaixo) &&
      Number.isFinite(encontradoCima) &&
      Number.isFinite(solicitadoBaixo) &&
      Number.isFinite(solicitadoCima)
        ? ` | baixo ${fmt(encontradoBaixo, 0)}/${fmt(solicitadoBaixo, 0)} | cima ${fmt(
            encontradoCima,
            0
          )}/${fmt(solicitadoCima, 0)}`
        : "";
    passosMeta.textContent = `${passos.length} de ${fmt(totalFaixasSolicitadas, 0)} faixas exibidas (passo ${fmt(
      passoAtual,
      0
    )}%, PSI ${fmt(psiMin, 0)}-${fmt(psiMax, 0)})${detalheLados}`;
  }

  function textoOpcaoSelecionada(selectNode) {
    if (!selectNode) return "";
    const idx = Number(selectNode.selectedIndex);
    const opt = idx >= 0 ? selectNode.options[idx] : null;
    return String((opt && opt.textContent) || "").trim();
  }

  function textoDeltaComp(passoAlvo, mostrarSinal) {
    const delta = Number(passoAlvo) - 100;
    if (delta === 0) return mostrarSinal ? "+/-0%" : "0%";
    if (delta > 0) {
      return `-${fmt(Math.abs(delta), 0)}%`;
    }
    if (!mostrarSinal) return `${fmt(Math.abs(delta), 0)}%`;
    return `+${fmt(Math.abs(delta), 0)}%`;
  }

  function blocoDemandaPdf(vazao, psi) {
    const psiExibivel = Number.isFinite(psi) && psi >= PSI_LIMITE_MIN;
    return `
      <div class="pdf-op-demand-q">${Number.isFinite(vazao) ? `${fmt(vazao, 2)} L/min` : "n/d"}</div>
      <div class="pdf-op-demand-p">${psiExibivel ? `${fmt(psi, 1)} psi` : "n/d"}</div>
    `;
  }

  function montarRelatorioConfiguracoes(modeloEscolhido) {
    if (!ultimoContextoCalculo || !ultimoContextoCalculo.input || !Array.isArray(ultimoContextoCalculo.passos)) {
      return false;
    }
    const input = ultimoContextoCalculo.input;
    const passos = ultimoContextoCalculo.passos;
    if (!passos.length) return false;

    const modelo = normalizarModeloRelatorioPdf(modeloEscolhido);
    const existente = document.getElementById("pdf-operacional-bicos");
    const report = existente || document.createElement("section");
    report.id = "pdf-operacional-bicos";
    report.className = "pdf-op-report";

    const dataRel = new Date();
    const dataRelTxt = dataRel.toLocaleString("pt-BR");
    const mostrarSinal = preferenciaExibirSinalPercentual();
    const equipamento = input && input.bicoSelecionado ? input.bicoSelecionado : null;
    const nomeEquipamento = String((equipamento && (equipamento.nome || equipamento.id)) || "-");
    const imagemEquipamento = normalizarSrcImagemPdf(resolverImagemReferencia(equipamento));
    const aeronave = textoOpcaoSelecionada(presetAeronave) || "Manual";
    const metaFaixas = String((passosMeta && passosMeta.textContent) || "").trim();
    const limiteLinhas = modelo === "operacional-1p" ? 16 : modelo === "comparativo-1p" ? 22 : 14;
    const linhas = passos.slice(0, limiteLinhas);

    const resumo = ultimoContextoCalculo.resumo || { area: {}, vt: {}, vb: {} };
    const areaMed = Number(resumo && resumo.area ? resumo.area.med : NaN);
    const vtMed = Number(resumo && resumo.vt ? resumo.vt.med : NaN);
    const vbMed = Number(resumo && resumo.vb ? resumo.vb.med : NaN);

    const rowsHtml = linhas
      .map((item, idx) => {
        const cand = item && item.candidato ? item.candidato : null;
        const classe = Math.abs(Number(item && item.passoAlvo) - 100) < 0.001 ? "is-main" : "";
        const taxa = `${fmt(Number(item && item.taxaCompAlvo), 2)} L/ha`;
        const delta = textoDeltaComp(Number(item && item.passoAlvo), mostrarSinal);
        const config = cand ? escapeHtml(String(cand.configLabel || "-")) : "Indisponivel";

        if (modelo === "operacional-1p") {
          return `
            <tr class="${classe}">
              <td>${idx + 1}</td>
              <td><strong>${taxa}</strong><br><small>${delta}</small></td>
              <td>${config}</td>
              <td>${cand ? blocoDemandaPdf(cand.vazaoBico.med, cand.psi.med) : "n/d"}</td>
            </tr>
          `;
        }

        return `
          <tr class="${classe}">
            <td>${idx + 1}</td>
            <td><strong>${taxa}</strong><br><small>${delta}</small></td>
            <td>${config}</td>
            <td>${cand ? blocoDemandaPdf(cand.vazaoBico.min, cand.psi.min) : "n/d"}</td>
            <td>${cand ? blocoDemandaPdf(cand.vazaoBico.med, cand.psi.med) : "n/d"}</td>
            <td>${cand ? blocoDemandaPdf(cand.vazaoBico.max, cand.psi.max) : "n/d"}</td>
          </tr>
        `;
      })
      .join("");

    const tabelaOperacional = `
      <div class="pdf-op-table-wrap">
        <table class="pdf-op-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Configuracao disponivel</th>
              <th>Detalhe tecnico</th>
              <th>Velocidade media</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    const tabelaCompleta = `
      <div class="pdf-op-table-wrap">
        <table class="pdf-op-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Configuracao disponivel</th>
              <th>Detalhe tecnico</th>
              <th>Velocidade minima</th>
              <th>Velocidade media</th>
              <th>Velocidade maxima</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    const blocoVisualImagem =
      modelo === "visual-1p" && imagemEquipamento
        ? `
          <div style="margin:8px 0 10px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; padding:8px; display:flex; gap:10px; align-items:center;">
            <img src="${escapeHtml(imagemEquipamento)}" alt="${escapeHtml(nomeEquipamento)}" style="width:92px;height:92px;object-fit:contain;background:#fff;border:1px solid #cbd5e1;border-radius:8px;" />
            <div>
              <strong style="font-size:9.5pt;">${escapeHtml(nomeEquipamento)}</strong><br>
              <small style="color:#475569;">Relatorio com referencia visual do equipamento selecionado.</small>
            </div>
          </div>
        `
        : "";

    const tabelaHtml = modelo === "operacional-1p" ? tabelaOperacional : tabelaCompleta;

    report.innerHTML = `
      <div class="pdf-op-page">
        <header class="pdf-op-header">
          <div>
            <h1>RELATORIO DE CONFIGURACOES DISPONIVEIS</h1>
            <p>Gerado em ${escapeHtml(dataRelTxt)}</p>
          </div>
          <span class="pdf-op-header-tag">${escapeHtml(modelo)}</span>
        </header>

        <section class="pdf-op-meta">
          <div><strong>Aeronave:</strong> ${escapeHtml(aeronave)}</div>
          <div><strong>Equipamento:</strong> ${escapeHtml(nomeEquipamento)}</div>
          <div><strong>Faixa:</strong> ${fmt(input.faixaM, 2)} m</div>
          <div><strong>Taxa alvo:</strong> ${fmt(input.taxaAlvoLHa, 2)} L/ha</div>
          <div><strong>N de bicos:</strong> ${fmt(input.pulverizadores, 0)}</div>
          <div><strong>Vel. min/med/max:</strong> ${fmt(input.velocidades.min, 0)} / ${fmt(
            input.velocidades.med,
            0
          )} / ${fmt(input.velocidades.max, 0)} km/h</div>
          <div><strong>Passo:</strong> ${fmt(input.passoComp, 0)}%</div>
          <div><strong>Faixa de PSI:</strong> ${fmt(input.psiFaixa.min, 0)} - ${fmt(input.psiFaixa.max, 0)} psi</div>
          <div><strong>Passos:</strong> -${fmt(input.passosBaixo, 0)} / +${fmt(input.passosCima, 0)}</div>
          <div><strong>Faixas exibidas:</strong> ${escapeHtml(metaFaixas || `${passos.length} opcoes`)}</div>
        </section>

        <section class="pdf-op-kpis">
          <article>
            <span>Area coberta (media)</span>
            <strong>${Number.isFinite(areaMed) ? `${fmt(areaMed, 2)} ha/min` : "n/d"}</strong>
          </article>
          <article>
            <span>Vazao total alvo (media)</span>
            <strong>${Number.isFinite(vtMed) ? `${fmt(vtMed, 2)} L/min` : "n/d"}</strong>
          </article>
          <article>
            <span>Vazao por bico alvo (media)</span>
            <strong>${Number.isFinite(vbMed) ? `${fmt(vbMed, 2)} L/min` : "n/d"}</strong>
          </article>
          <article>
            <span>Configuracoes mapeadas</span>
            <strong>${fmt(passos.length, 0)}</strong>
          </article>
        </section>

        ${blocoVisualImagem}
        ${tabelaHtml}
      </div>
    `;

    if (!report.parentNode) {
      document.body.appendChild(report);
    }
    return true;
  }

  async function exportarPaginaParaPdf() {
    if (exportPdfBtn && exportPdfBtn.disabled) return;
    setExportPdfBusy(true);
    try {
      const modeloPdf = lerModeloRelatorioPdfAtual();
      const sufixoModelo = modeloPdf.replace(/[^a-z0-9-]/gi, "");
      const prefixo = `relatorio_configuracoes_${sufixoModelo}`;
      const gerou = montarRelatorioConfiguracoes(modeloPdf);
      if (!gerou) {
        setError("Execute um calculo antes de exportar o relatorio.");
        return;
      }

      const reportNode = document.getElementById("pdf-operacional-bicos");
      const reportHtml = reportNode ? reportNode.outerHTML : "";

      if (reportHtml) {
        try {
          setError("");
          const endpoints = endpointRelatorioPdfCandidatos();
          let respOk = null;
          let erroDetalhe = "";

          for (let i = 0; i < endpoints.length; i += 1) {
            const endpoint = endpoints[i];
            const resp = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reportHtml, prefixo }),
            });
            const contentType = String(resp.headers.get("content-type") || "").toLowerCase();

            if (resp.ok && contentType.includes("application/pdf")) {
              respOk = resp;
              break;
            }

            let detalhes = "";
            try {
              if (contentType.includes("application/json")) {
                const body = await resp.json();
                detalhes = body && body.error ? body.error : "";
              } else {
                const txt = await resp.text();
                const sample = String(txt || "").slice(0, 140).replace(/\s+/g, " ").trim();
                if (sample) detalhes = sample;
              }
            } catch (_erroParse) {
              detalhes = "";
            }

            erroDetalhe = `endpoint ${endpoint} retornou ${resp.status}${detalhes ? ` (${detalhes})` : ""}`;
          }

          if (!respOk) {
            throw new Error(`Falha ao gerar PDF via Puppeteer (${erroDetalhe || "sem resposta valida"})`);
          }

          const blob = await respOk.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${prefixo}_${dataHoraParaNomeArquivo(new Date())}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        } catch (error) {
          setError(`${error.message || "Falha ao exportar via Puppeteer."} Usando impressao local.`);
        }
      }

      document.body.classList.add("print-report-bicos");
      const tituloAnterior = String(document.title || "");
      document.title = `${prefixo}_${dataHoraParaNomeArquivo(new Date())}`;
      window.print();
      window.setTimeout(() => {
        document.title = tituloAnterior;
        document.body.classList.remove("print-report-bicos");
      }, 400);
    } finally {
      setExportPdfBusy(false);
    }
  }

  function recalc() {
    try {
      setError("");
      const input = lerEntrada();
      const resumo = atualizarResumo(input);
      const passos = calcularPassos(input);
      renderPassos(passos, input);
      ultimoContextoCalculo = { input, passos, resumo };
    } catch (error) {
      setError(error.message);
      clearTabela();
    }
  }

  function aplicarPresetSelecionado() {
    const nome = String(presetAeronave.value || "").trim();
    if (!nome) return;
    const item = aeronaves.find((a) => String(a.modelo || "").trim() === nome);
    if (!item) return;

    if (Number.isFinite(Number(item.vminKmh))) inputVelMin.value = String(Number(item.vminKmh));
    if (Number.isFinite(Number(item.vmedKmh))) inputVelMed.value = String(Number(item.vmedKmh));
    if (Number.isFinite(Number(item.vmaxKmh))) inputVelMax.value = String(Number(item.vmaxKmh));
    salvarDadosCompartilhados();
    recalc();
  }

  function bindEvents() {
    if (inputSistemaUnidades) {
      inputSistemaUnidades.addEventListener("change", function () {
        inputSistemaUnidades.value = normalizarSistemaUnidades(inputSistemaUnidades.value);
        salvarDadosCompartilhados();
      });
    }

    form.addEventListener("input", function (event) {
      const alvo = event && event.target;
      if (alvo && alvo.classList && alvo.classList.contains("comp-config-check")) {
        // Seletores de configuracao sao tratados no evento "change".
        return;
      }
      salvarDadosCompartilhados();
      recalc();
    });

    form.addEventListener("change", function (event) {
      const alvo = event && event.target;
      if (alvo && alvo.id === "equipamento-comp") {
        if (inputAtomizador && String(inputEquipamento && inputEquipamento.value || "").trim()) {
          inputAtomizador.value = "";
        }
        harmonizarSelecaoEquipamento();
        atualizarSeletorConfiguracao();
      }
      if (alvo && alvo.id === "atomizador-comp") {
        if (inputEquipamento && String(inputAtomizador && inputAtomizador.value || "").trim()) {
          inputEquipamento.value = "";
        }
        harmonizarSelecaoEquipamento();
        atualizarSeletorConfiguracao();
      }
      if (alvo && alvo.classList && alvo.classList.contains("comp-config-check")) {
        const item = obterEquipamentoSelecionado();
        const tipo = tipoSelecaoConfiguracao(item);
        if (tipo === "ponta" && alvo.checked && configOpcoes) {
          const marcados = configOpcoes.querySelectorAll("input.comp-config-check:checked");
          if (marcados.length > MAX_PONTEIRAS_TT11) {
            alvo.checked = false;
            salvarSelecaoConfiguracaoAtual(item);
            salvarDadosCompartilhados();
            setError(`TT11 permite no maximo ${MAX_PONTEIRAS_TT11} ponteiras selecionadas.`);
            return;
          }
        }
        salvarSelecaoConfiguracaoAtual(item);
      }
      salvarDadosCompartilhados();
      recalc();
    });

    if (presetAeronave) presetAeronave.addEventListener("change", aplicarPresetSelecionado);
    if (btnConfigTodos) {
      btnConfigTodos.addEventListener("click", function () {
        if (!configOpcoes) return;
        const item = obterEquipamentoSelecionado();
        const tipo = tipoSelecaoConfiguracao(item);
        const checks = Array.from(configOpcoes.querySelectorAll("input.comp-config-check"));
        checks.forEach((node, idx) => {
          if (tipo === "disco") {
            node.checked = idx === 0;
          } else if (tipo === "ponta") {
            node.checked = idx < MAX_PONTEIRAS_TT11;
          } else {
            node.checked = true;
          }
        });
        salvarSelecaoConfiguracaoAtual(item);
        salvarDadosCompartilhados();
        recalc();
      });
    }
    if (btnConfigLimpar) {
      btnConfigLimpar.addEventListener("click", function () {
        if (!configOpcoes) return;
        configOpcoes.querySelectorAll("input.comp-config-check").forEach((node) => {
          node.checked = false;
        });
        salvarSelecaoConfiguracaoAtual(obterEquipamentoSelecionado());
        recalc();
      });
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener("click", function () {
        exportarPaginaParaPdf();
      });
    }
    if (pdfModeloGroup) {
      pdfModeloGroup.addEventListener("click", function (event) {
        const alvo =
          event && event.target && typeof event.target.closest === "function"
            ? event.target.closest("[data-pdf-modelo]")
            : null;
        if (!alvo) return;
        const modelo = normalizarModeloRelatorioPdf(alvo.getAttribute("data-pdf-modelo"));
        if (pdfModeloSelect) {
          pdfModeloSelect.value = modelo;
        }
        atualizarBotoesModeloPdf(modelo);
      });
    }
  }

  async function init() {
    try {
      setError("");

      catalogo = await fetchJsonWithFallback(
        ["js/data/catalogo.json", "./js/data/catalogo.json", "/js/data/catalogo.json"],
        true
      );
      const aeronavesData = await fetchJsonWithFallback(
        ["js/data/aeronaves_fluxometro.json", "./js/data/aeronaves_fluxometro.json", "/js/data/aeronaves_fluxometro.json"],
        false
      );

      aeronaves = Array.isArray(aeronavesData && aeronavesData.aeronaves) ? aeronavesData.aeronaves : [];
      bicosConfiguracao = listarBicosConfiguracao();
      if (!bicosConfiguracao.length) {
        throw new Error("Nenhum bico com curva de configuracao foi encontrado no catalogo.");
      }
      atomizadoresConfiguracao = listarAtomizadoresConfiguracao();

      preencherPresets();
      preencherBicosConfiguracao();
      preencherAtomizadoresConfiguracao();
      atualizarSeletorConfiguracao();
      const aplicouCompartilhado = aplicarDadosCompartilhadosNoForm();
      if (!aplicouCompartilhado) {
        aplicarPadraoInicial();
      }
      harmonizarSelecaoEquipamento();
      atualizarSeletorConfiguracao();
      bindEvents();
      lerModeloRelatorioPdfAtual();
      salvarDadosCompartilhados();
      if (entradaInicialValidaParaCalculo()) {
        recalc();
      }
    } catch (error) {
      setError(error.message || "Falha ao inicializar a pagina de configuracoes.");
      clearTabela();
    }
  }

  init();
})();
