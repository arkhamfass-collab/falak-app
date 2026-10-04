/**
 * src/ui/render.js
 * دوال عرض خالصة: تملأ عناصر DOM من نتيجة engine.computeAll()، بلا أي حالة أو منطق تطبيق
 * خاص بها (الحالة والأحداث في app.js). تأخذ كل دوال العرض لغة العرض lang ('ar'|'fr') لاختيار
 * النصوص والأسماء المناسبة من i18n.js ومن حقول *Arabic/*French التي يُرجعها المحرك.
 */
import format from '../core/format.js'
import i18n from '../core/i18n.js'

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

export function renderHeader (root, r, lang = 'ar') {
  setText(root, '#clockNow', `${pad2(r.time.local.hour)}:${pad2(r.time.local.minute)}:${pad2(r.time.local.second)}`)
  setText(root, '#weekdayNow', lang === 'fr' ? r.time.local.weekdayNameFrench : r.time.local.weekdayNameArabic)
  const hijriMonth = lang === 'fr' ? r.time.hijri.monthNameFrench : r.time.hijri.monthNameArabic
  const gregMonth = lang === 'fr' ? r.time.gregorian.monthNameFrench : r.time.gregorian.monthNameArabic
  if (lang === 'fr') {
    setText(root, '#hijriNow', `Hégire : ${r.time.hijri.day} ${hijriMonth} ${r.time.hijri.year}`)
    setText(root, '#gregorianNow', `Grégorien : ${r.time.gregorian.day} ${gregMonth} ${r.time.gregorian.year}`)
  } else {
    setText(root, '#hijriNow', `هجري: ${r.time.hijri.day} ${hijriMonth} ${r.time.hijri.year} هـ`)
    setText(root, '#gregorianNow', `ميلادي: ${r.time.gregorian.day} ${gregMonth} ${r.time.gregorian.year} م`)
  }
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

export function renderSun (root, r, localPartsFn, lang = 'ar') {
  const s = r.sun
  const auSuffix = i18n.t('sun.auSuffix', lang)
  const cmSuffix = i18n.t('sun.cmSuffix', lang)
  setByDataF(root, 'sun.ecl.lon', format.formatDMS(s.ecliptic.longitudeDeg))
  setByDataF(root, 'sun.ecl.dist', s.ecliptic.distanceAU.toFixed(6) + auSuffix)
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
  setText(root, '#sunShadowGroupTitle', i18n.t('sun.shadowGroupTitle', lang, { gnomon: s.gnomonCm }))
  const isAr = lang !== 'fr'
  setByDataF(root, 'sun.shadowZawal', s.shadowAtZawalCm != null ? s.shadowAtZawalCm.toFixed(1) + cmSuffix : '—', { rtl: isAr })
  setByDataF(root, 'sun.shadowNow', s.shadowNowCm != null ? s.shadowNowCm.toFixed(1) + cmSuffix : i18n.t('sun.shadowNowFallback', lang), { rtl: isAr })
  // سمت الظل: قيمة زاوية بصيغة DMS (كسمت الشمس sun.hz.az أعلاه، بلا rtl) حين يوجد ظل، أو نفس
  // نص "الشمس تحت الأفق" (نص عربي/فرنسي صرف، يحتاج rtl في العربية كـsun.shadowNow) حين لا يوجد.
  setByDataF(root, 'sun.shadowAzimuthNow',
    s.shadowAzimuthNowDeg != null ? format.formatDMS(s.shadowAzimuthNowDeg) : i18n.t('sun.shadowNowFallback', lang),
    { rtl: s.shadowAzimuthNowDeg == null && isAr })
  setByDataF(root, 'sun.dayLen', format.formatHMS(s.dayLengthHours, { showSeconds: false }))
  setByDataF(root, 'sun.nightLen', format.formatHMS(s.nightLengthHours, { showSeconds: false }))
}

export function renderMoon (root, r, localPartsFn, lang = 'ar') {
  const m = r.moon
  const isAr = lang !== 'fr'
  const daySuffix = i18n.t('moon.daySuffix', lang)
  const kmSuffix = i18n.t('moon.kmSuffix', lang)
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
  setByDataF(root, 'moon.age', m.ageDays.toFixed(2) + daySuffix, { rtl: isAr })
  setByDataF(root, 'moon.dist', Math.round(m.distanceKm).toLocaleString('en-US') + kmSuffix, { rtl: isAr })
  setByDataF(root, 'moon.phase', isAr ? m.phaseNameArabic : m.phaseNameFrench, { rtl: isAr })
  setByDataF(root, 'moon.illum', (m.illuminatedFraction * 100).toFixed(1) + '%')
  setByDataF(root, 'moon.nextNewUtc', fmtDateAndClock(m.nextNewMoon.utcDate, UTC_PARTS_FN), { rtl: isAr })
  setByDataF(root, 'moon.nextNewLocal', fmtDateAndClock(m.nextNewMoon.utcDate, localPartsFn), { rtl: isAr })
}

export function renderSidereal (root, r) {
  setByDataF(root, 'sid.gst0', format.formatHMS(r.sidereal.gst0Hours))
  setByDataF(root, 'sid.gst', format.formatHMS(r.sidereal.gstHours))
  setByDataF(root, 'sid.lst', format.formatHMS(r.sidereal.lstHours))
}

export function renderPrayerHints (root, settings, lang = 'ar') {
  const asrMethodLabel = settings.asrFactor === 2 ? i18n.t('prayer.asrHanafiShort', lang) : i18n.t('prayer.asrJumhurShort', lang)
  const ishaInfo = settings.ishaMode === 'angle'
    ? `${settings.ishaAngleDeg}${i18n.t('prayer.hintIshaAngleSuffix', lang)}`
    : settings.ishaOffsetMinutes
  setText(root, '#prayerHintText', i18n.t('prayer.hint', lang, {
    fajrAngle: settings.fajrAngleDeg + '°',
    asrMethod: asrMethodLabel,
    ishaInfo
  }))
}

/** يطبّق كل النصوص الثابتة (data-i18n) والمتغيّرة مع اللغة الحالية - يُستدعى عند الإقلاع وعند تبديل اللغة */
export function applyStaticLanguage (root, lang) {
  i18n.applyTranslations(root, lang)
}

export function renderAll (root, r, localPartsFn, lang = 'ar') {
  renderHeader(root, r, lang)
  renderPrayerTimes(root, r, localPartsFn)
  renderSun(root, r, localPartsFn, lang)
  renderMoon(root, r, localPartsFn, lang)
  renderSidereal(root, r)
}

export default { renderHeader, renderPrayerTimes, renderSun, renderMoon, renderSidereal, renderPrayerHints, applyStaticLanguage, renderAll }
