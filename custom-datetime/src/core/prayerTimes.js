/**
 * src/core/prayerTimes.js
 * أوقات الصلاة الخمس: الفجر، الشروق، الظهر، العصر، المغرب، العشاء.
 *
 * طريقة الحساب (حسب اختيار المستخدم):
 *  - الفجر  : عبور الشمس صباحا ارتفاعا = fajrAngleDeg (الافتراضي -18°)
 *  - الشروق : الشروق الفعلي (ارتفاع معياري يشمل الانكسار ونصف قطر القرص، من sun.sunRiseTransitSet)
 *  - الظهر  : لحظة الزوال الفعلية (عبور الشمس خط زوال المراقب)
 *  - العصر  : صيغة الفقهاء/ميوس القياسية  h_asr = atan(1/(asrFactor + tan(|lat - dec|)))
 *             حيث |lat-dec| تُستخرج من ارتفاع الزوال مباشرة (transitAltitude = 90 - |lat-dec|)
 *             asrFactor = 1 لمذهب الجمهور (الشافعية/المالكية/الحنابلة) أو 2 للحنفية
 *  - المغرب : الغروب الفعلي
 *  - العشاء : حسب الإعداد الحالي = المغرب + ishaOffsetMinutes دقيقة (90 دقيقة)، لا بزاوية ارتفاع
 *
 * كل هذه الإعدادات قابلة للتبديل عبر معامل settings (كما وُعِد المستخدم: قابلة للتعديل من
 * داخل التطبيق لاحقا)، بما يشمل التبديل لاحقا لطريقة العشاء بالزاوية الفلكية إن رغب المستخدم.
 */

import sun from './sun.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

export const DEFAULT_PRAYER_SETTINGS = {
  fajrAngleDeg: -18, // اختيار المستخدم
  asrFactor: 1, // 1 = الجمهور (الشافعية/المالكية/الحنابلة)، 2 = الحنفية
  ishaMode: 'offsetAfterMaghrib', // 'offsetAfterMaghrib' | 'angle'
  ishaOffsetMinutes: 90, // اختيار المستخدم: عشاء = مغرب + 90 دقيقة
  ishaAngleDeg: -18, // تُستعمل فقط إذا ishaMode === 'angle' (مرونة لتبديل الطريقة مستقبلا)
  ihtiyatMinutes: 0, // هامش احتياط اختياري (دقائق)؛ 0 الآن = حساب فلكي خالص بلا هامش
  maghribTamkinMinutes: 2, // هامش "تمكين" الغروب (دقائق تُضاف بعد الغروب الفلكي الخالص قبل إعلان
  // دخول وقت المغرب) - طلب المستخدم صراحة. يخص هذا الهامش إعلان وقت المغرب نفسه (وبالتبعية
  // العشاء في وضع offsetAfterMaghrib أدناه، لأنه يُحسب من وقت إعلان المغرب كما تفعل التقاويم
  // الرسمية) فقط - لا يُطبَّق على حساب "بداية الثلث الأخير من الليل" (تلك تبقى من الغروب
  // الفلكي الخالص إلى الفجر الفلكي الخالص، بلا أي هامش بشري، تماما كما ihtiyatMinutes أعلاه
  // لا يُطبَّق على حدّ الفجر المُستعمل هناك رغم تطبيقه على وقت إعلان الفجر نفسه بالأسفل).
  isfarAlaAngleDeg: -6, // ارتفاع الإسفار الأعلى (اختيار المستخدم صريحا)
  naflAltitudeDeg: 4 // ارتفاع "قيد رمح" لحل النافلة (اختيار المستخدم صريحا، مطابقة لبرنامجهم "الهادي الناطق")
}

export const PRAYER_NAMES_AR = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء'
}

/**
 * يحسب أوقات الصلاة الخمس (+الشروق) ليوم محلي معيّن عند موقع المراقب.
 * @param {number} localYear
 * @param {number} localMonth1to12
 * @param {number} localDay
 * @param {{mode:'offset',utcOffsetHours:number}|{mode:'tz',timeZone:string}} observerTime
 * @param {number} latDeg - عرض المراقب (شمالا موجب)
 * @param {number} lonEastDeg - طول المراقب (شرقا موجب)
 * @param {Partial<typeof DEFAULT_PRAYER_SETTINGS>} [settings]
 * @returns {{
 *   fajr:Date|null, sunrise:Date|null, dhuhr:Date|null, asr:Date|null,
 *   maghrib:Date|null, isha:Date|null,
 *   status:{fajr:string, sunMain:string, asr:string, isha:string}
 * }}
 */
export function computePrayerTimes (localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, settings = {}) {
  const s = { ...DEFAULT_PRAYER_SETTINGS, ...settings }
  const ihtiyatMs = (s.ihtiyatMinutes || 0) * 60000

  // الشروق/الزوال(الظهر)/الغروب الفعلية + ارتفاع الزوال (يُستعمل لاستخراج العصر أدناه)
  const main = sun.sunRiseTransitSet(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg)

  // الفجر: عبور صباحي لارتفاع fajrAngleDeg
  const fajrCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, s.fajrAngleDeg)

  // العصر: نحسب h_asr من |lat-dec| المُستخرجة من ارتفاع الزوال، ثم نجد عبورها المسائي (بعد الزوال)
  let asrDate = null
  let asrStatus = main.status
  if (main.status === 'ok') {
    const absLatDecDeg = 90 - main.transitAltitudeDeg
    const hAsrDeg = Math.atan(1 / (s.asrFactor + Math.tan(absLatDecDeg * D2R))) * R2D
    const asrCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, hAsrDeg)
    asrDate = asrCrossing.setDate // بعد الزوال = العبور المسائي (الهابط) لهذا الارتفاع
    asrStatus = asrCrossing.status
  }

  // الغروب الفلكي الخالص (بلا أي هامش بشري) - يبقى هذا، لا maghribDate أدناه، أساس حساب "الليلة
  // الشرعية" (الثلث الأخير) بالأسفل. maghribDate نفسه هو وقت *إعلان* دخول صلاة المغرب المعروض
  // للمستخدم، بعد إضافة هامش التمكين - يطابق هذا ما تفعله التقاويم الرسمية (تمكين ثم عشاء من بعده).
  const trueMaghribDate = main.setDate
  const maghribTamkinMs = (s.maghribTamkinMinutes || 0) * 60000
  const maghribDate = trueMaghribDate ? new Date(trueMaghribDate.getTime() + maghribTamkinMs) : null

  // العشاء
  let ishaDate = null
  let ishaStatus = main.status
  if (s.ishaMode === 'angle') {
    const ishaCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, s.ishaAngleDeg)
    ishaDate = ishaCrossing.setDate ? new Date(ishaCrossing.setDate.getTime() + ihtiyatMs) : null
    ishaStatus = ishaCrossing.status
  } else if (maghribDate) {
    // الإزاحة الثابتة (90 دقيقة) تمثل هامشا كافيا بذاتها، فلا نضيف إليها ihtiyat إضافيا
    ishaDate = new Date(maghribDate.getTime() + s.ishaOffsetMinutes * 60000)
    ishaStatus = 'ok'
  }

  // ---------------- أوقات شرعية إضافية (طلب المستخدم) ----------------

  // ١) بداية الثلث الأخير من الليل: الليلة الشرعية من الغروب إلى طلوع فجر اليوم التالي (لا
  // منتصف الليل الساعاتي) - فنحتاج فجر "اليوم التالي" تحديدا، بنفس زاوية fajrAngleDeg الحالية.
  let lastThirdOfNightStart = null
  let lastThirdOfNightStatus = (main.status === 'ok') ? 'pending' : main.status
  if (trueMaghribDate) {
    const tomorrowFajrCrossing = sun.sunAngleCrossing(
      localYear, localMonth1to12, localDay + 1, observerTime, latDeg, lonEastDeg, s.fajrAngleDeg
    )
    if (tomorrowFajrCrossing.riseDate) {
      const nightMs = tomorrowFajrCrossing.riseDate.getTime() - trueMaghribDate.getTime()
      lastThirdOfNightStart = new Date(trueMaghribDate.getTime() + (nightMs * 2) / 3)
      lastThirdOfNightStatus = 'ok'
    } else {
      lastThirdOfNightStatus = tomorrowFajrCrossing.status
    }
  }

  // ٢) الإسفار الأعلى: عبور صباحي (كالفجر تماما، زاوية مختلفة فقط) لارتفاع isfarAlaAngleDeg
  const isfarCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, s.isfarAlaAngleDeg)
  const isfarAlaStart = isfarCrossing.riseDate

  // ٣) وقت حل النافلة: عبور صباحي لارتفاع naflAltitudeDeg ("قيد رمح")
  const naflCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, s.naflAltitudeDeg)
  const naflTime = naflCrossing.riseDate

  // ٤) نهاية الوقت المختار للعصر: نفس صيغة العصر أعلاه تماما (h_asr = atan(1/(factor+tan(|lat-dec|))))
  // بعامل = ٢ ثابت دائما هنا (مستقل عن asrFactor المُختار للعصر نفسه أعلاه)، إذ طلب المستخدم
  // صريحا "ضِعف طول صاحبه" - أي: ظل = ظل الزوال + ٢×طول العود.
  let asrMukhtarEnd = null
  let asrMukhtarEndStatus = main.status
  if (main.status === 'ok') {
    const absLatDecDeg = 90 - main.transitAltitudeDeg
    const hAsrMukhtarEndDeg = Math.atan(1 / (2 + Math.tan(absLatDecDeg * D2R))) * R2D
    const asrMukhtarEndCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, hAsrMukhtarEndDeg)
    asrMukhtarEnd = asrMukhtarEndCrossing.setDate
    asrMukhtarEndStatus = asrMukhtarEndCrossing.status
  }

  return {
    fajr: fajrCrossing.riseDate ? new Date(fajrCrossing.riseDate.getTime() - ihtiyatMs) : null,
    sunrise: main.riseDate,
    dhuhr: main.transitDate ? new Date(main.transitDate.getTime() + ihtiyatMs) : null,
    asr: asrDate,
    maghrib: maghribDate,
    isha: ishaDate,
    lastThirdOfNightStart,
    isfarAlaStart,
    naflTime,
    asrMukhtarEnd,
    status: {
      fajr: fajrCrossing.status,
      sunMain: main.status,
      asr: asrStatus,
      isha: ishaStatus,
      lastThirdOfNight: lastThirdOfNightStatus,
      isfarAla: isfarCrossing.status,
      nafl: naflCrossing.status,
      asrMukhtarEnd: asrMukhtarEndStatus
    }
  }
}

export default { computePrayerTimes, DEFAULT_PRAYER_SETTINGS, PRAYER_NAMES_AR }
