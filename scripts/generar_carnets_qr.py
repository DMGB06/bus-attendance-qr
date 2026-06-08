"""
Genera carnets escolares profesionales con código QR para BusControl.

Uso:
  python generar_carnets_qr.py
  python generar_carnets_qr.py --csv data/alumnos_activos.csv
  python generar_carnets_qr.py --codigo BU0098 --limit 3

Salida:
  scripts/output/carnets_qr/png/*.png
  scripts/output/carnets_qr/Carnets_BusControl.pdf
  scripts/output/carnets_qr/manifest.csv
"""
from __future__ import annotations

import argparse
import csv
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_M
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from matching_utils import clean_field, find_best_match, load_current, load_official

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
LOGO_PATH = PROJECT_ROOT / "mobile" / "assets" / "images" / "escudo_MDCA.png"
DEFAULT_CSV = ROOT / "data" / "alumnos_activos.csv"
MIGRATION_SQL = ROOT / "output" / "migracion_lista_oficial.sql"
OUTPUT_DIR = ROOT / "output" / "carnets_qr"
PNG_DIR = OUTPUT_DIR / "png"

# CR-80 (tarjeta estándar) @ 300 DPI
CARD_W_PX = 1012
CARD_H_PX = 638
DPI = 300

# Colores institucionales
COLOR_NAVY = (11, 61, 110)
COLOR_NAVY_DARK = (7, 42, 78)
COLOR_GOLD = (201, 162, 55)
COLOR_WHITE = (255, 255, 255)
COLOR_OFF_WHITE = (248, 250, 252)
COLOR_TEXT = (26, 32, 44)
COLOR_MUTED = (92, 107, 122)
COLOR_LINE = (226, 232, 240)


@dataclass
class CarnetStudent:
    codigo: str
    nombre: str
    apoderado: str
    telefono: str
    colegio: str

    @property
    def qr_payload(self) -> str:
        return self.codigo.strip().upper()


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(
            [
                Path(r"C:\Windows\Fonts\arialbd.ttf"),
                Path(r"C:\Windows\Fonts\segoeuib.ttf"),
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            ]
        )
    else:
        candidates.extend(
            [
                Path(r"C:\Windows\Fonts\arial.ttf"),
                Path(r"C:\Windows\Fonts\segoeui.ttf"),
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            ]
        )

    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)

    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines[:2]


def _split_sql_values(raw: str) -> list[str | None]:
    values: list[str | None] = []
    i = 0
    length = len(raw)

    while i < length:
        while i < length and raw[i] in " \t":
            i += 1
        if i >= length:
            break
        if i + 4 <= length and raw[i : i + 4].upper() == "NULL":
            values.append(None)
            i += 4
            while i < length and raw[i] in " \t":
                i += 1
            if i < length and raw[i] == ",":
                i += 1
            continue
        if raw[i] == "'":
            i += 1
            chars: list[str] = []
            while i < length:
                if raw[i] == "'":
                    if i + 1 < length and raw[i + 1] == "'":
                        chars.append("'")
                        i += 2
                        continue
                    i += 1
                    break
                chars.append(raw[i])
                i += 1
            values.append("".join(chars))
            while i < length and raw[i] in " \t":
                i += 1
            if i < length and raw[i] == ",":
                i += 1
            continue
        if raw[i : i + 4].lower() == "true":
            values.append("true")
            i += 4
            while i < length and raw[i] in " \t":
                i += 1
            if i < length and raw[i] == ",":
                i += 1
            continue
        start = i
        while i < length and raw[i] not in ",":
            i += 1
        values.append(raw[start:i].strip())
        if i < length and raw[i] == ",":
            i += 1

    return values


def load_students_from_migration_sql(path: Path) -> list[CarnetStudent]:
    text = path.read_text(encoding="utf-8")

    guardians: dict[str, dict[str, str]] = {}
    for line in text.splitlines():
        if not line.startswith("INSERT INTO bus_guardians"):
            continue
        raw = line.split("VALUES (", 1)[1].rsplit(");", 1)[0]
        parts = _split_sql_values(raw)
        if len(parts) < 4:
            continue
        guardians[str(parts[0])] = {
            "name": str(parts[1] or ""),
            "phone": str(parts[2] or ""),
        }

    student_guardian: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("INSERT INTO bus_student_guardians"):
            continue
        raw = line.split("VALUES (", 1)[1].rsplit(");", 1)[0]
        parts = _split_sql_values(raw)
        if len(parts) < 2:
            continue
        student_guardian[str(parts[0])] = str(parts[1])

    rows: list[CarnetStudent] = []
    for line in text.splitlines():
        if not line.startswith("INSERT INTO social_bus_escolar"):
            continue
        raw = line.split("VALUES (", 1)[1].rsplit(");", 1)[0]
        parts = _split_sql_values(raw)
        if len(parts) < 10:
            continue

        student_id = str(parts[0])
        nombre = str(parts[1] or "")
        colegio = str(parts[5] or "—") if parts[5] else "—"
        codigo = str(parts[7] or "").upper()
        if not codigo:
            continue

        guardian = guardians.get(student_guardian.get(student_id, ""), {"name": "", "phone": ""})
        rows.append(
            CarnetStudent(
                codigo=codigo,
                nombre=nombre,
                apoderado=guardian["name"],
                telefono=guardian["phone"],
                colegio=colegio,
            )
        )

    rows.sort(key=lambda s: s.nombre.upper())
    return rows


def build_students_from_sources() -> list[CarnetStudent]:
    if MIGRATION_SQL.exists():
        return load_students_from_migration_sql(MIGRATION_SQL)

    official = load_official()
    current = load_current()
    used_ids: set[str] = set()
    rows: list[CarnetStudent] = []

    for item in official:
        match, _score = find_best_match(item["alumno"], current, used_ids)
        if match:
            used_ids.add(match["id"])

        codigo = clean_field(match.get("codigo") if match else "")
        if not codigo:
            codigo = f"BU{item['fila']:04d}"

        rows.append(
            CarnetStudent(
                codigo=codigo.upper(),
                nombre=item["alumno"].strip(),
                apoderado=item["apoderado"].strip(),
                telefono=item["telefono"].strip(),
                colegio=clean_field(match.get("colegio") if match else "") or "—",
            )
        )

    return rows


def load_students_from_csv(path: Path) -> list[CarnetStudent]:
    rows: list[CarnetStudent] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = {f.lower(): f for f in (reader.fieldnames or [])}

        def col(*names: str) -> str | None:
            for name in names:
                key = fieldnames.get(name.lower())
                if key:
                    return key
            return None

        codigo_key = col("codigo", "code")
        nombre_key = col("nombre_alumno", "nombre", "nombre_hijo")
        apoderado_key = col("apoderado", "nombre_apoderado", "full_name")
        telefono_key = col("telefono_apoderado", "telefono", "phone")
        colegio_key = col("colegio", "school")

        if not codigo_key or not nombre_key:
            raise ValueError("El CSV debe incluir al menos columnas codigo y nombre_alumno.")

        for raw in reader:
            codigo = clean_field(raw.get(codigo_key, ""))
            nombre = (raw.get(nombre_key) or "").strip()
            if not codigo or not nombre:
                continue

            rows.append(
                CarnetStudent(
                    codigo=codigo.upper(),
                    nombre=nombre,
                    apoderado=(raw.get(apoderado_key or "") or "").strip(),
                    telefono=(raw.get(telefono_key or "") or "").strip(),
                    colegio=(raw.get(colegio_key or "") or "").strip() or "—",
                )
            )

    return rows


def load_students(csv_path: Path | None) -> list[CarnetStudent]:
    if csv_path and csv_path.exists():
        return load_students_from_csv(csv_path)
    if MIGRATION_SQL.exists():
        return load_students_from_migration_sql(MIGRATION_SQL)
    if DEFAULT_CSV.exists():
        return load_students_from_csv(DEFAULT_CSV)
    return build_students_from_sources()


def make_qr_image(payload: str, size_px: int) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    return img.resize((size_px, size_px), Image.Resampling.NEAREST)


def draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int] | None = None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def render_carnet(student: CarnetStudent, logo: Image.Image | None) -> Image.Image:
    card = Image.new("RGB", (CARD_W_PX, CARD_H_PX), COLOR_WHITE)
    draw = ImageDraw.Draw(card)

    # Marco exterior
    draw_rounded_rect(draw, (8, 8, CARD_W_PX - 8, CARD_H_PX - 8), 28, COLOR_OFF_WHITE, COLOR_LINE, 2)

    # Cabecera institucional
    draw.rectangle((24, 24, CARD_W_PX - 24, 168), fill=COLOR_NAVY)
    draw.rectangle((24, 160, CARD_W_PX - 24, 168), fill=COLOR_GOLD)

    font_brand = load_font(22, bold=True)
    font_brand_sub = load_font(16, bold=True)
    font_name = load_font(34, bold=True)
    font_code = load_font(28, bold=True)
    font_footer = load_font(16)

    # Logo
    if logo:
        logo_size = 96
        logo_copy = logo.copy().convert("RGBA")
        logo_copy.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
        lx = 42
        ly = 36
        card.paste(logo_copy, (lx, ly), logo_copy)

    brand_x = 150
    draw.text((brand_x, 42), "MUNICIPALIDAD DISTRITAL", fill=COLOR_WHITE, font=font_brand)
    draw.text((brand_x, 68), "DE CERRO AZUL", fill=COLOR_WHITE, font=font_brand)
    draw.text((brand_x, 102), "TRANSPORTE ESCOLAR", fill=COLOR_GOLD, font=font_brand_sub)

    # QR
    qr_size = 250
    qr_img = make_qr_image(student.qr_payload, qr_size)
    qr_x = (CARD_W_PX - qr_size) // 2
    qr_y = 196
    pad = 14
    draw_rounded_rect(
        draw,
        (qr_x - pad, qr_y - pad, qr_x + qr_size + pad, qr_y + qr_size + pad),
        16,
        COLOR_WHITE,
        COLOR_LINE,
        2,
    )
    card.paste(qr_img, (qr_x, qr_y))

    # Nombre alumno
    name_y = qr_y + qr_size + 36
    for idx, line in enumerate(wrap_text(draw, student.nombre.upper(), font_name, CARD_W_PX - 80)):
        line_w = draw.textlength(line, font=font_name)
        draw.text(((CARD_W_PX - line_w) / 2, name_y + idx * 38), line, fill=COLOR_TEXT, font=font_name)

    # Código
    code_text = f"CÓDIGO  {student.qr_payload}"
    code_w = draw.textlength(code_text, font=font_code)
    code_y = name_y + 78
    draw_rounded_rect(
        draw,
        (int((CARD_W_PX - code_w) / 2 - 18), code_y - 8, int((CARD_W_PX + code_w) / 2 + 18), code_y + 40),
        12,
        COLOR_NAVY_DARK,
    )
    draw.text(((CARD_W_PX - code_w) / 2, code_y), code_text, fill=COLOR_WHITE, font=font_code)

    footer = f"Válido para control de asistencia · {datetime.now().year}"
    footer_w = draw.textlength(footer, font=font_footer)
    draw.text(((CARD_W_PX - footer_w) / 2, CARD_H_PX - 52), footer, fill=COLOR_MUTED, font=font_footer)

    return card


def save_png(card: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    card.save(path, format="PNG", dpi=(DPI, DPI))


def build_pdf(images: list[tuple[CarnetStudent, Image.Image]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    page_w, page_h = A4
    card_w = 85.6 * mm
    card_h = 53.98 * mm
    margin_x = 12 * mm
    margin_y = 10 * mm
    gap_x = 6 * mm
    gap_y = 4 * mm
    cols = 2
    rows = 5

    c = canvas.Canvas(str(output_path), pagesize=A4)

    for index, (_student, image) in enumerate(images):
        pos = index % (cols * rows)
        if index > 0 and pos == 0:
            c.showPage()

        col = pos % cols
        row = pos // cols

        x = margin_x + col * (card_w + gap_x)
        y = page_h - margin_y - card_h - row * (card_h + gap_y)

        buffer = BytesIO()
        image.save(buffer, format="PNG", dpi=(DPI, DPI))
        buffer.seek(0)
        c.drawImage(ImageReader(buffer), x, y, width=card_w, height=card_h, preserveAspectRatio=True, mask="auto")

    c.save()


def write_manifest(students: list[CarnetStudent], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["codigo", "nombre", "apoderado", "telefono", "colegio", "qr_payload", "png", "generado_at"],
        )
        writer.writeheader()
        now = datetime.now(timezone.utc).isoformat()
        for student in students:
            writer.writerow(
                {
                    "codigo": student.codigo,
                    "nombre": student.nombre,
                    "apoderado": student.apoderado,
                    "telefono": student.telefono,
                    "colegio": student.colegio,
                    "qr_payload": student.qr_payload,
                    "png": f"png/{student.codigo}.png",
                    "generado_at": now,
                }
            )


def export_template_csv(students: list[CarnetStudent], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["codigo", "nombre_alumno", "apoderado", "telefono_apoderado", "colegio"],
        )
        writer.writeheader()
        for student in students:
            writer.writerow(
                {
                    "codigo": student.codigo,
                    "nombre_alumno": student.nombre,
                    "apoderado": student.apoderado,
                    "telefono_apoderado": student.telefono,
                    "colegio": student.colegio,
                }
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera carnets QR profesionales para BusControl.")
    parser.add_argument("--csv", type=Path, default=None, help="CSV con codigo y nombre_alumno.")
    parser.add_argument("--codigo", type=str, default=None, help="Generar solo un código (prueba).")
    parser.add_argument("--limit", type=int, default=None, help="Limitar cantidad (prueba).")
    parser.add_argument("--export-csv", action="store_true", help="Guarda data/alumnos_activos.csv y sale.")
    parser.add_argument("--no-pdf", action="store_true", help="Solo PNG, sin PDF.")
    return parser.parse_args()


def clear_output_dir() -> None:
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    PNG_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = parse_args()
    students = load_students(args.csv)

    if not students:
        raise SystemExit("No se encontraron alumnos para generar carnets.")

    # Validar códigos únicos
    codes = [s.codigo for s in students]
    dupes = {c for c in codes if codes.count(c) > 1}
    if dupes:
        raise SystemExit(f"Códigos duplicados en la fuente: {', '.join(sorted(dupes))}")

    if args.export_csv:
        export_template_csv(students, DEFAULT_CSV)
        print(f"CSV exportado: {DEFAULT_CSV} ({len(students)} alumnos)")
        return

    if args.codigo:
        code = args.codigo.strip().upper()
        students = [s for s in students if s.codigo == code]
        if not students:
            raise SystemExit(f"No se encontró el código {code}.")

    if args.limit is not None:
        students = students[: args.limit]

    if not args.export_csv:
        clear_output_dir()

    logo = Image.open(LOGO_PATH) if LOGO_PATH.exists() else None
    PNG_DIR.mkdir(parents=True, exist_ok=True)

    rendered: list[tuple[CarnetStudent, Image.Image]] = []
    for student in students:
        card = render_carnet(student, logo)
        png_path = PNG_DIR / f"{student.codigo}.png"
        save_png(card, png_path)
        rendered.append((student, card))
        print(f"OK  {student.codigo}  {student.nombre}")

    pdf_path = OUTPUT_DIR / "Carnets_BusControl.pdf"
    if not args.no_pdf:
        build_pdf(rendered, pdf_path)

    manifest_path = OUTPUT_DIR / "manifest.csv"
    write_manifest([s for s, _ in rendered], manifest_path)

    print()
    print(f"Carnets generados: {len(rendered)}")
    print(f"PNG: {PNG_DIR}")
    if not args.no_pdf:
        print(f"PDF: {pdf_path}")
    print(f"Manifiesto: {manifest_path}")
    print()
    print("Siguiente paso: imprime el PDF, plastifica y prueba 3 QR con la app.")


if __name__ == "__main__":
    main()
