import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { jsonError, requireApiSession } from '@/lib/api-security'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request) {
  try {
    const session = requireApiSession(request, ['faculty'])
    const timestamp = Math.round(new Date().getTime() / 1000)
    
    // We restrict the upload to a specific folder for this faculty
    const folder = `eduresource/faculty_${session.uid}`
    
    const paramsToSign = {
      timestamp,
      folder,
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    )

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    })
  } catch (error) {
    return jsonError(error, 'Could not generate upload signature.')
  }
}
