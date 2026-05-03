/**
 * 🛠️ GOOGLE DRIVE EDGE CLIENT (Cloudflare Native)
 * 
 * Replaces 'googleapis' with direct REST API calls using 'fetch'.
 * Uses Web Streams (ReadableStream) for memory-efficient uploads and downloads.
 */

/**
 * Gets a fresh access token using the OAuth2 Refresh Token.
 */
async function getAccessToken() {
  const clientId = (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim()
  const clientSecret = (process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim()
  const refreshToken = (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim()

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = []
    if (!clientId) missing.push('GOOGLE_DRIVE_CLIENT_ID')
    if (!clientSecret) missing.push('GOOGLE_DRIVE_CLIENT_SECRET')
    if (!refreshToken) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN')
    throw new Error(`Google Drive credentials missing: ${missing.join(', ')}. Check your environment variables.`)
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      const msg = errorPayload.error_description || errorPayload.error || response.statusText || 'Unknown Auth Error'
      console.error('Google Drive OAuth Token Refresh Failed:', {
        status: response.status,
        error: msg,
        clientId: clientId.slice(0, 8) + '...',
      })
      throw new Error(`Google Drive Auth failed: ${msg}. Please ensure your Refresh Token is valid and not revoked.`)
    }

    const { access_token } = await response.json()
    return access_token
  } catch (error) {
    if (error.message.includes('Auth failed')) throw error
    throw new Error(`Google Drive Connection failed: ${error.message}`)
  }
}

/**
 * Uploads a file to Google Drive using Multipart Upload.
 */
export async function uploadToDrive(fileBuffer, fileName, mimeType, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
  try {
    const accessToken = await getAccessToken()

    const metadata = {
      name: fileName,
      parents: folderId ? [folderId] : []
    }

    // Prepare multipart/related body
    const boundary = '-------314159265358979323846'
    const delimiter = `--${boundary}`
    const closeDelimiter = `--${boundary}--`

    const bodyParts = [
      delimiter,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}`,
      '',
      fileBuffer, // Cloudflare fetch handles Uint8Array/Buffer/ArrayBuffer
      closeDelimiter
    ]

    // Construct the payload as a Blob or ArrayBuffer for fetch
    // On Edge, we can join these for the request body
    const parts = []
    for (const p of bodyParts) {
      if (typeof p === 'string') parts.push(new TextEncoder().encode(p + '\r\n'))
      else parts.push(p, new TextEncoder().encode('\r\n'))
    }
    
    // Combine all parts into a single Uint8Array
    const totalLength = parts.reduce((acc, p) => acc + p.byteLength, 0)
    const combinedBody = new Uint8Array(totalLength)
    let offset = 0
    for (const p of parts) {
      combinedBody.set(new Uint8Array(p), offset)
      offset += p.byteLength
    }

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': combinedBody.byteLength.toString()
      },
      body: combinedBody
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Upload failed')
    }

    const data = await response.json()
    return {
      fileId: data.id,
      webViewLink: data.webViewLink
    }
  } catch (error) {
    console.error('Google Drive Upload Error:', error)
    throw error
  }
}

/**
 * Streams a file from Google Drive.
 */
export async function streamFromDrive(fileId) {
  try {
    const accessToken = await getAccessToken()

    // 1. Get metadata
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!metaRes.ok) throw new Error('Could not fetch file metadata')
    const { name, mimeType } = await metaRes.json()

    // 2. Get media stream
    const mediaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!mediaRes.ok) throw new Error('Could not fetch file content')

    return {
      stream: mediaRes.body, // In Cloudflare, this is a ReadableStream
      fileName: name,
      mimeType: mimeType
    }
  } catch (error) {
    console.error('Google Drive Stream Error:', error)
    throw error
  }
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFromDrive(fileId) {
  try {
    const accessToken = await getAccessToken()
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    return response.ok
  } catch (error) {
    console.error('Google Drive Delete Error:', error)
    throw error
  }
}
