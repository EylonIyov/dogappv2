const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = "dogprofilepictures";
const BUCKET_PATH = "DogPictures";

// Generate unique filename
function generateUniqueFilename(originalName, userId) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop();
  return `${BUCKET_PATH}/${userId}/${timestamp}-${randomString}.${extension}`;
}

// Upload function with pre-signed URL generation
async function uploadToS3(file, userId) {
  try {
    const key = generateUniqueFilename(file.originalname, userId);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });
    
    const result = await s3Client.send(command);
    
    // Generate a pre-signed URL for reading the image (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    const photoUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 days
    
    return {
      success: true,
      photoUrl,
      key
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Validate file type and size
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.'
    };
  }

  return { valid: true };
}

module.exports = { uploadToS3, validateImageFile };