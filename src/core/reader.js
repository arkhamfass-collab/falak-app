/**
 * src/core/reader.js
 * القارئ الصوتي العربي: يحوّل نتيجة engine.computeAll() إلى نص عربي مكتوب مُعَدّ للنطق
 * (بكامل مضمون الواجهة: الوقت، التاريخان، مواقيت الصلاة، معطيات الشمس والقمر، الوقت النجمي)،
 * ثم ينطقه عبر Web Speech API (متوفرة في متصفح Chromium على ويندوز، وفي متصفح أندرويد، فتعمل
 * في كلا النسختين بلا أي حزمة صوت إضافية)، مع جدولة تلقائية عند بداية كل ساعة وكل نصف ساعة.
 *
 * ملاحظة على دقة القواعد: تذكير الاسم المعدود (دقيقة/دقيقتان/دقائق...) هنا مُبسَّط عمليا
 * (يغطي الحالات الشائعة 0،1،2،3-10،11+) ولا يطبّق كل تفصيلات الإعراب العربي الكاملة - خيار
 * عملي مقصود لغرض النطق الآلي المسموع، لا الكتابة الأدبية.
 */

import format from './format.js'

// ------------------------- الأرقام عربيا (0-9999) -------------------------

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة']
const TEN_TO_19 = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
// كلمات مركَّبة ثابتة (لا تُشتق قياسيا من ONES؛ صيغة المئات تحذف تاء التأنيث: ثلاثمائة لا ثلاثةمائة)
const HUNDREDS_COMPOUND = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

/** يحوّل عددا صحيحا غير سالب (0-9999) إلى كلمات عربية (أرقام أصلية، بلا تذكير/تأنيث للمعدود) */
export function arabicNumberToWords (n) {
  n = Math.round(n)
  if (n === 0) return 'صفر'
  if (n < 0) return 'سالب ' + arabicNumberToWords(-n)
  if (n > 9999) return String(n) // خارج المدى المدعوم؛ يُترك رقما كما هو (احتياطي)

  const thousands = Math.floor(n / 1000)
  const hundreds = Math.floor((n % 1000) / 100)
  const rest = n % 100

  const parts = []

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف')
    else if (thousands === 2) parts.push('ألفان')
    else if (thousands >= 3 && thousands <= 10) parts.push(arabicNumberToWords(thousands) + ' آلاف')
    else parts.push(arabicNumberToWords(thousands) + ' ألفا')
  }

  if (hundreds > 0) {
    parts.push(HUNDREDS_COMPOUND[hundreds])
  }

  if (rest > 0) {
    if (rest < 10) parts.push(ONES[rest])
    else if (rest < 20) parts.push(TEN_TO_19[rest - 10])
    else {
      const t = Math.floor(rest / 10)
      const o = rest % 10
      if (o === 0) parts.push(TENS[t])
      else parts.push(ONES[o] + ' و' + TENS[t])
    }
  }

  return joinArabicList(parts)
}

/** يربط عناصر عربية بحرف العطف "و" متصلا بكل عنصر تال */
export function joinArabicList (parts) {
  const p = parts.filter(Boolean)
  if (p.length === 0) return ''
  if (p.length === 1) return p[0]
  return p[0] + p.slice(1).map((x) => ' و' + x).join('')
}

// ------------------------- تذكير المعدود (مبسَّط) -------------------------

/** @typedef {{singular:string, dual:string, plural:string}} NounForms */
/** @type {Object<string, NounForms>} */
export const NOUN_FORMS = {
  degree: { singular: 'درجة', dual: 'درجتان', plural: 'درجات' },
  minute: { singular: 'دقيقة', dual: 'دقيقتان', plural: 'دقائق' },
  second: { singular: 'ثانية', dual: 'ثانيتان', plural: 'ثوان' },
  hour: { singular: 'ساعة', dual: 'ساعتان', plural: 'ساعات' },
  day: { singular: 'يوم', dual: 'يومان', plural: 'أيام' },
  km: { singular: 'كيلومتر', dual: 'كيلومتران', plural: 'كيلومترا' }
}

/** يُرجع عبارة "عدد + اسم معدود" بصيغة مبسَّطة (مفرد للمفرد والـ11+، مثنى لـ2، جمع لـ3-10) */
export function arabicCountedNoun (n, forms) {
  const rounded = Math.round(n)
  if (rounded === 0) return 'صفر ' + forms.plural
  if (rounded === 1) return forms.singular + ' واحدة'
  if (rounded === 2) return forms.dual
  if (rounded >= 3 && rounded <= 10) return arabicNumberToWords(rounded) + ' ' + forms.plural
  return arabicNumberToWords(rounded) + ' ' + forms.singular
}

// ------------------------- قراءة الزوايا الستينية (DMS) -------------------------

/**
 * يحوّل زاوية عشرية إلى عبارة "X درجة وY دقيقة وZ ثانية" مع وصف العلامة بحسب mode،
 * مناسب للقراءة الصوتية (الثواني تُقرَّب لأقرب ثانية صحيحة).
 * @param {number} deg
 * @param {'plain'|'latitude'|'longitude'|'declination'|'hourAngle'} [mode='plain']
 */
export function dmsToArabicWords (deg, mode = 'plain') {
  if (!Number.isFinite(deg)) return 'غير متوفر'
  const sign = deg < 0 ? -1 : 1
  const a = Math.abs(deg)
  let d = Math.floor(a)
  let mFull = (a - d) * 60
  let m = Math.floor(mFull)
  let s = Math.round((mFull - m) * 60)
  if (s >= 60) { s -= 60; m += 1 }
  if (m >= 60) { m -= 60; d += 1 }

  const parts = [arabicCountedNoun(d, NOUN_FORMS.degree)]
  if (m > 0 || s > 0) parts.push(arabicCountedNoun(m, NOUN_FORMS.minute))
  if (s > 0) parts.push(arabicCountedNoun(s, NOUN_FORMS.second))
  const magnitude = joinArabicList(parts)

  if (mode === 'latitude') return magnitude + (sign < 0 ? ' جنوبا' : ' شمالا')
  if (mode === 'longitude') return magnitude + (sign < 0 ? ' غربا' : ' شرقا')
  if (mode === 'declination') return magnitude + (sign < 0 ? ' جنوبيا' : ' شماليا')
  if (mode === 'hourAngle') return (sign < 0 ? 'قبل الزوال بـ' : 'بعد الزوال بـ') + magnitude
  return (sign < 0 ? 'سالب ' : '') + magnitude
}

/**
 * يحوّل زاوية عشرية (بالدرجات) إلى عبارة "X ساعة وY دقيقة وZ ثانية" - للمطلع المستقيم والزاوية
 * الساعية تحديدا، فهما فلكيا قياس زمني (توقيت عبور خط الزوال) يُعبَّر عنه بالساعات لا بالدرجات
 * (الساعة الواحدة = 15 درجة)، بخلاف الميل والارتفاع والسمت فتبقى بالدرجات عبر dmsToArabicWords.
 * @param {number} deg
 * @param {'plain'|'hourAngle'} [mode='plain']
 */
export function hmsAngleToArabicWords (deg, mode = 'plain') {
  if (!Number.isFinite(deg)) return 'غير متوفر'
  // المطلع المستقيم زاوية دائرية دوما موجبة (٠-٢٤سا)، أما الزاوية الساعية فإشارتها (قبل/بعد
  // الزوال) معنى مقصود فنُبقيها كما وردت (موقَّعة ضمن ±١٨٠°/±١٢سا) ولا نُطبّعها إلى ٠-٣٦٠
  const degForConversion = (mode === 'hourAngle') ? deg : format.normalizeDeg360(deg)
  const hoursDecimal = degForConversion / 15
  const sign = hoursDecimal < 0 ? -1 : 1
  const a = Math.abs(hoursDecimal)
  let h = Math.floor(a)
  let mFull = (a - h) * 60
  let m = Math.floor(mFull)
  let s = Math.round((mFull - m) * 60)
  if (s >= 60) { s -= 60; m += 1 }
  if (m >= 60) { m -= 60; h += 1 }

  const parts = [arabicCountedNoun(h, NOUN_FORMS.hour)]
  if (m > 0 || s > 0) parts.push(arabicCountedNoun(m, NOUN_FORMS.minute))
  if (s > 0) parts.push(arabicCountedNoun(s, NOUN_FORMS.second))
  const magnitude = joinArabicList(parts)

  if (mode === 'hourAngle') return (sign < 0 ? 'قبل الزوال بـ' : 'بعد الزوال بـ') + magnitude
  return magnitude
}

// ------------------------- قراءة الوقت والتاريخ -------------------------

/** يصف الفترة من اليوم (24 ساعة) بعبارة عربية طبيعية */
function periodOfDay (hour24) {
  if (hour24 >= 0 && hour24 < 4) return 'ليلا'
  if (hour24 >= 4 && hour24 < 12) return 'صباحا'
  if (hour24 === 12) return 'ظهرا'
  if (hour24 > 12 && hour24 < 17) return 'بعد الظهر'
  if (hour24 >= 17 && hour24 < 20) return 'مساء'
  return 'ليلا'
}

// أسماء ساعات الوقت تُقال في العربية بصيغة التأنيث/الترتيب (الواحدة، الثانية...) لا بالعدد
// الأصلي (واحد، اثنان...) - فتُفرَد عن arabicNumberToWords لأنها مفردات ثابتة خاصة بالساعة.
const CLOCK_HOUR_NAMES = [
  '', 'الواحدة', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة',
  'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'
]

/** يحوّل ساعة (0-23) ودقيقة إلى عبارة "الساعة ... و... دقيقة ... (صباحا/مساء/...)" */
export function hmsClockToArabicWords (hour24, minute) {
  const h12raw = hour24 % 12
  const h12 = h12raw === 0 ? 12 : h12raw
  const hourWord = CLOCK_HOUR_NAMES[h12]
  const period = periodOfDay(hour24)
  if (minute === 0) return `الساعة ${hourWord} تماما ${period}`
  return `الساعة ${hourWord} و${arabicCountedNoun(minute, NOUN_FORMS.minute)} ${period}`
}

/** يحوّل مدة بالساعات العشرية (مثل طول النهار) إلى عبارة "H ساعة وM دقيقة" */
export function hoursDecimalToArabicDuration (hoursDecimal) {
  if (!Number.isFinite(hoursDecimal)) return 'غير متوفر'
  const totalMinutes = Math.round(hoursDecimal * 60)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  const hourPart = arabicCountedNoun(hh, NOUN_FORMS.hour)
  if (mm === 0) return hourPart
  return hourPart + ' و' + arabicCountedNoun(mm, NOUN_FORMS.minute)
}

/** يحوّل كائن Date (أو null) إلى عبارة وقت محلي - يحتاج دالة تحويل لأجزاء محلية مناسبة */
function dateToClockWords (date, localPartsFn) {
  if (!date) return 'غير محقَّق (الجسم لا يعبر هذا الارتفاع اليوم)'
  const parts = localPartsFn(date)
  return hmsClockToArabicWords(parts.hour, parts.minute)
}

/** يبني عبارة الاقتران القادم بالتوقيتين العالمي والمحلي معا (كما طلب المستخدم صريحا) */
function nextNewMoonSentence (nextNewMoon) {
  const u = nextNewMoon.utcDate
  const l = nextNewMoon.local
  const utcPart =
    `${arabicNumberToWords(u.getUTCDate())} ${format.gregorianMonthNameArabic(u.getUTCMonth() + 1)}، ` +
    `${hmsClockToArabicWords(u.getUTCHours(), u.getUTCMinutes())} بالتوقيت العالمي`
  const localPart =
    `${arabicNumberToWords(l.day)} ${format.gregorianMonthNameArabic(l.month)}، ` +
    `${hmsClockToArabicWords(l.hour, l.minute)} بتوقيتكم المحلي`
  return `الاقتران القادم - أي المحاق - يكون يوم ${utcPart}، أي يوم ${localPart}.`
}

// ------------------------- بناء نص القراءة الكامل -------------------------

/**
 * يبني النص العربي الكامل المُعَدّ للنطق من نتيجة engine.computeAll().
 * @param {ReturnType<import('./engine.js').computeAll>} r
 * @param {(utcDate:Date)=>{year:number,month:number,day:number,hour:number,minute:number,second:number}} localPartsFn
 *   دالة تحويل لحظة UTC إلى أجزاء محلية (مرّر timeutil.localPartsFromUTC مُقيَّدة بـobserverTime المستعمل)
 */
export function buildNarrationScript (r, localPartsFn) {
  const sections = []

  // 1) الوقت والتاريخان
  sections.push(
    `الوقت الآن ${hmsClockToArabicWords(r.time.local.hour, r.time.local.minute)}، يوم ${r.time.local.weekdayNameArabic}.`
  )
  sections.push(
    `التاريخ الهجري: ${arabicNumberToWords(r.time.hijri.day)} ${r.time.hijri.monthNameArabic} سنة ${arabicNumberToWords(r.time.hijri.year)} للهجرة.`
  )
  sections.push(
    `التاريخ الميلادي: ${arabicNumberToWords(r.time.gregorian.day)} ${r.time.gregorian.monthNameArabic} سنة ${arabicNumberToWords(r.time.gregorian.year)} ميلادية.`
  )

  // 2) مواقيت الصلاة
  const p = r.prayerTimes
  sections.push(
    'مواقيت الصلاة اليوم: ' +
    `الفجر ${dateToClockWords(p.fajr, localPartsFn)}، ` +
    `الشروق ${dateToClockWords(p.sunrise, localPartsFn)}، ` +
    `الظهر ${dateToClockWords(p.dhuhr, localPartsFn)}، ` +
    `العصر ${dateToClockWords(p.asr, localPartsFn)}، ` +
    `المغرب ${dateToClockWords(p.maghrib, localPartsFn)}، ` +
    `والعشاء ${dateToClockWords(p.isha, localPartsFn)}.`
  )

  // 3) الشمس
  const s = r.sun
  sections.push(
    'أما بيانات الشمس: ' +
    `طولها البروجي ${dmsToArabicWords(s.ecliptic.longitudeDeg)}، وبعدها عن الأرض ${s.ecliptic.distanceAU.toFixed(4)} وحدة فلكية. ` +
    `مطلعها المستقيم ${hmsAngleToArabicWords(s.equatorial.rightAscensionDeg)}، وميلها ${dmsToArabicWords(s.equatorial.declinationDeg, 'declination')}. ` +
    `ارتفاعها الآن ${dmsToArabicWords(s.horizontal.altitudeDeg)}، وسمتها ${dmsToArabicWords(s.horizontal.azimuthDeg)}، وزاويتها الساعية ${hmsAngleToArabicWords(s.horizontal.hourAngleDeg, 'hourAngle')}. ` +
    `شروقها ${dateToClockWords(s.riseTransitSet.riseDate, localPartsFn)}، وزوالها ${dateToClockWords(s.riseTransitSet.transitDate, localPartsFn)}، وغروبها ${dateToClockWords(s.riseTransitSet.setDate, localPartsFn)}. ` +
    (s.shadowAtZawalCm != null ? `طول ظل الزوال لعود ${arabicNumberToWords(s.gnomonCm)} سنتيمترا هو ${s.shadowAtZawalCm.toFixed(1)} سنتيمترا. ` : '') +
    (s.shadowNowCm != null ? `وطول الظل الآن ${s.shadowNowCm.toFixed(1)} سنتيمترا. ` : 'والشمس الآن تحت الأفق فلا ظل لها. ') +
    `طول النهار ${hoursDecimalToArabicDuration(s.dayLengthHours)}، وطول الليل ${hoursDecimalToArabicDuration(s.nightLengthHours)}.`
  )

  // 4) القمر
  const m = r.moon
  sections.push(
    'وأما بيانات القمر: ' +
    `طوله البروجي ${dmsToArabicWords(m.ecliptic.longitudeDeg)}، وعرضه البروجي ${dmsToArabicWords(m.ecliptic.latitudeDeg, 'latitude')}. ` +
    `مطلعه المستقيم ${hmsAngleToArabicWords(m.equatorial.rightAscensionDeg)}، وميله ${dmsToArabicWords(m.equatorial.declinationDeg, 'declination')}. ` +
    `ارتفاعه الآن ${dmsToArabicWords(m.horizontal.altitudeDeg)}، وسمته ${dmsToArabicWords(m.horizontal.azimuthDeg)}، وزاويته الساعية ${hmsAngleToArabicWords(m.horizontal.hourAngleDeg, 'hourAngle')}. ` +
    `شروقه ${dateToClockWords(m.riseTransitSet.riseDate, localPartsFn)}، وعبوره ${dateToClockWords(m.riseTransitSet.transitDate, localPartsFn)}، وغروبه ${dateToClockWords(m.riseTransitSet.setDate, localPartsFn)}. ` +
    `مطاله عن الشمس ${dmsToArabicWords(m.elongationDeg)}، وعمره ${m.ageDays.toFixed(1)} يوما، وبعده عن الأرض ${Math.round(m.distanceKm).toLocaleString('en-US')} كيلومترا. ` +
    `طوره الحالي: ${m.phaseNameArabic}، بنسبة إضاءة ${Math.round(m.illuminatedFraction * 100)} بالمئة. ` +
    nextNewMoonSentence(m.nextNewMoon)
  )

  // 5) الوقت النجمي
  const sd = r.sidereal
  const hmsWords = (hoursDecimal) => {
    const hh = Math.floor(hoursDecimal)
    const mm = Math.floor((hoursDecimal - hh) * 60)
    return hmsClockToArabicWords(hh, mm)
  }
  sections.push(
    'وأخيرا الوقت النجمي: ' +
    `الوقت النجمي بغرينتش عند منتصف الليل العالمي كان ${hmsWords(sd.gst0Hours)}. ` +
    `الوقت النجمي الحالي بغرينتش ${hmsWords(sd.gstHours)}. ` +
    `والوقت النجمي المحلي لموقعكم الآن ${hmsWords(sd.lstHours)}.`
  )

  return sections.join('\n\n')
}

// ------------------------- النطق عبر Web Speech API (متصفح فقط) -------------------------

/**
 * ينطق نصا عربيا عبر Web Speech API إن توفرت (متصفح Chromium على ويندوز، أو متصفح أندرويد).
 * لا تأثير لها في بيئة بلا `window` (مثل بيئة الاختبار في Node) - تُرجع Promise تُرفض بهدوء.
 * @param {string} text
 * @param {{lang?:string, rate?:number, pitch?:number, voiceNameHint?:string}} [opts]
 */
export function speakArabic (text, opts = {}) {
  const { lang = 'ar-SA', rate = 0.95, pitch = 1, voiceNameHint } = opts
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Web Speech API غير متوفرة في هذه البيئة'))
      return
    }
    const synth = window.speechSynthesis
    const utter = new window.SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = rate
    utter.pitch = pitch

    const pickVoice = () => {
      const voices = synth.getVoices()
      let voice = null
      if (voiceNameHint) voice = voices.find((v) => v.name.includes(voiceNameHint))
      if (!voice) voice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ar'))
      if (voice) utter.voice = voice
    }

    if (synth.getVoices().length > 0) {
      pickVoice()
    } else if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', pickVoice, { once: true })
    }

    utter.onend = () => resolve()
    utter.onerror = (e) => reject(e.error || e)
    synth.speak(utter)
  })
}

// ------------------------- الجدولة التلقائية (كل ساعة وكل نصف ساعة) -------------------------

/**
 * يُجدول قراءة تلقائية عند بداية كل ساعة (الدقيقة 0) وكل نصف ساعة (الدقيقة 30)، باستدعاء
 * getTextFn() (التي يجب أن تُعيد نصا جديدا محسوبا من أحدث بيانات الآن) ثم speakFn(text).
 * تستعمل setTimeout متكررة محسوبة على حدود الساعة الفعلية (أدق من setInterval الثابت، ولا
 * تتراكم أخطاء التوقيت بمرور الوقت).
 * @param {() => string} getTextFn
 * @param {(text:string) => Promise<void>|void} speakFn
 * @returns {() => void} دالة لإيقاف الجدولة
 */
export function scheduleHourlyReadings (getTextFn, speakFn) {
  let stopped = false
  let timeoutId = null

  function msUntilNextBoundary () {
    const now = new Date()
    const next = new Date(now)
    const minute = now.getMinutes()
    if (minute < 30) {
      next.setMinutes(30, 0, 0)
    } else {
      next.setHours(now.getHours() + 1, 0, 0, 0)
    }
    return next.getTime() - now.getTime()
  }

  function fireAndReschedule () {
    if (stopped) return
    try {
      const text = getTextFn()
      speakFn(text)
    } catch (e) {
      // لا نُسقط الجدولة بسبب خطأ عارض في القراءة الواحدة
      if (typeof console !== 'undefined') console.error('خطأ في القراءة الصوتية المجدولة:', e)
    }
    timeoutId = setTimeout(fireAndReschedule, msUntilNextBoundary())
  }

  timeoutId = setTimeout(fireAndReschedule, msUntilNextBoundary())

  return function stop () {
    stopped = true
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export default {
  arabicNumberToWords,
  joinArabicList,
  arabicCountedNoun,
  NOUN_FORMS,
  dmsToArabicWords,
  hmsAngleToArabicWords,
  hmsClockToArabicWords,
  buildNarrationScript,
  speakArabic,
  scheduleHourlyReadings
}
