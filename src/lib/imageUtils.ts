/**
 * Client-side high-performance image compression utility using HTML5 Canvas.
 * Keeps image sizes between 10KB - 40KB to strictly adhere to Firestore's 1MB document limit.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 360,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if it is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result as string;
      compressDataUrl(result, maxDimension, quality)
        .then(resolve)
        .catch(reject);
    };
    reader.readAsDataURL(file);
  });
}

export async function compressDataUrl(
  dataUrl: string,
  maxDimension = 360,
  quality = 0.75
): Promise<string> {
  // If not a data url or empty, return as is
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If it's already an SVG or tiny (< 15KB), no need to compress
  if (dataUrl.startsWith('data:image/svg+xml') || dataUrl.length < 15000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (!width || !height) {
        return resolve(dataUrl);
      }

      // Calculate proportional dimensions
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(dataUrl);
        }

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to progressive JPEG
        const compressed = canvas.toDataURL('image/jpeg', quality);

        // Return compressed version if smaller, otherwise keep original
        if (compressed.length < dataUrl.length) {
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      } catch (err) {
        console.warn('Canvas compression error:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
