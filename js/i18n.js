(function () {
  const STORAGE_KEY = "softwarebicos_lang";
  const SUPPORTED = ["pt", "en", "es"];

  const I18N = {
    pt: {
      title_home: "Home - Calculadoras Travicar",
      title_bicos: "Calibracao - Bicos Hidraulicos",
      title_atomizadores: "Calibracao - Atomizadores",
      title_configuracoes: "Configuracoes - Bicos",
      header_home: "CALCULADORAS TRAVICAR",
      header_bicos: "CALIBRAÇÃO DE BICOS HIDRÁULICOS",
      header_atomizadores: "CALIBRACAO ATOMIZADORES ROTATIVOS",
      header_configuracoes: "LIMITE DE ATUAÇÃO DOS BICOS",
      nav_home: "HOME",
      nav_bicos: "BICOS",
      nav_atomizadores: "ATOMIZADORES",
      nav_configuracoes: "CONFIGURACOES",
      home_intro: "Escolha qual calculadora voce quer usar",
      home_card_bicos_title: "Calibracao geral - bicos",
      home_card_bicos_desc: "Recomendacoes e calibracao para bicos hidraulicos.",
      home_card_atomizadores_title: "Calibracao geral - atomizadores",
      home_card_atomizadores_desc: "Recomendacoes e calibracao para atomizadores rotativos.",
      home_card_configuracoes_title: "O que o seu bico pode fazer",
      home_card_configuracoes_desc: "Faixas de taxa e ajustes possiveis com o equipamento selecionado.",
      label_select_aircraft: "Selecione sua aeronave",
      option_manual: "Manual",
      option_selecione: "Selecione",
      label_faixa: "Faixa (m)",
      label_taxa: "Taxa (L/ha)",
      label_taxa_alvo: "Taxa alvo (L/ha)",
      label_n_bicos: "N de bicos",
      label_max_rec_modelo: "Recomendacoes por bico",
      label_n_atomizadores: "N de atomizadores",
      label_display: "Exibicao",
      option_min_med_max: "Min/med/max",
      label_vel_min: "Velocidade minima (km/h)",
      label_vel_med: "Velocidade media (km/h)",
      label_vel_max: "Velocidade maxima (km/h)",
      filter_conico_core: "Jato Conico: Core/Disco",
      filter_conico_eletro: "Jato Conico: Eletrostatico",
      filter_plano: "Jato Plano",
      filter_solido: "Jato Solido",
      summary_range_title: "Resumo da calibracao para o range da velocidade",
      h2_summary: "Resumo da calibracao",
      th_vel_min: "Velocidade Minima",
      th_vel_med: "Velocidade Media",
      th_vel_max: "Velocidade Maxima",
      th_vel_min_lower: "Velocidade minima",
      th_vel_med_lower: "Velocidade media",
      th_vel_max_lower: "Velocidade maxima",
      row_velocidade: "Velocidade (km/h)",
      row_area: "Area Coberta (ha/min)",
      row_vazao_total: "Vazao Total (L/min)",
      row_vazao_total_alvo: "Vazao Total Alvo (L/min)",
      row_vazao_por_bico: "Vazao por Pulverizador (L/min)",
      row_vazao_bico_alvo: "Vazao por Bico Alvo (L/min)",
      row_vazao_por_atomizador: "Vazao por Atomizador (L/min)",
      row_pressao: "Pressao (psi)",
      h2_recommendations: "Recomendacoes",
      h2_recommendations_atomizadores: "Recomendacoes de atomizadores",
      btn_export_pdf: "Exportar PDF",
      th_modelo: "Modelo",
      th_familia: "Familia",
      th_faixa_vazao: "Faixa de vazao (L/min)",
      th_cor: "Cor",
      th_config_sugerida: "Configuracao sugerida",
      label_bico_utilizado: "Bico utilizado",
      label_passo_ajuste: "Passo de ajuste (%)",
      label_pressao_min_cfg: "Pressao minima (psi)",
      label_pressao_max_cfg: "Pressao maxima (psi)",
      label_passos_baixo: "Passos para baixo",
      label_passos_cima: "Passos para cima",
      label_cfg_disponiveis: "Selecione as configuracoes disponiveis",
      btn_marcar_todos: "Marcar todos",
      btn_limpar: "Limpar",
      h2_cfg_disponiveis: "Configuracoes disponiveis (passo ajustavel)",
      th_cfg_disp: "Configuracao disponivel",
      th_cfg: "Configuracao",
    },
    en: {
      title_home: "Home - Travicar Calculators",
      title_bicos: "Calibration - Hydraulic Nozzles",
      title_atomizadores: "Calibration - Rotary Atomizers",
      title_configuracoes: "Rate Settings - Nozzles",
      header_home: "TRAVICAR CALCULATORS",
      header_bicos: "AGRICULTURAL AIRCRAFT CALIBRATION",
      header_atomizadores: "ATOMIZER CALIBRATION",
      header_configuracoes: "RATE SETTINGS - NOZZLES",
      nav_home: "HOME",
      nav_bicos: "NOZZLES",
      nav_atomizadores: "ATOMIZERS",
      nav_configuracoes: "SETTINGS",
      home_intro: "Choose which calculator you want to use",
      home_card_bicos_title: "General calibration - nozzles",
      home_card_bicos_desc: "Recommendations and calibration for hydraulic nozzles.",
      home_card_atomizadores_title: "General calibration - atomizers",
      home_card_atomizadores_desc: "Recommendations and calibration for rotary atomizers.",
      home_card_configuracoes_title: "What your nozzle can do",
      home_card_configuracoes_desc: "Rate ranges and possible adjustments for the selected equipment.",
      label_select_aircraft: "Select your aircraft",
      option_manual: "Manual",
      option_selecione: "Select",
      label_faixa: "Swath (m)",
      label_taxa: "Rate (L/ha)",
      label_taxa_alvo: "Target rate (L/ha)",
      label_n_bicos: "Nozzle count",
      label_max_rec_modelo: "Recommendations per nozzle",
      label_n_atomizadores: "Atomizer count",
      label_display: "Display",
      option_min_med_max: "Min/avg/max",
      label_vel_min: "Minimum speed (km/h)",
      label_vel_med: "Average speed (km/h)",
      label_vel_max: "Maximum speed (km/h)",
      filter_conico_core: "Cone spray: Core/Disc",
      filter_conico_eletro: "Cone spray: Electrostatic",
      filter_plano: "Flat spray",
      filter_solido: "Solid spray",
      summary_range_title: "Calibration summary across speed range",
      h2_summary: "Calibration summary",
      th_vel_min: "Minimum Speed",
      th_vel_med: "Average Speed",
      th_vel_max: "Maximum Speed",
      th_vel_min_lower: "minimum speed",
      th_vel_med_lower: "average speed",
      th_vel_max_lower: "maximum speed",
      row_velocidade: "Speed (km/h)",
      row_area: "Covered Area (ha/min)",
      row_vazao_total: "Total Flow (L/min)",
      row_vazao_total_alvo: "Target Total Flow (L/min)",
      row_vazao_por_bico: "Flow per Nozzle (L/min)",
      row_vazao_bico_alvo: "Target Flow per Nozzle (L/min)",
      row_vazao_por_atomizador: "Flow per Atomizer (L/min)",
      row_pressao: "Pressure (psi)",
      h2_recommendations: "Recommendations",
      h2_recommendations_atomizadores: "Atomizer recommendations",
      btn_export_pdf: "Export PDF",
      th_modelo: "Model",
      th_familia: "Family",
      th_faixa_vazao: "Flow range (L/min)",
      th_cor: "Color",
      th_config_sugerida: "Suggested setup",
      label_bico_utilizado: "Nozzle in use",
      label_passo_ajuste: "Adjustment step (%)",
      label_pressao_min_cfg: "Minimum pressure (psi)",
      label_pressao_max_cfg: "Maximum pressure (psi)",
      label_passos_baixo: "Steps below",
      label_passos_cima: "Steps above",
      label_cfg_disponiveis: "Select available configurations",
      btn_marcar_todos: "Select all",
      btn_limpar: "Clear",
      h2_cfg_disponiveis: "Available settings (adjustable step)",
      th_cfg_disp: "Available setting",
      th_cfg: "Configuration",
    },
    es: {
      title_home: "Inicio - Calculadoras Travicar",
      title_bicos: "Calibracion - Boquillas Hidraulicas",
      title_atomizadores: "Calibracion - Atomizadores Rotativos",
      title_configuracoes: "Configuraciones de Tasa - Boquillas",
      header_home: "CALCULADORAS TRAVICAR",
      header_bicos: "CALIBRACION DE AERONAVES AGRICOLAS",
      header_atomizadores: "CALIBRACION DE ATOMIZADORES",
      header_configuracoes: "CONFIGURACIONES DE TASA - BOQUILLAS",
      nav_home: "INICIO",
      nav_bicos: "BOQUILLAS",
      nav_atomizadores: "ATOMIZADORES",
      nav_configuracoes: "CONFIGURACIONES",
      home_intro: "Elija que calculadora desea usar",
      home_card_bicos_title: "Calibracion general - boquillas",
      home_card_bicos_desc: "Recomendaciones y calibracion para boquillas hidraulicas.",
      home_card_atomizadores_title: "Calibracion general - atomizadores",
      home_card_atomizadores_desc: "Recomendaciones y calibracion para atomizadores rotativos.",
      home_card_configuracoes_title: "Lo que su boquilla puede hacer",
      home_card_configuracoes_desc: "Rangos de tasa y ajustes posibles para el equipo seleccionado.",
      label_select_aircraft: "Seleccione su aeronave",
      option_manual: "Manual",
      option_selecione: "Seleccionar",
      label_faixa: "Faja (m)",
      label_taxa: "Tasa (L/ha)",
      label_taxa_alvo: "Tasa objetivo (L/ha)",
      label_n_bicos: "N de boquillas",
      label_max_rec_modelo: "Recomendaciones por boquilla",
      label_n_atomizadores: "N de atomizadores",
      label_display: "Visualizacion",
      option_min_med_max: "Min/med/max",
      label_vel_min: "Velocidad minima (km/h)",
      label_vel_med: "Velocidad media (km/h)",
      label_vel_max: "Velocidad maxima (km/h)",
      filter_conico_core: "Chorro conico: Core/Disco",
      filter_conico_eletro: "Chorro conico: Electrostatico",
      filter_plano: "Chorro plano",
      filter_solido: "Chorro solido",
      summary_range_title: "Resumen de calibracion para el rango de velocidad",
      h2_summary: "Resumen de calibracion",
      th_vel_min: "Velocidad Minima",
      th_vel_med: "Velocidad Media",
      th_vel_max: "Velocidad Maxima",
      th_vel_min_lower: "velocidad minima",
      th_vel_med_lower: "velocidad media",
      th_vel_max_lower: "velocidad maxima",
      row_velocidade: "Velocidad (km/h)",
      row_area: "Area Cubierta (ha/min)",
      row_vazao_total: "Caudal Total (L/min)",
      row_vazao_total_alvo: "Caudal Total Objetivo (L/min)",
      row_vazao_por_bico: "Caudal por Boquilla (L/min)",
      row_vazao_bico_alvo: "Caudal Objetivo por Boquilla (L/min)",
      row_vazao_por_atomizador: "Caudal por Atomizador (L/min)",
      row_pressao: "Presion (psi)",
      h2_recommendations: "Recomendaciones",
      h2_recommendations_atomizadores: "Recomendaciones de atomizadores",
      btn_export_pdf: "Exportar PDF",
      th_modelo: "Modelo",
      th_familia: "Familia",
      th_faixa_vazao: "Rango de caudal (L/min)",
      th_cor: "Color",
      th_config_sugerida: "Configuracion sugerida",
      label_bico_utilizado: "Boquilla utilizada",
      label_passo_ajuste: "Paso de ajuste (%)",
      label_pressao_min_cfg: "Presion minima (psi)",
      label_pressao_max_cfg: "Presion maxima (psi)",
      label_passos_baixo: "Pasos hacia abajo",
      label_passos_cima: "Pasos hacia arriba",
      label_cfg_disponiveis: "Seleccione las configuraciones disponibles",
      btn_marcar_todos: "Marcar todo",
      btn_limpar: "Limpiar",
      h2_cfg_disponiveis: "Configuraciones disponibles (paso ajustable)",
      th_cfg_disp: "Configuracion disponible",
      th_cfg: "Configuracion",
    },
  };

  function safeGetStoredLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_error) {
      return "";
    }
  }

  function safeSetStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_error) {
      // ignore
    }
  }

  function normalizeLang(value) {
    const lang = String(value || "").toLowerCase().trim();
    return SUPPORTED.includes(lang) ? lang : "pt";
  }

  function getText(lang, key) {
    const table = I18N[lang] || I18N.pt;
    return table[key] || I18N.pt[key] || key;
  }

  function applyLang(lang) {
    const normalized = normalizeLang(lang);
    document.documentElement.lang = normalized === "pt" ? "pt-BR" : normalized;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      node.textContent = getText(normalized, key);
    });

    document.querySelectorAll(".lang-switch").forEach((sel) => {
      if (sel.value !== normalized) sel.value = normalized;
    });
  }

  function init() {
    const initial = normalizeLang(safeGetStoredLang() || "pt");
    applyLang(initial);

    document.querySelectorAll(".lang-switch").forEach((sel) => {
      sel.value = initial;
      sel.addEventListener("change", () => {
        const next = normalizeLang(sel.value);
        safeSetStoredLang(next);
        applyLang(next);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
