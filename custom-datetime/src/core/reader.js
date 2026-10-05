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

// ------------------------- الأرقام فرنسيا (0-9999) -------------------------
// ملاحظة: خلافا للعربية (حيث يأخذ المعدود 3-10 جنس العدد المعاكس)، التذكير/التأنيث الفرنسي
// في الأعداد يقتصر عمليا على "un/une" (بما في ذلك مركّباتها: vingt et un/une، quatre-vingt-un/une)
// - بقية الآحاد والعشرات ثابتة اللفظ بصرف النظر عن جنس المعدود، ما يجعل القاعدة الفرنسية هنا
// أبسط بنيويا من العربية رغم اختلاف شكلها.

const FR_ONES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
const FR_TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const FR_TENS_WORDS = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' }

function frenchOnesWord (n, feminine) {
  if (n === 1 && feminine) return 'une'
  return FR_ONES[n]
}

/** يحوّل عددا بين 0 و99 إلى كلمات فرنسية، بمراعاة شواذّ 70-79 و80-99 المعروفة */
function frenchUnder100 (n, feminine) {
  if (n < 10) return frenchOnesWord(n, feminine)
  if (n < 20) return FR_TEENS[n - 10]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (tens === 7 || tens === 9) {
    // 70-79: soixante + (dix..dix-neuf)؛ 90-99: quatre-vingt + (dix..dix-neuf)
    const base = tens === 7 ? 'soixante' : 'quatre-vingt'
    if (tens === 7 && ones === 1) return base + ' et onze' // الاستثناء الوحيد هنا: 71
    return base + '-' + FR_TEENS[ones]
  }
  if (tens === 8) {
    if (ones === 0) return 'quatre-vingts' // "s" فقط عند التمام (لا يتبعها عدد آخر ضمن نفس الرقم)
    return 'quatre-vingt-' + frenchOnesWord(ones, feminine)
  }
  const tensWord = FR_TENS_WORDS[tens]
  if (ones === 0) return tensWord
  if (ones === 1) return tensWord + ' et ' + (feminine ? 'une' : 'un') // vingt et un/une...
  return tensWord + '-' + frenchOnesWord(ones, feminine)
}

/** يحوّل عددا صحيحا (موجبا أو سالبا، 0-9999) إلى كلمات فرنسية */
export function frenchNumberToWords (n, { feminine = false } = {}) {
  n = Math.round(n)
  if (n === 0) return 'zéro'
  if (n < 0) return 'moins ' + frenchNumberToWords(-n, { feminine })
  if (n > 9999) return String(n) // خارج المدى المدعوم؛ يُترك رقما كما هو (احتياطي)

  const thousands = Math.floor(n / 1000)
  const remainder = n % 1000
  const hundreds = Math.floor(remainder / 100)
  const rest = remainder % 100

  const parts = []
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : frenchOnesWord(thousands, false) + ' mille')
  }
  if (hundreds > 0) {
    if (hundreds === 1) parts.push('cent')
    else parts.push(frenchOnesWord(hundreds, false) + (rest === 0 ? ' cents' : ' cent')) // "s" تُحذف إن تبعها رقم
  }
  if (rest > 0) {
    parts.push(frenchUnder100(rest, feminine))
  }
  return parts.join(' ')
}

/** يربط عناصر فرنسية: فاصلة بين الكل، و"et" قبل الأخير فقط (الأسلوب الفرنسي الطبيعي للتعداد) */
export function joinFrenchList (parts) {
  const p = parts.filter(Boolean)
  if (p.length === 0) return ''
  if (p.length === 1) return p[0]
  if (p.length === 2) return p[0] + ' et ' + p[1]
  return p.slice(0, -1).join(', ') + ' et ' + p[p.length - 1]
}

/** @type {Object<string, {singular:string, plural:string, gender:'m'|'f'}>} */
export const FRENCH_NOUN_FORMS = {
  degree: { singular: 'degré', plural: 'degrés', gender: 'm' },
  minute: { singular: 'minute', plural: 'minutes', gender: 'f' },
  second: { singular: 'seconde', plural: 'secondes', gender: 'f' },
  hour: { singular: 'heure', plural: 'heures', gender: 'f' },
  day: { singular: 'jour', plural: 'jours', gender: 'm' },
  km: { singular: 'kilomètre', plural: 'kilomètres', gender: 'm' },
  cm: { singular: 'centimètre', plural: 'centimètres', gender: 'm' }
}

/** يُرجع عبارة "عدد + اسم معدود" فرنسيا بصيغتها الصحيحة (المفرد لـ0/1، الجمع لما فوق) */
export function frenchCountedNoun (n, forms) {
  const rounded = Math.round(n)
  const absN = Math.abs(rounded)
  if (absN === 0) return 'zéro ' + forms.singular
  const words = frenchNumberToWords(absN, { feminine: forms.gender === 'f' })
  return absN === 1 ? (words + ' ' + forms.singular) : (words + ' ' + forms.plural)
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

/** كـdateToClockWords، لكن برسالة بديلة مخصَّصة عند غياب القيمة (لأوقات لا يُفسِّرها "عدم عبور
 * ارتفاع معيّن" بل سبب آخر: محاذاة سمتية كالقبلة، أو عدم تحقق حسابي كالثلث الأخير من الليل) */
function dateToClockWordsOr (date, localPartsFn, fallbackMsg) {
  if (!date) return fallbackMsg
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

// ------------------------- قراءة الزوايا والوقت فرنسيا -------------------------
// نظائر فرنسية لدوال القراءة العربية أعلاه (dmsToArabicWords، hmsAngleToArabicWords،
// hmsClockToArabicWords، hoursDecimalToArabicDuration، dateToClockWords، nextNewMoonSentence).
// ملاحظة: الفرنسية لا تحتاج مصفوفة "ساعات ترتيبية" خاصة كالعربية (التاسعة، العاشرة...) - يكفي
// العدد الأصلي ("il est neuf heures" لا "l'heure neuvième") فالقراءة هنا أبسط من ذلك الجانب.

/** نظير dmsToArabicWords بالفرنسية */
export function dmsToFrenchWords (deg, mode = 'plain') {
  if (!Number.isFinite(deg)) return 'non disponible'
  const sign = deg < 0 ? -1 : 1
  const a = Math.abs(deg)
  let d = Math.floor(a)
  let mFull = (a - d) * 60
  let m = Math.floor(mFull)
  let s = Math.round((mFull - m) * 60)
  if (s >= 60) { s -= 60; m += 1 }
  if (m >= 60) { m -= 60; d += 1 }

  const parts = [frenchCountedNoun(d, FRENCH_NOUN_FORMS.degree)]
  if (m > 0 || s > 0) parts.push(frenchCountedNoun(m, FRENCH_NOUN_FORMS.minute))
  if (s > 0) parts.push(frenchCountedNoun(s, FRENCH_NOUN_FORMS.second))
  const magnitude = joinFrenchList(parts)

  if (mode === 'latitude') return magnitude + (sign < 0 ? ' sud' : ' nord')
  if (mode === 'longitude') return magnitude + (sign < 0 ? ' ouest' : ' est')
  if (mode === 'declination') return magnitude + (sign < 0 ? ' sud' : ' nord')
  if (mode === 'hourAngle') return (sign < 0 ? 'avant le passage au méridien de ' : 'après le passage au méridien de ') + magnitude
  return (sign < 0 ? 'moins ' : '') + magnitude
}

/** نظير hmsAngleToArabicWords بالفرنسية (للمطلع المستقيم والزاوية الساعية، بالساعات-دقائق-ثواني) */
export function hmsAngleToFrenchWords (deg, mode = 'plain') {
  if (!Number.isFinite(deg)) return 'non disponible'
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

  const parts = [frenchCountedNoun(h, FRENCH_NOUN_FORMS.hour)]
  if (m > 0 || s > 0) parts.push(frenchCountedNoun(m, FRENCH_NOUN_FORMS.minute))
  if (s > 0) parts.push(frenchCountedNoun(s, FRENCH_NOUN_FORMS.second))
  const magnitude = joinFrenchList(parts)

  if (mode === 'hourAngle') return (sign < 0 ? 'avant le passage au méridien de ' : 'après le passage au méridien de ') + magnitude
  return magnitude
}

function periodOfDayFrench (hour24) {
  if (hour24 >= 0 && hour24 < 4) return 'de la nuit'
  if (hour24 >= 4 && hour24 < 12) return 'du matin'
  if (hour24 === 12) return 'de midi'
  if (hour24 > 12 && hour24 < 17) return "de l'après-midi"
  if (hour24 >= 17 && hour24 < 20) return 'du soir'
  return 'de la nuit'
}

/** نظير hmsClockToArabicWords بالفرنسية - يُرجع العبارة بلا "Il est" البادئة (يضيفها المستدعي
 * حسب السياق: "Il est..." للوقت الحالي، أو "...à..." لوقت حدث مثل صلاة أو شروق) */
export function hmsClockToFrenchWords (hour24, minute) {
  const h12raw = hour24 % 12
  const h12 = h12raw === 0 ? 12 : h12raw
  const hourWords = frenchCountedNoun(h12, FRENCH_NOUN_FORMS.hour)
  const period = periodOfDayFrench(hour24)
  if (minute === 0) return `${hourWords} pile ${period}`
  return `${hourWords} et ${frenchCountedNoun(minute, FRENCH_NOUN_FORMS.minute)} ${period}`
}

/** نظير hoursDecimalToArabicDuration بالفرنسية */
export function hoursDecimalToFrenchDuration (hoursDecimal) {
  if (!Number.isFinite(hoursDecimal)) return 'non disponible'
  const totalMinutes = Math.round(hoursDecimal * 60)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  const hourPart = frenchCountedNoun(hh, FRENCH_NOUN_FORMS.hour)
  if (mm === 0) return hourPart
  return hourPart + ' et ' + frenchCountedNoun(mm, FRENCH_NOUN_FORMS.minute)
}

/** نظير dateToClockWords بالفرنسية (بلا "à" بادئة - يضيفها المستدعي) */
function dateToClockWordsFrench (date, localPartsFn) {
  if (!date) return "non atteint (l'astre ne passe pas par cette hauteur aujourd'hui)"
  const parts = localPartsFn(date)
  return hmsClockToFrenchWords(parts.hour, parts.minute)
}

/** نظير dateToClockWordsOr بالفرنسية (بلا "à" بادئة - يضيفها المستدعي) */
function dateToClockWordsFrenchOr (date, localPartsFn, fallbackMsg) {
  if (!date) return fallbackMsg
  const parts = localPartsFn(date)
  return hmsClockToFrenchWords(parts.hour, parts.minute)
}

/** نظير nextNewMoonSentence بالفرنسية */
function nextNewMoonSentenceFrench (nextNewMoon) {
  const u = nextNewMoon.utcDate
  const l = nextNewMoon.local
  const utcPart =
    `${frenchNumberToWords(u.getUTCDate())} ${format.gregorianMonthNameFrench(u.getUTCMonth() + 1)}, ` +
    `à ${hmsClockToFrenchWords(u.getUTCHours(), u.getUTCMinutes())} en temps universel (UTC)`
  const localPart =
    `${frenchNumberToWords(l.day)} ${format.gregorianMonthNameFrench(l.month)}, ` +
    `à ${hmsClockToFrenchWords(l.hour, l.minute)} à votre heure locale`
  return `La prochaine conjonction - c'est-à-dire la nouvelle lune - aura lieu le ${utcPart}, soit le ${localPart}.`
}

/**
 * يبني النص الفرنسي الكامل المُعَدّ للنطق من نتيجة engine.computeAll() - نظير كامل لـ
 * buildNarrationScript العربية، بنفس الترتيب والمحتوى بالضبط.
 */
export function buildNarrationScriptFrench (r, localPartsFn) {
  const sections = []

  // 1) الوقت والتاريخان
  sections.push(
    `Il est ${hmsClockToFrenchWords(r.time.local.hour, r.time.local.minute)}. Nous sommes ${r.time.local.weekdayNameFrench}.`
  )
  sections.push(
    `Date du calendrier hégirien : ${frenchNumberToWords(r.time.hijri.day)} ${r.time.hijri.monthNameFrench} de l'an ${frenchNumberToWords(r.time.hijri.year)} de l'hégire.`
  )
  sections.push(
    `Date du calendrier grégorien : ${frenchNumberToWords(r.time.gregorian.day)} ${r.time.gregorian.monthNameFrench} ${frenchNumberToWords(r.time.gregorian.year)}.`
  )

  // 2) مواقيت الصلاة (مدمَجة في تسلسل زمني واحد: الثلث الأخير، الفجر، الإسفار الأعلى، الشروق،
  // حل النافلة، الزوال (الدهر)، العصر، نهاية المختار للعصر، المغرب، العشاء - كما طلب المستخدم)
  const p = r.prayerTimes
  sections.push(
    "Horaires de prière aujourd'hui : " +
    `début du dernier tiers de la nuit à ${dateToClockWordsFrenchOr(p.lastThirdOfNightStart, localPartsFn, 'non déterminé cette nuit à votre position')}, ` +
    `puis le Fajr à ${dateToClockWordsFrench(p.fajr, localPartsFn)}, ` +
    `puis l'Isfar à ${dateToClockWordsFrench(p.isfarAlaStart, localPartsFn)}, ` +
    `puis le lever du soleil à ${dateToClockWordsFrench(p.sunrise, localPartsFn)}, ` +
    `puis l'heure de licéité de la prière surérogatoire à ${dateToClockWordsFrench(p.naflTime, localPartsFn)}, ` +
    `puis le Dhuhr à ${dateToClockWordsFrench(p.dhuhr, localPartsFn)}, ` +
    `puis l'Asr à ${dateToClockWordsFrench(p.asr, localPartsFn)}, ` +
    `puis la fin du temps préféré de l'Asr à ${dateToClockWordsFrench(p.asrMukhtarEnd, localPartsFn)}, ` +
    `puis le Maghrib à ${dateToClockWordsFrench(p.maghrib, localPartsFn)}, ` +
    `et enfin l'Isha à ${dateToClockWordsFrench(p.isha, localPartsFn)}.`
  )

  // 3) الشمس (ثم اتجاه القبلة مباشرة بعدها - مدمَج هنا بعد طول الليل، كما طلب المستخدم، بدل
  // قسم مستقل في آخر النص كما كان سابقا)
  const s = r.sun
  const q = r.qibla
  sections.push(
    'Données du Soleil : ' +
    `longitude écliptique ${dmsToFrenchWords(s.ecliptic.longitudeDeg)}, distance à la Terre ${s.ecliptic.distanceAU.toFixed(4)} unités astronomiques. ` +
    `Il se trouve actuellement à ${dmsToFrenchWords(s.zodiac.degreeInSign)} de son signe zodiacal véritable : ${s.zodiac.nameFrench}, et à ${dmsToFrenchWords(s.manzil.degreeInManzil)} de sa demeure lunaire : ${s.manzil.nameFrench}. ` +
    `Ascension droite ${hmsAngleToFrenchWords(s.equatorial.rightAscensionDeg)}, déclinaison ${dmsToFrenchWords(s.equatorial.declinationDeg, 'declination')}. ` +
    `Hauteur actuelle ${dmsToFrenchWords(s.horizontal.altitudeDeg)}, azimut ${dmsToFrenchWords(s.horizontal.azimuthDeg)}, angle horaire ${hmsAngleToFrenchWords(s.horizontal.hourAngleDeg, 'hourAngle')}. ` +
    `Lever à ${dateToClockWordsFrench(s.riseTransitSet.riseDate, localPartsFn)}, passage au méridien à ${dateToClockWordsFrench(s.riseTransitSet.transitDate, localPartsFn)}, coucher à ${dateToClockWordsFrench(s.riseTransitSet.setDate, localPartsFn)}. ` +
    (s.shadowAtZawalCm != null ? `La longueur de l'ombre au passage au méridien, pour un gnomon de ${frenchCountedNoun(s.gnomonCm, FRENCH_NOUN_FORMS.cm)}, est de ${s.shadowAtZawalCm.toFixed(1)} centimètres. ` : '') +
    (s.shadowNowCm != null ? `La longueur de l'ombre actuelle est de ${s.shadowNowCm.toFixed(1)} centimètres. ` : "Le Soleil est actuellement sous l'horizon, il n'y a donc pas d'ombre. ") +
    (s.shadowAzimuthNowDeg != null ? `Et l'azimut de cette ombre est de ${dmsToFrenchWords(s.shadowAzimuthNowDeg)}. ` : '') +
    `Durée du jour ${hoursDecimalToFrenchDuration(s.dayLengthHours)}, durée de la nuit ${hoursDecimalToFrenchDuration(s.nightLengthHours)}. ` +
    `L'arc de l'azimut de la Qibla depuis votre position est de ${dmsToFrenchWords(q.azimuthDeg)}, soit en direction ${q.directionNameFrench}. ` +
    `La hauteur du Soleil au moment où il fait face à la Qibla est de ${q.sunAltitudeAtFacingDeg != null ? dmsToFrenchWords(q.sunAltitudeAtFacingDeg) : "cela ne se produit pas aujourd'hui à votre position"}. ` +
    `Le Soleil fait face à la Qibla aujourd'hui à ${dateToClockWordsFrenchOr(q.sunTowardQiblaDate, localPartsFn, "cela ne se produit pas aujourd'hui à votre position")}, ` +
    `et l'ombre indique la Qibla à ${dateToClockWordsFrenchOr(q.shadowTowardQiblaDate, localPartsFn, "cela ne se produit pas aujourd'hui à votre position")}.`
  )

  // 4) القمر
  const m = r.moon
  sections.push(
    'Données de la Lune : ' +
    `longitude écliptique ${dmsToFrenchWords(m.ecliptic.longitudeDeg)}, latitude écliptique ${dmsToFrenchWords(m.ecliptic.latitudeDeg, 'latitude')}. ` +
    `Elle se trouve actuellement à ${dmsToFrenchWords(m.zodiac.degreeInSign)} de son signe zodiacal véritable : ${m.zodiac.nameFrench}, et à ${dmsToFrenchWords(m.manzil.degreeInManzil)} de sa demeure lunaire : ${m.manzil.nameFrench}. ` +
    `Ascension droite ${hmsAngleToFrenchWords(m.equatorial.rightAscensionDeg)}, déclinaison ${dmsToFrenchWords(m.equatorial.declinationDeg, 'declination')}. ` +
    `Hauteur actuelle ${dmsToFrenchWords(m.horizontal.altitudeDeg)}, azimut ${dmsToFrenchWords(m.horizontal.azimuthDeg)}, angle horaire ${hmsAngleToFrenchWords(m.horizontal.hourAngleDeg, 'hourAngle')}. ` +
    `Lever à ${dateToClockWordsFrench(m.riseTransitSet.riseDate, localPartsFn)}, passage au méridien à ${dateToClockWordsFrench(m.riseTransitSet.transitDate, localPartsFn)}, coucher à ${dateToClockWordsFrench(m.riseTransitSet.setDate, localPartsFn)}. ` +
    `Élongation par rapport au Soleil ${dmsToFrenchWords(m.elongationDeg)}, âge ${m.ageDays.toFixed(1)} jours, distance à la Terre ${Math.round(m.distanceKm).toLocaleString('en-US')} kilomètres. ` +
    `Phase actuelle : ${m.phaseNameFrench}, taux d'éclairement ${Math.round(m.illuminatedFraction * 100)} pour cent. ` +
    nextNewMoonSentenceFrench(m.nextNewMoon)
  )

  // 5) الوقت النجمي
  const sd = r.sidereal
  const hmsWordsFr = (hoursDecimal) => {
    const hh = Math.floor(hoursDecimal)
    const mm = Math.floor((hoursDecimal - hh) * 60)
    return hmsClockToFrenchWords(hh, mm)
  }
  sections.push(
    'Enfin, le temps sidéral : ' +
    `le temps sidéral de Greenwich à minuit temps universel était de ${hmsWordsFr(sd.gst0Hours)}. ` +
    `Le temps sidéral actuel de Greenwich est de ${hmsWordsFr(sd.gstHours)}. ` +
    `Et le temps sidéral local de votre position est actuellement de ${hmsWordsFr(sd.lstHours)}.`
  )

  return sections.join('\n\n')
}

// ------------------------- بناء نص القراءة الكامل -------------------------

/**
 * يبني النص العربي الكامل المُعَدّ للنطق من نتيجة engine.computeAll().
 * @param {ReturnType<import('./engine.js').computeAll>} r
 * @param {(utcDate:Date)=>{year:number,month:number,day:number,hour:number,minute:number,second:number}} localPartsFn
 *   دالة تحويل لحظة UTC إلى أجزاء محلية (مرّر timeutil.localPartsFromUTC مُقيَّدة بـobserverTime المستعمل)
 */
export function buildNarrationScriptArabic (r, localPartsFn) {
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

  // 2) مواقيت الصلاة (مدمَجة في تسلسل زمني واحد: الثلث الأخير، الفجر، الإسفار الأعلى، الشروق،
  // حل النافلة، الزوال، العصر، نهاية المختار للعصر، المغرب، العشاء - كما طلب المستخدم صريحا)
  const p = r.prayerTimes
  sections.push(
    'مواقيت الصلاة اليوم: ' +
    `بداية الثلث الأخير من الليل ${dateToClockWordsOr(p.lastThirdOfNightStart, localPartsFn, 'غير متحقق عند موقعكم هذه الليلة')}، ` +
    `ثم الفجر ${dateToClockWords(p.fajr, localPartsFn)}، ` +
    `ثم الإسفار الأعلى ${dateToClockWords(p.isfarAlaStart, localPartsFn)}، ` +
    `ثم الشروق ${dateToClockWords(p.sunrise, localPartsFn)}، ` +
    `ثم وقت حل النافلة ${dateToClockWords(p.naflTime, localPartsFn)}، ` +
    `ثم الزوال ${dateToClockWords(p.dhuhr, localPartsFn)}، ` +
    `ثم العصر ${dateToClockWords(p.asr, localPartsFn)}، ` +
    `ثم نهاية الوقت المختار للعصر ${dateToClockWords(p.asrMukhtarEnd, localPartsFn)}، ` +
    `ثم المغرب ${dateToClockWords(p.maghrib, localPartsFn)}، ` +
    `والعشاء ${dateToClockWords(p.isha, localPartsFn)}.`
  )

  // 3) الشمس (ثم اتجاه القبلة مباشرة بعدها - مدمَج هنا بعد طول الليل، كما طلب المستخدم صريحا،
  // بدل قسم مستقل في آخر النص كما كان سابقا)
  const s = r.sun
  const q = r.qibla
  sections.push(
    'أما بيانات الشمس: ' +
    `طولها البروجي ${dmsToArabicWords(s.ecliptic.longitudeDeg)}، وبعدها عن الأرض ${s.ecliptic.distanceAU.toFixed(4)} وحدة فلكية. ` +
    `وهي الآن عند ${dmsToArabicWords(s.zodiac.degreeInSign)} من برجها الحقيقي: ${s.zodiac.nameArabic}، وعند ${dmsToArabicWords(s.manzil.degreeInManzil)} من منزلتها: ${s.manzil.nameArabic}. ` +
    `مطلعها المستقيم ${hmsAngleToArabicWords(s.equatorial.rightAscensionDeg)}، وميلها ${dmsToArabicWords(s.equatorial.declinationDeg, 'declination')}. ` +
    `ارتفاعها الآن ${dmsToArabicWords(s.horizontal.altitudeDeg)}، وسمتها ${dmsToArabicWords(s.horizontal.azimuthDeg)}، وزاويتها الساعية ${hmsAngleToArabicWords(s.horizontal.hourAngleDeg, 'hourAngle')}. ` +
    `شروقها ${dateToClockWords(s.riseTransitSet.riseDate, localPartsFn)}، وزوالها ${dateToClockWords(s.riseTransitSet.transitDate, localPartsFn)}، وغروبها ${dateToClockWords(s.riseTransitSet.setDate, localPartsFn)}. ` +
    (s.shadowAtZawalCm != null ? `طول ظل الزوال لعود ${arabicNumberToWords(s.gnomonCm)} سنتيمترا هو ${s.shadowAtZawalCm.toFixed(1)} سنتيمترا. ` : '') +
    (s.shadowNowCm != null ? `وطول الظل الآن ${s.shadowNowCm.toFixed(1)} سنتيمترا. ` : 'والشمس الآن تحت الأفق فلا ظل لها. ') +
    (s.shadowAzimuthNowDeg != null ? `وسمت هذا الظل ${dmsToArabicWords(s.shadowAzimuthNowDeg)}. ` : '') +
    `طول النهار ${hoursDecimalToArabicDuration(s.dayLengthHours)}، وطول الليل ${hoursDecimalToArabicDuration(s.nightLengthHours)}. ` +
    `ثم قوس سمت القبلة من موقعكم ${dmsToArabicWords(q.azimuthDeg)}، وجهتها ${q.directionNameArabic}. ` +
    `وارتفاع الشمس عند استقبال القبلة ${q.sunAltitudeAtFacingDeg != null ? dmsToArabicWords(q.sunAltitudeAtFacingDeg) : 'لا يحدث اليوم عند موقعكم'}. ` +
    `ويكون اتجاه الشمس نحو القبلة اليوم ${dateToClockWordsOr(q.sunTowardQiblaDate, localPartsFn, 'لا يحدث اليوم عند موقعكم')}، ` +
    `واتجاه الظل نحو القبلة ${dateToClockWordsOr(q.shadowTowardQiblaDate, localPartsFn, 'لا يحدث اليوم عند موقعكم')}.`
  )

  // 4) القمر
  const m = r.moon
  sections.push(
    'وأما بيانات القمر: ' +
    `طوله البروجي ${dmsToArabicWords(m.ecliptic.longitudeDeg)}، وعرضه البروجي ${dmsToArabicWords(m.ecliptic.latitudeDeg, 'latitude')}. ` +
    `وهو الآن عند ${dmsToArabicWords(m.zodiac.degreeInSign)} من برجه الحقيقي: ${m.zodiac.nameArabic}، وعند ${dmsToArabicWords(m.manzil.degreeInManzil)} من منزلته: ${m.manzil.nameArabic}. ` +
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

/**
 * يبني نص القراءة الكامل باللغة المطلوبة (عربي افتراضيا، أو فرنسي) - نقطة الدخول الموحَّدة
 * التي يستعملها app.js، فلا يحتاج استدعاؤها إلى معرفة وجود نسختين منفصلتين داخليا.
 * @param {ReturnType<import('./engine.js').computeAll>} r
 * @param {(utcDate:Date)=>{year:number,month:number,day:number,hour:number,minute:number,second:number}} localPartsFn
 * @param {'ar'|'fr'} [lang='ar']
 */
export function buildNarrationScript (r, localPartsFn, lang = 'ar') {
  return lang === 'fr' ? buildNarrationScriptFrench(r, localPartsFn) : buildNarrationScriptArabic(r, localPartsFn)
}

// ------------------------- النطق عبر Web Speech API (متصفح فقط) -------------------------

/**
 * ينطق نصا عبر Web Speech API إن توفرت (متصفح Chromium على ويندوز، أو متصفح أندرويد) - تعمل
 * بأي لغة يدعمها متصفح الجهاز، عربية كانت أو فرنسية؛ المهم ألا يُخلَط نص لغة بصوت لغة أخرى
 * (نص فرنسي بصوت عربي ينطق حروفا لا معنى لها، والعكس بالعكس) - لذا يُشتق مرشَّح اختيار الصوت
 * الاحتياطي من lang نفسها لا من افتراض ثابت.
 * لا تأثير لها في بيئة بلا `window` (مثل بيئة الاختبار في Node) - تُرجع Promise تُرفض بهدوء.
 * @param {string} text
 * @param {{lang?:string, rate?:number, pitch?:number, voiceNameHint?:string}} [opts]
 */
export function speak (text, opts = {}) {
  const { lang = 'ar-SA', rate = 0.95, pitch = 1, voiceNameHint } = opts
  const langPrefix = String(lang).slice(0, 2).toLowerCase()
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
      if (!voice) voice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix))
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

/** اسم قديم محفوظ للتوافق الخلفي (يستعمله أي كود سابق ما زال يستدعي speakArabic مباشرة) */
export function speakArabic (text, opts = {}) {
  return speak(text, { lang: 'ar-SA', ...opts })
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
  hoursDecimalToArabicDuration,
  frenchNumberToWords,
  joinFrenchList,
  frenchCountedNoun,
  FRENCH_NOUN_FORMS,
  dmsToFrenchWords,
  hmsAngleToFrenchWords,
  hmsClockToFrenchWords,
  hoursDecimalToFrenchDuration,
  buildNarrationScriptArabic,
  buildNarrationScriptFrench,
  buildNarrationScript,
  speak,
  speakArabic,
  scheduleHourlyReadings
}
