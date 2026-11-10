"use client";

import { useEffect, useState } from "react";
import type { Carnet } from "@/lib/carnet/layout";
import { carnetUrl } from "@/lib/carnet/render";

// Dibuja el carnet con el mismo código que se imprime (no es una maqueta).
export function VistaPrevia({ carnet }: { carnet: Carnet }) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const clave = `${carnet.codigo}|${carnet.nombre}|${carnet.anio}`;

  useEffect(() => {
    let vigente = true;
    carnetUrl(carnet).then((u) => vigente && setUrl(u), () => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume los campos de `carnet`
  }, [clave]);

  if (fallo) return <p className="ad-error" role="alert">No se pudo dibujar la vista previa del carnet.</p>;
  /* eslint-disable-next-line @next/next/no-img-element */
  return url ? <img className="ad-carnet" src={url} alt={`Vista previa del carnet de ${carnet.nombre}, código ${carnet.codigo}`} width={456} height={288} /> : <div className="ad-carnet ad-carnet-vacio" role="status">Dibujando el carnet</div>;
}
