import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DescargaArchivos {
  descargarTexto(nombreArchivo: string, contenido: string): void {
    this.descargarBlob(new Blob([contenido], { type: 'text/plain;charset=utf-8' }), nombreArchivo);
  }

  descargarUrlDatos(nombreArchivo: string, urlDatos: string): void {
    this.iniciarDescarga(nombreArchivo, urlDatos);
  }

  descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    this.iniciarDescarga(nombreArchivo, url);
    // Dar al navegador un turno para iniciar la descarga antes de liberar la URL.
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private iniciarDescarga(nombreArchivo: string, url: string): void {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.hidden = true;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
  }
}
