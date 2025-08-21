import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  const title = 'Chat Room for the World'
  const subtitle = 'Global, realtime, beautiful chat.'
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0b0b0d 0%, #1f2937 50%, #111827 100%)',
          color: 'white',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '32px 48px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #60a5fa, #34d399)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
            }}
          >
            💬
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
            <div style={{ fontSize: 28, opacity: 0.9, marginTop: 8 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 36, right: 48, fontSize: 22, opacity: 0.9 }}>
          globalchatroom.vercel.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
