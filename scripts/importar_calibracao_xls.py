#!/usr/bin/env python3
"""
Extrai dados de calibracao do arquivo .xls da Travicar para um JSON complementar.

Uso:
  python scripts/importar_calibracao_xls.py --input "C:\\caminho\\arquivo.xls" --output js/data/catalogo_xls_extra.json
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import xlrd


TT11_COLOR_MAP = {
    "4004": "vermelho",
    "4006": "cinza-claro",
    "4008": "cinza-escuro",
    "4010": "cinza",
    "4012": "laranja",
    "4015": "verde",
    "4020": "verde-claro",
    "4025": "azul",
    "4030": "bege",
}


def as_num(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace(",", ".")
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def parse_tt11_curves(sheet: xlrd.sheet.Sheet) -> list[dict[str, Any]]:
    curves: list[dict[str, Any]] = []
    row = 0
    while row < sheet.nrows:
        code = as_text(sheet.cell_value(row, 14))
        if re.fullmatch(r"\d{4}", code):
            points: list[dict[str, Any]] = []
            probe = row
            while probe < sheet.nrows:
                if probe != row:
                    maybe_new_code = as_text(sheet.cell_value(probe, 14))
                    if re.fullmatch(r"\d{4}", maybe_new_code):
                        break
                psi = as_num(sheet.cell_value(probe, 15))
                vazao = as_num(sheet.cell_value(probe, 16))
                if psi is None or vazao is None:
                    break
                points.append({"psi": psi, "vazaoLMin": vazao})
                probe += 1

            if points:
                curves.append(
                    {
                        "codigo": code,
                        "cor": TT11_COLOR_MAP.get(code, ""),
                        "pontos": points,
                    }
                )
            row = probe
            continue
        row += 1
    return curves


def parse_spe_snapshot(sheet: xlrd.sheet.Sheet) -> dict[str, Any]:
    psi_cols = []
    for col in range(4, 13):
        psi_val = as_num(sheet.cell_value(16, col))
        if psi_val is not None:
            psi_cols.append((col, psi_val))

    rows = []
    for row in range(sheet.nrows):
        code = as_text(sheet.cell_value(row, 0))
        if not re.fullmatch(r"SPE-\d+", code):
            continue

        psi_estimado = as_num(sheet.cell_value(row, 1))
        bar_estimado = as_num(sheet.cell_value(row, 2))
        status_by_psi: dict[str, str] = {}
        for col, psi in psi_cols:
            status = as_text(sheet.cell_value(row, col))
            if status:
                status_by_psi[str(int(psi) if float(psi).is_integer() else psi)] = status

        if psi_estimado is None:
            bar_estimado = None

        rows.append(
            {
                "codigo": code,
                "psiEstimadoPadrao": psi_estimado,
                "barEstimadoPadrao": bar_estimado,
                "statusPorPsi": status_by_psi,
            }
        )

    return {"tipo": "spe-snapshot", "linhas": rows}


def parse_orificio_snapshot(sheet: xlrd.sheet.Sheet) -> dict[str, Any]:
    rows = []
    for row in range(sheet.nrows):
        label = as_text(sheet.cell_value(row, 0))
        if not re.fullmatch(r"O\s*-\s*\d+", label):
            continue
        psi = as_num(sheet.cell_value(row, 1))
        rows.append({"orificio": label.replace(" ", ""), "psiEstimadoPadrao": psi})
    return {"tipo": "orificio-snapshot", "linhas": rows}


def parse_rotativo_snapshot(sheet: xlrd.sheet.Sheet) -> dict[str, Any]:
    rows = []
    for row in range(sheet.nrows):
        label = as_text(sheet.cell_value(row, 1))
        if not label:
            continue
        if not (
            re.fullmatch(r"VRU\s*\d+", label)
            or re.fullmatch(r"D\s*-\s*\d+", label)
            or re.fullmatch(r"O\s*-\s*\d+", label)
        ):
            continue
        psi = as_num(sheet.cell_value(row, 2))
        rows.append({"opcao": label.replace("  ", " "), "psiEstimadoPadrao": psi})
    return {"tipo": "rotativo-snapshot", "linhas": rows}


def parse_sheet_params(sheet: xlrd.sheet.Sheet) -> dict[str, Any]:
    out: dict[str, Any] = {}
    labels = {
        "VELOCIDADE": "velocidade",
        "FAIXA": "faixa",
        "VAZÃO REQUERIDA": "vazaoRequerida",
        "VAZÃO TOTAL": "vazaoTotal",
        "N° PULVERIZADORES": "numeroPulverizadores",
        "N° ATOMIZADORES": "numeroAtomizadores",
        "VAZÃO POR PULVERIZADOR": "vazaoPorPulverizador",
        "VAZÃO POR ATOMIZADOR": "vazaoPorAtomizador",
        "AREA COBERTA": "areaCoberta",
    }
    for row in range(min(sheet.nrows, 24)):
        for col in (0, 1):
            key = as_text(sheet.cell_value(row, col)).upper()
            if not key:
                continue
            for marker, alias in labels.items():
                if marker in key:
                    value_col = col + 1
                    if value_col >= sheet.ncols:
                        continue
                    raw = sheet.cell_value(row, value_col)
                    out[alias] = as_num(raw) if as_num(raw) is not None else as_text(raw)
    return out


def build_complement(book: xlrd.book.Book, input_path: str) -> list[dict[str, Any]]:
    by_name = {book.sheet_by_index(i).name: book.sheet_by_index(i) for i in range(book.nsheets)}
    generated = datetime.now(timezone.utc).isoformat()

    out: list[dict[str, Any]] = []

    tt11_sheet = by_name.get("TRAVICAR TT11")
    if tt11_sheet:
        curves = parse_tt11_curves(tt11_sheet)
        if curves:
            out.append(
                {
                    "id": "TT11",
                    "pressaoMinPsi": 20,
                    "pressaoMaxPsi": 70,
                    "curvasPontaColorida": curves,
                    "fonteComplemento": {
                        "arquivo": Path(input_path).name,
                        "aba": tt11_sheet.name,
                        "geradoEmUtc": generated,
                    },
                }
            )

    spe_sheet = by_name.get("SPE ELETROSTÁTICO")
    if spe_sheet:
        out.append(
            {
                "id": "90500",
                "calibracaoPlanilha": {
                    "origem": "xls",
                    "parametrosPadrao": parse_sheet_params(spe_sheet),
                    "snapshot": parse_spe_snapshot(spe_sheet),
                },
                "fonteComplemento": {
                    "arquivo": Path(input_path).name,
                    "aba": spe_sheet.name,
                    "geradoEmUtc": generated,
                },
            }
        )

    sheet_to_id = {
        "TRAVICAR 03": "TT90300",
        "TRAVICAR LEQUE ": "90088",
        "ROTATIVO TELA VRU ESFERA": "AR-ESFERA-23",
        "ROTATIVO TELA": "AR-15",
        "ROTATIVO DISCO": "AR-27",
    }

    for sheet_name, item_id in sheet_to_id.items():
        sheet = by_name.get(sheet_name)
        if not sheet:
            continue
        if sheet_name.startswith("ROTATIVO"):
            snapshot = parse_rotativo_snapshot(sheet)
        else:
            snapshot = parse_orificio_snapshot(sheet)

        out.append(
            {
                "id": item_id,
                "calibracaoPlanilha": {
                    "origem": "xls",
                    "parametrosPadrao": parse_sheet_params(sheet),
                    "snapshot": snapshot,
                },
                "fonteComplemento": {
                    "arquivo": Path(input_path).name,
                    "aba": sheet_name,
                    "geradoEmUtc": generated,
                },
            }
        )

    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Arquivo XLS de calibracao")
    parser.add_argument("--output", required=True, help="Arquivo JSON de saida")
    args = parser.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        raise SystemExit(f"Arquivo nao encontrado: {in_path}")

    book = xlrd.open_workbook(str(in_path), formatting_info=False)
    payload = build_complement(book, str(in_path))

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Complemento gerado em: {out_path} ({len(payload)} itens)")


if __name__ == "__main__":
    main()
