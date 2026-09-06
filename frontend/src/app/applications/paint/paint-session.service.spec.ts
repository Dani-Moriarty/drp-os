import { TestBed } from '@angular/core/testing';
import { SesionPaint } from './paint-session.service';

function image(valor: number): ImageData {
  return {
    data: new Uint8ClampedArray([valor, valor, valor, 255]),
    width: 1,
    height: 1,
  } as ImageData;
}

describe('PaintSessionService', () => {
  it('keeps drawing history available for undo and redo', () => {
    const sesion = TestBed.runInInjectionContext(() => new SesionPaint());
    sesion.initialize(image(10));
    sesion.commit(image(20));
    sesion.commit(image(30));

    expect(sesion.canUndo()).toBe(true);
    expect(sesion.undo()?.data[0]).toBe(20);
    expect(sesion.undo()?.data[0]).toBe(10);
    expect(sesion.canUndo()).toBe(false);
    expect(sesion.redo()?.data[0]).toBe(20);
    expect(sesion.canRedo()).toBe(true);
  });

  it('starts a clean document without carrying over the previous history', () => {
    const sesion = TestBed.runInInjectionContext(() => new SesionPaint());
    sesion.initialize(image(10));
    sesion.commit(image(20));
    sesion.replace(image(255), 'new-drawing.bmp', false);

    expect(sesion.documentName()).toBe('new-drawing.bmp');
    expect(sesion.dirty()).toBe(false);
    expect(sesion.canUndo()).toBe(false);
    expect(sesion.canRedo()).toBe(false);
  });
});
