// Medidas del carnet (mica 95 x 60 mm, horizontal) y de la hoja A4. Todo en milímetros.
export const A4 = { w: 210, h: 297 } as const;
export const MICA = { w: 95, h: 60 } as const;
export const COLUMNAS = 2;
export const FILAS = 4;
export const POR_HOJA = COLUMNAS * FILAS;
export const MAX_CARNETS = 200;

export type Carnet = { codigo: string; nombre: string; anio: number };

// Un carnet sin código no se imprime: el QR llevaría "BUnull" o nada (Review Focus 1).
export function validarCarnet(c: Carnet): Carnet {
  const codigo = (c.codigo ?? "").trim().toUpperCase();
  const nombre = (c.nombre ?? "").trim().toUpperCase();
  if (!codigo) throw new Error("codigo vacío");
  if (!nombre) throw new Error("nombre vacío");
  if (!Number.isInteger(c.anio) || c.anio < 2000 || c.anio > 2100) throw new Error("año inválido");
  return { codigo, nombre, anio: c.anio };
}

export const paginas = (n: number) => Math.max(1, Math.ceil(n / POR_HOJA));

// Esquina superior izquierda del carnet i (0, 1, 2...) en su hoja. Los 8 carnets quedan centrados con
// margen igual a cada lado: (210 - 2 x 95) / 2 = 10 mm y (297 - 4 x 60) / 2 = 28,5 mm.
export function posicion(i: number) {
  const k = i % POR_HOJA;
  const margenX = (A4.w - COLUMNAS * MICA.w) / 2;
  const margenY = (A4.h - FILAS * MICA.h) / 2;
  return {
    pagina: Math.floor(i / POR_HOJA),
    x: margenX + (k % COLUMNAS) * MICA.w,
    y: margenY + Math.floor(k / COLUMNAS) * MICA.h,
  };
}
