/**
 * Formatter bersama. Dipisah dari App.tsx supaya bisa diuji tanpa React.
 */

/** Desimal dari API bisa berupa string, number, atau objek Decimal Prisma. */
export type ApiDecimal = string | number | { s: number; e: number; d: number[] } | null | undefined

export function toNumber(value: ApiDecimal): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'object' && Array.isArray(value.d)) {
    // Bentuk Decimal.js: { s, e, d }
    const digits = value.d.join('')
    const parsed = Number(`${value.s < 0 ? '-' : ''}${digits}e${value.e - (digits.length - 1)}`)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** "7.80" jadi "7,8". Koma sebagai pemisah desimal, sesuai kebiasaan Indonesia. */
export function formatDecimal(value: ApiDecimal, digits = 1): string {
  const num = toNumber(value)
  if (num === null) return '-'
  const text = num.toFixed(digits).replace('.', ',')
  // Buang nol di belakang koma, lalu buang koma yang jadi menggantung.
  return text.replace(/0+$/, '').replace(/,$/, '')
}

export function formatWeight(value: ApiDecimal): string {
  const text = formatDecimal(value, 2)
  return text === '-' ? '-' : `${text} kg`
}

export function formatHeight(value: ApiDecimal): string {
  const text = formatDecimal(value, 1)
  return text === '-' ? '-' : `${text} cm`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** Usia dalam bentuk "1 tahun 2 bulan" atau "3 bulan 5 hari". */
export function formatAge(birthDate: string | null | undefined, at: Date = new Date()): string {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '-'

  let months =
    (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth())
  if (at.getDate() < birth.getDate()) months -= 1
  if (months < 0) return 'Belum lahir'

  const years = Math.floor(months / 12)
  const restMonths = months % 12

  if (years > 0 && restMonths > 0) return `${years} tahun ${restMonths} bulan`
  if (years > 0) return `${years} tahun`
  if (restMonths > 0) return `${restMonths} bulan`

  const days = Math.max(0, Math.floor((at.getTime() - birth.getTime()) / 86_400_000))
  return `${days} hari`
}

/** Label status gizi jadi kelas warna. */
export function statusTone(label: string | null | undefined): 'normal' | 'warning' | 'danger' | 'muted' {
  if (!label) return 'muted'
  const text = label.toLowerCase()
  if (text.includes('normal')) return 'normal'
  if (text.includes('sangat') || text.includes('buruk')) return 'danger'
  return 'warning'
}
