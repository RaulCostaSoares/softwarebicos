const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 31415;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
