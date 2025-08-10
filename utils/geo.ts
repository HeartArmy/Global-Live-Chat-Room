export function countryCodeToFlag(code?: string | null): string {
  if (!code) return ''
  const cc = code.trim().toUpperCase()
  if (cc.length !== 2) return ''
  const A = 0x41 // 'A'
  const OFFSET = 0x1F1E6 // Regional Indicator Symbol Letter A
  const c0 = cc.charCodeAt(0)
  const c1 = cc.charCodeAt(1)
  if (c0 < A || c0 > 0x5A || c1 < A || c1 > 0x5A) return ''
  const r0 = String.fromCodePoint(OFFSET + (c0 - A))
  const r1 = String.fromCodePoint(OFFSET + (c1 - A))
  return r0 + r1
}
