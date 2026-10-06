import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { getStorage } from 'firebase-admin/storage';
import { requireRole, requireString } from '../helpers.js';
import { classifyWasteImage } from '../ai/index.js';

// Stored in Google Secret Manager: `firebase functions:secrets:set AI_API_KEY`
// (for emulators: functions/.secret.local). Never sent to the browser.
const aiApiKey = defineSecret('AI_API_KEY');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * classifyWaste({ imagePath }) -> { itemName, category, confidence, ... }
 * The image is first uploaded by the user to Cloud Storage; this function
 * reads it server-side and sends it to the configured vision AI provider.
 */
export const classifyWaste = onCall({ secrets: [aiApiKey], timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  const profile = await requireRole(request, ['user', 'collector', 'admin']);
  const imagePath = requireString(request.data?.imagePath, 'imagePath', 300);
  if (!imagePath.startsWith(`waste-images/${profile.id}/`)) {
    throw new HttpsError('permission-denied', 'You can only analyse your own images.');
  }

  const file = getStorage().bucket().file(imagePath);
  let buffer;
  let mimeType;
  try {
    const [metadata] = await file.getMetadata();
    mimeType = metadata.contentType;
    if (!ALLOWED_TYPES.includes(mimeType) || Number(metadata.size) > MAX_BYTES) {
      throw new HttpsError('invalid-argument', 'Unsupported image. Use JPG, PNG or WebP under 5 MB.');
    }
    [buffer] = await file.download();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Could not read uploaded image', error);
    throw new HttpsError('not-found', 'Uploaded image could not be read. Please upload it again.');
  }

  let apiKey = '';
  try {
    apiKey = aiApiKey.value();
  } catch {
    apiKey = '';
  }

  try {
    const result = await classifyWasteImage({ apiKey, buffer, mimeType });
    logger.info('Waste classified', { uid: profile.id, category: result.category, confidence: result.confidence });
    return result;
  } catch (error) {
    logger.error('AI classification failed', error);
    throw new HttpsError('unavailable', 'AI classification is currently unavailable.');
  }
});
