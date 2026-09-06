import { IdArchivoAudio } from '../../desktop/models/desktop.models';

export interface PistaAudio {
  id: IdArchivoAudio;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  assetUrl: string;
  sourceUrl: string;
  license: 'CC0 1.0 Universal';
  licenseUrl: string;
}

const BASE = '/audio/holiznacc0';
const FUENTE_ARTISTA = 'https://freemusicarchive.org/music/holiznacc0/';
const LICENCIA = 'https://creativecommons.org/publicdomain/zero/1.0/';

export const PISTAS_AUDIO: readonly PistaAudio[] = [
  track('ffs-hurry-up', 'HoliznaCC0 -FFS HURRY UP!.m4a', 'FFS HURRY UP!', 151),
  track('spring-on-the-horizon', 'HoliznaCC0 -Spring On The Horizon.m4a', 'Spring On The Horizon', 91, 'Background Music', 'https://freemusicarchive.org/music/holiznacc0/background-music/spring-on-the-horizon/'),
  track('unwind', 'HoliznaCC0 -Unwind.m4a', 'Unwind', 251, 'Kick It (laid back HipHop)', 'https://freemusicarchive.org/music/holiznacc0/kick-it-laid-back-hiphop/unwind/'),
  track('one-good-day', 'HoliznaCC0 -One Good Day.m4a', 'One Good Day', 129, 'Public Domain Lofi', 'https://freemusicarchive.org/music/holiznacc0/public-domain-lofi'),
  track('technopol', 'TECHNOPOL  - (HoliznaCC0   Deus Ex Machina).m4a', 'TECHNOPOL', 423, 'Deus Ex Machina'),
  track('something-in-the-air', 'Something In the Air - HoliznaCC0   Hip Hop   LoFi Chill, Laid Back   Royalty-Free Music.m4a', 'Something In the Air', 132, 'Lo-fi And Chill', 'https://freemusicarchive.org/music/holiznacc0/lo-fi-and-chill/something-in-the-air/'),
  track('lost-in-space', 'HoliznaCC0 -Lost In Space.m4a', 'Lost In Space', 192, 'Lost', 'https://freemusicarchive.org/music/holiznacc0/lost/lost-in-space-1/'),
  track('make-funk', 'HoliznaCC0 -Make Funk.m4a', 'Make Funk', 163, 'BASSIC', 'https://freemusicarchive.org/music/holiznacc0/bassic/make-funk/'),
];

export const MAPA_PISTAS = new Map(PISTAS_AUDIO.map((elemento) => [elemento.id, elemento]));
export const IDS_ARCHIVOS_AUDIO = PISTAS_AUDIO.map((elemento) => elemento.id);

export function esIdArchivoAudio(valor: string): valor is IdArchivoAudio {
  return MAPA_PISTAS.has(valor as IdArchivoAudio);
}

function track(
  id: string,
  nombreArchivo: string,
  titulo: string,
  durationSeconds: number,
  album = '',
  sourceUrl = FUENTE_ARTISTA,
): PistaAudio {
  return {
    id: `audio-${id}`,
    fileName: nombreArchivo,
    title: titulo,
    artist: 'HoliznaCC0',
    album,
    durationSeconds,
    assetUrl: `${BASE}/${nombreArchivo}`,
    sourceUrl,
    license: 'CC0 1.0 Universal',
    licenseUrl: LICENCIA,
  };
}
