/**
 * src/core/format.js
 * أدوات تنسيق الزوايا (بالنظام الستيني: درجات/دقائق/ثواني) والأوقات (ساعة:دقيقة:ثانية)
 * مستعملة في كل الوحدات (الشمس/القمر/الصلاة/الوقت النجمي) لضمان تنسيق واحد متّسق.
 */

/** يُرجع زاوية بالدرجات ضمن المجال [0, 360) */
export function normalizeDeg360 (deg) {
  let d = deg % 360
  if (d < 0) d += 360
  return d
}

/** يُرجع زاوية بالدرجات ضمن المجال (-180, 180] - مفيد لفروق الزوايا */
export function normalizeDegSigned180 (deg) {
  let d = normalizeDeg360(deg)
  if (d > 180) d -= 360
  return d
}

/**
 * يفكّك زاوية عشرية إلى مكوناتها الستينية (العلامة، الدرجات، الدقائق، الثواني)
 * مع معالجة تقريب الثواني التي قد ترتفع إلى 60 (وتُرحَّل إلى الدقائق، وبالمِثل للدرجات)
 */
export function degToDMSParts (deg, secPrecision = 1) {
  const sign = deg < 0 ? -1 : 1
  const a = Math.abs(deg)
  let d = Math.floor(a)
  let mFull = (a - d) * 60
  let m = Math.floor(mFull)
  let s = (mFull - m) * 60
  const factor = Math.pow(10, secPrecision)
  s = Math.round(s * factor) / factor
  if (s >= 60) { s -= 60; m += 1 }
  if (m >= 60) { m -= 60; d += 1 }
  return { sign, d, m, s }
}

/**
 * ينسق زاوية كنص "D° M′ S.s″" باستعمال الأرقام العربية المعتادة (0-9).
 * @param {number} deg - الزاوية بالدرجات العشرية
 * @param {object} [opts]
 * @param {number} [opts.secPrecision=1] عدد الخانات العشرية للثواني
 * @param {boolean} [opts.showPlus=false] إظهار علامة + أمام القيم الموجبة (مفيد لفرق الزوايا والساعة الزاوية)
 */
export function formatDMS (deg, { secPrecision = 1, showPlus = false } = {}) {
  if (!Number.isFinite(deg)) return '—'
  const { sign, d, m, s } = degToDMSParts(deg, secPrecision)
  const sPart = s.toFixed(secPrecision)
  const signStr = sign < 0 ? '-' : (showPlus ? '+' : '')
  return `${signStr}${d}° ${m}′ ${sPart}″`
}

/** ينسق زاوية كدرجات عشرية فقط، لعرض سريع ثانوي */
export function formatDeg (deg, precision = 4) {
  if (!Number.isFinite(deg)) return '—'
  return `${deg.toFixed(precision)}°`
}

/**
 * ينسق عدد ساعات عشري (0..24 أو أي مجال) كـ "HH:MM:SS"
 * @param {number} hoursDecimal
 * @param {object} [opts]
 * @param {boolean} [opts.showSeconds=true]
 */
export function formatHMS (hoursDecimal, { showSeconds = true, showPlus = false } = {}) {
  if (!Number.isFinite(hoursDecimal)) return '—:—'
  let neg = hoursDecimal < 0
  let h = Math.abs(hoursDecimal)
  let hh = Math.floor(h)
  let mFull = (h - hh) * 60
  let mm = Math.floor(mFull)
  let ss = Math.round((mFull - mm) * 60)
  if (ss >= 60) { ss -= 60; mm += 1 }
  if (mm >= 60) { mm -= 60; hh += 1 }
  const pad2 = (n) => String(n).padStart(2, '0')
  const sign = neg ? '-' : (showPlus ? '+' : '')
  return showSeconds
    ? `${sign}${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`
    : `${sign}${pad2(hh)}:${pad2(mm)}`
}

/**
 * يحوّل "ثوانٍ من منتصف الليل" (كما تُرجع دوال rise.js/sidereal.js في astronomia) إلى نص HH:MM:SS
 */
export function formatSecondsOfDayAsHMS (secs, opts) {
  if (!Number.isFinite(secs)) return '—:—'
  const h = (secs / 3600) % 24
  return formatHMS(h, opts)
}

/** يبني تاريخا بصيغة عربية مبسطة "اليوم رقم الشهر السنة" مع اسم اليوم */
const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
export function weekdayNameArabic (jsDateUTCWeekday0Sunday) {
  return ARABIC_WEEKDAYS[jsDateUTCWeekday0Sunday]
}

const GREGORIAN_MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]
export function gregorianMonthNameArabic (month1to12) {
  return GREGORIAN_MONTHS_AR[month1to12 - 1]
}

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
]
export function hijriMonthNameArabic (month1to12) {
  return HIJRI_MONTHS_AR[month1to12 - 1]
}

// ------------------------- الأسماء الفرنسية (لدعم اللغة الفرنسية كخيار بديل) -------------------------
// ملاحظة: أسماء الأيام والأشهر الميلادية تُكتب بحروف صغيرة في الفرنسية (خلافا للإنجليزية) -
// هذا هو الصواب الإملائي الفرنسي القياسي، وليس سهوا.

const FRENCH_WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export function weekdayNameFrench (jsDateUTCWeekday0Sunday) {
  return FRENCH_WEEKDAYS[jsDateUTCWeekday0Sunday]
}

const GREGORIAN_MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
]
export function gregorianMonthNameFrench (month1to12) {
  return GREGORIAN_MONTHS_FR[month1to12 - 1]
}

// تحويل حرفي شائع لأسماء الأشهر الهجرية بالفرنسية (لا يوجد معيار إملائي وحيد متفَق عليه؛
// هذه الصيغ هي الأكثر شيوعا في المصادر الإسلامية الناطقة بالفرنسية)
const HIJRI_MONTHS_FR = [
  'Mouharram', 'Safar', 'Rabia al-Awwal', 'Rabia ath-Thani', 'Joumada al-Oula', 'Joumada al-Akhira',
  'Rajab', "Cha'bane", 'Ramadan', 'Chawwal', "Dhou al-Qi'da", 'Dhou al-Hijja'
]
export function hijriMonthNameFrench (month1to12) {
  return HIJRI_MONTHS_FR[month1to12 - 1]
}

/** دوال عامة تختار العربية أو الفرنسية حسب lang (افتراضيا عربي) - مفيدة لمن لا يريد التفرّع يدويا */
export function weekdayName (jsDateUTCWeekday0Sunday, lang = 'ar') {
  return lang === 'fr' ? weekdayNameFrench(jsDateUTCWeekday0Sunday) : weekdayNameArabic(jsDateUTCWeekday0Sunday)
}
export function gregorianMonthName (month1to12, lang = 'ar') {
  return lang === 'fr' ? gregorianMonthNameFrench(month1to12) : gregorianMonthNameArabic(month1to12)
}
export function hijriMonthName (month1to12, lang = 'ar') {
  return lang === 'fr' ? hijriMonthNameFrench(month1to12) : hijriMonthNameArabic(month1to12)
}

export default {
  normalizeDeg360,
  normalizeDegSigned180,
  degToDMSParts,
  formatDMS,
  formatDeg,
  formatHMS,
  formatSecondsOfDayAsHMS,
  weekdayNameArabic,
  gregorianMonthNameArabic,
  hijriMonthNameArabic,
  weekdayNameFrench,
  gregorianMonthNameFrench,
  hijriMonthNameFrench,
  weekdayName,
  gregorianMonthName,
  hijriMonthName
}
