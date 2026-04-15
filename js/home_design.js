(function () {
  const KEY = "softwarebicos_home_design";
  const GROUPS = {
    home: {
      modern: "home.html",
      compact: "home_compacto.html",
    },
    bicos: {
      modern: "bicos_hidraulicos.html",
      compact: "bicos_hidraulicos_compacto.html",
    },
    atomizadores: {
      modern: "atomizadores.html",
      compact: "atomizadores_compacto.html",
    },
    configuracoes: {
      modern: "configuracoes.html",
      compact: "configuracoes_compacto.html",
    },
    ajustes: {
      modern: "ajustes.html",
      compact: "ajustes_compacto.html",
    },
  };

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_error) {
      return "";
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_error) {
      // ignore
    }
  }

  function currentPageName() {
    const path = String(window.location.pathname || "");
    const parts = path.split(/[\\/]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1].toLowerCase() : "home.html";
  }

  function findCurrentGroup(pageName) {
    const page = String(pageName || "").toLowerCase().trim();
    const entries = Object.entries(GROUPS);
    for (const [groupName, map] of entries) {
      const values = Object.values(map).map((v) => String(v || "").toLowerCase());
      if (values.includes(page)) return { groupName, map };
    }
    return null;
  }

  function goToDesign(design, map, pageName) {
    if (!map) return;
    const key = design === "compact" ? "compact" : "modern";
    const target = map[key];
    if (!target) return;
    safeSet(KEY, key);
    if (String(pageName || currentPageName()).toLowerCase() === target.toLowerCase()) return;
    window.location.href = target;
  }

  function init() {
    const pageName = currentPageName();
    const groupData = findCurrentGroup(pageName);
    if (!groupData) return;
    const map = groupData.map;

    const bodyDesign = String((document.body && document.body.dataset && document.body.dataset.design) || "")
      .toLowerCase()
      .trim();
    const currentDesign = bodyDesign === "compact" ? "compact" : "modern";
    const saved = String(safeGet(KEY) || "").toLowerCase().trim();

    if ((saved === "modern" || saved === "compact") && saved !== currentDesign) {
      const expected = map[saved];
      if (expected && pageName !== expected.toLowerCase()) {
        window.location.replace(expected);
        return;
      }
    }

    safeSet(KEY, currentDesign);

    const switches = Array.from(document.querySelectorAll(".design-switch"));
    switches.forEach((sel) => {
      if (!(sel instanceof HTMLSelectElement)) return;
      sel.value = currentDesign;
      sel.addEventListener("change", () => {
        goToDesign(sel.value, map, pageName);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
