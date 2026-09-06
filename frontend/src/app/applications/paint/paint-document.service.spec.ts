import { codificarBitmap } from './paint-document.service';

describe('Paint bitmap export', () => {
  it('encodes a standards-shaped 24-bit BMP with bottom-up BGR pixels', async () => {
    const pixeles = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255,
    ]);
    const blob = codificarBitmap({ data: pixeles, width: 2, height: 2 } as ImageData);
    const vista = new DataView(await blob.arrayBuffer());

    expect(blob.type).toBe('image/bmp');
    expect(vista.getUint16(0, true)).toBe(0x4d42);
    expect(vista.getUint32(10, true)).toBe(54);
    expect(vista.getInt32(18, true)).toBe(2);
    expect(vista.getInt32(22, true)).toBe(2);
    expect(vista.getUint16(28, true)).toBe(24);
    expect(Array.from(new Uint8Array(vista.buffer, 54, 3))).toEqual([255, 0, 0]);
  });
});
