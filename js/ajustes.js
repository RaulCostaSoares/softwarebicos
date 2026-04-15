(function () {
  const CHAVE_DADOS_COMPARTILHADOS = "softwarebicos_shared_form_v1";
  const SISTEMA_UNIDADES_METRICO = "metrico";
  const SISTEMA_UNIDADES_IMPERIAL = "imperial";

  const inputSistema = document.getElementById("ajustes-sistema-unidades");
  const statusNode = document.getElementById("ajustes-status");

  if (!inputSistema) return;

  function normalizarSistema(value) {
    return String(value || "").toLowerCase().trim() === SISTEMA_UNIDADES_IMPERIAL
      ? SISTEMA_UNIDADES_IMPERIAL
      : SISTEMA_UNIDADES_METRICO;
  }

  function lerDados() {
    try {
      const bruto = localStorage.getItem(CHAVE_DADOS_COMPARTILHADOS);
      if (!bruto) return {};
      const parsed = JSON.parse(bruto);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function salvarSistema() {
    try {
      const atual = lerDados();
      const sistema = normalizarSistema(inputSistema.value);
      const payload = {
        ...atual,
        sistemaUnidades: sistema,
      };
      localStorage.setItem(CHAVE_DADOS_COMPARTILHADOS, JSON.stringify(payload));
      if (statusNode) {
        statusNode.textContent =
          sistema === SISTEMA_UNIDADES_IMPERIAL
            ? "Salvo: Imperial."
            : "Salvo: Metrico.";
      }
    } catch (_error) {
      if (statusNode) statusNode.textContent = "Nao foi possivel salvar.";
    }
  }

  function carregarSistema() {
    const dados = lerDados();
    inputSistema.value = normalizarSistema(dados.sistemaUnidades);
    if (statusNode) statusNode.textContent = "";
  }

  inputSistema.addEventListener("change", salvarSistema);
  carregarSistema();
})();
