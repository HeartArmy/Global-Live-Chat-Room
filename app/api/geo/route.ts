import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Try common edge headers set by hosting/CDNs without storing any IP
  const country =
    (request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country') ||
      '').toUpperCase()

  return NextResponse.json({ countryCode: country || null }, { status: 200 })
}
