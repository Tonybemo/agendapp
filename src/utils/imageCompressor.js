/**
 * Utilidad para comprimir imágenes en el cliente antes de subirlas a Supabase.
 * Reduce fotos de móviles (5MB - 12MB) a ~100-150KB en formato JPEG con calidad óptima,
 * ahorrando espacio de almacenamiento y permitiendo subidas instantáneas con datos móviles.
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75
  } = options;

  // Si no es imagen o ya es muy pequeña, devolver directamente
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo relación de aspecto
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Fondo blanco para evitar fondos negros en PNG con transparencia convertidos a JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Crear un nuevo File manteniendo nombre descriptivo
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'foto';
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            console.log(
              `[ImageCompressor] Original: ${(file.size / 1024).toFixed(1)} KB -> Comprimida: ${(compressedFile.size / 1024).toFixed(1)} KB (${width}x${height}px)`
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
