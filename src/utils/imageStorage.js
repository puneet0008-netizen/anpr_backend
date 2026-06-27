const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const parseBase64Image = (input) => {
  if (!input || typeof input !== 'string') {
    throw Object.assign(new Error('Invalid image data'), { statusCode: 400 });
  }

  const trimmed = input.trim();
  const match   = trimmed.match(/^data:(image\/[\w+.-]+);base64,(.+)$/i);

  let mime;
  let base64Data;

  if (match) {
    mime       = match[1].toLowerCase();
    base64Data = match[2];
  } else {
    mime       = 'image/jpeg';
    base64Data = trimmed;
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer.length) {
    throw Object.assign(new Error('Invalid base64 image'), { statusCode: 400 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('Image exceeds 5 MB limit'), { statusCode: 400 });
  }

  return { mime, buffer };
};

/**
 * Save a base64-encoded image to uploads/sessions/<subfolder>/.
 * Returns a public URL path served via /uploads static route.
 */
const saveBase64Image = (base64, subfolder) => {
  const { mime, buffer } = parseBase64Image(base64);
  const ext              = MIME_EXT[mime] || '.jpg';
  const dir              = path.join(process.cwd(), 'uploads', 'sessions', subfolder);

  fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}-${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);

  return `/uploads/sessions/${subfolder}/${filename}`;
};

const getPublicBaseUrl = () =>
  (process.env.BASE_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

/** Turn a stored path (/uploads/...) into a full public URL. */
const toPublicImageUrl = (urlPath) => {
  if (!urlPath) return null;
  if (/^https?:\/\//i.test(urlPath)) return urlPath;
  return `${getPublicBaseUrl()}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`;
};

module.exports = { saveBase64Image, parseBase64Image, toPublicImageUrl, getPublicBaseUrl };
