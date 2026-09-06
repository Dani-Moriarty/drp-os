import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DocumentosSesion {
  private readonly documents = signal<Record<string, string>>({});

  read(clave: string, originalValue: string): string {
    return this.documents()[clave] ?? originalValue;
  }

  write(clave: string, valor: string): void {
    this.documents.update((documentos) => ({ ...documentos, [clave]: valor }));
  }

  reset(): void {
    this.documents.set({});
  }
}
