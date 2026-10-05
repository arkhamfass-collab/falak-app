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

/** كـfmtClockOrDash، لكن يُرجع نص رسالة (مثلا "لم يقع اليوم عند موقعكم") بدل شَرطة عند غياب القيمة -
 * تُستعمل للأوقات التي قد لا تقع فعلا في بعض الأيام (أوقات القبلة/الأوقات الشرعية الإضافية) حيث
 * الشرطة المجردة لا تُفسَّر بسهولة، بخلاف غياب عابر لحظي كأوقات الصلاة الاعتيادية. */
function fmtClockOrMsg (date, localPartsFn, fallbackMsg) {
  return date ? fmtClockOrDash(date, localPartsFn) : fallbackMsg
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

// ترتيب موحَّد واحد للمواقيت الشرعية العشرة (الستة الأصلية + الأربعة الإضافية)، بالترتيب
// الزمني المتسلسل الذي طلب المستخدم اعتماده: الثلث الأخير، الفجر، الإسفار الأعلى، الشروق،
// حل النافلة، الزوال (الظهر)، العصر، نهاية المختار للعصر، المغرب، العشاء. data-k هنا هو مفتاح
// بطاقة العرض (prayer-card)؛ field هو اسم الحقل المقابل في r.prayerTimes؛ extra=true للأربعة
// التي قد لا تقع أصلا بعض الأيام (فتحتاج رسالة بديلة لا شَرطة مجردة - كـprayer.extra سابقا).
const PRAYER_ORDER = [
  { k: 'lastThird', field: 'lastThirdOfNightStart', extra: true },
  { k: 'fajr', field: 'fajr', extra: false },
  { k: 'isfarAla', field: 'isfarAlaStart', extra: true },
  { k: 'sunrise', field: 'sunrise', extra: false },
  { k: 'nafl', field: 'naflTime', extra: true },
  { k: 'dhuhr', field: 'dhuhr', extra: false },
  { k: 'asr', field: 'asr', extra: false },
  { k: 'asrMukhtarEnd', field: 'asrMukhtarEnd', extra: true },
  { k: 'maghrib', field: 'maghrib', extra: false },
  { k: 'isha', field: 'isha', extra: false }
]

export function renderPrayerTimes (root, r, localPartsFn, lang = 'ar') {
  const p = r.prayerTimes
  const isAr = lang !== 'fr'
  const fallback = i18n.t('prayer.extraNotTodayFallback', lang)
  for (const { k, field, extra } of PRAYER_ORDER) {
    const card = root.querySelector(`.prayer-card[data-k="${k}"]`)
    if (!card) continue
    const val = p[field]
    const el = card.querySelector('.ptime')
    if (extra) {
      el.textContent = fmtClockOrMsg(val, localPartsFn, fallback)
      el.classList.toggle('rtl-value', !val && isAr)
    } else {
      el.textContent = fmtClockOrDash(val, localPartsFn)
      el.classList.remove('rtl-value')
    }
  }
  const now = r.time.utcDate.getTime()
  let currentKey = null
  for (const { k, field } of PRAYER_ORDER) {
    const d = p[field]
    if (d && d.getTime() <= now) currentKey = k
  }
  for (const { k } of PRAYER_ORDER) {
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
  // الترتيب المطلوب: الدرجة في البرج قبل اسم البرج، ثم الدرجة في المنزلة قبل اسم المنزلة (برجها
  // الحقيقي/التحقيقي - انظر ayanamsaDeg في zodiac.js وموضع استعمالها في engine.js)
  setByDataF(root, 'sun.zodiacDeg', format.formatDMS(s.zodiac.degreeInSign))
  setByDataF(root, 'sun.zodiacSign', isAr ? s.zodiac.nameArabic : s.zodiac.nameFrench, { rtl: isAr })
  setByDataF(root, 'sun.manzilDeg', format.formatDMS(s.manzil.degreeInManzil))
  setByDataF(root, 'sun.manzil', isAr ? s.manzil.nameArabic : s.manzil.nameFrench, { rtl: isAr })
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
  setByDataF(root, 'moon.zodiacDeg', format.formatDMS(m.zodiac.degreeInSign))
  setByDataF(root, 'moon.zodiacSign', isAr ? m.zodiac.nameArabic : m.zodiac.nameFrench, { rtl: isAr })
  setByDataF(root, 'moon.manzilDeg', format.formatDMS(m.manzil.degreeInManzil))
  setByDataF(root, 'moon.manzil', isAr ? m.manzil.nameArabic : m.manzil.nameFrench, { rtl: isAr })
}

export function renderSidereal (root, r) {
  setByDataF(root, 'sid.gst0', format.formatHMS(r.sidereal.gst0Hours))
  setByDataF(root, 'sid.gst', format.formatHMS(r.sidereal.gstHours))
  setByDataF(root, 'sid.lst', format.formatHMS(r.sidereal.lstHours))
}

export function renderQibla (root, r, localPartsFn, lang = 'ar') {
  const q = r.qibla
  const isAr = lang !== 'fr'
  const fallback = i18n.t('qibla.notTodayFallback', lang)
  setByDataF(root, 'qibla.azimuth', format.formatDMS(q.azimuthDeg))
  setByDataF(root, 'qibla.direction', isAr ? q.directionNameArabic : q.directionNameFrench, { rtl: isAr })
  setByDataF(root, 'qibla.altitudeAtFacing',
    q.sunAltitudeAtFacingDeg != null ? format.formatDMS(q.sunAltitudeAtFacingDeg, { showPlus: true }) : fallback,
    { rtl: q.sunAltitudeAtFacingDeg == null && isAr })
  setByDataF(root, 'qibla.sunToward', fmtClockOrMsg(q.sunTowardQiblaDate, localPartsFn, fallback), { rtl: !q.sunTowardQiblaDate && isAr })
  setByDataF(root, 'qibla.shadowToward', fmtClockOrMsg(q.shadowTowardQiblaDate, localPartsFn, fallback), { rtl: !q.shadowTowardQiblaDate && isAr })
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
  renderPrayerTimes(root, r, localPartsFn, lang)
  renderSun(root, r, localPartsFn, lang)
  renderMoon(root, r, localPartsFn, lang)
  renderSidereal(root, r)
  renderQibla(root, r, localPartsFn, lang)
}

export default {
  renderHeader,
  renderPrayerTimes,
  renderSun,
  renderMoon,
  renderSidereal,
  renderQibla,
  renderPrayerHints,
  applyStaticLanguage,
  renderAll
}
