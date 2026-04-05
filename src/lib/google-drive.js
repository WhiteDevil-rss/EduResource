import { google } from 'googleapis'
import { Readable } from 'stream'

/**
 * Google Drive Service
 * Manages file uploads and secure downloads using a Service Account.
 */

const SCOPES = ['https://www.googleapis.com/auth/drive.file']

/**
 * Initializes the Google Drive client.
 * Uses OAuth2 to bypass quota limits for personal accounts.
 */
async function getDriveClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth2 credentials (GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN) are not configured.')
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3001' // Matches the generator script's redirect URI
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  })

  // Explicitly authenticate to verify credentials and project access
  try {
    const { token } = await oauth2Client.getAccessToken()
    if (!token) {
      throw new Error('Could not retrieve access token. Check your refresh token.')
    }
    console.log(`[Google Drive] OAuth2 authentication successful.`)
  } catch (authError) {
    console.error('FAILED to authorize Google Drive via OAuth2:', authError.message)
    if (authError.message.includes('API has not been used') || authError.message.includes('disabled')) {
      throw new Error(`Google Drive API is disabled. Please enable it in the Google Cloud Console for this project.`)
    }
    throw new Error(`Google Drive Auth failed: ${authError.message}. Ensure your REFRESH_TOKEN is valid.`)
  }

  return google.drive({ version: 'v3', auth: oauth2Client })
}

/**
 * Uploads a file to Google Drive.
 * @param {Buffer} fileBuffer - The file content.
 * @param {string} fileName - Original file name.
 * @param {string} mimeType - File MIME type.
 * @param {string} folderId - Optional Google Drive folder ID.
 */
export async function uploadToDrive(fileBuffer, fileName, mimeType, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
  try {
    const drive = await getDriveClient()
    
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : []
    }

    const media = {
      mimeType: mimeType,
      body: Readable.from(fileBuffer)
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    })

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink
    }
  } catch (error) {
    console.error('Google Drive Upload Error:', error)
    throw new Error(`Failed to upload file to Google Drive: ${error.message}`)
  }
}

/**
 * Streams a file from Google Drive for secure download.
 * @param {string} fileId - The Google Drive file ID.
 */
export async function streamFromDrive(fileId) {
  try {
    const drive = await getDriveClient()
    
    // Get file metadata to get the original name and mime type
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType'
    })

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    )

    return {
      stream: response.data,
      fileName: fileInfo.data.name,
      mimeType: fileInfo.data.mimeType
    }
  } catch (error) {
    console.error('Google Drive Stream Error:', error)
    throw new Error(`Failed to stream file from Google Drive: ${error.message}`)
  }
}

/**
 * Deletes a file from Google Drive.
 * @param {string} fileId - The Google Drive file ID.
 */
export async function deleteFromDrive(fileId) {
  try {
    const drive = await getDriveClient()
    await drive.files.delete({ fileId })
    return true
  } catch (error) {
    console.error('Google Drive Delete Error:', error)
    throw new Error(`Failed to delete file from Google Drive: ${error.message}`)
  }
}
