import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
  secure: true
})

export default cloudinary

/**
 * Generates a signed Cloudinary URL with the attachment flag.
 * Forces download and ensures authorized access to restricted assets.
 */
export function signDownloadUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.includes('res.cloudinary.com')) {
    return fileUrl
  }

  try {
    const url = new URL(fileUrl)
    const pathParts = url.pathname.split('/')
    
    // Find where the public_id starts (usually after /upload/ or v[numeric]/)
    const uploadIndex = pathParts.indexOf('upload')
    if (uploadIndex === -1) {
      return fileUrl
    }

    // Extract the resource_type (usually 'image', 'video', or 'raw')
    // In /cloud_name/resource_type/upload/..., it's the part before 'upload'
    const resourceType = pathParts[uploadIndex - 1] || 'image'

    // Skip 'upload' and any transformation segments until we hit the version (v123...) or the first folder
    let startIndex = uploadIndex + 1
    let version = null
    
    // Find the index of the version string (e.g., v1775373480) or skip past known transformation segments
    while (startIndex < pathParts.length) {
      const part = pathParts[startIndex]
      // If it looks like a version (v followed by digits), capture it and move to public ID
      if (/^v\d+$/.test(part)) {
        version = part.substring(1) // Extract the numeric part
        startIndex++
        break
      }
      // If it's a known transformation or contains a comma/underscore, it's NOT a public ID start
      if (part.includes('_') || part.includes(',') || part === 'fl_attachment') {
        startIndex++
        continue
      }
      // Otherwise, we've likely hit the first folder of the public ID
      break
    }

    // The rest is the public_id + extension
    const remainingPath = pathParts.slice(startIndex).join('/')
    const lastDotIndex = remainingPath.lastIndexOf('.')
    
    if (lastDotIndex === -1) {
      return fileUrl
    }

    const publicId = remainingPath.substring(0, lastDotIndex)
    const extension = remainingPath.substring(lastDotIndex + 1)

    // Generate a signed URL using the SDK
    const options = {
      sign_url: true,
      secure: true,
      resource_type: resourceType,
      format: extension
    }

    if (version) {
      options.version = version
    }

    // Only force attachment for images and videos. 
    // Raw resources (like Excel) don't support fl_attachment and are downloaded automatically by browsers.
    if (resourceType !== 'raw') {
      options.flags = 'attachment'
    }

    return cloudinary.url(publicId, options)
  } catch (error) {
    console.error('Error generating signed URL:', error)
    return fileUrl
  }
}

/**
 * Uploads a preview image to Cloudinary.
 * For images, it uploads the file. For PDFs, it tries to generate a thumbnail.
 * @param {Buffer} fileBuffer - The file content.
 * @param {string} fileName - Original file name.
 * @param {string} mimeType - File MIME type.
 */
export async function uploadPreview(fileBuffer, fileName, mimeType) {
  try {
    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf'

    if (!isImage && !isPdf) {
      // For other file types, we might want to use a predefined set of icons/placeholders
      return null
    }

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'previews',
        resource_type: isImage ? 'image' : 'image', // PDFs uploaded as images get converted to first-page thumbnails
        format: isImage ? undefined : 'jpg',
        transformation: [
          { width: 500, height: 500, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
        ]
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error)
          else resolve({
            url: result.secure_url,
            publicId: result.public_id,
            version: result.version
          })
        }
      )

      Readable.from(fileBuffer).pipe(uploadStream)
    })
  } catch (error) {
    console.error('Cloudinary Preview Upload Error:', error)
    return null
  }
}

