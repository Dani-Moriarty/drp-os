import { Injectable } from '@angular/core';
import { IdImagenUsuario } from '../../desktop/models/desktop.models';

export interface ResultadoGuardadoPaint {
  id: IdImagenUsuario;
  name: string;
  created: boolean;
}

export interface AdaptadorArchivosPaint {
  open(ruta: string): Promise<Blob | null>;
  save(solicitud: {
    path: string;
    contents: Blob;
    existingId: IdImagenUsuario | null;
    width: number;
    height: number;
  }): Promise<ResultadoGuardadoPaint>;
}

export function codificarBitmap(imagen: ImageData): Blob {
  const rowSize = Math.ceil((imagen.width * 3) / 4) * 4;
  const pixelBytes = rowSize * imagen.height;
  const buffer = new ArrayBuffer(54 + pixelBytes);
  const vista = new DataView(buffer);

  vista.setUint16(0, 0x4d42, true);
  vista.setUint32(2, buffer.byteLength, true);
  vista.setUint32(10, 54, true);
  vista.setUint32(14, 40, true);
  vista.setInt32(18, imagen.width, true);
  vista.setInt32(22, imagen.height, true);
  vista.setUint16(26, 1, true);
  vista.setUint16(28, 24, true);
  vista.setUint32(34, pixelBytes, true);
  vista.setInt32(38, 2835, true);
  vista.setInt32(42, 2835, true);

  for (let sourceY = 0; sourceY < imagen.height; sourceY += 1) {
    const destinationY = imagen.height - sourceY - 1;
    const desplazamientoFila = 54 + destinationY * rowSize;
    for (let x = 0; x < imagen.width; x += 1) {
      const origen = (sourceY * imagen.width + x) * 4;
      const destino = desplazamientoFila + x * 3;
      const alpha = imagen.data[origen + 3] / 255;
      vista.setUint8(destino, Math.round(imagen.data[origen + 2] * alpha + 255 * (1 - alpha)));
      vista.setUint8(destino + 1, Math.round(imagen.data[origen + 1] * alpha + 255 * (1 - alpha)));
      vista.setUint8(destino + 2, Math.round(imagen.data[origen] * alpha + 255 * (1 - alpha)));
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

@Injectable({ providedIn: 'root' })
export class DocumentosPaint {
  private virtualFileAdapter: AdaptadorArchivosPaint | null = null;

  connectVirtualFileAdapter(adaptador: AdaptadorArchivosPaint): void {
    this.virtualFileAdapter = adaptador;
  }

  async openVirtualFile(ruta: string): Promise<ImageBitmap | HTMLImageElement | null> {
    const contenido = await this.virtualFileAdapter?.open(ruta);
    return contenido ? this.decodeImage(contenido) : null;
  }

  async saveVirtualPng(
    ruta: string,
    lienzo: HTMLCanvasElement,
    existingId: IdImagenUsuario | null,
  ): Promise<ResultadoGuardadoPaint | null> {
    if (!this.virtualFileAdapter) {
      return null;
    }
    const contenido = await this.canvasBlob(lienzo, 'image/png');
    return this.virtualFileAdapter.save({
      path: this.pngFileName(ruta),
      contents: contenido,
      existingId,
      width: lienzo.width,
      height: lienzo.height,
    });
  }

  decodeImage(archivo: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof globalThis.createImageBitmap === 'function') {
      return globalThis.createImageBitmap(archivo);
    }

    return new Promise<HTMLImageElement>((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onerror = () => rechazar(new Error('The selected image could not be read.'));
      lector.onload = () => {
        const imagen = new Image();
        imagen.onload = () => resolver(imagen);
        imagen.onerror = () => rechazar(new Error('The selected file is not a supported image.'));
        imagen.src = String(lector.result);
      };
      lector.readAsDataURL(archivo);
    });
  }

  downloadBitmap(imagen: ImageData, nombreSolicitado: string): string {
    const nombreArchivo = this.bitmapFileName(nombreSolicitado);
    this.download(codificarBitmap(imagen), nombreArchivo);
    return nombreArchivo;
  }

  downloadPng(lienzo: HTMLCanvasElement, nombreSolicitado: string): Promise<string> {
    const nombreArchivo = this.pngFileName(nombreSolicitado);
    return this.canvasBlob(lienzo, 'image/png').then((blob) => {
      this.download(blob, nombreArchivo);
      return nombreArchivo;
    });
  }

  bitmapFileName(nombreSolicitado: string): string {
    return this.safeBaseName(nombreSolicitado, 'drawing').replace(/\.(png|jpe?g|webp|gif|bmp)$/iu, '') + '.bmp';
  }

  pngFileName(nombreSolicitado: string): string {
    return this.safeBaseName(nombreSolicitado, 'drawing').replace(/\.(png|jpe?g|webp|gif|bmp)$/iu, '') + '.png';
  }

  private safeBaseName(nombreSolicitado: string, alternativa: string): string {
    const sanitized = nombreSolicitado.trim().replace(/[\\/:*?"<>|]+/gu, '-').slice(0, 80);
    return sanitized || alternativa;
  }

  private canvasBlob(lienzo: HTMLCanvasElement, tipoMime: string): Promise<Blob> {
    return new Promise((resolver, rechazar) => {
      lienzo.toBlob((blob) => {
        if (blob) {
          resolver(blob);
        } else {
          rechazar(new Error('The image could not be exported.'));
        }
      }, tipoMime);
    });
  }

  private download(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.hidden = true;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
