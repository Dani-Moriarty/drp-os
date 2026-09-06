import { IdFotografia, ImagenVisualizable } from '../models/desktop.models';

function photo(
  id: IdFotografia,
  nombre: string,
  ancho: number,
  alto: number,
): ImagenVisualizable {
  return {
    id,
    name: nombre,
    source: `/assets/photo-album/${encodeURIComponent(nombre)}`,
    mimeType: 'image/png',
    width: ancho,
    height: alto,
  };
}

export const FOTOS_ALBUM: readonly ImagenVisualizable[] = [
  photo('photo-viajando', 'Viajando.png', 941, 1672),
  photo('photo-boda-calle', 'Boda Calle.png', 1086, 1448),
  photo('photo-caballas', 'Caballas.png', 941, 1419),
  photo('photo-campeones-del-mundo', 'Campeones del mundo.png', 1447, 1087),
  photo('photo-dni', 'Foto DNI.png', 1024, 1536),
  photo('photo-valentina', 'Valentina.png', 1024, 1536),
  photo('photo-fuengirola', 'Fuengirola.png', 1672, 941),
];

export const IDS_FOTOGRAFIAS = FOTOS_ALBUM.map((archivo) => archivo.id);
export const MAPA_FOTOGRAFIAS = new Map(FOTOS_ALBUM.map((archivo) => [archivo.id, archivo]));

export function esIdFotografia(id: string): id is IdFotografia {
  return MAPA_FOTOGRAFIAS.has(id as IdFotografia);
}
