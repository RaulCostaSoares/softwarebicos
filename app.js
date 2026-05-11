const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 31415;

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "bicos_hidraulicos.html"));
});

app.get("/ajustes", (req, res) => {
  res.sendFile(path.join(__dirname, "ajustes.html"));
});

app.get("/ajustes_compacto", (req, res) => {
  res.sendFile(path.join(__dirname, "ajustes_compacto.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "softwarebicos",
    now: new Date().toISOString(),
  });
});

function pad2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "00";
  return String(Math.floor(n)).padStart(2, "0");
}

function timestampNomeArquivo(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${y}-${m}-${day}_${h}-${min}`;
}

function htmlBaseRelatorio(reportHtml) {
  const cssPath = path.join(__dirname, "styles_colunas.css");
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Relatorio Operacional</title>
  <style>
${css}
@page {
  size: A4;
  margin: 0;
}
body {
  margin: 0;
  background: #ffffff;
  color: #0f172a;
  font-family: "Inter", Arial, sans-serif;
}
#pdf-operacional-bicos {
  display: block !important;
}
  </style>
</head>
<body>
  ${String(reportHtml || "")}
</body>
</html>`;
}

app.post("/api/relatorio-pdf", async (req, res) => {
  try {
    const reportHtml = String((req.body && req.body.reportHtml) || "").trim();
    if (!reportHtml) {
      return res.status(400).json({ ok: false, error: "reportHtml vazio" });
    }

    let puppeteer = null;
    try {
      puppeteer = require("puppeteer");
    } catch (_err) {
      return res.status(500).json({
        ok: false,
        error: "Puppeteer nao instalado. Rode: npm install puppeteer",
      });
    }

    const html = htmlBaseRelatorio(reportHtml);
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
      });

      const prefixo = String((req.body && req.body.prefixo) || "relatorio_bicos_hidraulicos");
      const nome = `${prefixo}_${timestampNomeArquivo(new Date())}.pdf`;
      const pdfBinario = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
      return res.send(pdfBinario);
    } finally {
      await browser.close();
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error && error.message ? error.message : "Falha ao gerar PDF",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
