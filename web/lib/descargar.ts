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
