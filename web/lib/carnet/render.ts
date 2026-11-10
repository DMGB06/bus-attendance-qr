// Dibujo del carnet y armado del PDF. Corre en el NAVEGADOR (usa <canvas> y las fuentes de la página): así el
// texto sale con la misma tipografía del panel y no hace falta un servidor con fuentes. Nada se guarda en el servidor.
// Diseño: el del script scripts/generar_carnets_qr.py (mica 95 x 60 mm horizontal a 300 dpi, cabecera azul, franja dorada).
// qrcode y pdf-lib (186 KB comprimidos) se cargan con import() solo cuando hacen falta: abrir /qr no los descarga.
import { A4, MAX_CARNETS, MICA, paginas, posicion, validarCarnet, type Carnet } from "./layout";

const DPI = 300;
const px = (mm: number) => Math.round((mm / 25.4) * DPI);
export const ANCHO = px(MICA.w); // 1122
export const ALTO = px(MICA.h); // 709
const C = { navy: "#152766", gold: "#FFCC00", sky: "#5DB8E5", off: "#F8FAFC", line: "#E2E8F0", text: "#1A202C", muted: "#5C6B7A", white: "#FFFFFF" };

let escudoCache: Promise<HTMLImageElement> | undefined;
export function cargarEscudo(): Promise<HTMLImageElement> {
  escudoCache ??= new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => {
      escudoCache = undefined;
      mal(new Error("No se pudo cargar el escudo."));
    };
    img.src = "/escudo.png";
  });
  return escudoCache;
}

function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const out: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(prueba).width > ancho) {
      out.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) out.push(actual);
  return out;
}

export async function carnetCanvas(carnet: Carnet, escudo: HTMLImageElement): Promise<HTMLCanvasElement> {
  const c = validarCarnet(carnet);
  await document.fonts.ready;
  const familia = getComputedStyle(document.body).fontFamily || "sans-serif";
  const cv = document.createElement("canvas");
  cv.width = ANCHO;
  cv.height = ALTO;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("El navegador no puede dibujar el carnet.");

  // Fondo y marco
  ctx.fillStyle = C.off;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(4, 4, ANCHO - 8, ALTO - 8, 26);
  ctx.stroke();

  // Cabecera institucional con franja dorada
  const headerH = Math.round(ALTO * 0.25);
  const goldH = 15;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(4, 4, ANCHO - 8, ALTO - 8, 26);
  ctx.clip();
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, 0, ANCHO, headerH);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, headerH - goldH, ANCHO, goldH);
  ctx.restore();

  const escH = Math.round((headerH - goldH) * 0.74);
  const escW = Math.round((escH * escudo.naturalWidth) / escudo.naturalHeight);
  const escY = Math.round((headerH - goldH - escH) / 2);
  ctx.drawImage(escudo, 40, escY, escW, escH);
  const tx = 40 + escW + 28;
  const mid = (headerH - goldH) / 2;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = C.white;
  ctx.font = `800 36px ${familia}`;
  ctx.fillText("MUNICIPALIDAD DE CERRO AZUL", tx, mid - 6);
  ctx.fillStyle = C.sky;
  ctx.font = `700 28px ${familia}`;
  ctx.letterSpacing = "2px";
  ctx.fillText("TRANSPORTE ESCOLAR", tx, mid + 34);
  ctx.letterSpacing = "0px";

  // Pie
  const footerH = 56;
  ctx.fillStyle = C.muted;
  ctx.font = `500 24px ${familia}`;
  ctx.textAlign = "center";
  ctx.fillText(`Válido para control de asistencia · ${c.anio}`, ANCHO / 2, ALTO - 24);

  // QR a la izquierda: lleva el código del padrón, igual que el script
  const top = headerH;
  const bottom = ALTO - footerH;
  const caja = 340;
  const cajaY = Math.round(top + (bottom - top - caja) / 2);
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(40, cajaY, caja, caja, 20);
  ctx.fill();
  ctx.stroke();
  const qr = document.createElement("canvas");
  const { default: QRCode } = await import("qrcode");
  await QRCode.toCanvas(qr, c.codigo, { errorCorrectionLevel: "M", margin: 0, width: caja - 56 });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, 40 + (caja - qr.width) / 2, cajaY + (caja - qr.height) / 2);
  ctx.imageSmoothingEnabled = true;

  // Nombre y código a la derecha
  const x0 = 40 + caja + 50;
  const x1 = ANCHO - 40;
  const cx = (x0 + x1) / 2;
  let tam = 52;
  let ls: string[] = [];
  for (; tam >= 36; tam -= 4) {
    ctx.font = `800 ${tam}px ${familia}`;
    ls = lineas(ctx, c.nombre, x1 - x0);
    if (ls.length <= 3) break;
  }
  const alto = tam * 1.15;
  const chipH = 68;
  const bloque = ls.length * alto + 34 + chipH;
  let y = top + (bottom - top - bloque) / 2 + tam;
  ctx.fillStyle = C.text;
  ctx.textAlign = "center";
  for (const l of ls) {
    ctx.fillText(l, cx, y);
    y += alto;
  }
  const chipTxt = `CÓDIGO ${c.codigo}`;
  ctx.font = `800 34px ${familia}`;
  ctx.letterSpacing = "2px";
  const chipW = Math.min(x1 - x0, Math.round(ctx.measureText(chipTxt).width + 64));
  const chipY = y - alto + 34 + 6;
  ctx.fillStyle = C.navy;
  ctx.beginPath();
  ctx.roundRect(cx - chipW / 2, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.textBaseline = "middle";
  ctx.fillText(chipTxt, cx + 1, chipY + chipH / 2 + 2);
  ctx.letterSpacing = "0px";
  return cv;
}

const aBlob = (cv: HTMLCanvasElement) =>
  new Promise<Blob>((ok, mal) => cv.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo generar la imagen."))), "image/png"));

export async function carnetPng(carnet: Carnet): Promise<Blob> {
  return aBlob(await carnetCanvas(carnet, await cargarEscudo()));
}

// Para la vista previa: imagen lista para un <img>.
export async function carnetUrl(carnet: Carnet): Promise<string> {
  return (await carnetCanvas(carnet, await cargarEscudo())).toDataURL("image/png");
}

const pt = (mm: number) => (mm * 72) / 25.4;

// PDF A4 con 8 carnets por hoja a tamaño real (imprimir al 100 %).
export async function hojaPdf(carnets: Carnet[]): Promise<Uint8Array> {
  const lista = carnets.map(validarCarnet);
  if (lista.length < 1 || lista.length > MAX_CARNETS) throw new Error(`Elige de 1 a ${MAX_CARNETS} alumnos.`);
  const escudo = await cargarEscudo();
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle("Carnets CerroBus");
  const hojas = Array.from({ length: paginas(lista.length) }, () => pdf.addPage([pt(A4.w), pt(A4.h)]));
  for (let i = 0; i < lista.length; i++) {
    const img = await pdf.embedPng(await (await aBlob(await carnetCanvas(lista[i], escudo))).arrayBuffer());
    const p = posicion(i);
    const caja = { x: pt(p.x), y: pt(A4.h - p.y - MICA.h), width: pt(MICA.w), height: pt(MICA.h) };
    hojas[p.pagina].drawImage(img, caja);
    hojas[p.pagina].drawRectangle({ ...caja, borderColor: rgb(0.75, 0.78, 0.82), borderWidth: 0.4 }); // guía de corte
  }
  return pdf.save();
}

export function descargar(contenido: Blob | Uint8Array, nombre: string, tipo: string) {
  const url = URL.createObjectURL(contenido instanceof Blob ? contenido : new Blob([contenido as BlobPart], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
