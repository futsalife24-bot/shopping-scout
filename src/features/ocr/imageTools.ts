export interface ImageQuality {
  width: number;
  height: number;
  contrast: number;
  usable: boolean;
  message?: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした。別の画像を選んでください。'));
    image.src = source;
  });
}

export function inspectImageQuality(image: HTMLImageElement): ImageQuality {
  const sampleWidth = Math.min(image.naturalWidth, 160);
  const sampleHeight = Math.min(image.naturalHeight, 160);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(sampleWidth, 1);
  canvas.height = Math.max(sampleHeight, 1);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { width: image.naturalWidth, height: image.naturalHeight, contrast: 0, usable: false };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  const values: number[] = [];
  for (let index = 0; index < pixels.length; index += 16) {
    const value = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    values.push(value);
    sum += value;
  }
  const mean = sum / Math.max(values.length, 1);
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(values.length, 1);
  const contrast = Math.sqrt(variance);
  if (image.naturalWidth < 480 || image.naturalHeight < 240) {
    return { width: image.naturalWidth, height: image.naturalHeight, contrast, usable: false, message: '画像が小さめです。値札に近づいて撮ると読み取りやすくなります。' };
  }
  if (contrast < 18) {
    return { width: image.naturalWidth, height: image.naturalHeight, contrast, usable: false, message: '文字と背景の差が小さめです。明るさやピントを確認してください。' };
  }
  return { width: image.naturalWidth, height: image.naturalHeight, contrast, usable: true };
}

export async function cropAndRotate(source: string, crop: CropRect, rotation: number): Promise<string> {
  const image = await loadImage(source);
  const scaleX = image.naturalWidth / Math.max(image.width, 1);
  const scaleY = image.naturalHeight / Math.max(image.height, 1);
  const sourceX = Math.max(0, crop.x * scaleX);
  const sourceY = Math.max(0, crop.y * scaleY);
  const sourceCrop = {
    x: sourceX,
    y: sourceY,
    width: Math.min(image.naturalWidth - sourceX, crop.width * scaleX),
    height: Math.min(image.naturalHeight - sourceY, crop.height * scaleY)
  };
  const rotationQuarter = ((rotation % 360) + 360) % 360;
  const canvas = document.createElement('canvas');
  const sideways = rotationQuarter === 90 || rotationQuarter === 270;
  canvas.width = Math.round(sideways ? sourceCrop.height : sourceCrop.width);
  canvas.height = Math.round(sideways ? sourceCrop.width : sourceCrop.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像の切り抜きを開始できませんでした。');
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotationQuarter * Math.PI) / 180);
  context.drawImage(
    image,
    sourceCrop.x,
    sourceCrop.y,
    sourceCrop.width,
    sourceCrop.height,
    -sourceCrop.width / 2,
    -sourceCrop.height / 2,
    sourceCrop.width,
    sourceCrop.height
  );
  context.restore();
  return canvas.toDataURL('image/jpeg', 0.9);
}

/** Downsize only very large photos and make a modest grayscale contrast adjustment. */
export async function preprocessForOcr(source: string): Promise<{ image: string; elapsedMs: number }> {
  const startedAt = performance.now();
  const image = await loadImage(source);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestSide > 2048 ? 2048 / longestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('OCR用の画像を準備できませんでした。');
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const gray = 0.299 * imageData.data[index] + 0.587 * imageData.data[index + 1] + 0.114 * imageData.data[index + 2];
    const adjusted = Math.max(0, Math.min(255, (gray - 128) * 1.15 + 128));
    imageData.data[index] = adjusted;
    imageData.data[index + 1] = adjusted;
    imageData.data[index + 2] = adjusted;
  }
  context.putImageData(imageData, 0, 0);
  return { image: canvas.toDataURL('image/jpeg', 0.9), elapsedMs: Math.round(performance.now() - startedAt) };
}
