import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { compressImage } from '../utils/image';
import { validateImage } from '../utils/validation';

/**
 * Uploads an image to <folder>/<uid>/<unique-name> and returns { url, path }.
 * folder: waste-images | listing-images | pickup-images | complaint-images
 */
export async function uploadImage(folder, uid, file) {
  const prepared = await compressImage(file);
  const error = validateImage(prepared);
  if (error) throw new Error(error);
  const ext = prepared.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${folder}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, prepared, { contentType: prepared.type });
  const url = await getDownloadURL(fileRef);
  return { url, path };
}

export async function deleteImage(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Ignore - the file may already be gone.
  }
}
