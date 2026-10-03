/**
 * src/ui/render.js
 * دوال عرض خالصة: تملأ عناصر DOM من نتيجة engine.computeAll()، بلا أي حالة أو منطق تطبيق
 * خاص بها (الحالة والأحداث في app.js).
 */
import format from '../core/format.js'

function setText (root, selector, text) {
  const el = root.querySelector(selector)
  if (el) el.textContent = text
}

function setByDataF (root, key, text, { rtl = false } = {}) {
  const el = root.querySelector(`[data-f="${key}"]`)
  if (!el) return
  el.textContent = text
  el.classList.toggle('rtl-value', rtl)
}

function pad2 (n) { return String(n).padStart(2, '0') }

function fmtClockOrDash (date, localPartsFn) {
  if (!date) return '—'
  const p = localPartsFn(date)
  return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`
}

function fmtDateAndClock (date, localPartsFn) {
  if (!date) return '—'
  const p = localPartsFn(date)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}`
}

const UTC_PARTS_FN = (d) => ({
  year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
  hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds()
})

export function renderHeader (root, r) {
  setText(root, '#clockNow', `${pad2(r.time.local.hour)}:${pad2(r.time.local.minute)}:${pad2(r.time.local.second)}`)
  setText(root, '#weekdayNow', r.time.local.weekdayNameArabic)
  setText(root, '#hijriNow', `هجري: ${r.time.hijri.day} ${r.time.hijri.monthNameArabic} ${r.time.hijri.year} هـ`)
  setText(root, '#gregorianNow', `ميلادي: ${r.time.gregorian.day} ${r.time.gregorian.monthNameArabic} ${r.time.gregorian.year} م`)
}

export function renderPrayerTimes (root, r, localPartsFn) {
  const p = r.prayerTimes
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
  for (const k of order) {
    const card = root.querySelector(`.prayer-card[data-k="${k}"]`)
    if (!card) continue
    card.querySelector('.ptime').textContent = fmtClockOrDash(p[k], localPartsFn)
  }
  const now = r.time.utcDate.getTime()
  let currentKey = null
  for (const k of order) {
    const d = p[k]
    if (d && d.getTime() <= now) currentKey = k
  }
  for (const k of order) {
    const card = root.querySelector(`.prayer-card[data-k="${k}"]`)
    if (card) card.classList.toggle('current', k === currentKey)
  }
}

export function renderSun (root, r, localPartsFn) {
  const s = r.sun
  setByDataF(root, 'sun.ecl.lon', format.formatDMS(s.ecliptic.longitudeDeg))
  setByDataF(root, 'sun.ecl.dist', s.ecliptic.distanceAU.toFixed(6) + ' و.ف')
  // المطلع المستقيم والزاوية الساعية يُعبَّر عنهما فلكيا بالساعات-دقائق-ثواني (0-24سا) لا
  // بالدرجات، لأنهما أصلا قياس زمني (مطابقة توقيت عبور خط الزوال) - بخلاف الميل والارتفاع
  // والسمت فهي زوايا حقيقية تبقى بالدرجات. انظر أيضا moon.eq.ra/moon.hz.ha بالأسفل لنفس السبب.
  setByDataF(root, 'sun.eq.ra', format.formatHMS(format.normalizeDeg360(s.equatorial.rightAscensionDeg) / 15))
  setByDataF(root, 'sun.eq.dec', format.formatDMS(s.equatorial.declinationDeg, { showPlus: true }))
  setByDataF(root, 'sun.hz.alt', format.formatDMS(s.horizontal.altitudeDeg, { showPlus: true }))
  setByDataF(root, 'sun.hz.az', format.formatDMS(s.horizontal.azimuthDeg))
  setByDataF(root, 'sun.hz.ha', format.formatHMS(s.horizontal.hourAngleDeg / 15, { showPlus: true }))
  setByDataF(root, 'sun.rts.rise', fmtClockOrDash(s.riseTransitSet.riseDate, localPartsFn))
  setByDataF(root, 'sun.rts.transit', fmtClockOrDash(s.riseTransitSet.transitDate, localPartsFn))
  setByDataF(root, 'sun.rts.set', fmtClockOrDash(s.riseTransitSet.setDate, localPartsFn))
  setByDataF(root, 'sun.gnomon', String(s.gnomonCm))
  setByDataF(root, 'sun.shadowZawal', s.shadowAtZawalCm != null ? s.shadowAtZawalCm.toFixed(1) + ' سم' : '—', { rtl: true })
  setByDataF(root, 'sun.shadowNow', s.shadowNowCm != null ? s.shadowNowCm.toFixed(1) + ' سم' : 'الشمس تحت الأفق', { rtl: true })
  setByDataF(root, 'sun.dayLen', format.formatHMS(s.dayLengthHours, { showSeconds: false }))
  setByDataF(root, 'sun.nightLen', format.formatHMS(s.nightLengthHours, { showSeconds: false }))
}

export function renderMoon (root, r, localPartsFn) {
  const m = r.moon
  setByDataF(root, 'moon.ecl.lon', format.formatDMS(m.ecliptic.longitudeDeg))
  setByDataF(root, 'moon.ecl.lat', format.formatDMS(m.ecliptic.latitudeDeg, { showPlus: true }))
  setByDataF(root, 'moon.eq.ra', format.formatHMS(format.normalizeDeg360(m.equatorial.rightAscensionDeg) / 15))
  setByDataF(root, 'moon.eq.dec', format.formatDMS(m.equatorial.declinationDeg, { showPlus: true }))
  setByDataF(root, 'moon.hz.alt', format.formatDMS(m.horizontal.altitudeDeg, { showPlus: true }))
  setByDataF(root, 'moon.hz.az', format.formatDMS(m.horizontal.azimuthDeg))
  setByDataF(root, 'moon.hz.ha', format.formatHMS(m.horizontal.hourAngleDeg / 15, { showPlus: true }))
  setByDataF(root, 'moon.rts.rise', fmtClockOrDash(m.riseTransitSet.riseDate, localPartsFn))
  setByDataF(root, 'moon.rts.transit', fmtClockOrDash(m.riseTransitSet.transitDate, localPartsFn))
  setByDataF(root, 'moon.rts.set', fmtClockOrDash(m.riseTransitSet.setDate, localPartsFn))
  setByDataF(root, 'moon.elong', format.formatDMS(m.elongationDeg))
  setByDataF(root, 'moon.age', m.ageDays.toFixed(2) + ' يوما', { rtl: true })
  setByDataF(root, 'moon.dist', Math.round(m.distanceKm).toLocaleString('en-US') + ' كم', { rtl: true })
  setByDataF(root, 'moon.phase', m.phaseNameArabic, { rtl: true })
  setByDataF(root, 'moon.illum', (m.illuminatedFraction * 100).toFixed(1) + '%')
  setByDataF(root, 'moon.nextNewUtc', fmtDateAndClock(m.nextNewMoon.utcDate, UTC_PARTS_FN), { rtl: true })
  setByDataF(root, 'moon.nextNewLocal', fmtDateAndClock(m.nextNewMoon.utcDate, localPartsFn), { rtl: true })
}

export function renderSidereal (root, r) {
  setByDataF(root, 'sid.gst0', format.formatHMS(r.sidereal.gst0Hours))
  setByDataF(root, 'sid.gst', format.formatHMS(r.sidereal.gstHours))
  setByDataF(root, 'sid.lst', format.formatHMS(r.sidereal.lstHours))
}

export function renderPrayerHints (root, settings) {
  setText(root, '#hintFajrAngle', settings.fajrAngleDeg + '°')
  setText(root, '#hintAsrMethod', settings.asrFactor === 2 ? 'الحنفية' : 'الجمهور')
  setText(root, '#hintIshaOffset', settings.ishaMode === 'angle' ? (settings.ishaAngleDeg + '° (بزاوية)') : settings.ishaOffsetMinutes)
}

export function renderAll (root, r, localPartsFn) {
  renderHeader(root, r)
  renderPrayerTimes(root, r, localPartsFn)
  renderSun(root, r, localPartsFn)
  renderMoon(root, r, localPartsFn)
  renderSidereal(root, r)
}

export default { renderHeader, renderPrayerTimes, renderSun, renderMoon, renderSidereal, renderPrayerHints, renderAll }
