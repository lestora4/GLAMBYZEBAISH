import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFile(file, folder = 'artist-id-proofs', options = {}) {
  try {
    const {
      allowedFormats = ['jpg', 'jpeg', 'png', 'pdf'],
      maxBytes = 5 * 1024 * 1024,
    } = options;

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: 'auto',
      allowed_formats: allowedFormats,
      max_bytes: maxBytes,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload file');
  }
}

export async function deleteFile(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error('Failed to delete file');
  }
}

export function getFileUrl(publicId) {
  return cloudinary.url(publicId, { secure: true });
}