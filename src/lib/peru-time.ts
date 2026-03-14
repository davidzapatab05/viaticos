export function getPeruNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }))
}

export function createPeruDateFromYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}
