import { IMAGE_MAX_LENGTH } from '../../model/character';

/** Longest side of a stored picture: enough for the sheet's image boxes, small enough to keep in the character. */
const MAX_SIDE = 600;

export class PictureError extends Error {
  constructor() {
    super('The picture could not be read');
    this.name = 'PictureError';
  }
}

/** Shrinks a chosen picture to a jpeg data URL that fits in the character; lowers the quality until it does. */
export async function pictureToDataUrl(file: Blob): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PictureError();
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new PictureError();
  // Jpeg has no transparency; white matches the paper of the sheet.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.5, 0.3]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.startsWith('data:image/jpeg;base64,') && url.length <= IMAGE_MAX_LENGTH) return url;
  }
  throw new PictureError();
}
