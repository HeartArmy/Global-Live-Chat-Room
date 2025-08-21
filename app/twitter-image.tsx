import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const title = 'Chat Room for the World'
  const subtitle = 'Join the global conversation.'
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
          background: 'linear-gradient(135deg, #111827, #1f2937)',
          color: 'white',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
        <div style={{ fontSize: 28, opacity: 0.9, marginTop: 8 }}>{subtitle}</div>
        <div style={{ position: 'absolute', bottom: 36, right: 48, fontSize: 22, opacity: 0.9 }}>
          globalchatroom.vercel.app
        </div>
      </div>
    ),
    { ...size }
  )
}
