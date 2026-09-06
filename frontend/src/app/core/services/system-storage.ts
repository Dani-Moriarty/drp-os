/**
 * Compatibilidad con el nombre anterior del producto. Mantenerla aquí para
 * conservar archivos, posiciones, idioma y autor al actualizar.
 */
export function leerAlmacenamiento(clave: string): string | null {
  const almacenamiento = globalThis.localStorage;
  const actual = almacenamiento?.getItem(clave) ?? null;
  if (actual !== null) return actual;
  const legacyKey = clave.replace(/^drp-os\./u, 'daniel-os.');
  const legacy = almacenamiento?.getItem(legacyKey) ?? null;
  if (legacy !== null) {
    // Si no cabe la copia nueva, devolver el original y conservarlo.
    try { almacenamiento.setItem(clave, legacy); almacenamiento.removeItem(legacyKey); } catch { /* Conservar el original. */ }
  }
  return legacy;
}
