const byteUnits = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

/** A number of bytes as people read it, like "312 MB" or "1.8 GB", in the given language */
export function formatBytes(bytes: number, language: string) {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < byteUnits.length - 1) {
    value /= 1000
    unit += 1
  }
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
    style: 'unit',
    unit: byteUnits[unit],
    unitDisplay: 'short',
  }).format(value)
}
