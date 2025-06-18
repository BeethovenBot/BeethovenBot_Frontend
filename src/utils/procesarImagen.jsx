import { clasificarVector } from './clasificador';

export async function procesarImagenBase64(base64Data, targetWidth = 18, targetHeight = 18) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
      const vector = [];
      const binCanvas = document.createElement('canvas');
      binCanvas.width = targetWidth;
      binCanvas.height = targetHeight;
      const binCtx = binCanvas.getContext('2d');
      const binImg = binCtx.createImageData(targetWidth, targetHeight);

      for (let i = 0, j = 0; i < imgData.length; i += 4, j++) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const bin = gray > 100 ? 1 : 0;
        vector.push(bin);

        const color = bin ? 255 : 0;
        binImg.data[i] = color;
        binImg.data[i + 1] = color;
        binImg.data[i + 2] = color;
        binImg.data[i + 3] = 255;
      }

      binCtx.putImageData(binImg, 0, 0);
      const binariaDataUrl = binCanvas.toDataURL();

      resolve({
        clase: clasificarVector(vector),
        vectorBinario: vector,
        binariaDataUrl
      });
    };
    img.src = base64Data;
  });
}
