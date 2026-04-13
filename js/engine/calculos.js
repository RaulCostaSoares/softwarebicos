(function () {
  function asNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function formatNumber(value, decimals) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function calcularVazao(volumeLHa, velocidadeKmh, faixaM) {
    return (volumeLHa * velocidadeKmh * faixaM) / 600;
  }

  function calcularDemanda(input) {
    const velocidadeKmh = asNumber(input.velocidadeKmh);
    const faixaM = asNumber(input.faixaM);
    const volumeLHa = asNumber(input.volumeLHa);
    const numeroPulverizadores = asNumber(input.numeroPulverizadores);

    const validacao = [
      ["Velocidade", velocidadeKmh],
      ["Faixa", faixaM],
      ["Volume requerido", volumeLHa],
      ["Numero de pulverizadores", numeroPulverizadores],
    ];

    for (let i = 0; i < validacao.length; i += 1) {
      const [nome, valor] = validacao[i];
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error(`${nome} deve ser maior que zero.`);
      }
    }

    const vazaoTotalLMin = calcularVazao(volumeLHa, velocidadeKmh, faixaM);
    const vazaoPorPulverizadorLMin = vazaoTotalLMin / numeroPulverizadores;
    const espacamentoMedioM = faixaM / numeroPulverizadores;

    return {
      velocidadeKmh,
      faixaM,
      volumeLHa,
      numeroPulverizadores,
      vazaoTotalLMin,
      vazaoPorPulverizadorLMin,
      espacamentoMedioM,
    };
  }

  function calcularDemandaFaixa(input) {
    const velocidadeMinKmh = asNumber(input.velocidadeMinKmh);
    const velocidadeMedKmh = asNumber(input.velocidadeMedKmh);
    const velocidadeMaxKmh = asNumber(input.velocidadeMaxKmh);
    const faixaM = asNumber(input.faixaM);
    const volumeLHa = asNumber(input.volumeLHa);
    const numeroPulverizadores = asNumber(input.numeroPulverizadores);

    const validacao = [
      ["Velocidade minima", velocidadeMinKmh],
      ["Velocidade media", velocidadeMedKmh],
      ["Velocidade maxima", velocidadeMaxKmh],
      ["Faixa", faixaM],
      ["Volume requerido", volumeLHa],
      ["Numero de pulverizadores", numeroPulverizadores],
    ];

    for (let i = 0; i < validacao.length; i += 1) {
      const [nome, valor] = validacao[i];
      if (!Number.isFinite(valor) || valor <= 0) {
        throw new Error(`${nome} deve ser maior que zero.`);
      }
    }

    if (!(velocidadeMinKmh <= velocidadeMedKmh && velocidadeMedKmh <= velocidadeMaxKmh)) {
      throw new Error("As velocidades devem seguir a ordem: minima <= media <= maxima.");
    }

    const espacamentoMedioM = faixaM / numeroPulverizadores;

    const vazaoTotalMinLMin = calcularVazao(volumeLHa, velocidadeMinKmh, faixaM);
    const vazaoTotalMedLMin = calcularVazao(volumeLHa, velocidadeMedKmh, faixaM);
    const vazaoTotalMaxLMin = calcularVazao(volumeLHa, velocidadeMaxKmh, faixaM);

    return {
      velocidadesKmh: {
        min: velocidadeMinKmh,
        med: velocidadeMedKmh,
        max: velocidadeMaxKmh,
      },
      faixaM,
      volumeLHa,
      numeroPulverizadores,
      espacamentoMedioM,
      vazaoTotalLMin: {
        min: vazaoTotalMinLMin,
        med: vazaoTotalMedLMin,
        max: vazaoTotalMaxLMin,
      },
      vazaoPorPulverizadorLMin: {
        min: vazaoTotalMinLMin / numeroPulverizadores,
        med: vazaoTotalMedLMin / numeroPulverizadores,
        max: vazaoTotalMaxLMin / numeroPulverizadores,
      },
    };
  }

  window.SoftwareBicos = window.SoftwareBicos || {};
  window.SoftwareBicos.calculos = {
    calcularDemanda,
    calcularDemandaFaixa,
    formatNumber,
  };
})();
