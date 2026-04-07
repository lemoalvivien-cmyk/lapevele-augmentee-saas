import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { fileSize, mimeType, fileName } = body;

    if (fileSize === undefined || typeof fileSize !== 'number' || fileSize <= 0 || fileSize > 100 * 1024 * 1024) {
      return Response.json({ valid: false, error: 'fileSize invalide ou absent' }, { status: 400 });
    }
    if (!mimeType || !fileName) {
      return Response.json({ valid: false, error: 'mimeType et fileName requis' }, { status: 400 });
    }

    // Validation size
    if (fileSize > MAX_IMAGE_SIZE) {
      return Response.json({
        valid: false,
        error: `Image dépasse 5 MB (${(fileSize / 1024 / 1024).toFixed(1)} MB)`
      }, { status: 400 });
    }

    // Validation type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return Response.json({
        valid: false,
        error: 'Format non supporté (JPEG, PNG, WebP, GIF seulement)'
      }, { status: 400 });
    }

    // Validation nom
    if (!fileName || fileName.length > 255) {
      return Response.json({
        valid: false,
        error: 'Nom de fichier invalide'
      }, { status: 400 });
    }

    return Response.json({ valid: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});