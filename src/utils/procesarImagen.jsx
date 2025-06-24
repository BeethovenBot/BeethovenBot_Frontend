import { clasificarVector } from './clasificador';

export async function procesarImagenCanvas(canvas, targetWidth = 18, targetHeight = 18) {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
    const vector = [];

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const bin = gray > 100 ? 1 : 0;
      vector.push(bin);
    }

    resolve({
      clase: clasificarVector(vector),
      vectorBinario: vector
    });
  });
}
