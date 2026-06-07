"""Utilidades compartidas para cruce lista oficial vs BD."""
from __future__ import annotations

import csv
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

OFFICIAL_CSV = Path(r"c:\Users\denil\Downloads\Editado alumnos.csv")
CURRENT_CSV = Path(r"c:\Users\denil\Downloads\social_bus_escolar_rows.csv")

MANUAL_ALIASES: dict[str, str] = {
    "BRIGITTE TOCTO CUEVA": "BRIGITTE TOCTON CUEVA",
    "YOHAN TOCTO CUEVA": "JOHAN TOCTON CUEVA",
    "KATSUMI SALDANA RAVELLO": "KAPSUMI SALDANA RAVELLO",
    "HEYKEL ESPIRITU ORMENO": "EYKEL ESPRITUD",
    "ADRIANO ESPIRITU ORMENO": "ADRIANO ESPIRITUD",
    "KIARA FELIX ARASCUE": "KIARA DALILA FELIX ARASCUE",
    "CRISTOFER MARTINEZ NAUPA": "CRISTHOFER MARTINEZ NAUPA",
    "GLUTILDE NAUPA DOMINGUEZ": "CLOTILDE NAUPA",
    "ZOE FLORES ATOCCSA": "ZOE FLOREZ",
    "MIA LORES ATOCCSA": "MIA FLORES ACTOSSA",
    "NARSHELL DE LA CADENA ATOCCSA": "MARSHERLL DE LA CADENA ATOCSSA",
    "DUSTIN DE LA CADENA ATOCCSA": "DUSTIN DE LA CADENA ATOCSSA",
    "ALONDRA YANAC SEGOBIA": "ALONDRA YANAC SEGOVIA",
    "DEISY DEL CARPIO IGNA": "DEYSI DEL CARPIO INGA",
    "KATTY PARIONA": "KATHY PARIONA",
    "KATTY JIMENEZ SUAREZ": "KATHY JIMENEZ SUAREZ",
    "MARIA MONTENEGRO GOICOCHEA": "KARINA VASQUEZ MONTENEGRO",
    "MARIA PEZO FERNANDO": "FERNANDO TOSCANO PEZO",
    "ESMIRNA PEREZ SANDOVAL": "OLGA LUCIA MERCADO PEVEZ",
    "YOHANA PEVES MARTINEZ": "AZUMI ALVITES PEVEZ",
    "NERIO CARRASCO LEON": "NERIO CARRASCO",
    "CLARIBEL CARRASCO CHERO": "CLARIBEL CARRASC0",
    "MILAN GRANDEZ HUAMAN": "MILAN GRANDE HUAMAN",
    "BRITHNEY ROJAS HUAMAN": "BRITHANY DEL PILAR ROJAS HUAMAN",
    "FABRIZIO SILVA CHAVEZ": "FABRICIO ALEJANDRO GOMEZ CHAVEZ",
    "VANIA ESTRADA CHAVEZ": "VANIA DANIELA ESTRADA CHAVEZ",
    "OLGA MERCADO PEREZ": "OLGA LUCIA MERCADO PEVEZ",
    "FERNANDO TOSCANO": "FERNANDO TOSCANO PEZO",
    "JADIEL ORE LLAMO": "JADIEL ORE LLAMO",
    "VICTOR GAMERO QUISPE": "VICTOR GAMERO QUISPE",
    "LUIS SIMON MANRIQUE": "LUIS GUSTAVO SIMON MANRIQUE",
    "ARACELY MELMA DEL CARPIO": "ARACELY MELMA DEL CARPIO",
    "DYLAN MALLA DEL CARPIO": "DILAN MALLA DEL CARPIO",
    "LUIS ORTIZ FELIX": "LUIS ORTIZ",
    "EIKEL GUEVARA GUTIERREZ": "EIKEL GUEVARA GUTIERREZ",
    "AZUMY CONTRERAS GUTIERREZ": "AZUMI CONTRERAS GUTIERREZ",
    "DIEGO RAMIREZ PARIONA": "DIEGO RAMIREZ PARIONA",
    "CELESTE CARHUAZ SAMANIEGO": "CELESTE CARHUAR SAMANIEGO",
    "ROSSY CARHUAZ SAMANIEGO": "ROSY CARHUAS",
    "CIELO CATALAN CHAVEZ": "CIELO CATALAN",
    "JOAQUIN CULLANCO CORONADO": "JOAQUIN CULLANCO",
    "LUCAS CARO PADILLA": "LUCAS CARO PADILLA",
    "GIMENA CARO PADILLA": "GIMENA CARO PADILLA",
    "PRISCILA CARO PADILLA": "PRISCILA CARO PADILLA",
    "KIT ITZEL HURTADO CCASANI": "KIT ETZEL",
    "ASTRID PEREZ QUISPE": "ASTRID PEREZ QUISPE",
    "ALEX CHUCO CHAMORRO": "ALEX CHUCO CHAMORRO",
    "EMMANUEL SING SALAS": "EMMANUEL SING SALAS",
    "EDINSON CAMPOS SALAS": "EDINSON CAMPOS SALAS",
    "MARIA QUISPE SALAS": "MARIA JOSE QUISPE SALAS",
    "CRISTHIAN CATALAN CASTRO": "CRISTHIAN CATALAN CASTRO",
    "YELITZA NARVAEZ ALLAZO": "YALITZA NARVAEZ",
    "GABRIEL NARVAEZ ALLAZO": "GIANFRANK",
    "CALEB NARVAEZ ALLAZO": "CALED NARVAEZ ALLAZO",
    "ROSA MEDINA AYLAS": "ROSA MEDINA",
    "SNAYDER MEDINA AYLAS": "SNAIDER MEDINA",
    "DERRICK TOMAYLLA VARGAS": "DERRICK TOMAYLOS VARGAS",
    "SOFIA RAMIREZ ALLAZO": "SOFIA LUANA RAMIREZ ALLAZO",
    "JOSE RAMIREZ ALLAZO": "JOSE ANTONIO RAMIREZ ALLAZO",
    "ANNIE QUISPE SEGURA": "ANNIE QUISPE SEGURA",
    "VICTOR QUISPE SEGURA": "VICTOR QUISPE SEGURA",
    "EDUARDO QUISPE CAMPOS": "EDUARDO QUISPE CAMPOS",
    "DOMINIK PARIMIACHI CAMPOS": "DOMINCK PARIAMACHI CAMPOS",
    "NAIM MACHACUAY CARRASCO": "NAIM MACHACUAY",
    "ORIETHA MACHACUAY CARRASCO": "ORITHA MACHACUAY CARRASCO",
    "DYLAN QUERO PINA": "DILAN QUERO PINA",
    "JARED CASIMIRO MESARES": "JARED CASIMIRO MESARES",
    "ANGELA ORMENO RAMOS": "ANGELA ORMENO RAMOS",
    "MARITA PUEDES CHIPA": "MARITA QUEDA CHIPA",
    "MILLER VIDAL BUSTOS": "MILLER VIDAL BUSTOS",
    "FERNANDO VIDAL BUSTOS": "FERNANDO VIDAL BUSTOS",
    "HENRY VIDAL BUSTOS": "HENRY SIXTO VIDAL BUSTOS",
    "BRYAN SORIANO VENANCIO": "JOSE SORIANO VENANCIO",
    "JOSE SORIANO VENANCIO": "JOSE SORIANO VENANCIO",
    "ROSANGELA HUAMAN HINOSTROZA": "ROSANGELA HUAMAN",
    "KENNY HUAMAN HINOSTROZA": "KENNY HUAMAN",
    "LUCAS SAMANIEGO": "LUCAS SAMANIEGO",
    "DANIELA GUTIERREZ": "DANIELA GUTIERREZ SAMANIEGO",
    "FRANK HUAMANI ESPINOZA": "FRANK HUAMANI",
    "ALIS RAMIREZ BERROCAL": "ALIS RAMIREZ BERROCAL",
    "BELEN ALLAZO CARO": "BELEN ALLAZO CARO",
    "JEREMIAS ALLAZO CARO": "JEREMIAS ALLAZO CARO",
    "LUCAS ALLAZO CARO": "LUCAS ALLAZO CARO",
    "JAMES CUCHULA FLORES": "JAMES CUCHULA",
    "SIMON CUCHULA FLORES": "JAMES CUCHULA",
    "GERARD CUEVA CABRERA": "GERARD CUEVA CABRERA",
    "DULCE LEON JIMENEZ": "DULCE LEON JIMENEZ",
    "DAYIRO MACHACUAY VILLAR": "DAYIRO MAURICIO MACHACUAY VILLAR",
    "JHERSON FELIX ARASCUE": "JHERSON FELIX ARASCUE",
    "KARINA VASQUEZ MONTENEGRO": "KARINA VASQUEZ MONTENEGRO",
    "AXEL CHAMORRO VALDES": "AXEL CHAMORRO",
    "STEBAN QUIROZ PEVES": "STEBAN QUIROZ PEVES",
    "SEBASTIAN QUIROZ PEVES": "SEBASTIAN QUIROZ PEVES",
    "LUCAS QUIROZ PEVES": "LUCAS QUIROZ PEVES",
    "MATIAS QUISPE QUIROZ": "MATIAS QUISPE QUIROZ",
    "CARITO QUISPE QUIROZ": "CARITO QUISPE QUIROZ",
    "SUMIKO SALDANA RAVELLO": "SUMIKO SALDANA RAVELLO",
    "YUMIKO SALDANA RAVELLO": "YUMIKO SALDAÑA RAVELLO",
    "ELVIRA ORMENO": "ADRIANO ESPIRITUD",
    "JOSELIN UCHUYPOMA HILARIO": "YULIETH CARDENAS",
    "JULIETH CARDENAS UCHUYPOMA": "YULIETH CARDENAS",
    "YOHANA CARDENAS UCHUYPOMA": "YULIETH CARDENAS",
    "ELIANA ESPINOZA": "FRANK HUAMANI",
    "EMMA QUISPE HIDALGO": "ASTRID PEREZ QUISPE",
    "ENDERS TOMAYLLA VARGAS": "ENDERS TOMAYLLA VARGAS",
    "THIAGO PEVES": "THIAGO PEVES",
    "SOFIA PEVES": "SOFIA PEVES",
    "NASHLEY JULIAN CCOYLLO": "NASHLEY JULIAN CCOYLLO",
    "ZOE PADILLA LA MADRID": "ZOE PADILLA LA MADRID",
    "IVANA HUARA ESCALANTE": "IVANA HUARA ESCALANTE",
    "TANNERT FERREYRA MANCO": "TANNERT FERREYRA MANCO",
    "SOFIA GUTIERREZ MANCO": "SOFIA GUTIERREZ MANCO",
    "DAYANA CACERES MENA": "DAYANA CACERES MENA",
    "JHORDY CACERES MENA": "JHORDY CACERES MENA",
    "ARIANA QUISPE VILLALOBOS": "ARIANA QUISPE VILLALOBOS",
    "LEY GUTIERREZ CUBA": "LEY GUTIERREZ CUBA",
    "LUIS SOTELO PARRA": "LUIS SOTELO PARRA",
    "OSTIN CHUCO CHAMORRO": "OSTIN CHUCO CHAMORRO",
    "JHON ESCOBAR": "JHON ESCOBAR",
    "ALESSANDRO ESCOBAR": "ALESSANDRO ESCOBAR",
}


def normalize_name(value: str) -> str:
    if not value:
        return ""
    text = value.strip().upper()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_phone(value: str) -> str:
    if not value:
        return ""
    digits = re.sub(r"\D", "", value)
    if not digits or set(digits) <= {"0", "O"}:
        return ""
    return digits[-9:] if len(digits) >= 9 else digits


def is_placeholder(value: str | None) -> bool:
    if value is None:
        return True
    text = str(value).strip().upper()
    if not text:
        return True
    if re.fullmatch(r"[0O]+", text):
        return True
    return text in {"PENDIENTE", "N/A", "NA", "NULL", "NONE"}


def clean_field(value: str | None) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return "" if is_placeholder(text) else text


def score_match(official_name: str, db_name: str) -> float:
    on = normalize_name(official_name)
    dn = normalize_name(db_name)
    if not on or not dn:
        return 0.0
    if on == dn:
        return 1.0
    alias = MANUAL_ALIASES.get(on)
    if alias and normalize_name(alias) == dn:
        return 0.99
    ta, tb = set(on.split()), set(dn.split())
    overlap = len(ta & tb) / max(len(ta), len(tb)) if ta and tb else 0.0
    ratio = SequenceMatcher(None, on, dn).ratio()
    return max(ratio, overlap)


def load_official() -> list[dict]:
    rows: list[dict] = []
    with OFFICIAL_CSV.open(encoding="utf-8-sig", newline="") as f:
        for i, row in enumerate(csv.DictReader(f, delimiter=";"), start=1):
            rows.append(
                {
                    "fila": i,
                    "apoderado": row.get("nombre_apoderado", "").strip(),
                    "telefono": row.get("telefono_apoderado", "").strip(),
                    "telefono_norm": normalize_phone(row.get("telefono_apoderado", "")),
                    "alumno": row.get("nombre_hijo", "").strip(),
                }
            )
    return rows


def load_current() -> list[dict]:
    rows: list[dict] = []
    with CURRENT_CSV.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f, delimiter=";"):
            rows.append({k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()})
    return rows


def find_best_match(
    official_name: str, current_rows: list[dict], used_ids: set[str]
) -> tuple[dict | None, float]:
    best_row: dict | None = None
    best_score = 0.0
    for row in current_rows:
        if row["id"] in used_ids:
            continue
        score = score_match(official_name, row["nombre_alumno"])
        if score > best_score:
            best_score = score
            best_row = row
    if best_score < 0.55:
        return None, best_score
    return best_row, best_score
